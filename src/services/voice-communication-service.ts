/**
 * Voice Communication Service
 * WebRTC voice calls with signaling, quality monitoring, and call recording
 * Arkan Al-Numo Center - Real-time Voice Communication
 */

import { supabase } from '@/lib/supabase'
import { errorMonitoring } from '@/lib/error-monitoring'
import type { 
  VoiceCall, 
  CreateVoiceCallData, 
  UpdateVoiceCallData, 
  ConnectionQuality,
  CallStatus,
  VoiceCallEvent
} from '@/types/communication'

// =====================================================
// WEBRTC CONFIGURATION
// =====================================================

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
]

const PEER_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10
}

// =====================================================
// CALL MANAGEMENT CLASS
// =====================================================

export class VoiceCallManager {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private callId: string | null = null
  private conversationId: string | null = null
  private isInitiator: boolean = false
  private callQualityInterval: NodeJS.Timeout | null = null
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []

  // Event handlers
  public onRemoteStream?: (stream: MediaStream) => void
  public onCallStateChange?: (state: CallStatus) => void
  public onConnectionQualityChange?: (quality: ConnectionQuality) => void
  public onError?: (error: string) => void

  constructor() {
    this.setupPeerConnection()
  }

  private setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection(PEER_CONFIG)

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callId) {
        this.sendSignalingMessage({
          type: 'ice_candidate',
          candidate: event.candidate,
          callId: this.callId
        })
      }
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0]
      this.onRemoteStream?.(this.remoteStream)
    }

    // Monitor connection state
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState
      console.log('Connection state:', state)
      
      if (state === 'connected') {
        this.startQualityMonitoring()
        this.updateCallStatus('answered')
      } else if (state === 'disconnected' || state === 'failed') {
        this.handleCallEnd()
      }
    }

    // Handle ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState
      console.log('ICE connection state:', state)
      
      if (state === 'disconnected' || state === 'failed') {
        this.handleCallEnd()
      }
    }
  }

  // =====================================================
  // CALL INITIATION
  // =====================================================

  async initiateCall(conversationId: string, calleeId: string, enableRecording: boolean = false): Promise<VoiceCall> {
    try {
      this.conversationId = conversationId
      this.isInitiator = true

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        },
        video: false
      })

      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream!)
        }
      })

      // Create call record in database
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const callData: CreateVoiceCallData = {
        conversation_id: conversationId,
        callee_id: calleeId,
        call_type: 'voice',
        call_reason_ar: 'مكالمة عادية',
        emergency_call: false
      }

      const { data: call, error } = await supabase
        .from('voice_calls')
        .insert({
          ...callData,
          caller_id: user.id,
          call_status: 'initiated',
          initiated_at: new Date().toISOString(),
          recording_enabled: enableRecording,
          peer_connection_id: this.generateConnectionId(),
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      this.callId = call.id

      // Start recording if enabled
      if (enableRecording && this.localStream) {
        this.startRecording()
      }

      // Create and send offer
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      })
      
      await this.peerConnection!.setLocalDescription(offer)

      // Send offer through signaling
      await this.sendSignalingMessage({
        type: 'offer',
        offer: offer,
        callId: this.callId
      })

      this.onCallStateChange?.('initiated')
      return call

    } catch (error) {
      console.error('Error initiating call:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'VoiceCallManager',
        action: 'initiate_call',
        conversationId
      })
      this.cleanup()
      throw error
    }
  }

  // =====================================================
  // CALL ANSWERING
  // =====================================================

  async answerCall(callId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      this.callId = callId
      this.isInitiator = false

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      })

      // Add local stream
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream!)
        }
      })

      // Set remote description
      await this.peerConnection!.setRemoteDescription(offer)

      // Create answer
      const answer = await this.peerConnection!.createAnswer()
      await this.peerConnection!.setLocalDescription(answer)

      // Update call status
      await this.updateCallStatus('answered')

      // Send answer
      await this.sendSignalingMessage({
        type: 'answer',
        answer: answer,
        callId: this.callId
      })

      this.onCallStateChange?.('answered')

    } catch (error) {
      console.error('Error answering call:', error)
      await this.updateCallStatus('failed')
      this.cleanup()
      throw error
    }
  }

  // =====================================================
  // SIGNALING MANAGEMENT
  // =====================================================

  private async sendSignalingMessage(message: any) {
    try {
      // Use Supabase real-time for signaling
      const channel = supabase.channel(`call-${this.callId}`)
      await channel.send({
        type: 'broadcast',
        event: 'signaling',
        payload: message
      })
    } catch (error) {
      console.error('Signaling error:', error)
    }
  }

  async handleSignalingMessage(message: VoiceCallEvent) {
    try {
      switch (message.eventType) {
        case 'offer':
          if (!this.isInitiator && message.data.offer) {
            await this.answerCall(message.callId, message.data.offer)
          }
          break

        case 'answer':
          if (this.isInitiator && message.data.answer) {
            await this.peerConnection!.setRemoteDescription(message.data.answer)
          }
          break

        case 'ice_candidate':
          if (message.data.candidate) {
            await this.peerConnection!.addIceCandidate(message.data.candidate)
          }
          break

        case 'end_call':
          this.handleCallEnd()
          break
      }
    } catch (error) {
      console.error('Error handling signaling:', error)
    }
  }

  // =====================================================
  // CALL CONTROL
  // =====================================================

  async endCall(): Promise<void> {
    try {
      // Send end call signal
      if (this.callId) {
        await this.sendSignalingMessage({
          type: 'end_call',
          callId: this.callId
        })

        await this.updateCallStatus('ended')
      }

      this.handleCallEnd()
    } catch (error) {
      console.error('Error ending call:', error)
    }
  }

  private handleCallEnd() {
    this.stopQualityMonitoring()
    this.stopRecording()
    this.cleanup()
    this.onCallStateChange?.('ended')
  }

  async rejectCall(): Promise<void> {
    if (this.callId) {
      await this.updateCallStatus('rejected')
      await this.sendSignalingMessage({
        type: 'end_call',
        callId: this.callId
      })
    }
    this.cleanup()
  }

  // =====================================================
  // QUALITY MONITORING
  // =====================================================

  private startQualityMonitoring() {
    this.callQualityInterval = setInterval(async () => {
      if (!this.peerConnection) return

      const stats = await this.peerConnection.getStats()
      let audioLevel = 0
      let packetsLost = 0
      let roundTripTime = 0

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          audioLevel = report.audioLevel || 0
          packetsLost = report.packetsLost || 0
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          roundTripTime = report.currentRoundTripTime || 0
        }
      })

      // Calculate connection quality
      const quality = this.calculateConnectionQuality(audioLevel, packetsLost, roundTripTime)
      this.onConnectionQualityChange?.(quality)

      // Update call with quality metrics
      if (this.callId) {
        await this.updateCallQuality(quality, audioLevel)
      }

    }, 5000) // Check every 5 seconds
  }

  private stopQualityMonitoring() {
    if (this.callQualityInterval) {
      clearInterval(this.callQualityInterval)
      this.callQualityInterval = null
    }
  }

  private calculateConnectionQuality(audioLevel: number, packetsLost: number, rtt: number): ConnectionQuality {
    // Simple quality calculation based on multiple factors
    if (packetsLost > 5 || rtt > 500) return 'poor'
    if (packetsLost > 2 || rtt > 200 || audioLevel < 0.1) return 'fair'
    if (rtt < 100 && audioLevel > 0.5) return 'excellent'
    return 'good'
  }

  // =====================================================
  // RECORDING FUNCTIONALITY
  // =====================================================

  private startRecording() {
    if (!this.localStream) return

    try {
      this.mediaRecorder = new MediaRecorder(this.localStream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = async () => {
        await this.saveRecording()
      }

      this.mediaRecorder.start(1000) // Collect data every second
    } catch (error) {
      console.error('Recording start error:', error)
    }
  }

  private stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
    }
  }

  private async saveRecording() {
    if (this.recordedChunks.length === 0 || !this.callId) return

    try {
      const recordingBlob = new Blob(this.recordedChunks, { type: 'audio/webm' })
      const fileName = `call-${this.callId}-${Date.now()}.webm`
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('call-recordings')
        .upload(fileName, recordingBlob)

      if (uploadError) throw uploadError

      // Update call record with recording path
      await supabase
        .from('voice_calls')
        .update({
          recording_path: fileName,
          recording_duration_seconds: Math.floor(recordingBlob.size / 16000) // Estimate
        })
        .eq('id', this.callId)

      console.log('Recording saved successfully:', fileName)

    } catch (error) {
      console.error('Error saving recording:', error)
    }

    this.recordedChunks = []
  }

  // =====================================================
  // DATABASE OPERATIONS
  // =====================================================

  private async updateCallStatus(status: CallStatus) {
    if (!this.callId) return

    const updateData: Partial<UpdateVoiceCallData> = {
      call_status: status
    }

    if (status === 'answered') {
      updateData.answered_at = new Date().toISOString()
    } else if (status === 'ended' || status === 'rejected') {
      updateData.ended_at = new Date().toISOString()
      if (status === 'ended') {
        // Calculate duration
        const { data: call } = await supabase
          .from('voice_calls')
          .select('answered_at')
          .eq('id', this.callId)
          .single()

        if (call?.answered_at) {
          const duration = Math.floor(
            (new Date().getTime() - new Date(call.answered_at).getTime()) / 1000
          )
          updateData.duration_seconds = duration
        }
      }
    }

    await supabase
      .from('voice_calls')
      .update(updateData)
      .eq('id', this.callId)
  }

  private async updateCallQuality(quality: ConnectionQuality, audioLevel: number) {
    if (!this.callId) return

    const qualityScore = this.getQualityScore(quality)

    await supabase
      .from('voice_calls')
      .update({
        connection_quality: quality,
        call_quality_score: qualityScore,
        ice_connection_state: this.peerConnection?.iceConnectionState,
        signaling_state: this.peerConnection?.signalingState
      })
      .eq('id', this.callId)
  }

  private getQualityScore(quality: ConnectionQuality): number {
    switch (quality) {
      case 'excellent': return 5
      case 'good': return 4
      case 'fair': return 3
      case 'poor': return 2
      default: return 1
    }
  }

  // =====================================================
  // AUDIO CONTROL
  // =====================================================

  muteAudio(muted: boolean = true) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted
      })
    }
  }

  adjustVolume(volume: number) {
    // Volume should be between 0 and 1
    if (this.remoteStream) {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(this.remoteStream)
      const gainNode = audioContext.createGain()
      gainNode.gain.value = Math.max(0, Math.min(1, volume))
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private generateConnectionId(): string {
    return `pc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private cleanup() {
    this.stopQualityMonitoring()
    this.stopRecording()

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    this.remoteStream = null
    this.callId = null
    this.conversationId = null
  }

  // =====================================================
  // PUBLIC STATUS METHODS
  // =====================================================

  getCallStatus(): { isActive: boolean; callId: string | null; quality: ConnectionQuality | null } {
    const isActive = this.peerConnection?.connectionState === 'connected'
    return {
      isActive,
      callId: this.callId,
      quality: isActive ? this.getCurrentQuality() : null
    }
  }

  private getCurrentQuality(): ConnectionQuality {
    const state = this.peerConnection?.iceConnectionState
    switch (state) {
      case 'connected':
      case 'completed':
        return 'excellent'
      case 'checking':
        return 'good'
      case 'disconnected':
        return 'fair'
      default:
        return 'poor'
    }
  }
}

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

export const voiceCommService = {
  // Create new voice call manager instance
  createCallManager(): VoiceCallManager {
    return new VoiceCallManager()
  },

  // Get call history for conversation
  async getCallHistory(conversationId: string): Promise<VoiceCall[]> {
    try {
      const { data, error } = await supabase
        .from('voice_calls')
        .select(`
          *,
          caller:caller_id(id, name, avatar_url),
          callee:callee_id(id, name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('Error fetching call history:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'voiceCommService',
        action: 'get_call_history',
        conversationId
      })
      throw error
    }
  },

  // Get active calls for user
  async getActiveCalls(userId: string): Promise<VoiceCall[]> {
    try {
      const { data, error } = await supabase
        .from('voice_calls')
        .select('*')
        .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
        .in('call_status', ['initiated', 'ringing', 'answered'])
        .order('initiated_at', { ascending: false })

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('Error fetching active calls:', error)
      throw error
    }
  },

  // Update call notes after completion
  async updateCallNotes(callId: string, notes: string, followUpRequired: boolean = false): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      await supabase
        .from('voice_calls')
        .update({
          call_notes_ar: notes,
          follow_up_required: followUpRequired,
          follow_up_notes_ar: followUpRequired ? 'يتطلب متابعة' : undefined
        })
        .eq('id', callId)

    } catch (error) {
      console.error('Error updating call notes:', error)
      throw error
    }
  },

  // Check device capabilities
  async checkDeviceCapabilities(): Promise<{
    hasAudio: boolean
    hasMicrophone: boolean
    supportedCodecs: string[]
  }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const hasAudio = devices.some(device => device.kind === 'audiooutput')
      const hasMicrophone = devices.some(device => device.kind === 'audioinput')

      // Check WebRTC support
      const pc = new RTCPeerConnection()
      const supportedCodecs: string[] = []
      
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true })
        if (offer.sdp?.includes('opus')) supportedCodecs.push('opus')
        if (offer.sdp?.includes('G722')) supportedCodecs.push('G722')
      } catch (error) {
        console.warn('Codec check failed:', error)
      } finally {
        pc.close()
      }

      return {
        hasAudio,
        hasMicrophone,
        supportedCodecs
      }

    } catch (error) {
      console.error('Device capability check failed:', error)
      return {
        hasAudio: false,
        hasMicrophone: false,
        supportedCodecs: []
      }
    }
  },

  // Emergency call handling
  async initiateEmergencyCall(conversationId: string, calleeId: string, reason: string): Promise<VoiceCall> {
    try {
      const callManager = new VoiceCallManager()
      
      // Create emergency call record
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: call, error } = await supabase
        .from('voice_calls')
        .insert({
          conversation_id: conversationId,
          caller_id: user.id,
          callee_id: calleeId,
          call_type: 'voice',
          call_status: 'initiated',
          initiated_at: new Date().toISOString(),
          emergency_call: true,
          call_reason_ar: reason,
          recording_enabled: true, // Always record emergency calls
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Trigger high-priority notification
      await supabase
        .from('notifications')
        .insert({
          recipient_id: calleeId,
          type: 'emergency_call',
          title: 'مكالمة طارئة',
          message: `مكالمة طارئة من ${user.user_metadata?.name || 'مستخدم'}`,
          priority: 'urgent',
          data: { call_id: call.id, conversation_id: conversationId }
        })

      return call

    } catch (error) {
      console.error('Emergency call error:', error)
      throw error
    }
  }
}

// =====================================================
// CALL EVENT TYPES
// =====================================================

export type VoiceCallEventType = 'call_initiated' | 'call_answered' | 'call_ended' | 'call_rejected' | 'quality_changed'

export interface VoiceCallEventData {
  type: VoiceCallEventType
  callId: string
  conversationId: string
  quality?: ConnectionQuality
  duration?: number
  error?: string
}