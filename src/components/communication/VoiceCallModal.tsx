import React, { useState, useEffect, useRef } from 'react'
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { VoiceCallManager, type VoiceCallEventData } from '@/services/voice-communication-service'
import type { VoiceCall, ConnectionQuality, CallStatus } from '@/types/communication'

interface VoiceCallModalProps {
  isOpen: boolean
  onClose: () => void
  call: VoiceCall | null
  isIncoming?: boolean
  onAnswer?: () => Promise<void>
  onReject?: () => Promise<void>
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  call,
  isIncoming = false,
  onAnswer,
  onReject
}) => {
  const [callManager] = useState(() => new VoiceCallManager())
  const [callStatus, setCallStatus] = useState<CallStatus>('initiated')
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState([80])
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good')
  const [callDuration, setCallDuration] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [audioIssues, setAudioIssues] = useState(false)
  
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const callStartTime = useRef<Date | null>(null)
  const durationInterval = useRef<NodeJS.Timeout | null>(null)

  // Initialize call manager event handlers
  useEffect(() => {
    callManager.onRemoteStream = (stream) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream
      }
    }

    callManager.onCallStateChange = (status) => {
      setCallStatus(status)
      
      if (status === 'answered' && !callStartTime.current) {
        callStartTime.current = new Date()
        startDurationTimer()
      } else if (status === 'ended' || status === 'rejected') {
        stopDurationTimer()
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    }

    callManager.onConnectionQualityChange = (quality) => {
      setConnectionQuality(quality)
      setAudioIssues(quality === 'poor')
    }

    callManager.onError = (error) => {
      console.error('Call error:', error)
      setAudioIssues(true)
    }

    return () => {
      callManager.cleanup?.()
    }
  }, [callManager, onClose])

  // Duration timer
  const startDurationTimer = () => {
    durationInterval.current = setInterval(() => {
      if (callStartTime.current) {
        const duration = Math.floor((Date.now() - callStartTime.current.getTime()) / 1000)
        setCallDuration(duration)
      }
    }, 1000)
  }

  const stopDurationTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current)
      durationInterval.current = null
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDurationTimer()
      if (callManager && callStatus === 'answered') {
        callManager.endCall()
      }
    }
  }, [callManager, callStatus])

  // Handle call controls
  const handleAnswer = async () => {
    try {
      await onAnswer?.()
      setCallStatus('answered')
    } catch (error) {
      console.error('Error answering call:', error)
      setAudioIssues(true)
    }
  }

  const handleReject = async () => {
    try {
      await onReject?.()
      await callManager.rejectCall()
      setCallStatus('rejected')
    } catch (error) {
      console.error('Error rejecting call:', error)
    }
  }

  const handleEndCall = async () => {
    try {
      await callManager.endCall()
      setCallStatus('ended')
    } catch (error) {
      console.error('Error ending call:', error)
    }
  }

  const handleMute = () => {
    const newMutedState = !isMuted
    callManager.muteAudio(newMutedState)
    setIsMuted(newMutedState)
  }

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume)
    callManager.adjustVolume(newVolume[0] / 100)
  }

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get status message
  const getStatusMessage = () => {
    switch (callStatus) {
      case 'initiated':
        return isIncoming ? 'مكالمة واردة' : 'جاري الاتصال...'
      case 'ringing':
        return 'جاري الرنين...'
      case 'answered':
        return 'متصل'
      case 'ended':
        return 'انتهت المكالمة'
      case 'rejected':
        return 'رُفضت المكالمة'
      case 'failed':
        return 'فشل في الاتصال'
      case 'missed':
        return 'مكالمة فائتة'
      default:
        return 'حالة غير معروفة'
    }
  }

  // Get quality indicator
  const getQualityIndicator = () => {
    const qualityConfig = {
      excellent: { color: 'text-green-500', icon: Wifi, bars: 4, label: 'ممتازة' },
      good: { color: 'text-blue-500', icon: Wifi, bars: 3, label: 'جيدة' },
      fair: { color: 'text-yellow-500', icon: Wifi, bars: 2, label: 'متوسطة' },
      poor: { color: 'text-red-500', icon: WifiOff, bars: 1, label: 'ضعيفة' }
    }

    const config = qualityConfig[connectionQuality]
    const Icon = config.icon

    return (
      <div className="flex items-center gap-1">
        <Icon className={cn("w-4 h-4", config.color)} />
        <span className={cn("text-xs", config.color)}>{config.label}</span>
      </div>
    )
  }

  if (!call) return null

  const callPartner = call.caller_id === call.callee_id ? call.callee : call.caller
  const isEmergency = call.emergency_call

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-gradient-to-b from-blue-50 to-white" dir="rtl">
        <div className="relative">
          {/* Emergency indicator */}
          {isEmergency && (
            <div className="absolute top-4 left-4 right-4 z-10">
              <Badge variant="destructive" className="w-full justify-center text-center">
                <AlertCircle className="w-4 h-4 ml-1" />
                مكالمة طارئة
              </Badge>
            </div>
          )}

          {/* Header */}
          <DialogHeader className="p-6 text-center space-y-4">
            {/* Avatar */}
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="w-24 h-24 ring-4 ring-white shadow-lg">
                  <AvatarImage src={callPartner?.avatar_url} />
                  <AvatarFallback className="text-xl font-semibold">
                    {callPartner?.name?.slice(0, 2) || 'مج'}
                  </AvatarFallback>
                </Avatar>
                
                {/* Status indicator */}
                <div className={cn(
                  "absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-white",
                  callStatus === 'answered' ? 'bg-green-500' : 
                  callStatus === 'initiated' || callStatus === 'ringing' ? 'bg-yellow-500' :
                  'bg-gray-400'
                )} />
              </div>
            </div>

            {/* Caller Info */}
            <div className="text-center">
              <DialogTitle className="text-xl font-semibold text-right">
                {callPartner?.name || 'مستخدم'}
              </DialogTitle>
              <p className="text-sm text-gray-600 text-right mt-1">
                {call.caller_id === callPartner?.id ? 'مكالمة صادرة' : 'مكالمة واردة'}
              </p>
            </div>

            {/* Call Status */}
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-gray-900">
                {getStatusMessage()}
              </p>
              
              {callStatus === 'answered' && (
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="text-right">
                    <span className="font-mono text-lg">{formatDuration(callDuration)}</span>
                  </div>
                  
                  {getQualityIndicator()}
                </div>
              )}

              {/* Audio issues warning */}
              {audioIssues && callStatus === 'answered' && (
                <div className="flex items-center justify-center gap-2 text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">مشاكل في جودة الصوت</span>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Settings Panel */}
          {showSettings && callStatus === 'answered' && (
            <div className="px-6 pb-4 space-y-4">
              {/* Volume Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-right">مستوى الصوت</span>
                  <span className="text-sm text-gray-500">{volume[0]}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX className="w-4 h-4 text-gray-400" />
                  <Slider
                    value={volume}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <Volume2 className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Connection Quality */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-right">جودة الاتصال</span>
                <div className="flex items-center justify-between">
                  {getQualityIndicator()}
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1 h-4 rounded-full",
                          i < (connectionQuality === 'excellent' ? 4 : 
                               connectionQuality === 'good' ? 3 : 
                               connectionQuality === 'fair' ? 2 : 1)
                            ? 'bg-blue-500' : 'bg-gray-200'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Call Controls */}
          <div className="p-6 pt-0">
            {isIncoming && (callStatus === 'initiated' || callStatus === 'ringing') ? (
              // Incoming call controls
              <div className="flex justify-center gap-6">
                <Button
                  onClick={handleReject}
                  variant="destructive"
                  size="lg"
                  className="w-16 h-16 rounded-full"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
                
                <Button
                  onClick={handleAnswer}
                  className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700"
                >
                  <Phone className="w-6 h-6" />
                </Button>
              </div>
            ) : callStatus === 'answered' ? (
              // Active call controls
              <div className="space-y-4">
                <div className="flex justify-center gap-4">
                  {/* Mute Button */}
                  <Button
                    onClick={handleMute}
                    variant={isMuted ? "destructive" : "outline"}
                    size="lg"
                    className="w-12 h-12 rounded-full"
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>

                  {/* Settings Button */}
                  <Button
                    onClick={() => setShowSettings(!showSettings)}
                    variant={showSettings ? "secondary" : "outline"}
                    size="lg"
                    className="w-12 h-12 rounded-full"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>

                  {/* End Call Button */}
                  <Button
                    onClick={handleEndCall}
                    variant="destructive"
                    size="lg"
                    className="w-12 h-12 rounded-full"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </Button>
                </div>

                {/* Status Row */}
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    {call.recording_enabled && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span>يتم التسجيل</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    {isMuted && <span className="text-orange-600">الميكروفون مكتوم</span>}
                  </div>
                </div>
              </div>
            ) : (
              // Connecting or ended state
              <div className="text-center">
                {callStatus === 'initiated' && !isIncoming && (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Button
                        onClick={handleEndCall}
                        variant="destructive" 
                        size="lg"
                        className="w-16 h-16 rounded-full"
                      >
                        <PhoneOff className="w-6 h-6" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 text-right">جاري محاولة الاتصال...</p>
                  </div>
                )}

                {(callStatus === 'ended' || callStatus === 'rejected' || callStatus === 'failed') && (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center",
                        callStatus === 'ended' ? 'bg-gray-100' :
                        callStatus === 'rejected' ? 'bg-red-100' :
                        'bg-red-100'
                      )}>
                        {callStatus === 'ended' ? (
                          <CheckCircle className="w-8 h-8 text-gray-500" />
                        ) : (
                          <AlertCircle className="w-8 h-8 text-red-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm font-medium text-right">
                        {callStatus === 'ended' ? 'انتهت المكالمة' :
                         callStatus === 'rejected' ? 'رُفضت المكالمة' :
                         'فشل في الاتصال'}
                      </p>
                      
                      {callDuration > 0 && (
                        <p className="text-xs text-gray-500 text-right mt-1">
                          مدة المكالمة: {formatDuration(callDuration)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Call Information */}
          {call.call_reason_ar && (
            <div className="px-6 pb-4">
              <div className="bg-blue-50 rounded-lg p-3 text-right">
                <p className="text-sm font-medium text-blue-900 mb-1">سبب المكالمة:</p>
                <p className="text-sm text-blue-700">{call.call_reason_ar}</p>
              </div>
            </div>
          )}

          {/* Emergency Call Warning */}
          {isEmergency && (
            <div className="px-6 pb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-right">
                <div className="flex items-center gap-2 flex-row-reverse">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">مكالمة طارئة</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  سيتم تسجيل هذه المكالمة لأغراض الأمان والمتابعة
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden audio element for remote stream */}
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  )
}

// =====================================================
// VOICE CALL HOOK
// =====================================================

export const useVoiceCall = () => {
  const [activeCall, setActiveCall] = useState<VoiceCall | null>(null)
  const [callManager, setCallManager] = useState<VoiceCallManager | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const initiateCall = async (conversationId: string, calleeId: string, emergency: boolean = false) => {
    try {
      const manager = new VoiceCallManager()
      setCallManager(manager)
      
      const call = await manager.initiateCall(conversationId, calleeId, emergency)
      setActiveCall(call)
      setIsModalOpen(true)
      
      return call
    } catch (error) {
      console.error('Failed to initiate call:', error)
      throw error
    }
  }

  const answerIncomingCall = async (call: VoiceCall, offer: RTCSessionDescriptionInit) => {
    try {
      const manager = new VoiceCallManager()
      setCallManager(manager)
      
      await manager.answerCall(call.id, offer)
      setActiveCall(call)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Failed to answer call:', error)
      throw error
    }
  }

  const endCall = () => {
    callManager?.endCall()
    setActiveCall(null)
    setCallManager(null)
    setIsModalOpen(false)
  }

  return {
    activeCall,
    isModalOpen,
    initiateCall,
    answerIncomingCall,
    endCall,
    setIsModalOpen
  }
}