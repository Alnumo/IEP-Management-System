/**
 * IEP Collaboration Real-time Service
 * خدمة التعاون في الوقت الفعلي للبرنامج التعليمي الفردي
 * 
 * @description Real-time collaboration service for IEP development with:
 * - Live presence tracking
 * - Simultaneous editing with conflict resolution
 * - Real-time notifications and activity feeds
 * - Section-based locking and permissions
 * - Version control integration
 * 
 * Story 1.3 - Task 2: Collaborative IEP development workflow
 */

import { supabase } from '@/lib/supabase'
import { errorMonitoring } from '@/lib/error-monitoring'
import type { 
  RealtimeChannel, 
  RealtimePresenceState,
  RealtimePresenceJoinPayload,
  RealtimePresenceLeavePayload
} from '@supabase/supabase-js'

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type CollaborationEventType = 
  | 'user_joined'
  | 'user_left'
  | 'editing_started'
  | 'editing_stopped'
  | 'content_changed'
  | 'section_locked'
  | 'section_unlocked'
  | 'comment_added'
  | 'version_saved'
  | 'conflict_detected'
  | 'approval_requested'
  | 'approval_given'

export type IEPSectionType =
  | 'basic_info'
  | 'present_levels'
  | 'goals_academic'
  | 'goals_functional'
  | 'goals_behavioral'
  | 'accommodations'
  | 'services'
  | 'lre_justification'
  | 'transition_planning'

export interface CollaborationPresence {
  user_id: string
  name_ar: string
  name_en: string
  email: string
  avatar?: string
  role: string
  status: 'online' | 'away' | 'editing'
  current_section?: IEPSectionType
  cursor_position?: number
  last_activity: string
  color: string // For user identification in UI
}

export interface CollaborationEvent {
  id: string
  event_type: CollaborationEventType
  iep_id: string
  section?: IEPSectionType
  user_id: string
  user_name_ar: string
  user_name_en: string
  data?: any
  timestamp: string
}

export interface SectionLock {
  iep_id: string
  section: IEPSectionType
  locked_by: string
  locked_by_name_ar: string
  locked_by_name_en: string
  locked_at: string
  expires_at?: string
}

export interface ContentChange {
  iep_id: string
  section: IEPSectionType
  field_name: string
  old_value: string
  new_value: string
  changed_by: string
  changed_at: string
  change_id: string
}

export interface CollaborationComment {
  id: string
  iep_id: string
  section: IEPSectionType
  field_name?: string
  content_ar: string
  content_en: string
  author_id: string
  author_name_ar: string
  author_name_en: string
  created_at: string
  resolved: boolean
  resolved_by?: string
  resolved_at?: string
}

// Event handler types
export type PresenceUpdateHandler = (presence: Record<string, CollaborationPresence[]>) => void
export type CollaborationEventHandler = (event: CollaborationEvent) => void
export type SectionLockHandler = (locks: SectionLock[]) => void
export type ContentChangeHandler = (change: ContentChange) => void
export type CommentUpdateHandler = (comments: CollaborationComment[]) => void

// =============================================================================
// IEP COLLABORATION SERVICE
// =============================================================================

export class IEPCollaborationService {
  private channels = new Map<string, RealtimeChannel>()
  private eventHandlers = new Map<string, Set<CollaborationEventHandler>>()
  private presenceHandlers = new Map<string, Set<PresenceUpdateHandler>>()
  private lockHandlers = new Map<string, Set<SectionLockHandler>>()
  private contentChangeHandlers = new Map<string, Set<ContentChangeHandler>>()
  private commentHandlers = new Map<string, Set<CommentUpdateHandler>>()
  
  private connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected'
  private currentUser: CollaborationPresence | null = null
  private activeLocks = new Map<string, SectionLock[]>()
  
  // User color assignment for visual identification
  private readonly userColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red  
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1'  // Indigo
  ]

  /**
   * Join IEP collaboration session
   */
  async joinCollaboration(
    iepId: string,
    userProfile: {
      user_id: string
      name_ar: string
      name_en: string
      email: string
      role: string
      avatar?: string
    }
  ): Promise<RealtimeChannel> {
    try {
      const channelName = `iep-collaboration:${iepId}`
      
      // Create or get existing channel
      let channel = this.channels.get(channelName)
      
      if (!channel) {
        channel = supabase.channel(channelName, {
          config: {
            presence: {
              key: userProfile.user_id
            }
          }
        })
        
        this.channels.set(channelName, channel)
        this.setupChannelHandlers(channel, iepId)
      }

      // Set current user presence
      this.currentUser = {
        ...userProfile,
        status: 'online',
        last_activity: new Date().toISOString(),
        color: this.assignUserColor(userProfile.user_id)
      }

      // Track presence
      await channel.track(this.currentUser)
      
      // Subscribe to channel
      const subscribeStatus = await channel.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          this.connectionStatus = 'connected'
          console.log('✅ IEP Collaboration: Connected to', channelName)
          
          // Send join event
          await this.broadcastEvent(iepId, {
            event_type: 'user_joined',
            user_id: userProfile.user_id,
            user_name_ar: userProfile.name_ar,
            user_name_en: userProfile.name_en,
            data: { role: userProfile.role }
          })
        } else if (err) {
          this.connectionStatus = 'disconnected'
          console.error('❌ IEP Collaboration: Connection error:', err)
          errorMonitoring.reportError(err, {
            component: 'IEPCollaborationService',
            action: 'join_collaboration',
            metadata: { iep_id: iepId }
          })
        }
      })

      return channel
      
    } catch (error) {
      console.error('❌ Error joining IEP collaboration:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'IEPCollaborationService',
        action: 'join_collaboration',
        metadata: { iep_id: iepId }
      })
      throw error
    }
  }

  /**
   * Leave IEP collaboration session
   */
  async leaveCollaboration(iepId: string): Promise<void> {
    try {
      const channelName = `iep-collaboration:${iepId}`
      const channel = this.channels.get(channelName)
      
      if (channel && this.currentUser) {
        // Send leave event
        await this.broadcastEvent(iepId, {
          event_type: 'user_left',
          user_id: this.currentUser.user_id,
          user_name_ar: this.currentUser.name_ar,
          user_name_en: this.currentUser.name_en
        })

        // Unsubscribe and cleanup
        await channel.unsubscribe()
        this.channels.delete(channelName)
        this.currentUser = null
        this.connectionStatus = 'disconnected'
        
        console.log('✅ IEP Collaboration: Left', channelName)
      }
    } catch (error) {
      console.error('❌ Error leaving IEP collaboration:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'IEPCollaborationService',
        action: 'leave_collaboration'
      })
    }
  }

  /**
   * Start editing a specific section
   */
  async startEditing(iepId: string, section: IEPSectionType): Promise<boolean> {
    if (!this.currentUser) return false

    try {
      // Check if section is locked by someone else
      const locks = this.activeLocks.get(iepId) || []
      const existingLock = locks.find(lock => 
        lock.section === section && lock.locked_by !== this.currentUser!.user_id
      )
      
      if (existingLock) {
        console.warn('⚠️ Section already locked by:', existingLock.locked_by_name_en)
        return false
      }

      // Create lock
      const lockData: SectionLock = {
        iep_id: iepId,
        section: section,
        locked_by: this.currentUser.user_id,
        locked_by_name_ar: this.currentUser.name_ar,
        locked_by_name_en: this.currentUser.name_en,
        locked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min expiry
      }

      // Update presence
      this.currentUser.status = 'editing'
      this.currentUser.current_section = section
      this.currentUser.last_activity = new Date().toISOString()

      // Broadcast events
      await Promise.all([
        this.trackPresence(iepId),
        this.broadcastEvent(iepId, {
          event_type: 'editing_started',
          section: section,
          user_id: this.currentUser.user_id,
          user_name_ar: this.currentUser.name_ar,
          user_name_en: this.currentUser.name_en,
          data: { lock_expires_at: lockData.expires_at }
        }),
        this.broadcastSectionLock(iepId, lockData)
      ])

      return true
      
    } catch (error) {
      console.error('❌ Error starting edit:', error)
      return false
    }
  }

  /**
   * Stop editing a section
   */
  async stopEditing(iepId: string, section: IEPSectionType): Promise<void> {
    if (!this.currentUser) return

    try {
      // Update presence
      this.currentUser.status = 'online'
      this.currentUser.current_section = undefined
      this.currentUser.last_activity = new Date().toISOString()

      // Remove lock
      const locks = this.activeLocks.get(iepId) || []
      const updatedLocks = locks.filter(lock => 
        !(lock.section === section && lock.locked_by === this.currentUser!.user_id)
      )
      this.activeLocks.set(iepId, updatedLocks)

      // Broadcast events
      await Promise.all([
        this.trackPresence(iepId),
        this.broadcastEvent(iepId, {
          event_type: 'editing_stopped',
          section: section,
          user_id: this.currentUser.user_id,
          user_name_ar: this.currentUser.name_ar,
          user_name_en: this.currentUser.name_en
        })
      ])

      // Notify lock handlers
      this.lockHandlers.get(iepId)?.forEach(handler => handler(updatedLocks))
      
    } catch (error) {
      console.error('❌ Error stopping edit:', error)
    }
  }

  /**
   * Broadcast content change
   */
  async broadcastContentChange(
    iepId: string,
    section: IEPSectionType,
    fieldName: string,
    oldValue: string,
    newValue: string
  ): Promise<void> {
    if (!this.currentUser) return

    try {
      const changeData: ContentChange = {
        iep_id: iepId,
        section: section,
        field_name: fieldName,
        old_value: oldValue,
        new_value: newValue,
        changed_by: this.currentUser.user_id,
        changed_at: new Date().toISOString(),
        change_id: `${iepId}-${section}-${fieldName}-${Date.now()}`
      }

      await this.broadcastEvent(iepId, {
        event_type: 'content_changed',
        section: section,
        user_id: this.currentUser.user_id,
        user_name_ar: this.currentUser.name_ar,
        user_name_en: this.currentUser.name_en,
        data: changeData
      })

      // Notify content change handlers
      this.contentChangeHandlers.get(iepId)?.forEach(handler => handler(changeData))
      
    } catch (error) {
      console.error('❌ Error broadcasting content change:', error)
    }
  }

  /**
   * Add collaboration comment
   */
  async addComment(
    iepId: string,
    section: IEPSectionType,
    contentAr: string,
    contentEn: string,
    fieldName?: string
  ): Promise<CollaborationComment | null> {
    if (!this.currentUser) return null

    try {
      const commentData: Omit<CollaborationComment, 'id'> = {
        iep_id: iepId,
        section: section,
        field_name: fieldName,
        content_ar: contentAr,
        content_en: contentEn,
        author_id: this.currentUser.user_id,
        author_name_ar: this.currentUser.name_ar,
        author_name_en: this.currentUser.name_en,
        created_at: new Date().toISOString(),
        resolved: false
      }

      // Save to database
      const { data, error } = await supabase
        .from('iep_collaboration_comments')
        .insert([commentData])
        .select()
        .single()

      if (error) throw error

      const comment = data as CollaborationComment

      // Broadcast event
      await this.broadcastEvent(iepId, {
        event_type: 'comment_added',
        section: section,
        user_id: this.currentUser.user_id,
        user_name_ar: this.currentUser.name_ar,
        user_name_en: this.currentUser.name_en,
        data: { comment_id: comment.id, field_name: fieldName }
      })

      return comment
      
    } catch (error) {
      console.error('❌ Error adding comment:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'IEPCollaborationService',
        action: 'add_comment'
      })
      return null
    }
  }

  /**
   * Subscribe to collaboration events
   */
  onEvent(iepId: string, handler: CollaborationEventHandler): () => void {
    if (!this.eventHandlers.has(iepId)) {
      this.eventHandlers.set(iepId, new Set())
    }
    
    this.eventHandlers.get(iepId)!.add(handler)
    
    return () => {
      this.eventHandlers.get(iepId)?.delete(handler)
    }
  }

  /**
   * Subscribe to presence updates
   */
  onPresenceUpdate(iepId: string, handler: PresenceUpdateHandler): () => void {
    if (!this.presenceHandlers.has(iepId)) {
      this.presenceHandlers.set(iepId, new Set())
    }
    
    this.presenceHandlers.get(iepId)!.add(handler)
    
    return () => {
      this.presenceHandlers.get(iepId)?.delete(handler)
    }
  }

  /**
   * Subscribe to section lock updates
   */
  onSectionLock(iepId: string, handler: SectionLockHandler): () => void {
    if (!this.lockHandlers.has(iepId)) {
      this.lockHandlers.set(iepId, new Set())
    }
    
    this.lockHandlers.get(iepId)!.add(handler)
    
    return () => {
      this.lockHandlers.get(iepId)?.delete(handler)
    }
  }

  /**
   * Subscribe to content changes
   */
  onContentChange(iepId: string, handler: ContentChangeHandler): () => void {
    if (!this.contentChangeHandlers.has(iepId)) {
      this.contentChangeHandlers.set(iepId, new Set())
    }
    
    this.contentChangeHandlers.get(iepId)!.add(handler)
    
    return () => {
      this.contentChangeHandlers.get(iepId)?.delete(handler)
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private setupChannelHandlers(channel: RealtimeChannel, iepId: string): void {
    // Handle presence changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        this.presenceHandlers.get(iepId)?.forEach(handler => handler(presenceState))
      })
      .on('presence', { event: 'join' }, ({ newPresences }: { newPresences: RealtimePresenceJoinPayload }) => {
        console.log('👥 User joined IEP collaboration:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: RealtimePresenceLeavePayload }) => {
        console.log('👋 User left IEP collaboration:', leftPresences)
      })

    // Handle broadcast events
    channel
      .on('broadcast', { event: 'collaboration_event' }, ({ payload }: { payload: CollaborationEvent }) => {
        this.eventHandlers.get(iepId)?.forEach(handler => handler(payload))
      })
      .on('broadcast', { event: 'section_lock' }, ({ payload }: { payload: SectionLock }) => {
        const locks = this.activeLocks.get(iepId) || []
        const updatedLocks = [...locks.filter(l => 
          !(l.section === payload.section && l.locked_by === payload.locked_by)
        ), payload]
        this.activeLocks.set(iepId, updatedLocks)
        this.lockHandlers.get(iepId)?.forEach(handler => handler(updatedLocks))
      })
  }

  private async trackPresence(iepId: string): Promise<void> {
    if (!this.currentUser) return
    
    const channelName = `iep-collaboration:${iepId}`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      await channel.track(this.currentUser)
    }
  }

  private async broadcastEvent(iepId: string, eventData: Omit<CollaborationEvent, 'id' | 'timestamp'>): Promise<void> {
    const channelName = `iep-collaboration:${iepId}`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      const event: CollaborationEvent = {
        ...eventData,
        id: `${iepId}-${eventData.event_type}-${Date.now()}`,
        iep_id: iepId,
        timestamp: new Date().toISOString()
      }
      
      await channel.send({
        type: 'broadcast',
        event: 'collaboration_event',
        payload: event
      })
    }
  }

  private async broadcastSectionLock(iepId: string, lockData: SectionLock): Promise<void> {
    const channelName = `iep-collaboration:${iepId}`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'section_lock',
        payload: lockData
      })
    }
  }

  private assignUserColor(userId: string): string {
    // Simple hash function to assign consistent colors
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i)
      hash = hash & hash // Convert to 32-bit integer
    }
    return this.userColors[Math.abs(hash) % this.userColors.length]
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): 'connected' | 'disconnected' | 'reconnecting' {
    return this.connectionStatus
  }

  /**
   * Get current user presence
   */
  getCurrentUser(): CollaborationPresence | null {
    return this.currentUser
  }

  /**
   * Get active section locks for IEP
   */
  getActiveLocks(iepId: string): SectionLock[] {
    return this.activeLocks.get(iepId) || []
  }
}

// =============================================================================
// SERVICE INSTANCE
// =============================================================================

export const iepCollaborationService = new IEPCollaborationService()