/**
 * Call Controls - Advanced Voice Call Control Panel
 * Healthcare-grade call controls with compliance features
 * Arkan Al-Numo Center - Voice Communication Management
 */

import React, { useState, useEffect } from 'react'
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Monitor,
  MonitorOff,
  Video,
  VideoOff,
  Record,
  StopCircle,
  Pause,
  Play,
  RotateCcw,
  Settings,
  AlertTriangle,
  Clock,
  Users,
  FileText,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CallStatus, ConnectionQuality } from '@/types/communication'

interface CallControlsProps {
  callId: string
  callStatus: CallStatus
  connectionQuality: ConnectionQuality
  duration: number
  isMuted: boolean
  isRecording: boolean
  isScreenSharing: boolean
  volume: number
  isEmergencyCall?: boolean
  isTherapySession?: boolean
  onMute: (muted: boolean) => void
  onVolumeChange: (volume: number) => void
  onScreenShare: (enabled: boolean) => void
  onRecord: (enabled: boolean) => void
  onEndCall: () => void
  onEmergencyEscalate?: () => void
  onAddNotes?: (notes: string) => void
  className?: string
}

export const CallControls: React.FC<CallControlsProps> = ({
  callId,
  callStatus,
  connectionQuality,
  duration,
  isMuted,
  isRecording,
  isScreenSharing,
  volume,
  isEmergencyCall = false,
  isTherapySession = false,
  onMute,
  onVolumeChange,
  onScreenShare,
  onRecord,
  onEndCall,
  onEmergencyEscalate,
  onAddNotes,
  className
}) => {
  const { language, isRTL } = useLanguage()
  
  // Local state
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [callNotes, setCallNotes] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [isRecordingPaused, setIsRecordingPaused] = useState(false)
  const [networkLatency, setNetworkLatency] = useState(0)
  const [connectionStable, setConnectionStable] = useState(true)
  const [lastQualityCheck, setLastQualityCheck] = useState<Date>(new Date())

  // Audio level monitoring (simulated)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate audio level changes
      const level = Math.random() * 100
      setAudioLevel(level)
      
      // Update connection metrics
      const latency = 50 + Math.random() * 100
      setNetworkLatency(latency)
      setConnectionStable(latency < 150)
      setLastQualityCheck(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get quality indicator
  const getQualityStatus = () => {
    const qualities = {
      excellent: {
        text: language === 'ar' ? 'ممتازة' : 'Excellent',
        color: 'text-green-600 bg-green-50',
        progress: 100
      },
      good: {
        text: language === 'ar' ? 'جيدة' : 'Good',
        color: 'text-blue-600 bg-blue-50',
        progress: 75
      },
      fair: {
        text: language === 'ar' ? 'متوسطة' : 'Fair',
        color: 'text-yellow-600 bg-yellow-50',
        progress: 50
      },
      poor: {
        text: language === 'ar' ? 'ضعيفة' : 'Poor',
        color: 'text-red-600 bg-red-50',
        progress: 25
      }
    }
    return qualities[connectionQuality] || qualities.good
  }

  // Handle recording pause/resume
  const handleRecordingPause = () => {
    setIsRecordingPaused(!isRecordingPaused)
    // Implement actual pause/resume logic
  }

  // Handle emergency escalation
  const handleEmergencyEscalate = () => {
    if (onEmergencyEscalate) {
      onEmergencyEscalate()
    }
  }

  // Handle notes saving
  const handleSaveNotes = () => {
    if (onAddNotes && callNotes.trim()) {
      onAddNotes(callNotes)
      setCallNotes('')
    }
  }

  const qualityStatus = getQualityStatus()

  return (
    <Card className={cn("w-full max-w-4xl", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <Phone className={cn(
              "w-6 h-6",
              callStatus === 'answered' ? 'text-green-500' :
              callStatus === 'initiated' ? 'text-blue-500' :
              'text-gray-500'
            )} />
            {isEmergencyCall ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-4 h-4" />
                {language === 'ar' ? 'مكالمة طارئة' : 'Emergency Call'}
              </Badge>
            ) : isTherapySession ? (
              <Badge variant="secondary" className="gap-1">
                <Users className="w-4 h-4" />
                {language === 'ar' ? 'جلسة علاجية' : 'Therapy Session'}
              </Badge>
            ) : (
              language === 'ar' ? 'مكالمة صوتية' : 'Voice Call'
            )}
          </CardTitle>

          <div className="flex items-center gap-4">
            {/* Call duration */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-lg">{formatDuration(duration)}</span>
            </div>

            {/* Connection quality */}
            <Badge className={cn("gap-1", qualityStatus.color)}>
              {qualityStatus.text}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main call controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Mute control */}
          <Button
            onClick={() => onMute(!isMuted)}
            variant={isMuted ? "destructive" : "outline"}
            size="lg"
            className="w-14 h-14 rounded-full"
            title={isMuted ? 
              (language === 'ar' ? 'إلغاء الكتم' : 'Unmute') :
              (language === 'ar' ? 'كتم الصوت' : 'Mute')
            }
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          {/* Screen share control */}
          <Button
            onClick={() => onScreenShare(!isScreenSharing)}
            variant={isScreenSharing ? "secondary" : "outline"}
            size="lg"
            className="w-14 h-14 rounded-full"
            title={language === 'ar' ? 'مشاركة الشاشة' : 'Screen Share'}
          >
            {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
          </Button>

          {/* Recording control */}
          <div className="relative">
            <Button
              onClick={() => onRecord(!isRecording)}
              variant={isRecording ? "destructive" : "outline"}
              size="lg"
              className="w-14 h-14 rounded-full"
              title={language === 'ar' ? 'تسجيل المكالمة' : 'Record Call'}
            >
              {isRecording ? <StopCircle className="w-6 h-6" /> : <Record className="w-6 h-6" />}
            </Button>
            
            {/* Recording pause control */}
            {isRecording && (
              <Button
                onClick={handleRecordingPause}
                variant="ghost"
                size="sm"
                className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-8 h-6 p-0"
                title={isRecordingPaused ? 
                  (language === 'ar' ? 'استئناف التسجيل' : 'Resume Recording') :
                  (language === 'ar' ? 'إيقاف التسجيل مؤقتاً' : 'Pause Recording')
                }
              >
                {isRecordingPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              </Button>
            )}
          </div>

          {/* Advanced settings */}
          <Button
            onClick={() => setShowAdvanced(!showAdvanced)}
            variant={showAdvanced ? "secondary" : "outline"}
            size="lg"
            className="w-14 h-14 rounded-full"
            title={language === 'ar' ? 'الإعدادات المتقدمة' : 'Advanced Settings'}
          >
            <Settings className="w-6 h-6" />
          </Button>

          {/* Emergency escalation */}
          {isTherapySession && (
            <Button
              onClick={handleEmergencyEscalate}
              variant="destructive"
              size="lg"
              className="w-14 h-14 rounded-full"
              title={language === 'ar' ? 'تصعيد طارئ' : 'Emergency Escalation'}
            >
              <AlertTriangle className="w-6 h-6" />
            </Button>
          )}

          {/* End call */}
          <Button
            onClick={onEndCall}
            variant="destructive"
            size="lg"
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
            title={language === 'ar' ? 'إنهاء المكالمة' : 'End Call'}
          >
            <PhoneOff className="w-7 h-7" />
          </Button>
        </div>

        {/* Status indicators */}
        <div className="flex items-center justify-center gap-6 text-sm">
          {/* Audio level indicator */}
          <div className="flex items-center gap-2">
            {isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-green-500" />}
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 h-4 rounded-full",
                    i < Math.floor(audioLevel / 20) ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Recording status */}
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-600 font-medium">
                {isRecordingPaused ? 
                  (language === 'ar' ? 'التسجيل متوقف مؤقتاً' : 'Recording Paused') :
                  (language === 'ar' ? 'جاري التسجيل' : 'Recording')
                }
              </span>
            </div>
          )}

          {/* Screen sharing status */}
          {isScreenSharing && (
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-500" />
              <span className="text-blue-600 font-medium">
                {language === 'ar' ? 'مشاركة الشاشة نشطة' : 'Screen Sharing Active'}
              </span>
            </div>
          )}
        </div>

        {/* Advanced controls panel */}
        {showAdvanced && (
          <div className="space-y-6 p-6 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-lg mb-4">
              {language === 'ar' ? 'إعدادات متقدمة' : 'Advanced Settings'}
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Audio controls */}
              <div className="space-y-4">
                <h5 className="font-medium">
                  {language === 'ar' ? 'إعدادات الصوت' : 'Audio Settings'}
                </h5>
                
                {/* Volume control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'مستوى الصوت' : 'Volume'}
                    </span>
                    <span className="text-sm text-gray-500">{volume}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <VolumeX className="w-4 h-4 text-gray-400" />
                    <Slider
                      value={[volume]}
                      onValueChange={(value) => onVolumeChange(value[0])}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <Volume2 className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Connection quality details */}
              <div className="space-y-4">
                <h5 className="font-medium">
                  {language === 'ar' ? 'جودة الاتصال' : 'Connection Quality'}
                </h5>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>{language === 'ar' ? 'الجودة الحالية' : 'Current Quality'}</span>
                    <span className="font-medium">{qualityStatus.text}</span>
                  </div>
                  <Progress value={qualityStatus.progress} className="h-2" />
                  
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{language === 'ar' ? 'زمن الاستجابة' : 'Latency'}</span>
                    <span className={cn(
                      "font-mono",
                      networkLatency > 150 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {networkLatency.toFixed(0)}ms
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{language === 'ar' ? 'آخر فحص' : 'Last Check'}</span>
                    <span>{lastQualityCheck.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Call notes section */}
            <div className="space-y-3">
              <h5 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {language === 'ar' ? 'ملاحظات المكالمة' : 'Call Notes'}
              </h5>
              <Textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder={language === 'ar' ? 
                  'أضف ملاحظات حول المكالمة...' : 
                  'Add notes about the call...'
                }
                className="min-h-[100px]"
              />
              <Button
                onClick={handleSaveNotes}
                disabled={!callNotes.trim()}
                size="sm"
                className="w-auto"
              >
                {language === 'ar' ? 'حفظ الملاحظات' : 'Save Notes'}
              </Button>
            </div>

            {/* Compliance notice */}
            {(isTherapySession || isEmergencyCall) && (
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  {language === 'ar' ? 
                    'هذه المكالمة يتم تسجيلها والاحتفاظ بها لأغراض التوثيق الطبي والامتثال للوائح.' :
                    'This call is being recorded and stored for medical documentation and compliance purposes.'
                  }
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Connection issues alert */}
        {!connectionStable && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              {language === 'ar' ? 
                'مشاكل في جودة الاتصال. قد تتأثر جودة الصوت.' :
                'Connection issues detected. Audio quality may be affected.'
              }
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}