/**
 * IEP Collaboration Hook
 * خطاف التعاون في البرنامج التعليمي الفردي
 * 
 * @description React hook for IEP real-time collaboration functionality
 * Story 1.3 - Task 2: Collaborative IEP development workflow
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { requireAuth } from '@/lib/auth-utils'
import { errorMonitoring } from '@/lib/error-monitoring'
import { 
  iepCollaborationService,
  type CollaborationPresence,
  type CollaborationEvent,
  type SectionLock,
  type ContentChange,
  type CollaborationComment,
  type IEPSectionType
} from '@/services/iep-collaboration-service'

// =============================================================================
// HOOK INTERFACE
// =============================================================================

export interface UseIEPCollaborationOptions {
  iepId: string
  userProfile?: {
    user_id: string
    name_ar: string
    name_en: string
    email: string
    role: string
    avatar?: string
  }
  autoJoin?: boolean
}

export interface UseIEPCollaborationReturn {
  // Connection State
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  
  // Collaboration State
  participants: CollaborationPresence[]
  currentUser: CollaborationPresence | null
  activeLocks: SectionLock[]
  recentEvents: CollaborationEvent[]
  
  // Actions
  joinCollaboration: () => Promise<boolean>
  leaveCollaboration: () => Promise<void>
  
  // Section Management
  startEditing: (section: IEPSectionType) => Promise<boolean>
  stopEditing: (section: IEPSectionType) => Promise<void>
  isSectionLocked: (section: IEPSectionType) => boolean
  isSectionLockedByMe: (section: IEPSectionType) => boolean
  getSectionLockInfo: (section: IEPSectionType) => SectionLock | null
  
  // Content Management
  broadcastContentChange: (
    section: IEPSectionType,
    fieldName: string,
    oldValue: string,
    newValue: string
  ) => Promise<void>
  
  // Comments
  addComment: (
    section: IEPSectionType,
    contentAr: string,
    contentEn: string,
    fieldName?: string
  ) => Promise<CollaborationComment | null>
  
  // Utilities
  getParticipantCount: () => number
  getEditingParticipants: () => CollaborationPresence[]
  isUserEditing: (userId: string) => boolean
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export const useIEPCollaboration = (
  options: UseIEPCollaborationOptions
): UseIEPCollaborationReturn => {
  const { iepId, userProfile, autoJoin = true } = options
  
  // Connection State
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  // Collaboration State
  const [participants, setParticipants] = useState<CollaborationPresence[]>([])
  const [currentUser, setCurrentUser] = useState<CollaborationPresence | null>(null)
  const [activeLocks, setActiveLocks] = useState<SectionLock[]>([])
  const [recentEvents, setRecentEvents] = useState<CollaborationEvent[]>([])
  
  // Refs for cleanup
  const unsubscribeRefs = useRef<(() => void)[]>([])
  const hasJoined = useRef(false)

  // =============================================================================
  // COLLABORATION ACTIONS
  // =============================================================================

  const joinCollaboration = useCallback(async (): Promise<boolean> => {
    if (hasJoined.current || isConnecting) return false
    
    try {
      setIsConnecting(true)
      setConnectionError(null)
      
      // Get authenticated user if not provided
      let profile = userProfile
      if (!profile) {
        const user = await requireAuth()
        // In a real implementation, you'd fetch the user profile
        profile = {
          user_id: user.id,
          name_ar: user.user_metadata?.name_ar || 'مستخدم',
          name_en: user.user_metadata?.name_en || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role: user.user_metadata?.role || 'therapist',
          avatar: user.user_metadata?.avatar
        }
      }

      // Join collaboration session
      const channel = await iepCollaborationService.joinCollaboration(iepId, profile)
      
      // Set up event listeners
      const eventUnsub = iepCollaborationService.onEvent(iepId, handleCollaborationEvent)
      const presenceUnsub = iepCollaborationService.onPresenceUpdate(iepId, handlePresenceUpdate)
      const lockUnsub = iepCollaborationService.onSectionLock(iepId, handleSectionLocks)
      const contentUnsub = iepCollaborationService.onContentChange(iepId, handleContentChange)
      
      // Store unsubscribe functions
      unsubscribeRefs.current = [eventUnsub, presenceUnsub, lockUnsub, contentUnsub]
      
      // Update state
      setIsConnected(true)
      setCurrentUser(iepCollaborationService.getCurrentUser())
      setActiveLocks(iepCollaborationService.getActiveLocks(iepId))
      hasJoined.current = true
      
      console.log('✅ Joined IEP collaboration for:', iepId)
      return true
      
    } catch (error) {
      console.error('❌ Failed to join IEP collaboration:', error)
      setConnectionError(error instanceof Error ? error.message : 'Connection failed')
      
      errorMonitoring.reportError(error as Error, {
        component: 'useIEPCollaboration',
        action: 'join_collaboration',
        metadata: { iep_id: iepId }
      })
      
      return false
    } finally {
      setIsConnecting(false)
    }
  }, [iepId, userProfile, isConnecting])

  const leaveCollaboration = useCallback(async (): Promise<void> => {
    if (!hasJoined.current) return
    
    try {
      // Cleanup subscriptions
      unsubscribeRefs.current.forEach(unsub => unsub())
      unsubscribeRefs.current = []
      
      // Leave collaboration session
      await iepCollaborationService.leaveCollaboration(iepId)
      
      // Reset state
      setIsConnected(false)
      setCurrentUser(null)
      setParticipants([])
      setActiveLocks([])
      setRecentEvents([])
      hasJoined.current = false
      
      console.log('✅ Left IEP collaboration for:', iepId)
      
    } catch (error) {
      console.error('❌ Error leaving IEP collaboration:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'useIEPCollaboration',
        action: 'leave_collaboration'
      })
    }
  }, [iepId])

  // =============================================================================
  // SECTION MANAGEMENT
  // =============================================================================

  const startEditing = useCallback(async (section: IEPSectionType): Promise<boolean> => {
    if (!isConnected) return false
    
    try {
      const success = await iepCollaborationService.startEditing(iepId, section)
      
      if (success) {
        // Update current user state
        setCurrentUser(iepCollaborationService.getCurrentUser())
        setActiveLocks(iepCollaborationService.getActiveLocks(iepId))
        console.log('✅ Started editing section:', section)
      } else {
        console.warn('⚠️ Could not start editing section (may be locked):', section)
      }
      
      return success
    } catch (error) {
      console.error('❌ Error starting edit:', error)
      return false
    }
  }, [iepId, isConnected])

  const stopEditing = useCallback(async (section: IEPSectionType): Promise<void> => {
    if (!isConnected) return
    
    try {
      await iepCollaborationService.stopEditing(iepId, section)
      
      // Update state
      setCurrentUser(iepCollaborationService.getCurrentUser())
      setActiveLocks(iepCollaborationService.getActiveLocks(iepId))
      
      console.log('✅ Stopped editing section:', section)
    } catch (error) {
      console.error('❌ Error stopping edit:', error)
    }
  }, [iepId, isConnected])

  const isSectionLocked = useCallback((section: IEPSectionType): boolean => {
    return activeLocks.some(lock => lock.section === section)
  }, [activeLocks])

  const isSectionLockedByMe = useCallback((section: IEPSectionType): boolean => {
    if (!currentUser) return false
    return activeLocks.some(lock => 
      lock.section === section && lock.locked_by === currentUser.user_id
    )
  }, [activeLocks, currentUser])

  const getSectionLockInfo = useCallback((section: IEPSectionType): SectionLock | null => {
    return activeLocks.find(lock => lock.section === section) || null
  }, [activeLocks])

  // =============================================================================
  // CONTENT MANAGEMENT
  // =============================================================================

  const broadcastContentChange = useCallback(async (
    section: IEPSectionType,
    fieldName: string,
    oldValue: string,
    newValue: string
  ): Promise<void> => {
    if (!isConnected) return
    
    try {
      await iepCollaborationService.broadcastContentChange(
        iepId, 
        section, 
        fieldName, 
        oldValue, 
        newValue
      )
      
      console.log('✅ Broadcasted content change:', { section, fieldName })
    } catch (error) {
      console.error('❌ Error broadcasting content change:', error)
    }
  }, [iepId, isConnected])

  const addComment = useCallback(async (
    section: IEPSectionType,
    contentAr: string,
    contentEn: string,
    fieldName?: string
  ): Promise<CollaborationComment | null> => {
    if (!isConnected) return null
    
    try {
      const comment = await iepCollaborationService.addComment(
        iepId,
        section,
        contentAr,
        contentEn,
        fieldName
      )
      
      if (comment) {
        console.log('✅ Added collaboration comment:', comment.id)
      }
      
      return comment
    } catch (error) {
      console.error('❌ Error adding comment:', error)
      return null
    }
  }, [iepId, isConnected])

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const getParticipantCount = useCallback((): number => {
    return participants.length
  }, [participants])

  const getEditingParticipants = useCallback((): CollaborationPresence[] => {
    return participants.filter(p => p.status === 'editing')
  }, [participants])

  const isUserEditing = useCallback((userId: string): boolean => {
    return participants.some(p => p.user_id === userId && p.status === 'editing')
  }, [participants])

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  const handleCollaborationEvent = useCallback((event: CollaborationEvent) => {
    setRecentEvents(prev => {
      const updated = [event, ...prev].slice(0, 50) // Keep last 50 events
      return updated
    })
    
    console.log('🔄 Collaboration event:', event.event_type, event)
  }, [])

  const handlePresenceUpdate = useCallback((presenceState: Record<string, CollaborationPresence[]>) => {
    const allParticipants = Object.values(presenceState).flat()
    setParticipants(allParticipants)
    
    console.log('👥 Presence updated:', allParticipants.length, 'participants')
  }, [])

  const handleSectionLocks = useCallback((locks: SectionLock[]) => {
    setActiveLocks(locks)
    console.log('🔒 Section locks updated:', locks.length, 'active locks')
  }, [])

  const handleContentChange = useCallback((change: ContentChange) => {
    console.log('📝 Content change:', change.section, change.field_name)
    // Additional handling could be added here
  }, [])

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Auto-join effect
  useEffect(() => {
    if (autoJoin && !hasJoined.current && !isConnecting) {
      joinCollaboration()
    }
  }, [autoJoin, joinCollaboration, isConnecting])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (hasJoined.current) {
        leaveCollaboration()
      }
    }
  }, [leaveCollaboration])

  // Connection status monitoring
  useEffect(() => {
    const statusCheck = setInterval(() => {
      const serviceStatus = iepCollaborationService.getConnectionStatus()
      setIsConnected(serviceStatus === 'connected')
    }, 5000)

    return () => clearInterval(statusCheck)
  }, [])

  // =============================================================================
  // RETURN OBJECT
  // =============================================================================

  return {
    // Connection State
    isConnected,
    isConnecting,
    connectionError,
    
    // Collaboration State
    participants,
    currentUser,
    activeLocks,
    recentEvents,
    
    // Actions
    joinCollaboration,
    leaveCollaboration,
    
    // Section Management
    startEditing,
    stopEditing,
    isSectionLocked,
    isSectionLockedByMe,
    getSectionLockInfo,
    
    // Content Management
    broadcastContentChange,
    
    // Comments
    addComment,
    
    // Utilities
    getParticipantCount,
    getEditingParticipants,
    isUserEditing
  }
}