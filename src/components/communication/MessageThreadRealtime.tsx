import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, Phone, Video, MoreVertical, CheckCheck, Check, Smile, Reply, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
// Tooltip components not available - using hover titles instead
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn, formatDate } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRealTimeMessaging } from '@/hooks/useRealTimeMessaging'
import { messagingService } from '@/services/messaging-service'
import type { Message, Conversation, MediaAttachment, MessageReaction } from '@/types/communication'

interface MessageThreadRealtimeProps {
  conversationId: string
  currentUserId: string
  conversation?: Conversation
  onVoiceCall?: () => void
  onVideoCall?: () => void
  onFileUpload?: () => void
  className?: string
}

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showAvatar: boolean
  onReact: (messageId: string, reaction: string) => void
  onReply: (message: Message) => void
  language: 'ar' | 'en'
  isRTL: boolean
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwn, 
  showAvatar, 
  onReact, 
  onReply,
  language,
  isRTL 
}) => {
  const [showReactions, setShowReactions] = useState(false)
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { 
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
            className="w-full h-auto max-h-48 object-cover cursor-pointer hover:opacity-90"
            onClick={() => window.open(attachment.file_path, '_blank')}
          />
          {attachment.compressed && (
            <Badge className="absolute top-2 right-2 text-xs">
              {language === 'ar' ? 'مضغوط' : 'Compressed'}
            </Badge>
          )}
        </div>
      )
    }
    
    if (attachment.mime_type.startsWith('video/')) {
      return (
        <div className="relative mb-2 max-w-xs rounded-lg overflow-hidden">
          <video 
            controls
            className="w-full h-auto max-h-48"
            poster={attachment.thumbnail_path}
          >
            <source src={attachment.file_path} type={attachment.mime_type} />
          </video>
        </div>
      )
    }

    // Document/file attachment
    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-2 cursor-pointer hover:bg-muted/80"
           onClick={() => window.open(attachment.file_path, '_blank')}>
        <Paperclip className="h-4 w-4" />
        <span className="text-sm truncate max-w-[200px]">{attachment.filename}</span>
        <span className="text-xs text-muted-foreground">
          {(attachment.file_size / 1024).toFixed(1)}KB
        </span>
      </div>
    )
  }

  const messageContent = language === 'ar' ? message.content_ar : message.content_en

  return (
    <div className={cn(
      "flex gap-2 mb-4 group",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      {showAvatar && !isOwn && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={message.sender?.avatar_url} />
          <AvatarFallback>
            {message.sender?.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "flex flex-col max-w-[70%]",
        isOwn ? "items-end" : "items-start"
      )}>
        {/* Reply reference if exists */}
        {message.reply_to_message_id && message.reply_to && (
          <div className={cn(
            "text-xs text-muted-foreground mb-1 px-3 py-1 bg-muted/50 rounded",
            isRTL ? "text-right" : "text-left"
          )}>
            <Reply className="h-3 w-3 inline mr-1" />
            {language === 'ar' ? message.reply_to.content_ar : message.reply_to.content_en}
          </div>
        )}

        <div 
          className={cn(
            "relative rounded-lg px-4 py-2",
            isOwn 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted",
            message.priority_level === 'urgent' && "ring-2 ring-red-500",
            message.priority_level === 'high' && "ring-2 ring-orange-500"
          )}
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
        >
          {/* Priority badge */}
          {(message.priority_level === 'urgent' || message.priority_level === 'high') && (
            <Badge 
              variant={message.priority_level === 'urgent' ? 'destructive' : 'default'}
              className="absolute -top-2 -right-2 text-xs"
            >
              {language === 'ar' 
                ? (message.priority_level === 'urgent' ? 'عاجل' : 'مهم')
                : message.priority_level.toUpperCase()
              }
            </Badge>
          )}

          {/* Media attachments */}
          {message.media_attachments?.length > 0 && (
            <div className="mb-2">
              {message.media_attachments.map((attachment, idx) => (
                <div key={idx}>
                  {renderMediaPreview(attachment)}
                </div>
              ))}
            </div>
          )}

          {/* Message text */}
          {messageContent && (
            <p className={cn(
              "text-sm whitespace-pre-wrap break-words",
              isRTL ? "text-right" : "text-left"
            )}>
              {messageContent}
            </p>
          )}

          {/* Message status and time */}
          <div className={cn(
            "flex items-center gap-1 mt-1",
            isOwn ? "justify-end" : "justify-start"
          )}>
            <span className="text-xs opacity-70">
              {formatTime(message.created_at)}
            </span>
            {isOwn && (
              <>
                {message.read_status ? (
                  <CheckCheck className="h-3 w-3 text-blue-400" />
                ) : message.delivered_at ? (
                  <CheckCheck className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </>
            )}
          </div>

          {/* Quick reactions */}
          {showReactions && (
            <div className="absolute -top-8 left-0 bg-white dark:bg-gray-800 rounded-full shadow-lg p-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {['👍', '❤️', '😊', '🎉', '👏'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className="hover:scale-110 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => onReply(message)}
                className="hover:scale-110 transition-transform p-1"
              >
                <Reply className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Reactions display */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 mt-1">
            {message.reactions.map((reaction: MessageReaction, idx: number) => (
              <span key={idx} className="text-xs bg-muted px-2 py-1 rounded-full">
                {reaction.reaction_emoji} {reaction.count || 1}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const MessageThreadRealtime: React.FC<MessageThreadRealtimeProps> = ({
  conversationId,
  currentUserId,
  conversation,
  onVoiceCall,
  onVideoCall,
  onFileUpload,
  className
}) => {
  const { language, isRTL } = useLanguage()
  const [messageInput, setMessageInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [isSending, setIsSending] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const lastMessageRef = useRef<string>('')

  // Real-time messaging hook
  const {
    messages,
    isConnected,
    isLoading,
    error,
    typingUsers,
    onlineUsers,
    sendMessage,
    markAsRead,
    sendTypingIndicator,
    addReaction
  } = useRealTimeMessaging({
    conversationId,
    userId: currentUserId,
    onMessageReceived: (message) => {
      // Auto-scroll to new message
      scrollToBottom()
      // Mark as read if conversation is open
      if (document.hasFocus()) {
        markAsRead(message.id)
      }
    }
  })

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [])

  // Scroll to bottom on mount and messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Mark messages as read when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      messages
        .filter(m => !m.read_status && m.recipient_id === currentUserId)
        .forEach(m => markAsRead(m.id))
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [messages, currentUserId, markAsRead])

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true)
      sendTypingIndicator(true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      sendTypingIndicator(false)
    }, 2000)
  }, [isTyping, sendTypingIndicator])

  // Handle message send
  const handleSendMessage = async () => {
    if (!messageInput.trim() && !replyingTo) return

    setIsSending(true)
    
    try {
      await sendMessage({
        content_ar: language === 'ar' ? messageInput : undefined,
        content_en: language === 'en' ? messageInput : undefined,
        reply_to_message_id: replyingTo?.id
      })

      setMessageInput('')
      setReplyingTo(null)
      setIsTyping(false)
      sendTypingIndicator(false)
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  // Handle reaction
  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji)
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }

  // Group messages by sender for avatar display
  const groupedMessages = messages.reduce((acc, message, index) => {
    const prevMessage = messages[index - 1]
    const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id
    return [...acc, { ...message, showAvatar }]
  }, [] as (Message & { showAvatar: boolean })[])

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation?.participant?.avatar_url} />
              <AvatarFallback>
                {conversation?.participant?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">
                {conversation?.participant?.name || 
                 (language === 'ar' ? 'محادثة' : 'Conversation')}
              </h3>
              <div className="flex items-center gap-2">
                {onlineUsers.has(conversation?.participant?.id || '') ? (
                  <Badge variant="outline" className="text-xs">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    {language === 'ar' ? 'متصل' : 'Online'}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'غير متصل' : 'Offline'}
                  </span>
                )}
                {typingUsers.size > 0 && (
                  <span className="text-xs text-muted-foreground italic">
                    {language === 'ar' ? 'يكتب...' : 'typing...'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onVoiceCall && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onVoiceCall}
                title={language === 'ar' ? 'مكالمة صوتية' : 'Voice Call'}
              >
                <Phone className="h-4 w-4" />
              </Button>
            )}
            {onVideoCall && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onVideoCall}
                title={language === 'ar' ? 'مكالمة فيديو' : 'Video Call'}
              >
                <Video className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? "start" : "end"}>
                <DropdownMenuItem>
                  {language === 'ar' ? 'كتم الإشعارات' : 'Mute Notifications'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {language === 'ar' ? 'حذف المحادثة' : 'Delete Conversation'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {language === 'ar' ? 'الإبلاغ' : 'Report'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      {/* Connection status */}
      {!isConnected && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400">
          {language === 'ar' ? 'جاري إعادة الاتصال...' : 'Reconnecting...'}
        </div>
      )}

      {/* Messages area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500">
            {language === 'ar' ? 'خطأ في تحميل الرسائل' : 'Error loading messages'}
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="text-center text-muted-foreground">
            {language === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}
          </div>
        ) : (
          <div>
            {groupedMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === currentUserId}
                showAvatar={message.showAvatar}
                onReact={handleReaction}
                onReply={setReplyingTo}
                language={language}
                isRTL={isRTL}
              />
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Reply className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {language === 'ar' ? 'الرد على: ' : 'Replying to: '}
              {language === 'ar' ? replyingTo.content_ar : replyingTo.content_en}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyingTo(null)}
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
      )}

      {/* Input area */}
      <CardContent className="border-t p-4">
        <form 
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="flex items-center gap-2"
        >
          {onFileUpload && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={onFileUpload}
              title={language === 'ar' ? 'إرفاق ملف' : 'Attach File'}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          )}
          
          <Input
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value)
              handleTyping()
            }}
            placeholder={language === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
            disabled={isSending}
            className="flex-1"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          
          <Button 
            type="submit" 
            size="icon"
            disabled={!messageInput.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className={cn("h-4 w-4", isRTL && "rotate-180")} />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default MessageThreadRealtime