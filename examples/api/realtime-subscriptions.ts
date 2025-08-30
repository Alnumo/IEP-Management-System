/**
 * Real-time Subscriptions Examples
 * 
 * Why: Demonstrates real-time data patterns for therapy applications:
 * - Live therapy session updates
 * - Real-time messaging between therapists and parents
 * - Session status changes and notifications
 * - Progress updates during sessions
 * - Arabic/RTL support for real-time content
 * - Connection management and reconnection logic
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import { Language } from '../types/therapy-types'

// Real-time event types
export type RealtimeEventType = 
  | 'session_started'
  | 'session_ended'
  | 'session_updated'
  | 'progress_updated'
  | 'message_received'
  | 'therapist_joined'
  | 'therapist_left'
  | 'goal_completed'
  | 'attendance_marked'
  | 'file_uploaded'

// Real-time payload interface
export interface RealtimePayload<T = any> {
  eventType: RealtimeEventType
  data: T
  timestamp: Date
  userId?: string
  sessionId?: string
  metadata?: {
    language: Language
    source: 'therapist' | 'parent' | 'system'
    priority: 'low' | 'medium' | 'high'
  }
}

// Session update payload
export interface SessionUpdatePayload {
  id: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  title: string
  title_ar: string
  notes?: string
  notes_ar?: string
  progress?: number
  currentActivity?: string
  currentActivity_ar?: string
  therapistId: string
  studentId: string
  startTime?: Date
  endTime?: Date
}

// Progress update payload
export interface ProgressUpdatePayload {
  sessionId: string
  goalId: string
  goalTitle: string
  goalTitle_ar: string
  previousValue: number
  currentValue: number
  improvement: number
  notes?: string
  notes_ar?: string
  timestamp: Date
}

// Message payload
export interface MessagePayload {
  id: string
  content: string
  content_ar?: string
  senderId: string
  senderName: string
  senderName_ar: string
  senderType: 'therapist' | 'parent'
  sessionId?: string
  timestamp: Date
  attachments?: {
    id: string
    name: string
    url: string
    type: string
    size: number
  }[]
}

// Goal completion payload
export interface GoalCompletionPayload {
  goalId: string
  goalTitle: string
  goalTitle_ar: string
  sessionId: string
  studentId: string
  completedBy: string
  completedAt: Date
  notes?: string
  notes_ar?: string
  evidence?: {
    type: 'video' | 'audio' | 'image' | 'document'
    url: string
    description?: string
    description_ar?: string
  }[]
}

// Subscription manager class
export class TherapyRealtimeManager {
  private supabase: SupabaseClient
  private channels: Map<string, RealtimeChannel> = new Map()
  private eventHandlers: Map<string, Function[]> = new Map()
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 1000

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.setupConnectionHandlers()
  }

  // Setup connection event handlers
  private setupConnectionHandlers(): void {
    this.supabase.realtime.onOpen(() => {
      console.log('Realtime connection opened')
      this.reconnectAttempts = 0
      this.notifyConnectionStatus('connected')
    })

    this.supabase.realtime.onClose(() => {
      console.log('Realtime connection closed')
      this.notifyConnectionStatus('disconnected')
      this.attemptReconnect()
    })

    this.supabase.realtime.onError((error) => {
      console.error('Realtime connection error:', error)
      this.notifyConnectionStatus('error', error)
    })
  }

  // Attempt to reconnect with exponential backoff
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.notifyConnectionStatus('failed')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`)
    
    setTimeout(() => {
      this.supabase.realtime.connect()
    }, delay)
  }

  // Notify connection status changes
  private notifyConnectionStatus(status: string, error?: any): void {
    const handlers = this.eventHandlers.get('connection_status') || []
    handlers.forEach(handler => handler({ status, error, timestamp: new Date() }))
  }

  // Subscribe to therapy session updates
  subscribeToSession(sessionId: string, callbacks: {
    onSessionUpdate?: (payload: RealtimePayload<SessionUpdatePayload>) => void
    onProgressUpdate?: (payload: RealtimePayload<ProgressUpdatePayload>) => void
    onGoalCompleted?: (payload: RealtimePayload<GoalCompletionPayload>) => void
    onTherapistJoined?: (payload: RealtimePayload<{ therapistId: string; name: string; name_ar: string }>) => void
    onTherapistLeft?: (payload: RealtimePayload<{ therapistId: string; name: string; name_ar: string }>) => void
  }): () => void {
    const channelName = `session:${sessionId}`
    
    const channel = this.supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'therapy_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        const realtimePayload: RealtimePayload<SessionUpdatePayload> = {
          eventType: 'session_updated',
          data: payload.new as SessionUpdatePayload,
          timestamp: new Date(),
          sessionId,
          metadata: {
            language: 'ar', // Default to Arabic
            source: 'system',
            priority: 'medium'
          }
        }
        callbacks.onSessionUpdate?.(realtimePayload)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_progress',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        const realtimePayload: RealtimePayload<ProgressUpdatePayload> = {
          eventType: 'progress_updated',
          data: payload.new as ProgressUpdatePayload,
          timestamp: new Date(),
          sessionId,
          metadata: {
            language: 'ar',
            source: 'therapist',
            priority: 'high'
          }
        }
        callbacks.onProgressUpdate?.(realtimePayload)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'therapy_goals',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        if (payload.new.status === 'completed') {
          const realtimePayload: RealtimePayload<GoalCompletionPayload> = {
            eventType: 'goal_completed',
            data: payload.new as GoalCompletionPayload,
            timestamp: new Date(),
            sessionId,
            metadata: {
              language: 'ar',
              source: 'therapist',
              priority: 'high'
            }
          }
          callbacks.onGoalCompleted?.(realtimePayload)
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        Object.entries(presenceState).forEach(([userId, presence]) => {
          const user = presence[0] as any
          if (user.role === 'therapist') {
            callbacks.onTherapistJoined?.({
              eventType: 'therapist_joined',
              data: { therapistId: userId, name: user.name, name_ar: user.name_ar },
              timestamp: new Date(),
              sessionId,
              metadata: { language: 'ar', source: 'system', priority: 'medium' }
            })
          }
        })
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          if (presence.role === 'therapist') {
            callbacks.onTherapistLeft?.({
              eventType: 'therapist_left',
              data: { 
                therapistId: presence.user_id, 
                name: presence.name, 
                name_ar: presence.name_ar 
              },
              timestamp: new Date(),
              sessionId,
              metadata: { language: 'ar', source: 'system', priority: 'medium' }
            })
          }
        })
      })
      .subscribe()

    this.channels.set(channelName, channel)

    // Return unsubscribe function
    return () => {
      this.unsubscribeFromSession(sessionId)
    }
  }

  // Subscribe to messages for a session
  subscribeToMessages(sessionId: string, callback: (payload: RealtimePayload<MessagePayload>) => void): () => void {
    const channelName = `messages:${sessionId}`
    
    const channel = this.supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        const realtimePayload: RealtimePayload<MessagePayload> = {
          eventType: 'message_received',
          data: payload.new as MessagePayload,
          timestamp: new Date(),
          sessionId,
          metadata: {
            language: payload.new.content_ar ? 'ar' : 'en',
            source: payload.new.senderType,
            priority: 'medium'
          }
        }
        callback(realtimePayload)
      })
      .subscribe()

    this.channels.set(channelName, channel)

    return () => {
      this.unsubscribeFromMessages(sessionId)
    }
  }

  // Subscribe to global therapy updates (for dashboard)
  subscribeToGlobalUpdates(userId: string, callbacks: {
    onSessionStarted?: (payload: RealtimePayload<SessionUpdatePayload>) => void
    onSessionEnded?: (payload: RealtimePayload<SessionUpdatePayload>) => void
    onNewMessage?: (payload: RealtimePayload<MessagePayload>) => void
    onAttendanceMarked?: (payload: RealtimePayload<{ sessionId: string; studentId: string; status: string }>) => void
  }): () => void {
    const channelName = `global:${userId}`
    
    const channel = this.supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'therapy_sessions',
        filter: `therapist_id=eq.${userId}`
      }, (payload) => {
        const session = payload.new as SessionUpdatePayload
        
        if (payload.old.status !== 'in_progress' && session.status === 'in_progress') {
          callbacks.onSessionStarted?.({
            eventType: 'session_started',
            data: session,
            timestamp: new Date(),
            sessionId: session.id,
            metadata: { language: 'ar', source: 'system', priority: 'high' }
          })
        }
        
        if (payload.old.status === 'in_progress' && session.status === 'completed') {
          callbacks.onSessionEnded?.({
            eventType: 'session_ended',
            data: session,
            timestamp: new Date(),
            sessionId: session.id,
            metadata: { language: 'ar', source: 'system', priority: 'high' }
          })
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_messages'
      }, (payload) => {
        const message = payload.new as MessagePayload
        callbacks.onNewMessage?.({
          eventType: 'message_received',
          data: message,
          timestamp: new Date(),
          sessionId: message.sessionId,
          metadata: {
            language: message.content_ar ? 'ar' : 'en',
            source: message.senderType,
            priority: 'medium'
          }
        })
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_attendance'
      }, (payload) => {
        const attendance = payload.new as any
        callbacks.onAttendanceMarked?.({
          eventType: 'attendance_marked',
          data: {
            sessionId: attendance.session_id,
            studentId: attendance.student_id,
            status: attendance.status
          },
          timestamp: new Date(),
          sessionId: attendance.session_id,
          metadata: { language: 'ar', source: 'system', priority: 'low' }
        })
      })
      .subscribe()

    this.channels.set(channelName, channel)

    return () => {
      this.unsubscribeFromGlobalUpdates(userId)
    }
  }

  // Send real-time message
  async sendMessage(sessionId: string, message: Omit<MessagePayload, 'id' | 'timestamp'>): Promise<void> {
    const { error } = await this.supabase
      .from('session_messages')
      .insert({
        ...message,
        session_id: sessionId,
        timestamp: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Failed to send message: ${error.message}`)
    }
  }

  // Update session progress in real-time
  async updateSessionProgress(sessionId: string, progress: Partial<SessionUpdatePayload>): Promise<void> {
    const { error } = await this.supabase
      .from('therapy_sessions')
      .update({
        ...progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to update session progress: ${error.message}`)
    }
  }

  // Mark goal as completed
  async completeGoal(goalId: string, completion: Omit<GoalCompletionPayload, 'goalId' | 'completedAt'>): Promise<void> {
    const { error } = await this.supabase
      .from('therapy_goals')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: completion.completedBy,
        completion_notes: completion.notes,
        completion_notes_ar: completion.notes_ar,
        evidence: completion.evidence
      })
      .eq('id', goalId)

    if (error) {
      throw new Error(`Failed to complete goal: ${error.message}`)
    }
  }

  // Join session as therapist (presence)
  async joinSession(sessionId: string, therapist: { id: string; name: string; name_ar: string }): Promise<void> {
    const channel = this.channels.get(`session:${sessionId}`)
    if (channel) {
      await channel.track({
        user_id: therapist.id,
        name: therapist.name,
        name_ar: therapist.name_ar,
        role: 'therapist',
        joined_at: new Date().toISOString()
      })
    }
  }

  // Leave session
  async leaveSession(sessionId: string): Promise<void> {
    const channel = this.channels.get(`session:${sessionId}`)
    if (channel) {
      await channel.untrack()
    }
  }

  // Event handler registration
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  // Remove event handler
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // Unsubscribe from session
  unsubscribeFromSession(sessionId: string): void {
    const channelName = `session:${sessionId}`
    const channel = this.channels.get(channelName)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  // Unsubscribe from messages
  unsubscribeFromMessages(sessionId: string): void {
    const channelName = `messages:${sessionId}`
    const channel = this.channels.get(channelName)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  // Unsubscribe from global updates
  unsubscribeFromGlobalUpdates(userId: string): void {
    const channelName = `global:${userId}`
    const channel = this.channels.get(channelName)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  // Cleanup all subscriptions
  cleanup(): void {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel)
    })
    this.channels.clear()
    this.eventHandlers.clear()
  }

  // Get connection status
  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    return this.supabase.realtime.isConnected() ? 'connected' : 'disconnected'
  }
}

// React hook for real-time subscriptions
export const useRealtimeSession = (sessionId: string) => {
  const [sessionData, setSessionData] = useState<SessionUpdatePayload | null>(null)
  const [progress, setProgress] = useState<ProgressUpdatePayload[]>([])
  const [messages, setMessages] = useState<MessagePayload[]>([])
  const [therapistPresence, setTherapistPresence] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')

  useEffect(() => {
    const realtimeManager = new TherapyRealtimeManager(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    )

    // Connection status handler
    realtimeManager.on('connection_status', ({ status }) => {
      setConnectionStatus(status)
    })

    // Session subscription
    const unsubscribeSession = realtimeManager.subscribeToSession(sessionId, {
      onSessionUpdate: (payload) => {
        setSessionData(payload.data)
      },
      onProgressUpdate: (payload) => {
        setProgress(prev => [...prev, payload.data])
      },
      onTherapistJoined: (payload) => {
        setTherapistPresence(prev => [...prev, payload.data.therapistId])
      },
      onTherapistLeft: (payload) => {
        setTherapistPresence(prev => prev.filter(id => id !== payload.data.therapistId))
      }
    })

    // Messages subscription
    const unsubscribeMessages = realtimeManager.subscribeToMessages(sessionId, (payload) => {
      setMessages(prev => [...prev, payload.data])
    })

    return () => {
      unsubscribeSession()
      unsubscribeMessages()
      realtimeManager.cleanup()
    }
  }, [sessionId])

  return {
    sessionData,
    progress,
    messages,
    therapistPresence,
    connectionStatus
  }
}

// Usage examples:
/*
// Initialize realtime manager
const realtimeManager = new TherapyRealtimeManager(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

// Subscribe to session updates
const unsubscribe = realtimeManager.subscribeToSession('session-123', {
  onSessionUpdate: (payload) => {
    console.log('Session updated:', payload.data)
    // Update UI with new session data
  },
  onProgressUpdate: (payload) => {
    console.log('Progress updated:', payload.data)
    // Show progress notification in Arabic
    showNotification({
      title: 'تحديث التقدم',
      message: `تم تحديث الهدف: ${payload.data.goalTitle_ar}`,
      type: 'success'
    })
  },
  onGoalCompleted: (payload) => {
    console.log('Goal completed:', payload.data)
    // Celebrate goal completion
    showCelebration(payload.data.goalTitle_ar)
  }
})

// Send a message during session
await realtimeManager.sendMessage('session-123', {
  content: 'Great progress today!',
  content_ar: 'تقدم رائع اليوم!',
  senderId: 'therapist-456',
  senderName: 'Dr. Sarah',
  senderName_ar: 'د. سارة',
  senderType: 'therapist'
})

// Update session progress
await realtimeManager.updateSessionProgress('session-123', {
  progress: 75,
  currentActivity: 'Speech exercises',
  currentActivity_ar: 'تمارين النطق',
  notes: 'Student showing improvement',
  notes_ar: 'الطالب يظهر تحسناً'
})

// Join session as therapist
await realtimeManager.joinSession('session-123', {
  id: 'therapist-456',
  name: 'Dr. Sarah',
  name_ar: 'د. سارة'
})

// React component usage
function SessionPage({ sessionId }: { sessionId: string }) {
  const { sessionData, progress, messages, connectionStatus } = useRealtimeSession(sessionId)
  
  return (
    <div className="session-container">
      <div className="connection-status">
        {connectionStatus === 'connected' ? '🟢 متصل' : '🔴 غير متصل'}
      </div>
      
      {sessionData && (
        <div className="session-info">
          <h2>{sessionData.title_ar}</h2>
          <p>التقدم: {sessionData.progress}%</p>
        </div>
      )}
      
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className="message">
            <strong>{message.senderName_ar}:</strong>
            <p>{message.content_ar || message.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Cleanup when component unmounts
useEffect(() => {
  return () => {
    realtimeManager.cleanup()
  }
}, [])
*/
