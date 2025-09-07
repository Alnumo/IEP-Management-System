/**
 * Voice Call Interface - Enhanced UI for Remote Consultations
 * Comprehensive voice call interface with screen sharing and quality monitoring
 * Arkan Al-Numo Center - Real-time Voice Communication Enhancement
 */

import React, { useState, useEffect, useRef } from 'react'
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Monitor,
  MonitorOff,
  Settings,
  AlertCircle,
  Wifi,
  WifiOff,
  Camera,
  CameraOff,
  Speaker,
  Headphones,
  Record,
  StopCircle,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useVoiceCallManager } from '@/hooks/useVoiceCall'
import type { VoiceCall, ConnectionQuality, CallStatus } from '@/types/communication'

interface VoiceCallInterfaceProps {
  conversationId: string
  remoteUserId: string
  call?: VoiceCall | null
  onCallEnd?: () => void
  onCallStart?: (callId: string) => void
  enableScreenShare?: boolean
  enableRecording?: boolean
  isRemoteConsultation?: boolean
  className?: string
}

export const VoiceCallInterface: React.FC<VoiceCallInterfaceProps> = ({
  conversationId,
  remoteUserId,
  call,
  onCallEnd,
  onCallStart,
  enableScreenShare = true,
  enableRecording = true,
  isRemoteConsultation = false,
  className
}) => {
  const { language, isRTL } = useLanguage()
  
  // Voice call manager hook
  const {
    isActive,
    callStatus,
    duration,
    isMuted,
    connectionQuality,
    error,
    initiateCall,
    endCall,
    toggleMute,
    canInitiate,
    canEnd,
    canMute
  } = useVoiceCallManager()

  // Local state
  const [volume, setVolume] = useState([80])
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const [audioDevice, setAudioDevice] = useState<'speaker' | 'headphones'>('speaker')
  const [participantCount, setParticipantCount] = useState(2)
  const [callNotes, setCallNotes] = useState('')
  
  // Refs
  const screenShareRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const recordingRef = useRef<MediaRecorder | null>(null)

  // Screen sharing functionality
  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
        
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = stream
        }
        
        localStreamRef.current = stream
        setIsScreenSharing(true)
        
        // Handle stream end
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false)
        })
      } else {
        // Stop screen sharing
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop())
          localStreamRef.current = null
        }
        setIsScreenSharing(false)
      }
    } catch (error) {
      console.error('Screen sharing error:', error)
    }
  }

  // Recording functionality
  const handleRecording = async () => {
    try {
      if (!isRecording && enableRecording) {
        // Start recording
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        })
        
        const chunks: Blob[] = []
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }
        
        recorder.onstop = async () => {
          const recordingBlob = new Blob(chunks, { type: 'audio/webm' })
          // Save recording logic here
          console.log('Recording saved:', recordingBlob)
        }
        
        recorder.start(1000)
        recordingRef.current = recorder
        setIsRecording(true)
      } else {
        // Stop recording
        if (recordingRef.current && recordingRef.current.state === 'recording') {
          recordingRef.current.stop()
          recordingRef.current = null
          setIsRecording(false)
        }
      }
    } catch (error) {
      console.error('Recording error:', error)
    }
  }

  // Call initiation
  const handleStartCall = async () => {
    try {
      await initiateCall(conversationId, remoteUserId)
      onCallStart?.(conversationId)
    } catch (error) {
      console.error('Failed to start call:', error)
    }
  }

  // Call termination
  const handleEndCall = async () => {
    try {
      await endCall()
      
      // Cleanup screen sharing
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      
      // Stop recording
      if (recordingRef.current && recordingRef.current.state === 'recording') {
        recordingRef.current.stop()
      }
      
      setIsScreenSharing(false)
      setIsRecording(false)
      onCallEnd?.()
    } catch (error) {
      console.error('Failed to end call:', error)
    }
  }

  // Volume control
  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume)
    // Apply volume to audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = newVolume[0] / 100
    }
  }

  // Get quality indicator
  const getQualityIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return <Wifi className="w-5 h-5 text-green-500" />
      case 'good':
        return <Wifi className="w-5 h-5 text-blue-500" />
      case 'fair':
        return <Wifi className="w-5 h-5 text-yellow-500" />
      case 'poor':
        return <WifiOff className="w-5 h-5 text-red-500" />
      default:
        return <Wifi className="w-5 h-5 text-gray-500" />
    }
  }

  const getQualityText = () => {
    const quality = {
      excellent: language === 'ar' ? 'ممتازة' : 'Excellent',
      good: language === 'ar' ? 'جيدة' : 'Good', 
      fair: language === 'ar' ? 'متوسطة' : 'Fair',
      poor: language === 'ar' ? 'ضعيفة' : 'Poor'
    }
    return quality[connectionQuality] || quality.good
  }

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-3">
          <Phone className="w-6 h-6" />
          {isRemoteConsultation ? (
            language === 'ar' ? 'استشارة عن بُعد' : 'Remote Consultation'
          ) : (
            language === 'ar' ? 'مكالمة صوتية' : 'Voice Call'
          )}
        </CardTitle>
        
        {/* Call status */}
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
          {isActive && (
            <>
              <Badge variant="secondary" className="gap-1">
                {getQualityIcon()}
                {getQualityText()}
              </Badge>
              
              <div className="font-mono text-lg">
                {duration}
              </div>
              
              <Badge variant="outline" className="gap-1">
                <Users className="w-3 h-3" />
                {participantCount}
              </Badge>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Screen sharing display */}
        {enableScreenShare && isScreenSharing && (
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            <video
              ref={screenShareRef}
              autoPlay
              playsInline
              className="w-full h-64 object-cover"
            />
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-600">
                {language === 'ar' ? 'مشاركة الشاشة نشطة' : 'Screen Sharing Active'}
              </Badge>
            </div>
          </div>
        )}

        {/* Main call controls */}
        <div className="flex items-center justify-center gap-4">
          {!isActive ? (
            <Button
              onClick={handleStartCall}
              disabled={!canInitiate}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              <Phone className="w-5 h-5 mr-2" />
              {language === 'ar' ? 'بدء المكالمة' : 'Start Call'}
            </Button>
          ) : (
            <>
              {/* Mute button */}
              <Button
                onClick={toggleMute}
                disabled={!canMute}
                variant={isMuted ? "destructive" : "outline"}
                size="lg"
                className="w-12 h-12 rounded-full"
                title={isMuted ? 
                  (language === 'ar' ? 'إلغاء الكتم' : 'Unmute') :
                  (language === 'ar' ? 'كتم الصوت' : 'Mute')
                }
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              {/* Screen share button */}
              {enableScreenShare && (
                <Button
                  onClick={handleScreenShare}
                  variant={isScreenSharing ? "secondary" : "outline"}
                  size="lg"
                  className="w-12 h-12 rounded-full"
                  title={language === 'ar' ? 'مشاركة الشاشة' : 'Screen Share'}
                >
                  {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </Button>
              )}

              {/* Recording button */}
              {enableRecording && (
                <Button
                  onClick={handleRecording}
                  variant={isRecording ? "destructive" : "outline"}
                  size="lg"
                  className="w-12 h-12 rounded-full"
                  title={language === 'ar' ? 'تسجيل المكالمة' : 'Record Call'}
                >
                  {isRecording ? <StopCircle className="w-5 h-5" /> : <Record className="w-5 h-5" />}
                </Button>
              )}

              {/* Settings button */}
              <Button
                onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                variant="outline"
                size="lg"
                className="w-12 h-12 rounded-full"
                title={language === 'ar' ? 'الإعدادات' : 'Settings'}
              >
                <Settings className="w-5 h-5" />
              </Button>

              {/* End call button */}
              <Button
                onClick={handleEndCall}
                disabled={!canEnd}
                variant="destructive"
                size="lg"
                className="w-12 h-12 rounded-full"
                title={language === 'ar' ? 'إنهاء المكالمة' : 'End Call'}
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>

        {/* Advanced controls panel */}
        {showAdvancedControls && isActive && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-sm">
              {language === 'ar' ? 'إعدادات متقدمة' : 'Advanced Settings'}
            </h4>
            
            {/* Volume control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'مستوى الصوت' : 'Volume'}
                </span>
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

            {/* Audio device selection */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {language === 'ar' ? 'جهاز الصوت' : 'Audio Device'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setAudioDevice('speaker')}
                  variant={audioDevice === 'speaker' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="p-2"
                >
                  <Speaker className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setAudioDevice('headphones')}
                  variant={audioDevice === 'headphones' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="p-2"
                >
                  <Headphones className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Connection quality details */}
            <div className="space-y-2">
              <span className="text-sm font-medium">
                {language === 'ar' ? 'تفاصيل جودة الاتصال' : 'Connection Quality Details'}
              </span>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{language === 'ar' ? 'الجودة الإجمالية' : 'Overall Quality'}</span>
                  <span className="font-medium">{getQualityText()}</span>
                </div>
                <Progress 
                  value={
                    connectionQuality === 'excellent' ? 100 :
                    connectionQuality === 'good' ? 75 :
                    connectionQuality === 'fair' ? 50 : 25
                  }
                  className="h-2"
                />
              </div>
            </div>

            {/* Recording status */}
            {isRecording && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-red-700">
                  {language === 'ar' ? 'جاري التسجيل...' : 'Recording in progress...'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700">
              {error}
            </span>
          </div>
        )}

        {/* Call information */}
        {isActive && (
          <div className="text-center space-y-2">
            <div className="text-sm text-gray-600">
              {isRemoteConsultation && (
                <p>
                  {language === 'ar' ? 
                    'جلسة استشارة عن بُعد - يتم التسجيل لأغراض التوثيق' :
                    'Remote consultation session - Recording for documentation'
                  }
                </p>
              )}
            </div>
            
            {isMuted && (
              <Badge variant="secondary" className="text-orange-600">
                {language === 'ar' ? 'الميكروفون مكتوم' : 'Microphone Muted'}
              </Badge>
            )}
          </div>
        )}

        {/* Hidden audio element */}
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}