import React, { useState, useEffect, useRef } from 'react'
import {
  Bell, 
  BellRing, 
  X, 
  Check,
  CheckCheck,
  Filter,
  Search,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  Clock,
  Settings,
  Trash2,
  Archive
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { 
  notificationService, 
  type Notification, 
  type NotificationType, 
  type NotificationPriority 
} from '@/services/notification-service'

interface NotificationCenterProps {
  userId: string
  userType: 'parent' | 'therapist' | 'admin' | 'student'
  showAsDropdown?: boolean
  className?: string
  onNotificationClick?: (notification: Notification) => void
}

type FilterTab = 'all' | 'unread' | 'urgent' | 'today'

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  userType,
  showAsDropdown = false,
  className = '',
  onNotificationClick
}) => {
  const { language, isRTL } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Load notifications
  useEffect(() => {
    loadNotifications()
    
    // Set up real-time subscription
    unsubscribeRef.current = notificationService.subscribeToUserNotifications(
      userId,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev])
        playNotificationSound(newNotification.priority)
        showToastNotification(newNotification)
      }
    )

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [userId])

  // Filter notifications
  useEffect(() => {
    let filtered = notifications

    // Apply tab filter
    switch (activeTab) {
      case 'unread':
        filtered = filtered.filter(n => !n.is_read)
        break
      case 'urgent':
        filtered = filtered.filter(n => n.priority === 'urgent' || n.priority === 'high')
        break
      case 'today':
        const today = new Date().toDateString()
        filtered = filtered.filter(n => new Date(n.created_at).toDateString() === today)
        break
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      )
    }

    setFilteredNotifications(filtered)
  }, [notifications, activeTab, searchQuery])

  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const data = await notificationService.getUserNotifications(userId, {
        limit: 50
      })
      setNotifications(data)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      toast.error(
        language === 'ar' ? 'فشل في تحميل الإشعارات' : 'Failed to load notifications'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const playNotificationSound = (priority: NotificationPriority) => {
    if (audioRef.current && 'Notification' in window) {
      const frequency = priority === 'urgent' ? 800 : priority === 'high' ? 600 : 400
      
      try {
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
      } catch (error) {
        console.warn('Could not play notification sound:', error)
      }
    }
  }

  const showToastNotification = (notification: Notification) => {
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
        toast.info(message, { duration: 5000 })
        break
      default:
        toast(message, { duration: 3000 })
    }

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      })
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await notificationService.markAsRead(notification.id)
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        )
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }

    if (onNotificationClick) {
      onNotificationClick(notification)
    }

    if (showAsDropdown) {
      setIsOpen(false)
    }
  }

  const markAllAsRead = async () => {
    setIsLoading(true)
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read)
      await Promise.all(
        unreadNotifications.map(n => notificationService.markAsRead(n.id))
      )
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      
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

  const deleteSelected = async () => {
    if (selectedNotifications.length === 0) return

    try {
      // TODO: Implement delete notifications API
      setNotifications(prev => 
        prev.filter(n => !selectedNotifications.includes(n.id))
      )
      setSelectedNotifications([])
      
      toast.success(
        language === 'ar' ? 'تم حذف الإشعارات المحددة' : 'Selected notifications deleted'
      )
    } catch (error) {
      toast.error(
        language === 'ar' ? 'فشل في حذف الإشعارات' : 'Failed to delete notifications'
      )
    }
  }

  const getPriorityIcon = (priority: NotificationPriority) => {
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

  const getPriorityColor = (priority: NotificationPriority) => {
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
  const urgentCount = notifications.filter(n => 
    (n.priority === 'urgent' || n.priority === 'high') && !n.is_read
  ).length

  if (showAsDropdown) {
    return (
      <div className={`relative ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Notification Bell */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative"
        >
          {urgentCount > 0 ? (
            <BellRing className="h-5 w-5 text-red-600 animate-pulse" />
          ) : unreadCount > 0 ? (
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
          <div className="absolute top-full right-0 mt-2 w-96 max-h-[80vh] bg-white rounded-lg border shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الإشعارات' : 'Notifications'}
                {unreadCount > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {unreadCount}
                  </Badge>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={isLoading}
                    title={language === 'ar' ? 'تمييز الكل كمقروء' : 'Mark all read'}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-96">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className={language === 'ar' ? 'font-arabic' : ''}>
                    {isLoading
                      ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...')
                      : (language === 'ar' ? 'لا توجد إشعارات' : 'No notifications')
                    }
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border-l-4 cursor-pointer hover:bg-gray-50 transition-colors mb-2 ${
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
                          <p className={`text-sm text-muted-foreground mt-1 line-clamp-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
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

            <div className="border-t p-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setIsOpen(false)
                  // Navigate to full notification center
                }}
              >
                {language === 'ar' ? 'عرض جميع الإشعارات' : 'View All Notifications'}
              </Button>
            </div>
          </div>
        )}

        {/* Hidden audio element for notification sounds */}
        <audio ref={audioRef} preload="auto" />
      </div>
    )
  }

  // Full notification center view
  return (
    <Card className={`w-full ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Bell className="h-5 w-5" />
            {language === 'ar' ? 'مركز الإشعارات' : 'Notification Center'}
            {unreadCount > 0 && (
              <Badge variant="secondary">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedNotifications.length > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteSelected}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={isLoading}>
                <CheckCheck className="h-4 w-4" />
                {language === 'ar' ? 'تمييز الكل' : 'Mark All'}
              </Button>
            )}
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              placeholder={language === 'ar' ? 'البحث في الإشعارات...' : 'Search notifications...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${isRTL ? 'pr-10' : 'pl-10'} ${language === 'ar' ? 'font-arabic' : ''}`}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setActiveTab('all')}>
                {language === 'ar' ? 'جميع الإشعارات' : 'All Notifications'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('unread')}>
                {language === 'ar' ? 'غير مقروءة' : 'Unread'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('urgent')}>
                {language === 'ar' ? 'عاجلة' : 'Urgent'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('today')}>
                {language === 'ar' ? 'اليوم' : 'Today'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-96">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className={`text-lg font-semibold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {isLoading
                  ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...')
                  : (language === 'ar' ? 'لا توجد إشعارات' : 'No notifications')
                }
              </h3>
              {!isLoading && (
                <p className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' 
                    ? 'ستظهر الإشعارات الجديدة هنا' 
                    : 'New notifications will appear here'
                  }
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    getPriorityColor(notification.priority)
                  } ${!notification.is_read ? 'shadow-sm' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        setSelectedNotifications(prev =>
                          e.target.checked
                            ? [...prev, notification.id]
                            : prev.filter(id => id !== notification.id)
                        )
                      }}
                      className="mt-1"
                    />
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
        <audio ref={audioRef} preload="auto" />
      </CardContent>
    </Card>
  )
}

export default NotificationCenter