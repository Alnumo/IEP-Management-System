import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  notificationService, 
  type Notification, 
  type NotificationType, 
  type RecipientType,
  type NotificationChannel,
  type NotificationPriority
} from '@/services/notification-service'
import { requireAuth } from '@/lib/auth-utils'
import { errorMonitoring } from '@/lib/error-monitoring'

// =====================================================
// NOTIFICATION QUERIES
// =====================================================

/**
 * Hook to fetch user notifications
 */
export const useUserNotifications = (
  userId: string,
  options: {
    limit?: number
    unreadOnly?: boolean
    types?: NotificationType[]
    enabled?: boolean
  } = {}
) => {
  return useQuery({
    queryKey: ['notifications', userId, options],
    queryFn: async (): Promise<Notification[]> => {
      const user = await requireAuth()
      
      try {
        const notifications = await notificationService.getUserNotifications(userId, {
          limit: options.limit || 50,
          unreadOnly: options.unreadOnly,
          types: options.types
        })
        
        return notifications
      } catch (error) {
        errorMonitoring.reportError(error as Error, {
          component: 'useUserNotifications',
          action: 'fetch_notifications',
          userId: user.id
        })
        throw error
      }
    },
    enabled: options.enabled !== false && !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    refetchIntervalInBackground: true
  })
}

/**
 * Hook to get unread notification count
 */
export const useUnreadNotificationCount = (userId: string) => {
  return useQuery({
    queryKey: ['notifications', 'unread-count', userId],
    queryFn: async (): Promise<number> => {
      const user = await requireAuth()
      
      try {
        const notifications = await notificationService.getUserNotifications(userId, {
          unreadOnly: true,
          limit: 100 // Get up to 100 unread for accurate count
        })
        
        return notifications.length
      } catch (error) {
        errorMonitoring.reportError(error as Error, {
          component: 'useUnreadNotificationCount',
          action: 'fetch_unread_count',
          userId: user.id
        })
        return 0
      }
    },
    enabled: !!userId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  })
}

/**
 * Hook to get urgent notification count
 */
export const useUrgentNotificationCount = (userId: string) => {
  return useQuery({
    queryKey: ['notifications', 'urgent-count', userId],
    queryFn: async (): Promise<number> => {
      const user = await requireAuth()
      
      try {
        const notifications = await notificationService.getUserNotifications(userId, {
          unreadOnly: true,
          limit: 100
        })
        
        return notifications.filter(n => 
          n.priority === 'urgent' || n.priority === 'high'
        ).length
      } catch (error) {
        errorMonitoring.reportError(error as Error, {
          component: 'useUrgentNotificationCount',
          action: 'fetch_urgent_count',
          userId: user.id
        })
        return 0
      }
    },
    enabled: !!userId,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000, // More frequent for urgent notifications
  })
}

// =====================================================
// NOTIFICATION MUTATIONS
// =====================================================

/**
 * Hook to send a notification
 */
export const useSendNotification = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      recipientId: string
      recipientType: RecipientType
      notificationType: NotificationType
      data?: Record<string, any>
      options?: {
        priority?: NotificationPriority
        channels?: NotificationChannel[]
        scheduledFor?: Date
        language?: 'ar' | 'en'
      }
    }) => {
      const user = await requireAuth()
      
      const notificationId = await notificationService.sendNotification(
        params.recipientId,
        params.recipientType,
        params.notificationType,
        params.data || {},
        params.options || {}
      )
      
      return notificationId
    },
    onSuccess: (_, variables) => {
      // Invalidate notification queries for the recipient
      queryClient.invalidateQueries({ 
        queryKey: ['notifications', variables.recipientId] 
      })
    },
    onError: (error) => {
      errorMonitoring.reportError(error as Error, {
        component: 'useSendNotification',
        action: 'send_notification'
      })
    }
  })
}

/**
 * Hook to mark a notification as read
 */
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await requireAuth()
      await notificationService.markAsRead(notificationId)
      return notificationId
    },
    onSuccess: (notificationId) => {
      // Update the notification in the cache
      queryClient.setQueriesData(
        { queryKey: ['notifications'] },
        (oldData: Notification[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(n => 
            n.id === notificationId 
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        }
      )
      
      // Invalidate count queries
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'urgent-count'] })
    },
    onError: (error) => {
      errorMonitoring.reportError(error as Error, {
        component: 'useMarkNotificationRead',
        action: 'mark_as_read'
      })
    }
  })
}

/**
 * Hook to mark multiple notifications as read
 */
export const useMarkMultipleNotificationsRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      await requireAuth()
      
      await Promise.all(
        notificationIds.map(id => notificationService.markAsRead(id))
      )
      
      return notificationIds
    },
    onSuccess: (notificationIds) => {
      // Update notifications in cache
      queryClient.setQueriesData(
        { queryKey: ['notifications'] },
        (oldData: Notification[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(n => 
            notificationIds.includes(n.id)
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        }
      )
      
      // Invalidate count queries
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'urgent-count'] })
    },
    onError: (error) => {
      errorMonitoring.reportError(error as Error, {
        component: 'useMarkMultipleNotificationsRead',
        action: 'mark_multiple_as_read'
      })
    }
  })
}

// =====================================================
// REAL-TIME NOTIFICATION HOOKS
// =====================================================

/**
 * Hook for real-time notifications
 */
export const useRealTimeNotifications = (
  userId: string,
  onNewNotification?: (notification: Notification) => void
) => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastNotification, setLastNotification] = useState<Notification | null>(null)
  const subscriptionRef = useRef<(() => void) | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const unsubscribe = notificationService.subscribeToUserNotifications(
      userId,
      (notification) => {
        setLastNotification(notification)
        
        // Add to cache
        queryClient.setQueriesData(
          { queryKey: ['notifications', userId] },
          (oldData: Notification[] | undefined) => {
            if (!oldData) return [notification]
            return [notification, ...oldData]
          }
        )
        
        // Invalidate count queries
        queryClient.invalidateQueries({ 
          queryKey: ['notifications', 'unread-count', userId] 
        })
        queryClient.invalidateQueries({ 
          queryKey: ['notifications', 'urgent-count', userId] 
        })
        
        if (onNewNotification) {
          onNewNotification(notification)
        }
      }
    )

    subscriptionRef.current = unsubscribe
    setIsConnected(true)

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current()
        subscriptionRef.current = null
      }
      setIsConnected(false)
    }
  }, [userId, onNewNotification, queryClient])

  return {
    isConnected,
    lastNotification
  }
}

/**
 * Hook for notification permissions
 */
export const useNotificationPermissions = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      return 'denied'
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  return {
    permission,
    requestPermission,
    isSupported: 'Notification' in window
  }
}

// =====================================================
// NOTIFICATION SOUND HOOK
// =====================================================

/**
 * Hook for notification sounds
 */
export const useNotificationSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null)

  const playSound = useCallback((priority: NotificationPriority = 'medium') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const audioContext = audioContextRef.current
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Different frequencies for different priorities
      const frequencies = {
        urgent: 800,
        high: 600,
        medium: 400,
        low: 300
      }

      oscillator.frequency.value = frequencies[priority]
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.warn('Could not play notification sound:', error)
    }
  }, [])

  return { playSound }
}

// =====================================================
// BATCH NOTIFICATION OPERATIONS
// =====================================================

/**
 * Hook for batch notification operations
 */
export const useBatchNotificationOperations = () => {
  const queryClient = useQueryClient()

  const markAllAsRead = useMutation({
    mutationFn: async (userId: string) => {
      await requireAuth()
      
      const notifications = await notificationService.getUserNotifications(userId, {
        unreadOnly: true,
        limit: 100
      })
      
      await Promise.all(
        notifications.map(n => notificationService.markAsRead(n.id))
      )
      
      return notifications.length
    },
    onSuccess: (count, userId) => {
      // Update all notifications as read
      queryClient.setQueriesData(
        { queryKey: ['notifications', userId] },
        (oldData: Notification[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        }
      )
      
      // Reset count queries
      queryClient.setQueryData(['notifications', 'unread-count', userId], 0)
      queryClient.setQueryData(['notifications', 'urgent-count', userId], 0)
    }
  })

  return {
    markAllAsRead
  }
}

export default {
  useUserNotifications,
  useUnreadNotificationCount,
  useUrgentNotificationCount,
  useSendNotification,
  useMarkNotificationRead,
  useMarkMultipleNotificationsRead,
  useRealTimeNotifications,
  useNotificationPermissions,
  useNotificationSounds,
  useBatchNotificationOperations
}