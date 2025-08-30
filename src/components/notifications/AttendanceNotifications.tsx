import { useState, useEffect, useRef } from 'react'
import { Bell, BellRing, X, CheckCircle, AlertTriangle, Info, AlertCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUnreadNotifications, useMarkNotificationRead } from '@/hooks/useAttendance'
import { RealtimeAttendanceAPI } from '@/services/attendance-api'
import { toast } from 'sonner'
import type { AttendanceNotification } from '@/services/attendance-api'

interface AttendanceNotificationsProps {
  recipientId: string
  recipientType: 'parent' | 'therapist' | 'admin' | 'student'
  showAsDropdown?: boolean
  maxNotifications?: number
}

export const AttendanceNotifications = ({
  recipientId,
  recipientType,
  showAsDropdown = false,
  maxNotifications = 10
}: AttendanceNotificationsProps) => {
  const { language, isRTL } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AttendanceNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const subscriptionRef = useRef<any>(null)

  // Hooks
  const { data: unreadNotifications = [], refetch } = useUnreadNotifications(recipientId, recipientType)
  const markAsReadMutation = useMarkNotificationRead()

  // Initialize audio for notification sounds
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3
    }
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    if (!recipientId) return

    try {
      subscriptionRef.current = RealtimeAttendanceAPI.subscribeToNotifications(
        recipientId,
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const newNotification = payload.new as AttendanceNotification
            
            // Add to local state
            setNotifications(prev => [newNotification, ...prev.slice(0, maxNotifications - 1)])
            
            // Play notification sound
            playNotificationSound(newNotification.priority)
            
            // Show toast notification
            showToastNotification(newNotification)
            
            // Refetch unread count
            refetch()
          }
        }
      )
    } catch (error) {
      console.warn('Failed to set up real-time notifications:', error)
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [recipientId, refetch, maxNotifications])

  // Load initial notifications
  useEffect(() => {
    setNotifications(unreadNotifications.slice(0, maxNotifications))
  }, [unreadNotifications, maxNotifications])

  const playNotificationSound = (priority: string) => {
    if (audioRef.current && 'Notification' in window) {
      // Different sounds for different priorities
      const frequency = priority === 'urgent' ? 800 : priority === 'high' ? 600 : 400
      
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = frequency
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    }
  }

  const showToastNotification = (notification: AttendanceNotification) => {
    const message = notification.title
    
    switch (notification.priority) {
      case 'urgent':
        toast.error(message, {
          duration: 10000,
          action: {
            label: language === 'ar' ? 'عرض' : 'View',
            onClick: () => handleNotificationClick(notification)
          }
        })
        break
      case 'high':
        toast.warning(message, {
          duration: 7000,
          action: {
            label: language === 'ar' ? 'عرض' : 'View',
            onClick: () => handleNotificationClick(notification)
          }
        })
        break
      case 'medium':
        toast.info(message, {
          duration: 5000
        })
        break
      default:
        toast(message, {
          duration: 3000
        })
    }

    // Request permission for browser notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      })
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission()
    }
  }

  const handleNotificationClick = async (notification: AttendanceNotification) => {
    if (!notification.is_read) {
      try {
        await markAsReadMutation.mutateAsync(notification.id)
        
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        )
        
        refetch()
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }
    
    // Handle different notification types
    switch (notification.notification_type) {
      case 'student_check_in':
      case 'student_check_out':
        // Navigate to attendance page or show student details
        console.log('Navigate to student attendance:', notification.student_id)
        break
      case 'session_started':
        // Navigate to session details
        console.log('Navigate to session:', notification.session_id)
        break
      case 'emergency_contact':
        // Show emergency contact modal
        console.log('Show emergency contact modal')
        break
    }
    
    if (showAsDropdown) {
      setIsOpen(false)
    }
  }

  const markAllAsRead = async () => {
    setIsLoading(true)
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      await Promise.all(unreadIds.map(id => markAsReadMutation.mutateAsync(id)))
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      refetch()
      
      toast.success(
        language === 'ar' ? 'تم تمييز جميع الإشعارات كمقروءة' : 'All notifications marked as read'
      )
    } catch (error) {
      toast.error(
        language === 'ar' ? 'فشل في تحديث الإشعارات' : 'Failed to update notifications'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'medium':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50'
      case 'high':
        return 'border-l-orange-500 bg-orange-50'
      case 'medium':
        return 'border-l-blue-500 bg-blue-50'
      default:
        return 'border-l-green-500 bg-green-50'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) {
      return language === 'ar' ? 'الآن' : 'now'
    } else if (diffMinutes < 60) {
      return language === 'ar' ? `منذ ${diffMinutes} دقيقة` : `${diffMinutes}m ago`
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60)
      return language === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`
    } else {
      return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (showAsDropdown) {
    return (
      <div className="relative" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Notification Bell */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative gap-2"
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5 text-orange-600" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg border shadow-lg z-50">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الإشعارات' : 'Notifications'}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    {language === 'ar' ? 'تمييز الكل كمقروء' : 'Mark all read'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-96">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        getPriorityColor(notification.priority)
                      } ${!notification.is_read ? 'bg-blue-50' : 'bg-white'}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getPriorityIcon(notification.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-medium text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimestamp(notification.created_at)}
                            </span>
                          </div>
                          <p className={`text-sm text-muted-foreground mt-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {notification.priority}
                            </Badge>
                            {!notification.is_read && (
                              <Badge variant="default" className="text-xs">
                                {language === 'ar' ? 'جديد' : 'NEW'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Hidden audio element for notification sounds */}
        <audio ref={audioRef} preload="auto">
          <source src="/notification.mp3" type="audio/mpeg" />
        </audio>
      </div>
    )
  }

  // Full panel view
  return (
    <Card className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className={`flex items-center justify-between ${language === 'ar' ? 'font-arabic' : ''}`}>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {language === 'ar' ? 'إشعارات الحضور' : 'Attendance Notifications'}
            {unreadCount > 0 && (
              <Badge className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={isLoading}
            >
              {language === 'ar' ? 'تمييز الكل كمقروء' : 'Mark all read'}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className={`text-lg font-semibold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
              </h3>
              <p className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' 
                  ? 'ستظهر إشعارات الحضور هنا' 
                  : 'Attendance notifications will appear here'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    getPriorityColor(notification.priority)
                  } ${!notification.is_read ? 'shadow-sm' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getPriorityIcon(notification.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {notification.title}
                        </h4>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTimestamp(notification.created_at)}
                        </span>
                      </div>
                      <p className={`text-sm text-muted-foreground mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {notification.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {notification.notification_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        {!notification.is_read && (
                          <Badge variant="default" className="text-xs">
                            {language === 'ar' ? 'جديد' : 'NEW'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Hidden audio element for notification sounds */}
        <audio ref={audioRef} preload="auto">
          <source src="/notification.mp3" type="audio/mpeg" />
        </audio>
      </CardContent>
    </Card>
  )
}

export default AttendanceNotifications