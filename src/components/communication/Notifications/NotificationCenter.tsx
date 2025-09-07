/**
 * Notification Center - In-App Notification Management
 * Comprehensive notification center with bilingual support and priority handling
 * Arkan Al-Numo Center - Communication Notification System
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  X,
  Trash2,
  Archive,
  Star,
  Phone,
  MessageCircle,
  FileText,
  AlertTriangle,
  Settings,
  Filter,
  Search,
  Calendar,
  Clock,
  User,
  Users,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import type { CommunicationNotificationType } from '@/services/communication-push-notifications'

interface Notification {
  id: string
  type: CommunicationNotificationType
  title_ar: string
  title_en: string
  message_ar: string
  message_en: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  read: boolean
  archived: boolean
  data: any
  sender_id?: string
  sender_name?: string
  sender_avatar?: string
  created_at: string
  expires_at?: string
  category: 'message' | 'call' | 'system' | 'alert'
}

interface NotificationCenterProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  onNotificationClick?: (notification: Notification) => void
  maxHeight?: string
  className?: string
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  isOpen,
  onClose,
  onNotificationClick,
  maxHeight = '80vh',
  className
}) => {
  const { language, isRTL } = useLanguage()
  
  // State
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'priority' | 'archived'>('all')
  const [filterType, setFilterType] = useState<CommunicationNotificationType | 'all'>('all')
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())
  const [unreadCount, setUnreadCount] = useState(0)

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    try {
      let query = supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!sender_id(id, name, avatar_url)
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      // Apply filters based on active tab
      if (activeTab === 'unread') {
        query = query.eq('read', false)
      } else if (activeTab === 'priority') {
        query = query.in('priority', ['high', 'urgent'])
      } else if (activeTab === 'archived') {
        query = query.eq('archived', true)
      } else {
        // For 'all', exclude archived by default
        query = query.eq('archived', false)
      }

      // Apply type filter
      if (filterType !== 'all') {
        query = query.eq('type', filterType)
      }

      const { data, error } = await query

      if (error) throw error

      const processedNotifications: Notification[] = (data || []).map(notif => ({
        ...notif,
        sender_name: notif.sender?.name,
        sender_avatar: notif.sender?.avatar_url,
        category: getCategoryFromType(notif.type)
      }))

      setNotifications(processedNotifications)
      
      // Update unread count
      const unread = processedNotifications.filter(n => !n.read && !n.archived).length
      setUnreadCount(unread)
      
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, activeTab, filterType])

  // Get category from notification type
  const getCategoryFromType = (type: CommunicationNotificationType): 'message' | 'call' | 'system' | 'alert' => {
    if (type.includes('message')) return 'message'
    if (type.includes('voice_call')) return 'call'
    if (type.includes('emergency') || type.includes('urgent')) return 'alert'
    return 'system'
  }

  // Get icon for notification type
  const getNotificationIcon = (notification: Notification) => {
    const iconClass = "w-5 h-5"
    
    switch (notification.category) {
      case 'message':
        return <MessageCircle className={cn(iconClass, getIconColor(notification.priority))} />
      case 'call':
        return <Phone className={cn(iconClass, getIconColor(notification.priority))} />
      case 'alert':
        return <AlertTriangle className={cn(iconClass, "text-red-500")} />
      case 'system':
        return <Bell className={cn(iconClass, getIconColor(notification.priority))} />
      default:
        return <Bell className={cn(iconClass, "text-gray-500")} />
    }
  }

  // Get icon color based on priority
  const getIconColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500'
      case 'high': return 'text-orange-500'
      case 'medium': return 'text-blue-500'
      case 'low': return 'text-gray-500'
      default: return 'text-gray-500'
    }
  }

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    if (priority === 'low') return null

    const variants = {
      urgent: 'destructive',
      high: 'destructive',
      medium: 'secondary'
    } as const

    const labels = {
      urgent: language === 'ar' ? 'عاجل' : 'Urgent',
      high: language === 'ar' ? 'مهم' : 'High',
      medium: language === 'ar' ? 'متوسط' : 'Medium'
    }

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'secondary'} className="text-xs">
        {labels[priority as keyof typeof labels]}
      </Badge>
    )
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (!error) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  // Archive notification
  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ archived: true })
        .eq('id', notificationId)

      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
    } catch (error) {
      console.error('Failed to archive notification:', error)
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    onNotificationClick?.(notification)
  }

  // Filter notifications based on search
  const filteredNotifications = notifications.filter(notification => {
    if (!searchQuery) return true
    
    const title = language === 'ar' ? notification.title_ar : notification.title_en
    const message = language === 'ar' ? notification.message_ar : notification.message_en
    
    return title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           notification.sender_name?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Real-time subscription for notifications
  useEffect(() => {
    if (!userId) return

    const channel = supabase.channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      }, (payload) => {
        const newNotification = payload.new as Notification
        setNotifications(prev => [{ ...newNotification, category: getCategoryFromType(newNotification.type) }, ...prev])
        if (!newNotification.read) {
          setUnreadCount(prev => prev + 1)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      }, (payload) => {
        const updatedNotification = payload.new as Notification
        setNotifications(prev => 
          prev.map(n => 
            n.id === updatedNotification.id 
              ? { ...updatedNotification, category: getCategoryFromType(updatedNotification.type) }
              : n
          )
        )
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId])

  // Load notifications on mount and tab change
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language === 'ar' ? ar : enUS
    })
  }

  if (!isOpen) return null

  return (
    <Card className={cn("fixed top-16 w-96 z-50 shadow-xl", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5" />
            {language === 'ar' ? 'مركز الإشعارات' : 'Notification Center'}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                size="sm"
                variant="ghost"
                className="text-xs"
              >
                <CheckCheck className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              onClick={onClose}
              size="sm"
              variant="ghost"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'البحث في الإشعارات...' : 'Search notifications...'}
              className="pl-10 h-8"
            />
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="text-xs">
                  <Filter className="w-3 h-3 mr-1" />
                  {language === 'ar' ? 'النوع' : 'Type'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterType('all')}>
                  {language === 'ar' ? 'جميع الأنواع' : 'All Types'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('new_message')}>
                  {language === 'ar' ? 'الرسائل' : 'Messages'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('voice_call_incoming')}>
                  {language === 'ar' ? 'المكالمات' : 'Calls'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="w-full grid grid-cols-4 rounded-none border-b">
            <TabsTrigger value="all" className="text-xs">
              {language === 'ar' ? 'الكل' : 'All'}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              {language === 'ar' ? 'غير مقروء' : 'Unread'}
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="priority" className="text-xs">
              {language === 'ar' ? 'مهم' : 'Priority'}
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-xs">
              {language === 'ar' ? 'الأرشيف' : 'Archived'}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className={`max-h-[${maxHeight}]`}>
            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">
                    {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 hover:bg-gray-50 cursor-pointer transition-colors",
                        !notification.read && "bg-blue-50 border-l-2 border-blue-500",
                        notification.priority === 'urgent' && "border-l-2 border-red-500"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-sm truncate">
                                {language === 'ar' ? notification.title_ar : notification.title_en}
                              </h4>
                              {getPriorityBadge(notification.priority)}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {language === 'ar' ? notification.message_ar : notification.message_en}
                          </p>

                          {/* Sender info */}
                          {notification.sender_name && (
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={notification.sender_avatar} />
                                <AvatarFallback className="text-xs">
                                  {notification.sender_name.slice(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-gray-500">
                                {notification.sender_name}
                              </span>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                {language === 'ar' ? 'تم القراءة' : 'Mark Read'}
                              </Button>
                            )}

                            {activeTab !== 'archived' && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  archiveNotification(notification.id)
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                              >
                                <Archive className="w-3 h-3 mr-1" />
                                {language === 'ar' ? 'أرشفة' : 'Archive'}
                              </Button>
                            )}

                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              {language === 'ar' ? 'حذف' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  )
}