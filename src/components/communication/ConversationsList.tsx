import React from 'react'
import { MessageCircle, Search, Filter, AlertCircle, Phone, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, formatDate } from '@/lib/utils'
import type { Conversation, ConversationFilters } from '@/types/communication'
import { useConversations } from '@/hooks/useRealTimeMessaging'

interface ConversationsListProps {
  currentUserId: string
  selectedConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onStartVoiceCall?: (conversationId: string) => void
  onStartVideoCall?: (conversationId: string) => void
  className?: string
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  onStartVoiceCall,
  onStartVideoCall,
  className
}) => {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filters, setFilters] = React.useState<ConversationFilters>({})

  const { data: conversations, isLoading } = useConversations(currentUserId, {
    ...filters,
    search: searchTerm || undefined
  })

  const sortedConversations = React.useMemo(() => {
    return [...(conversations || [])].sort((a, b) => {
      // Prioritize unread messages
      const aUnread = currentUserId === a.parent_id ? a.unread_count_parent : a.unread_count_therapist
      const bUnread = currentUserId === b.parent_id ? b.unread_count_parent : b.unread_count_therapist
      
      if (aUnread > 0 && bUnread === 0) return -1
      if (aUnread === 0 && bUnread > 0) return 1
      
      // Then by last message time
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    })
  }, [conversations, currentUserId])

  const getConversationPartner = (conversation: Conversation) => {
    return currentUserId === conversation.parent_id 
      ? conversation.therapist 
      : conversation.parent
  }

  const getUnreadCount = (conversation: Conversation) => {
    return currentUserId === conversation.parent_id 
      ? conversation.unread_count_parent 
      : conversation.unread_count_therapist
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500 text-right">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-white border-l border-gray-200", className)}>
      {/* Search and Filters */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="البحث في المحادثات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 text-right"
            dir="rtl"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select 
            value={filters.status || 'all'} 
            onValueChange={(value) => setFilters({
              ...filters, 
              status: value === 'all' ? undefined : value as any
            })}
          >
            <SelectTrigger className="flex-1 text-right">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشطة</SelectItem>
              <SelectItem value="archived">مؤرشفة</SelectItem>
              <SelectItem value="muted">مكتومة</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setFilters({
              ...filters, 
              has_unread: filters.has_unread ? undefined : true
            })}
            className={cn(
              "shrink-0",
              filters.has_unread && "bg-blue-50 text-blue-700 border-blue-300"
            )}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-gray-100">
          {sortedConversations.map((conversation) => {
            const partner = getConversationPartner(conversation)
            const unreadCount = getUnreadCount(conversation)
            const isSelected = selectedConversationId === conversation.id
            
            return (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  "p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                  isSelected && "bg-blue-50 border-r-4 border-r-blue-500"
                )}
              >
                <div className="flex items-start gap-3 flex-row-reverse">
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={partner?.avatar_url} />
                      <AvatarFallback>
                        {partner?.name?.slice(0, 2) || 'مج'}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.status === 'active' && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <h3 className="font-medium text-gray-900 text-right truncate">
                          {partner?.name || 'مستخدم'}
                        </h3>
                        {conversation.latest_message?.priority_level === 'urgent' && (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">
                        {conversation.last_message_at && formatDate(conversation.last_message_at, 'ar-SA')}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-right">
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.latest_message?.content_ar || 
                           conversation.latest_message?.content_en || 
                           'لا توجد رسائل'}
                        </p>
                        
                        {/* Subject/Title */}
                        {(conversation.title_ar || conversation.title_en) && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {conversation.title_ar || conversation.title_en}
                          </p>
                        )}
                      </div>

                      {/* Status Indicators */}
                      <div className="flex items-center gap-1 mr-2 shrink-0">
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs min-w-[20px] h-5 flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                        
                        {conversation.latest_message?.requires_response && (
                          <Badge variant="secondary" className="text-xs">
                            يتطلب رد
                          </Badge>
                        )}

                        {conversation.status === 'muted' && (
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1 mt-2 justify-end">
                      {conversation.voice_calls_enabled && onStartVoiceCall && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onStartVoiceCall(conversation.id)
                          }}
                          className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                        >
                          <Phone className="w-3 h-3" />
                        </Button>
                      )}
                      
                      {conversation.voice_calls_enabled && onStartVideoCall && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onStartVideoCall(conversation.id)
                          }}
                          className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                        >
                          <Video className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {sortedConversations.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-right">لا توجد محادثات</p>
              <p className="text-xs text-gray-400 text-right mt-1">
                {searchTerm ? 'لا توجد نتائج للبحث' : 'ستظهر المحادثات هنا'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}