import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Phone, 
  Video, 
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ParentMobileNav } from '@/components/parent/ParentMobileNav'
import { ParentDesktopNav } from '@/components/parent/ParentDesktopNav'
import { parentPortalService } from '@/services/parent-portal'
import type { ParentMessage, MessageFilters, ParentUser } from '@/types/parent-portal'

export default function ParentMessagesPage() {
  const [messages, setMessages] = useState<ParentMessage[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [parentUser, setParentUser] = useState<ParentUser | null>(null)
  const [filters, setFilters] = useState<MessageFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Check authentication
    const storedUser = localStorage.getItem('parentUser')
    if (!storedUser) {
      navigate('/parent-login')
      return
    }

    const user = JSON.parse(storedUser)
    setParentUser(user)
    loadMessages(user.id)
  }, [navigate])

  const loadMessages = async (parentId: string) => {
    try {
      const messagesData = await parentPortalService.getMessages(parentId, filters)
      setMessages(messagesData)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !parentUser) return

    setSending(true)
    try {
      const messageData = {
        conversationId: selectedConversation || 'new',
        senderId: parentUser.id,
        senderName: `${parentUser.firstName} ${parentUser.lastName}`,
        senderType: 'parent' as const,
        recipientId: 'therapist-1', // In real app, get from conversation
        recipientName: 'المعالج',
        messageContent: newMessage,
        messageType: 'text' as const,
        attachments: [],
        isUrgent: false
      }

      const success = await parentPortalService.sendMessage(messageData)
      if (success) {
        setNewMessage('')
        loadMessages(parentUser.id)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const getMessageIcon = (senderType: string) => {
    switch (senderType) {
      case 'therapist':
        return <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">م</div>
      case 'admin':
        return <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">إ</div>
      case 'system':
        return <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">ن</div>
      default:
        return <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">و</div>
    }
  }

  const getStatusIcon = (message: ParentMessage) => {
    if (message.isUrgent) {
      return <AlertCircle className="w-4 h-4 text-red-500" />
    }
    if (message.isRead) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    return <Clock className="w-4 h-4 text-gray-400" />
  }

  const filteredMessages = messages.filter(message =>
    message.messageContent.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.senderName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedMessages = filteredMessages.reduce((groups, message) => {
    const conversationId = message.conversationId
    if (!groups[conversationId]) {
      groups[conversationId] = []
    }
    groups[conversationId].push(message)
    return groups
  }, {} as Record<string, ParentMessage[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جار تحميل الرسائل...</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('parentUser')
    localStorage.removeItem('parentSession')
    navigate('/parent-login')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Desktop Navigation */}
      <ParentDesktopNav 
        onLogout={handleLogout}
        parentName={`${parentUser?.firstName || ''} ${parentUser?.lastName || ''}`.trim() || 'ولي الأمر'}
      />

      <div className="flex h-[calc(100vh-80px)]">
        {/* Conversations List */}
        <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col">
          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative mb-3">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="البحث في الرسائل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 text-right"
                dir="rtl"
              />
            </div>

            <div className="flex space-x-2 space-x-reverse">
              <Select value={filters.senderType || 'all'} onValueChange={(value) => setFilters({...filters, senderType: value === 'all' ? undefined : value as any})}>
                <SelectTrigger className="flex-1 text-right">
                  <SelectValue placeholder="نوع المرسل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="therapist">المعالجين</SelectItem>
                  <SelectItem value="admin">الإدارة</SelectItem>
                  <SelectItem value="system">النظام</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFilters({...filters, isUnread: !filters.isUnread})}
                className={filters.isUnread ? 'bg-blue-50 text-blue-700' : ''}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {Object.entries(groupedMessages).map(([conversationId, conversationMessages]) => {
              const lastMessage = conversationMessages[conversationMessages.length - 1]
              const unreadCount = conversationMessages.filter(m => !m.isRead && m.senderType !== 'parent').length
              
              return (
                <div
                  key={conversationId}
                  onClick={() => setSelectedConversation(conversationId)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation === conversationId ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3 space-x-reverse">
                    {getMessageIcon(lastMessage.senderType)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 text-right truncate">
                          {lastMessage.senderName}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {new Date(lastMessage.sentAt).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 text-right truncate flex-1">
                          {lastMessage.messageContent}
                        </p>
                        <div className="flex items-center space-x-1 space-x-reverse ml-2">
                          {getStatusIcon(lastMessage)}
                          {unreadCount > 0 && (
                            <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {unreadCount}
                            </div>
                          )}
                        </div>
                      </div>

                      {lastMessage.subject && (
                        <p className="text-xs text-gray-500 text-right mt-1">
                          الموضوع: {lastMessage.subject}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {Object.keys(groupedMessages).length === 0 && (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد رسائل</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="text-right">
                      <h2 className="font-semibold text-gray-900">
                        {groupedMessages[selectedConversation]?.[0]?.senderName}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {groupedMessages[selectedConversation]?.[0]?.senderType === 'therapist' ? 'معالج' : 
                         groupedMessages[selectedConversation]?.[0]?.senderType === 'admin' ? 'إدارة' : 'نظام'}
                      </p>
                    </div>
                    {getMessageIcon(groupedMessages[selectedConversation]?.[0]?.senderType || 'therapist')}
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Button variant="outline" size="sm">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Video className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {groupedMessages[selectedConversation]?.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === 'parent' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderType === 'parent'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                      <p className="text-sm">{message.messageContent}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs ${
                          message.senderType === 'parent' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.sentAt).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {message.senderType === 'parent' && getStatusIcon(message)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 px-6 py-4">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <Button variant="outline" size="sm">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  
                  <Input
                    type="text"
                    placeholder="اكتب رسالتك..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 text-right"
                    dir="rtl"
                  />
                  
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  اختر محادثة للبدء
                </h3>
                <p className="text-gray-600">
                  اختر محادثة من القائمة للبدء في التواصل
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <ParentMobileNav />
    </div>
  )
}