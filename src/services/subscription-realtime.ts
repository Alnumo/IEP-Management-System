import { supabase } from '@/lib/supabase'
import { errorMonitoring } from '@/lib/error-monitoring'
import type { 
  StudentSubscription, 
  SubscriptionFreezeHistory,
  RealtimeSubscriptionEvent,
  SubscriptionEventHandler
} from '@/types/scheduling'

/**
 * Subscription Real-time Service
 * 
 * Manages real-time subscriptions and live updates for:
 * - Subscription status changes
 * - Freeze/unfreeze operations
 * - Session rescheduling updates
 * - Cross-user collaboration events
 */

type SubscriptionEventType = 
  | 'subscription_updated'
  | 'subscription_frozen'
  | 'subscription_unfrozen'
  | 'freeze_history_added'
  | 'sessions_rescheduled'
  | 'billing_adjusted'

interface RealtimeEventPayload {
  eventType: SubscriptionEventType
  subscription_id: string
  student_id?: string
  data: any
  timestamp: string
  user_id: string
}

export class SubscriptionRealtimeService {
  private subscriptions = new Map<string, any>()
  private eventHandlers = new Map<string, Set<SubscriptionEventHandler>>()
  private connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  /**
   * Subscribe to real-time updates for a specific subscription
   */
  subscribeToSubscription(
    subscriptionId: string, 
    handler: SubscriptionEventHandler
  ): () => void {
    console.log('🔔 Setting up real-time subscription for:', subscriptionId)

    try {
      // Add handler to event handlers map
      if (!this.eventHandlers.has(subscriptionId)) {
        this.eventHandlers.set(subscriptionId, new Set())
      }
      this.eventHandlers.get(subscriptionId)!.add(handler)

      // Create Supabase real-time subscription if not exists
      if (!this.subscriptions.has(subscriptionId)) {
        this.createSubscriptionChannel(subscriptionId)
      }

      // Return unsubscribe function
      return () => {
        this.unsubscribeFromSubscription(subscriptionId, handler)
      }

    } catch (error) {
      console.error('❌ Failed to subscribe to subscription updates:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'SubscriptionRealtimeService',
        action: 'subscribeToSubscription',
        subscriptionId
      })

      // Return no-op unsubscribe function
      return () => {}
    }
  }

  /**
   * Subscribe to all subscription updates for a student
   */
  subscribeToStudentSubscriptions(
    studentId: string,
    handler: SubscriptionEventHandler
  ): () => void {
    console.log('🔔 Setting up real-time subscription for student:', studentId)

    try {
      const channelName = `student-subscriptions:${studentId}`
      
      if (!this.eventHandlers.has(channelName)) {
        this.eventHandlers.set(channelName, new Set())
      }
      this.eventHandlers.get(channelName)!.add(handler)

      if (!this.subscriptions.has(channelName)) {
        this.createStudentSubscriptionChannel(studentId)
      }

      return () => {
        this.unsubscribeFromStudent(studentId, handler)
      }

    } catch (error) {
      console.error('❌ Failed to subscribe to student subscription updates:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'SubscriptionRealtimeService',
        action: 'subscribeToStudentSubscriptions',
        studentId
      })

      return () => {}
    }
  }

  /**
   * Subscribe to freeze/unfreeze operations across all subscriptions
   */
  subscribeToFreezeOperations(handler: SubscriptionEventHandler): () => void {
    console.log('🔔 Setting up real-time subscription for freeze operations')

    try {
      const channelName = 'freeze-operations'
      
      if (!this.eventHandlers.has(channelName)) {
        this.eventHandlers.set(channelName, new Set())
      }
      this.eventHandlers.get(channelName)!.add(handler)

      if (!this.subscriptions.has(channelName)) {
        this.createFreezeOperationsChannel()
      }

      return () => {
        const handlers = this.eventHandlers.get(channelName)
        if (handlers) {
          handlers.delete(handler)
          if (handlers.size === 0) {
            this.unsubscribeChannel(channelName)
          }
        }
      }

    } catch (error) {
      console.error('❌ Failed to subscribe to freeze operations:', error)
      return () => {}
    }
  }

  /**
   * Broadcast subscription event to all relevant subscribers
   */
  async broadcastSubscriptionEvent(
    subscriptionId: string,
    eventType: SubscriptionEventType,
    data: any
  ): Promise<void> {
    console.log('📡 Broadcasting subscription event:', eventType, subscriptionId)

    try {
      const payload: RealtimeEventPayload = {
        eventType,
        subscription_id: subscriptionId,
        data,
        timestamp: new Date().toISOString(),
        user_id: 'system' // This would be the actual user ID
      }

      // Send to Supabase real-time channel
      const channel = supabase.channel(`subscription:${subscriptionId}`)
      await channel.send({
        type: 'broadcast',
        event: eventType,
        payload
      })

      // Also trigger local handlers immediately for better UX
      this.triggerLocalHandlers(subscriptionId, {
        type: eventType,
        payload,
        timestamp: payload.timestamp
      })

    } catch (error) {
      console.error('❌ Failed to broadcast subscription event:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'SubscriptionRealtimeService',
        action: 'broadcastSubscriptionEvent',
        subscriptionId,
        eventType
      })
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): 'connected' | 'disconnected' | 'reconnecting' {
    return this.connectionStatus
  }

  /**
   * Manually reconnect to all subscriptions
   */
  async reconnectAll(): Promise<void> {
    console.log('🔄 Reconnecting all real-time subscriptions')

    this.connectionStatus = 'reconnecting'
    
    try {
      // Recreate all active subscriptions
      const activeSubscriptions = Array.from(this.subscriptions.keys())
      
      for (const key of activeSubscriptions) {
        await this.recreateSubscription(key)
      }

      this.connectionStatus = 'connected'
      this.reconnectAttempts = 0
      
      console.log('✅ All real-time subscriptions reconnected')

    } catch (error) {
      console.error('❌ Failed to reconnect subscriptions:', error)
      
      this.reconnectAttempts++
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
        setTimeout(() => this.reconnectAll(), delay)
      } else {
        this.connectionStatus = 'disconnected'
      }
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    console.log('🧹 Cleaning up all real-time subscriptions')

    for (const [key, subscription] of this.subscriptions) {
      try {
        subscription.unsubscribe()
      } catch (error) {
        console.warn(`⚠️ Failed to unsubscribe from ${key}:`, error)
      }
    }

    this.subscriptions.clear()
    this.eventHandlers.clear()
    this.connectionStatus = 'disconnected'
  }

  /**
   * Private helper methods
   */
  private createSubscriptionChannel(subscriptionId: string): void {
    const channel = supabase
      .channel(`subscription:${subscriptionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_subscriptions',
        filter: `id=eq.${subscriptionId}`
      }, (payload) => {
        this.handleSubscriptionChange(subscriptionId, payload)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'subscription_freeze_history',
        filter: `subscription_id=eq.${subscriptionId}`
      }, (payload) => {
        this.handleFreezeHistoryChange(subscriptionId, payload)
      })
      .on('broadcast', { event: '*' }, (payload) => {
        this.handleBroadcastEvent(subscriptionId, payload)
      })
      .subscribe((status) => {
        console.log(`📡 Subscription channel ${subscriptionId} status:`, status)
        this.updateConnectionStatus(status)
      })

    this.subscriptions.set(subscriptionId, channel)
  }

  private createStudentSubscriptionChannel(studentId: string): void {
    const channelName = `student-subscriptions:${studentId}`
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_subscriptions',
        filter: `student_id=eq.${studentId}`
      }, (payload) => {
        this.handleStudentSubscriptionChange(studentId, payload)
      })
      .subscribe((status) => {
        console.log(`📡 Student subscription channel ${studentId} status:`, status)
        this.updateConnectionStatus(status)
      })

    this.subscriptions.set(channelName, channel)
  }

  private createFreezeOperationsChannel(): void {
    const channel = supabase
      .channel('freeze-operations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscription_freeze_history'
      }, (payload) => {
        this.handleGlobalFreezeChange(payload)
      })
      .subscribe((status) => {
        console.log('📡 Freeze operations channel status:', status)
        this.updateConnectionStatus(status)
      })

    this.subscriptions.set('freeze-operations', channel)
  }

  private handleSubscriptionChange(subscriptionId: string, payload: any): void {
    console.log('📬 Subscription change detected:', subscriptionId, payload.eventType)

    const event: RealtimeSubscriptionEvent = {
      type: 'subscription_updated',
      payload: payload.new || payload.old,
      timestamp: new Date().toISOString()
    }

    this.triggerLocalHandlers(subscriptionId, event)
  }

  private handleFreezeHistoryChange(subscriptionId: string, payload: any): void {
    console.log('📬 Freeze history change detected:', subscriptionId, payload.eventType)

    const eventType = payload.new?.operation_type === 'freeze' 
      ? 'subscription_frozen' 
      : 'subscription_unfrozen'

    const event: RealtimeSubscriptionEvent = {
      type: eventType,
      payload: payload.new,
      timestamp: new Date().toISOString()
    }

    this.triggerLocalHandlers(subscriptionId, event)
  }

  private handleStudentSubscriptionChange(studentId: string, payload: any): void {
    const channelName = `student-subscriptions:${studentId}`
    
    const event: RealtimeSubscriptionEvent = {
      type: 'subscription_updated',
      payload: payload.new || payload.old,
      timestamp: new Date().toISOString()
    }

    this.triggerLocalHandlers(channelName, event)
  }

  private handleGlobalFreezeChange(payload: any): void {
    const eventType = payload.new?.operation_type === 'freeze' 
      ? 'subscription_frozen' 
      : 'subscription_unfrozen'

    const event: RealtimeSubscriptionEvent = {
      type: eventType,
      payload: payload.new,
      timestamp: new Date().toISOString()
    }

    this.triggerLocalHandlers('freeze-operations', event)
  }

  private handleBroadcastEvent(subscriptionId: string, payload: any): void {
    console.log('📬 Broadcast event received:', subscriptionId, payload)

    const event: RealtimeSubscriptionEvent = {
      type: payload.event,
      payload: payload.payload,
      timestamp: payload.payload?.timestamp || new Date().toISOString()
    }

    this.triggerLocalHandlers(subscriptionId, event)
  }

  private triggerLocalHandlers(key: string, event: RealtimeSubscriptionEvent): void {
    const handlers = this.eventHandlers.get(key)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event)
        } catch (error) {
          console.error('❌ Error in subscription event handler:', error)
        }
      })
    }
  }

  private updateConnectionStatus(status: string): void {
    switch (status) {
      case 'SUBSCRIBED':
        this.connectionStatus = 'connected'
        this.reconnectAttempts = 0
        break
      case 'CLOSED':
      case 'CHANNEL_ERROR':
        this.connectionStatus = 'disconnected'
        this.attemptReconnect()
        break
    }
  }

  private attemptReconnect(): void {
    if (this.connectionStatus !== 'reconnecting' && this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => this.reconnectAll(), 2000)
    }
  }

  private async recreateSubscription(key: string): Promise<void> {
    // Remove existing subscription
    const existingSubscription = this.subscriptions.get(key)
    if (existingSubscription) {
      existingSubscription.unsubscribe()
      this.subscriptions.delete(key)
    }

    // Recreate based on key pattern
    if (key.startsWith('student-subscriptions:')) {
      const studentId = key.split(':')[1]
      this.createStudentSubscriptionChannel(studentId)
    } else if (key === 'freeze-operations') {
      this.createFreezeOperationsChannel()
    } else {
      // Regular subscription channel
      this.createSubscriptionChannel(key)
    }
  }

  private unsubscribeFromSubscription(subscriptionId: string, handler: SubscriptionEventHandler): void {
    const handlers = this.eventHandlers.get(subscriptionId)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.unsubscribeChannel(subscriptionId)
      }
    }
  }

  private unsubscribeFromStudent(studentId: string, handler: SubscriptionEventHandler): void {
    const channelName = `student-subscriptions:${studentId}`
    const handlers = this.eventHandlers.get(channelName)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.unsubscribeChannel(channelName)
      }
    }
  }

  private unsubscribeChannel(key: string): void {
    const subscription = this.subscriptions.get(key)
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(key)
    }
    this.eventHandlers.delete(key)
  }
}

// Export singleton instance
export const subscriptionRealtimeService = new SubscriptionRealtimeService()

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    subscriptionRealtimeService.cleanup()
  })
}