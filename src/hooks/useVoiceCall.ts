import { useState, useEffect, useRef } from 'react'
import { VoiceCallManager, voiceCommService } from '@/services/voice-communication-service'
import { communicationPushNotifications } from '@/services/communication-push-notifications'

// =====================================================
// VOICE CALL MANAGER HOOK
// =====================================================

interface CallState {
  isActive: boolean
  callId: string | null
  remoteUserId: string | null
  callStatus: 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended' | 'failed'
  duration: number
  isMuted: boolean
  connectionQuality: 'poor' | 'fair' | 'good' | 'excellent'
  error: string | null
}

export const useVoiceCallManager = () => {
  // Call state
  const [callState, setCallState] = useState<CallState>({
    isActive: false,
    callId: null,
    remoteUserId: null,
    callStatus: 'idle',
    duration: 0,
    isMuted: false,
    connectionQuality: 'good',
    error: null
  })

  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const callManagerRef = useRef<VoiceCallManager | null>(null)

  // Initialize voice call manager
  useEffect(() => {
    try {
      callManagerRef.current = new VoiceCallManager()
      
      // Set up callbacks
      callManagerRef.current.onCallStateChange = (status) => {
        setCallState(prev => ({ 
          ...prev, 
          callStatus: status as any,
          isActive: status === 'answered'
        }))
        
        if (status === 'answered') {
          // Start duration counter
          durationIntervalRef.current = setInterval(() => {
            setCallState(prev => ({ ...prev, duration: prev.duration + 1 }))
          }, 1000)
        } else if (status === 'ended') {
          setCallState({
            isActive: false,
            callId: null,
            remoteUserId: null,
            callStatus: 'idle',
            duration: 0,
            isMuted: false,
            connectionQuality: 'good',
            error: null
          })
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current)
          }
        }
      }

      callManagerRef.current.onConnectionQualityChange = (quality) => {
        setCallState(prev => ({ ...prev, connectionQuality: quality }))
      }

      callManagerRef.current.onError = (error) => {
        setCallState(prev => ({
          ...prev,
          callStatus: 'failed',
          error: error
        }))
      }

    } catch (error) {
      console.error('❌ Failed to initialize voice call manager:', error)
    }

    // Cleanup
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [])

  // Call actions
  const initiateCall = async (conversationId: string, calleeId: string) => {
    try {
      setCallState(prev => ({
        ...prev,
        callStatus: 'connecting',
        remoteUserId: calleeId
      }))

      if (callManagerRef.current) {
        const call = await callManagerRef.current.initiateCall(conversationId, calleeId, true)
        setCallState(prev => ({ ...prev, callId: call.id }))
      }

    } catch (error) {
      console.error('❌ Error initiating call:', error)
      setCallState(prev => ({
        ...prev,
        callStatus: 'failed',
        error: error instanceof Error ? error.message : 'Call failed to start'
      }))
    }
  }

  const endCall = async () => {
    try {
      if (callManagerRef.current) {
        await callManagerRef.current.endCall()
      }
    } catch (error) {
      console.error('❌ Error ending call:', error)
    }
  }

  const toggleMute = (muted?: boolean) => {
    try {
      const newMuteState = muted !== undefined ? muted : !callState.isMuted
      setCallState(prev => ({ ...prev, isMuted: newMuteState }))
      
      if (callManagerRef.current) {
        callManagerRef.current.muteAudio(newMuteState)
      }
    } catch (error) {
      console.error('❌ Error toggling mute:', error)
    }
  }

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return {
    // State
    isActive: callState.isActive,
    callStatus: callState.callStatus,
    duration: formatDuration(callState.duration),
    isMuted: callState.isMuted,
    connectionQuality: callState.connectionQuality,
    error: callState.error,

    // Actions
    initiateCall,
    endCall,
    toggleMute,

    // Computed properties
    canInitiate: callState.callStatus === 'idle',
    canEnd: ['connecting', 'ringing', 'connected'].includes(callState.callStatus),
    canMute: callState.callStatus === 'connected'
  }
}