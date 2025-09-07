import React, { useState, useEffect, useMemo } from 'react'
import { Search, MessageCircle, Filter, Users, Bell, BellOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { messagingService } from '@/services/messaging-service'
import { supabase } from '@/lib/supabase'
import type { Conversation, Message } from '@/types/communication'

interface ConversationListRealtimeProps {
  currentUserId: string
  onConversationSelect: (conversation: Conversation) => void
  selectedConversationId?: string
  className?: string
}

interface ConversationItemProps {
  conversation: Conversation & {
    last_message?: Message
    participant?: {
      id: string
      name: string
      email: string
      avatar_url?: string
    }
    student?: {
      first_name_ar: string
      last_name_ar: string
      first_name_en: string
      last_name_en: string
    }
  }
  isSelected: boolean
  isOnline: boolean
  currentUserId: string
  language: 'ar' | 'en'
  isRTL: boolean
  onClick: () => void
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  isOnline,
  currentUserId,
  language,
  isRTL,
  onClick
}) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } else if (diffDays === 1) {
      return language === 'ar' ? 'أمس' : 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
        weekday: 'short'
      })
    } else {
      return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const unreadCount = currentUserId === conversation.parent_id 
    ? conversation.unread_count_parent 
    : conversation.unread_count_therapist

  const participantName = conversation.participant?.name || 
    (language === 'ar' ? 'مستخدم' : 'User')

  const studentName = language === 'ar'
    ? `${conversation.student?.first_name_ar || ''} ${conversation.student?.last_name_ar || ''}`
    : `${conversation.student?.first_name_en || ''} ${conversation.student?.last_name_en || ''}`

  const lastMessageContent = conversation.last_message
    ? (language === 'ar' ? conversation.last_message.content_ar : conversation.last_message.content_en)
    : (language === 'ar' ? 'لا توجد رسائل' : 'No messages')

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer transition-colors rounded-lg",
        isSelected 
          ? "bg-primary/10 hover:bg-primary/15" 
          : "hover:bg-muted/50",
        "border-b last:border-b-0"
      )}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={conversation.participant?.avatar_url} />
          <AvatarFallback>
            {participantName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1">
            <h3 className={cn(
              "font-semibold text-sm truncate",
              isRTL ? "text-right" : "text-left"
            )}>
              {participantName}
            </h3>
            <p className={cn(
              "text-xs text-muted-foreground truncate",
              isRTL ? "text-right" : "text-left"
            )}>
              {studentName}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground">
              {conversation.last_message_at && formatTime(conversation.last_message_at)}
            </span>
            {unreadCount > 0 && (
              <Badge 
                variant="default" 
                className="h-5 min-w-[20px] px-1 text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.last_message?.priority_level === 'urgent' && (
            <Badge variant="destructive" className="text-xs h-5">
              {language === 'ar' ? 'عاجل' : 'Urgent'}
            </Badge>
          )}
          {conversation.last_message?.priority_level === 'high' && (
            <Badge variant="secondary" className="text-xs h-5">
              {language === 'ar' ? 'مهم' : 'Important'}
            </Badge>
          )}
          <p className={cn(
            "text-sm text-muted-foreground truncate flex-1",
            isRTL ? "text-right" : "text-left"
          )}>
            {conversation.last_message?.message_type === 'media' ? (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {language === 'ar' ? 'مرفق' : 'Attachment'}
              </span>
            ) : (
              lastMessageContent
            )}
          </p>
        </div>
      </div>

      {conversation.status === 'muted' && (
        <BellOff className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  )
}

export const ConversationListRealtime: React.FC<ConversationListRealtimeProps> = ({
  currentUserId,
  onConversationSelect,
  selectedConversationId,
  className
}) => {
  const { language, isRTL } = useLanguage()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'urgent'>('all')
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  // Load conversations
  useEffect(() => {
    loadConversations()
    
    // Set up real-time subscriptions
    const channel = supabase
      .channel(`user_conversations:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `parent_id=eq.${currentUserId}`
        },
        handleConversationChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `therapist_id=eq.${currentUserId}`
        },
        handleConversationChange
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const onlineUserIds = new Set(
          Object.values(state).flat().map((presence: any) => presence.user_id)
        )
        setOnlineUsers(onlineUserIds)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUserId })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [currentUserId])

  const loadConversations = async () => {
    setIsLoading(true)
    try {
      const data = await messagingService.getUserConversations(currentUserId)
      setConversations(data)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConversationChange = (payload: any) => {
    if (payload.eventType === 'UPDATE') {
      setConversations(prev => 
        prev.map(conv => 
          conv.id === payload.new.id ? { ...conv, ...payload.new } : conv
        ).sort((a, b) => 
          new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        )
      )
    } else if (payload.eventType === 'INSERT') {
      loadConversations() // Reload to get full conversation data
    }
  }

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let filtered = [...conversations]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(conv => {
        const participantName = conv.participant?.name?.toLowerCase() || ''
        const studentNameAr = `${conv.student?.first_name_ar || ''} ${conv.student?.last_name_ar || ''}`.toLowerCase()
        const studentNameEn = `${conv.student?.first_name_en || ''} ${conv.student?.last_name_en || ''}`.toLowerCase()
        const query = searchQuery.toLowerCase()
        
        return participantName.includes(query) || 
               studentNameAr.includes(query) || 
               studentNameEn.includes(query)
      })
    }

    // Status filter
    if (filterStatus === 'unread') {
      filtered = filtered.filter(conv => {
        const unreadCount = currentUserId === conv.parent_id 
          ? conv.unread_count_parent 
          : conv.unread_count_therapist
        return unreadCount > 0
      })
    } else if (filterStatus === 'urgent') {
      filtered = filtered.filter(conv => 
        conv.last_message?.priority_level === 'urgent' || 
        conv.last_message?.priority_level === 'high'
      )
    }

    return filtered
  }, [conversations, searchQuery, filterStatus, currentUserId])

  // Calculate stats
  const totalUnread = conversations.reduce((sum, conv) => {
    const unreadCount = currentUserId === conv.parent_id 
      ? conv.unread_count_parent 
      : conv.unread_count_therapist
    return sum + unreadCount
  }, 0)

  const urgentCount = conversations.filter(conv => 
    conv.last_message?.priority_level === 'urgent'
  ).length

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {language === 'ar' ? 'المحادثات' : 'Conversations'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <Users className="h-3 w-3 mr-1" />
                {conversations.length}
              </Badge>
              {totalUnread > 0 && (
                <Badge variant="default">
                  {totalUnread} {language === 'ar' ? 'جديد' : 'new'}
                </Badge>
              )}
              {urgentCount > 0 && (
                <Badge variant="destructive">
                  {urgentCount} {language === 'ar' ? 'عاجل' : 'urgent'}
                </Badge>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className={cn(
              "absolute top-2.5 h-4 w-4 text-muted-foreground",
              isRTL ? "right-2" : "left-2"
            )} />
            <Input
              placeholder={language === 'ar' ? 'البحث في المحادثات...' : 'Search conversations...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("pl-8", isRTL && "pl-2 pr-8")}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Filter tabs */}
          <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                {language === 'ar' ? 'الكل' : 'All'}
              </TabsTrigger>
              <TabsTrigger value="unread" className="relative">
                {language === 'ar' ? 'غير مقروء' : 'Unread'}
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </TabsTrigger>
              <TabsTrigger value="urgent">
                {language === 'ar' ? 'عاجل' : 'Urgent'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">
                {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">
                {searchQuery || filterStatus !== 'all'
                  ? (language === 'ar' ? 'لا توجد نتائج' : 'No results found')
                  : (language === 'ar' ? 'لا توجد محادثات' : 'No conversations')
                }
              </p>
            </div>
          ) : (
            <div>
              {filteredConversations.map(conversation => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={conversation.id === selectedConversationId}
                  isOnline={onlineUsers.has(
                    conversation.parent_id === currentUserId 
                      ? conversation.therapist_id 
                      : conversation.parent_id
                  )}
                  currentUserId={currentUserId}
                  language={language}
                  isRTL={isRTL}
                  onClick={() => onConversationSelect(conversation)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default ConversationListRealtime