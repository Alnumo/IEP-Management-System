import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Phone, Video, MoreVertical, CheckCheck, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate } from '@/lib/utils'
import type { Message, Conversation, MediaAttachment } from '@/types/communication'
import { useRealTimeMessaging, useConversation, useSendMessage } from '@/hooks/useRealTimeMessaging'

interface MessageThreadProps {
  conversationId: string
  currentUserId: string
  onVoiceCall?: () => void
  onVideoCall?: () => void
  className?: string
}

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showAvatar: boolean
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, showAvatar }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const renderMediaPreview = (attachment: MediaAttachment) => {
    if (attachment.mime_type.startsWith('image/')) {
      return (
        <div className="relative mb-2 max-w-xs rounded-lg overflow-hidden">
          <img 
            src={attachment.file_path} 
            alt={attachment.filename}
            className="w-full h-auto max-h-48 object-cover"
          />
        </div>
      )
    }
    
    if (attachment.mime_type.startsWith('video/')) {
      return (
        <div className="relative mb-2 max-w-xs rounded-lg overflow-hidden bg-black">
          <video 
            src={attachment.file_path}
            poster={attachment.thumbnail_path}
            controls
            className="w-full h-auto max-h-48"
          />
        </div>
      )
    }

    return (
      <div className="mb-2 p-2 bg-gray-100 rounded-lg max-w-xs">
        <p className="text-sm font-medium text-right">{attachment.filename}</p>
        <p className="text-xs text-gray-500 text-right">
          {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex gap-2 mb-4",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      {showAvatar && !isOwn && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarImage src={message.sender?.avatar_url} />
          <AvatarFallback className="text-xs">
            {message.sender?.name?.slice(0, 2) || 'مج'}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "flex flex-col space-y-1 max-w-[70%]",
        isOwn ? "items-end" : "items-start"
      )}>
        {!isOwn && showAvatar && (
          <span className="text-xs text-gray-500 text-right px-2">
            {message.sender?.name}
          </span>
        )}
        
        <div className={cn(
          "rounded-2xl px-4 py-2 text-sm",
          isOwn 
            ? "bg-blue-600 text-white rounded-br-sm" 
            : "bg-gray-100 text-gray-900 rounded-bl-sm",
          message.message_type === 'system' && "bg-yellow-50 border border-yellow-200 text-yellow-800"
        )}>
          {/* Media Attachments */}
          {message.media_attachments?.map((attachment, index) => (
            <div key={attachment.id || index}>
              {renderMediaPreview(attachment)}
            </div>
          ))}
          
          {/* Message Content */}
          <div className="text-right" dir="rtl">
            {message.content_ar || message.content_en}
          </div>
          
          {/* Priority Badge */}
          {message.priority_level !== 'normal' && (
            <Badge 
              variant={message.priority_level === 'urgent' ? 'destructive' : 'secondary'}
              className="mt-1 text-xs"
            >
              {message.priority_level === 'urgent' ? 'عاجل' : 
               message.priority_level === 'high' ? 'مهم' : 'منخفض'}
            </Badge>
          )}
        </div>
        
        {/* Message Footer */}
        <div className={cn(
          "flex items-center gap-1 px-2 text-xs text-gray-500",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}>
          <span>{formatTime(message.created_at)}</span>
          {isOwn && (
            <div className="flex items-center">
              {message.read_status ? (
                <CheckCheck className="w-3 h-3 text-blue-500" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </div>
          )}
          {message.requires_response && (
            <Badge variant="outline" className="text-xs">
              يتطلب رد
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  conversationId,
  currentUserId,
  onVoiceCall,
  onVideoCall,
  className
}) => {
  const [message, setMessage] = useState('')
  const [showMediaOptions, setShowMediaOptions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Real-time hooks
  const { data: conversation } = useConversation(conversationId)
  const { 
    data: messages, 
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage 
  } = useRealTimeMessaging(conversationId)
  
  const sendMessageMutation = useSendMessage()

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!message.trim()) return

    try {
      await sendMessageMutation.mutateAsync({
        conversation_id: conversationId,
        recipient_id: conversation?.therapist_id === currentUserId 
          ? conversation?.parent_id 
          : conversation?.therapist_id,
        content_ar: message,
        message_type: 'text',
        priority_level: 'normal',
        requires_response: false,
        media_attachments: []
      })
      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      // TODO: Implement file upload with compression (Task 10)
      console.log('Files selected:', files)
    }
  }

  const groupedMessages = messages?.pages.flat().reduce((acc, message, index, arr) => {
    const prevMessage = arr[index - 1]
    const showAvatar = !prevMessage || 
      prevMessage.sender_id !== message.sender_id ||
      new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000 // 5 minutes

    acc.push({
      ...message,
      showAvatar,
      isOwn: message.sender_id === currentUserId
    })
    
    return acc
  }, [] as (Message & { showAvatar: boolean; isOwn: boolean })[]) || []

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 text-right">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-row-reverse">
            <Avatar className="w-10 h-10">
              <AvatarImage src={
                conversation.therapist_id === currentUserId 
                  ? conversation.parent?.avatar_url 
                  : conversation.therapist?.avatar_url
              } />
              <AvatarFallback>
                {(conversation.therapist_id === currentUserId 
                  ? conversation.parent?.name 
                  : conversation.therapist?.name)?.slice(0, 2) || 'مج'}
              </AvatarFallback>
            </Avatar>
            <div className="text-right">
              <h3 className="font-semibold">
                {conversation.therapist_id === currentUserId 
                  ? conversation.parent?.name 
                  : conversation.therapist?.name}
              </h3>
              <p className="text-sm text-blue-100">
                {conversation.title_ar || 'محادثة عامة'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {conversation.voice_calls_enabled && onVoiceCall && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onVoiceCall}
                className="text-white hover:bg-blue-700 h-8 w-8 p-0"
              >
                <Phone className="w-4 h-4" />
              </Button>
            )}
            {conversation.voice_calls_enabled && onVideoCall && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onVideoCall}
                className="text-white hover:bg-blue-700 h-8 w-8 p-0"
              >
                <Video className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700 h-8 w-8 p-0"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-1">
          {/* Load more trigger */}
          {hasNextPage && (
            <div className="text-center mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-xs text-gray-500"
              >
                {isFetchingNextPage ? 'جاري التحميل...' : 'تحميل رسائل أقدم'}
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 mt-2 text-right">جاري تحميل الرسائل...</p>
            </div>
          ) : groupedMessages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-right">لا توجد رسائل بعد</p>
              <p className="text-xs text-gray-400 text-right mt-1">ابدأ محادثة جديدة</p>
            </div>
          ) : (
            groupedMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.isOwn}
                showAvatar={message.showAvatar}
              />
            ))
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        {conversation.status === 'blocked' ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500 text-right">هذه المحادثة محظورة</p>
          </div>
        ) : conversation.status === 'archived' ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500 text-right">هذه المحادثة مؤرشفة</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Media Options */}
            {showMediaOptions && conversation.media_sharing_enabled && (
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  📷 صورة
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  📄 ملف
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMediaOptions(false)}
                  className="text-xs"
                >
                  إلغاء
                </Button>
              </div>
            )}

            {/* Message Input Row */}
            <div className="flex items-end gap-2">
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                {sendMessageMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>

              {conversation.media_sharing_enabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMediaOptions(!showMediaOptions)}
                  className="shrink-0 h-8 w-8 p-0"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              )}

              <Input
                type="text"
                placeholder="اكتب رسالتك هنا..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="flex-1 text-right"
                dir="rtl"
                maxLength={500}
              />
            </div>

            {/* Character Count */}
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{message.length}/500</span>
              {conversation.unread_count_parent > 0 || conversation.unread_count_therapist > 0 ? (
                <span className="text-right">
                  رسائل غير مقروءة: {
                    currentUserId === conversation.parent_id 
                      ? conversation.unread_count_parent 
                      : conversation.unread_count_therapist
                  }
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileSelect}
      />
    </Card>
  )
}