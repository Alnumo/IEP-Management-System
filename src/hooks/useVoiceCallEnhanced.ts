/**
 * Enhanced Voice Call Hook - Integrated with Session Scheduling
 * Healthcare-grade voice call management with therapy session integration
 * Arkan Al-Numo Center - Enhanced Voice Communication
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { VoiceCallManager, voiceCommService } from '@/services/voice-communication-service'
import { communicationPushNotifications } from '@/services/communication-push-notifications'
import { errorMonitoring } from '@/lib/error-monitoring'
import type { 
  VoiceCall, 
  CallStatus, 
  ConnectionQuality,
  CreateVoiceCallData 
} from '@/types/communication'

interface EnhancedCallState {
  isActive: boolean
  callId: string | null
  remoteUserId: string | null
  callStatus: CallStatus
  duration: number
  isMuted: boolean
  isScreenSharing: boolean
  isRecording: boolean
  connectionQuality: ConnectionQuality
  error: string | null
  sessionId: string | null
  isTherapyCall: boolean
  isEmergencyCall: boolean
  callNotes: string
  recordingPath: string | null
  participants: string[]
}

interface UseVoiceCallEnhancedOptions {
  autoRecord?: boolean
  enableScreenShare?: boolean
  sessionId?: string
  isTherapySession?: boolean
  emergencyEscalation?: boolean
  qualityMonitoring?: boolean
  onCallStart?: (callId: string) => void
  onCallEnd?: (callId: string, duration: number) => void
  onQualityIssue?: (quality: ConnectionQuality) => void
  onError?: (error: string) => void
}

export const useVoiceCallEnhanced = (options: UseVoiceCallEnhancedOptions = {}) => {
  const {
    autoRecord = false,
    enableScreenShare = true,
    sessionId,
    isTherapySession = false,
    emergencyEscalation = false,
    qualityMonitoring = true,
    onCallStart,
    onCallEnd,
    onQualityIssue,
    onError
  } = options

  // Enhanced call state
  const [callState, setCallState] = useState<EnhancedCallState>({
    isActive: false,
    callId: null,
    remoteUserId: null,
    callStatus: 'idle',
    duration: 0,
    isMuted: false,
    isScreenSharing: false,
    isRecording: false,
    connectionQuality: 'good',
    error: null,
    sessionId: sessionId || null,
    isTherapyCall: isTherapySession,
    isEmergencyCall: false,
    callNotes: '',
    recordingPath: null,
    participants: []
  })

  // Refs for manager and timers
  const callManagerRef = useRef<VoiceCallManager | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const qualityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const screenShareStreamRef = useRef<MediaStream | null>(null)
  const callStartTimeRef = useRef<Date | null>(null)

  // Initialize voice call manager
  const initializeCallManager = useCallback(() => {
    try {
      if (callManagerRef.current) return callManagerRef.current

      const manager = new VoiceCallManager()
      
      // Set up event handlers
      manager.onCallStateChange = (status) => {
        setCallState(prev => ({
          ...prev,
          callStatus: status as CallStatus,
          isActive: status === 'answered'
        }))

        if (status === 'answered') {
          callStartTimeRef.current = new Date()
          startDurationTimer()
          if (qualityMonitoring) {
            startQualityMonitoring()
          }
          onCallStart?.(callState.callId || '')
        } else if (status === 'ended' || status === 'rejected' || status === 'failed') {
          stopAllTimers()
          cleanup()
          if (callStartTimeRef.current) {
            const duration = Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000)
            onCallEnd?.(callState.callId || '', duration)
          }
        }
      }

      manager.onConnectionQualityChange = (quality) => {
        setCallState(prev => ({ ...prev, connectionQuality: quality }))
        
        if (quality === 'poor' || quality === 'fair') {
          onQualityIssue?.(quality)
        }
      }

      manager.onError = (error) => {
        setCallState(prev => ({ ...prev, error }))
        onError?.(error)
        errorMonitoring.reportError(new Error(error), {
          component: 'useVoiceCallEnhanced',
          callId: callState.callId,
          sessionId: callState.sessionId
        })
      }

      callManagerRef.current = manager
      return manager
    } catch (error) {
      console.error('Failed to initialize call manager:', error)
      setCallState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to initialize call' 
      }))
      return null
    }
  }, [callState.callId, callState.sessionId, onCallStart, onCallEnd, onQualityIssue, onError, qualityMonitoring])

  // Duration timer
  const startDurationTimer = useCallback(() => {
    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        const duration = Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000)
        setCallState(prev => ({ ...prev, duration }))
      }
    }, 1000)
  }, [])

  // Quality monitoring
  const startQualityMonitoring = useCallback(() => {
    if (!qualityMonitoring) return

    qualityCheckIntervalRef.current = setInterval(async () => {
      if (!callManagerRef.current) return

      try {
        const status = callManagerRef.current.getCallStatus()
        if (status.quality && status.quality !== callState.connectionQuality) {
          setCallState(prev => ({ ...prev, connectionQuality: status.quality! }))
        }

        // Log quality metrics to database
        if (callState.callId) {
          await supabase
            .from('call_quality_logs')
            .insert({
              call_id: callState.callId,
              quality_level: status.quality,
              timestamp: new Date().toISOString(),
              session_id: callState.sessionId
            })
        }
      } catch (error) {
        console.error('Quality monitoring error:', error)
      }
    }, 5000)
  }, [callState.callId, callState.connectionQuality, callState.sessionId, qualityMonitoring])

  // Stop all timers
  const stopAllTimers = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    if (qualityCheckIntervalRef.current) {
      clearInterval(qualityCheckIntervalRef.current)
      qualityCheckIntervalRef.current = null
    }
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    stopAllTimers()
    
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach(track => track.stop())
      screenShareStreamRef.current = null
    }

    if (callManagerRef.current) {
      try {
        callManagerRef.current.cleanup?.()
      } catch (error) {
        console.error('Cleanup error:', error)
      }
      callManagerRef.current = null
    }

    setCallState(prev => ({
      ...prev,
      isActive: false,
      callId: null,
      remoteUserId: null,
      callStatus: 'idle',
      duration: 0,
      isMuted: false,
      isScreenSharing: false,
      isRecording: false,
      error: null,
      recordingPath: null
    }))
  }, [stopAllTimers])

  // Initiate call
  const initiateCall = useCallback(async (
    conversationId: string, 
    calleeId: string, 
    options: {
      emergency?: boolean
      reason?: string
      autoRecord?: boolean
    } = {}
  ) => {
    try {
      const manager = initializeCallManager()
      if (!manager) throw new Error('Failed to initialize call manager')

      setCallState(prev => ({
        ...prev,
        remoteUserId: calleeId,
        callStatus: 'initiated',
        isEmergencyCall: options.emergency || false,
        isRecording: options.autoRecord || autoRecord
      }))

      // Create call with session integration
      const call = await manager.initiateCall(
        conversationId, 
        calleeId, 
        options.autoRecord || autoRecord
      )

      // Update session if this is a therapy call
      if (sessionId && isTherapySession) {
        await supabase
          .from('therapy_sessions')
          .update({
            call_id: call.id,
            session_status: 'in_progress',
            call_started_at: new Date().toISOString()
          })
          .eq('id', sessionId)
      }

      setCallState(prev => ({ ...prev, callId: call.id }))
      return call
    } catch (error) {
      console.error('Failed to initiate call:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to start call'
      setCallState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [initializeCallManager, sessionId, isTherapySession, autoRecord])

  // Answer incoming call
  const answerCall = useCallback(async (
    callId: string, 
    offer: RTCSessionDescriptionInit
  ) => {
    try {
      const manager = initializeCallManager()
      if (!manager) throw new Error('Failed to initialize call manager')

      setCallState(prev => ({ ...prev, callId, callStatus: 'answered' }))
      await manager.answerCall(callId, offer)
    } catch (error) {
      console.error('Failed to answer call:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to answer call'
      setCallState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [initializeCallManager])

  // End call
  const endCall = useCallback(async () => {
    try {
      if (callManagerRef.current) {
        await callManagerRef.current.endCall()
      }

      // Update session if this was a therapy call
      if (sessionId && isTherapySession && callState.callId) {
        await supabase
          .from('therapy_sessions')
          .update({
            session_status: 'completed',
            call_ended_at: new Date().toISOString(),
            call_duration_seconds: callState.duration,
            session_notes: callState.callNotes || undefined
          })
          .eq('id', sessionId)
      }

      cleanup()
    } catch (error) {
      console.error('Failed to end call:', error)
      cleanup()
    }
  }, [sessionId, isTherapySession, callState.callId, callState.duration, callState.callNotes, cleanup])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (callManagerRef.current) {
      const newMuteState = !callState.isMuted
      callManagerRef.current.muteAudio(newMuteState)
      setCallState(prev => ({ ...prev, isMuted: newMuteState }))
    }
  }, [callState.isMuted])

  // Screen sharing controls
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!enableScreenShare) return

      if (!callState.isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
        
        screenShareStreamRef.current = stream
        setCallState(prev => ({ ...prev, isScreenSharing: true }))

        // Handle stream end
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setCallState(prev => ({ ...prev, isScreenSharing: false }))
          screenShareStreamRef.current = null
        })
      } else {
        if (screenShareStreamRef.current) {
          screenShareStreamRef.current.getTracks().forEach(track => track.stop())
          screenShareStreamRef.current = null
        }
        setCallState(prev => ({ ...prev, isScreenSharing: false }))
      }
    } catch (error) {
      console.error('Screen sharing error:', error)
      setCallState(prev => ({ 
        ...prev, 
        error: 'Failed to start screen sharing' 
      }))
    }
  }, [enableScreenShare, callState.isScreenSharing])

  // Recording controls
  const toggleRecording = useCallback(async () => {
    try {
      const newRecordingState = !callState.isRecording
      setCallState(prev => ({ ...prev, isRecording: newRecordingState }))

      // Log recording state change
      if (callState.callId) {
        await supabase
          .from('call_recording_logs')
          .insert({
            call_id: callState.callId,
            action: newRecordingState ? 'start' : 'stop',
            timestamp: new Date().toISOString(),
            session_id: callState.sessionId
          })
      }
    } catch (error) {
      console.error('Recording toggle error:', error)
    }
  }, [callState.isRecording, callState.callId, callState.sessionId])

  // Emergency escalation
  const escalateEmergency = useCallback(async () => {
    if (!emergencyEscalation || !callState.callId) return

    try {
      // Mark call as emergency
      await supabase
        .from('voice_calls')
        .update({
          emergency_call: true,
          emergency_escalated_at: new Date().toISOString()
        })
        .eq('id', callState.callId)

      // Send emergency notifications
      await communicationPushNotifications.sendEmergencyAlert({
        callId: callState.callId,
        sessionId: callState.sessionId,
        reason: 'Call escalated to emergency during session'
      })

      setCallState(prev => ({ ...prev, isEmergencyCall: true }))
    } catch (error) {
      console.error('Emergency escalation error:', error)
    }
  }, [emergencyEscalation, callState.callId, callState.sessionId])

  // Add call notes
  const addCallNotes = useCallback(async (notes: string) => {
    setCallState(prev => ({ ...prev, callNotes: notes }))

    if (callState.callId) {
      try {
        await supabase
          .from('voice_calls')
          .update({ call_notes_ar: notes })
          .eq('id', callState.callId)
      } catch (error) {
        console.error('Failed to save call notes:', error)
      }
    }
  }, [callState.callId])

  // Volume control
  const adjustVolume = useCallback((volume: number) => {
    if (callManagerRef.current) {
      callManagerRef.current.adjustVolume(volume / 100)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // Real-time call updates subscription
  useEffect(() => {
    if (!callState.callId) return

    const channel = supabase.channel(`call-${callState.callId}`)
      .on('broadcast', { event: 'call_update' }, (payload) => {
        console.log('Call update received:', payload)
        // Handle real-time call updates
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [callState.callId])

  return {
    // State
    ...callState,
    
    // Actions
    initiateCall,
    answerCall,
    endCall,
    toggleMute,
    toggleScreenShare,
    toggleRecording,
    escalateEmergency,
    addCallNotes,
    adjustVolume,
    
    // Computed properties
    canInitiate: callState.callStatus === 'idle',
    canEnd: ['initiated', 'ringing', 'answered'].includes(callState.callStatus),
    canMute: callState.callStatus === 'answered',
    canRecord: callState.callStatus === 'answered',
    canScreenShare: callState.callStatus === 'answered' && enableScreenShare,
    
    // Formatting helpers
    formatDuration: (seconds: number = callState.duration) => {
      const hrs = Math.floor(seconds / 3600)
      const mins = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      
      if (hrs > 0) {
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
  }
}