/**
 * Parent Messaging Component
 * Secure messaging system between parents and therapists with real-time updates
 * نظام الرسائل الآمن بين أولياء الأمور والمعالجين مع التحديثات الفورية
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Send, 
  Paperclip, 
  Search, 
  Filter, 
  MoreHorizontal,
  Check,
  CheckCheck,
  Phone,
  Video,
  Info,
  X,
  Upload,
  Download,
  FileText,
  Image,
  MessageSquare,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  useMessageThreads, 
  useSendMessage, 
  useMarkNotificationRead,
  useParentPortal 
} from '@/hooks/useParentProgress';
import type { 
  MessageThread, 
  ParentMessage,
  Language 
} from '@/types/parent';

interface ParentMessagingProps {
  className?: string;
}

interface MessageInputData {
  thread_id?: string;
  therapist_id: string;
  student_id: string;
  message_text_ar: string;
  message_text_en: string;
  attachments?: File[];
}

const ParentMessaging: React.FC<ParentMessagingProps> = ({ className }) => {
  const { language, isRTL } = useLanguage();
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get comprehensive parent portal data
  const { profile, isLoading: isProfileLoading } = useParentPortal();
  const parentId = profile?.id;
  const studentId = profile?.student_id;

  // Get message threads with real-time updates
  const {
    data: messageThreads = [],
    isLoading: isThreadsLoading,
    error: threadsError,
    refetch: refetchThreads
  } = useMessageThreads(parentId || '');

  // Mutation for sending messages
  const sendMessageMutation = useSendMessage();

  // Mutation for marking notifications as read
  const markNotificationReadMutation = useMarkNotificationRead();

  // Filter threads based on search query
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return messageThreads;
    
    return messageThreads.filter(thread => {
      const searchText = searchQuery.toLowerCase();
      const therapistName = language === 'ar' ? 
        thread.therapist_name_ar?.toLowerCase() : 
        thread.therapist_name_en?.toLowerCase();
      const lastMessage = language === 'ar' ? 
        thread.last_message?.message_text_ar?.toLowerCase() : 
        thread.last_message?.message_text_en?.toLowerCase();
      
      return therapistName?.includes(searchText) || 
             lastMessage?.includes(searchText);
    });
  }, [messageThreads, searchQuery, language]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [selectedThread?.messages]);

  // Auto-select first thread if none selected
  useEffect(() => {
    if (filteredThreads.length > 0 && !selectedThread) {
      setSelectedThread(filteredThreads[0]);
    }
  }, [filteredThreads, selectedThread]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread || !parentId || !studentId) return;

    try {
      const messageData: MessageInputData = {
        thread_id: selectedThread.thread_id,
        therapist_id: selectedThread.therapist_id,
        student_id: studentId,
        message_text_ar: language === 'ar' ? newMessage : '',
        message_text_en: language === 'en' ? newMessage : newMessage, // Fallback
        attachments: attachments.length > 0 ? attachments : undefined
      };

      await sendMessageMutation.mutateAsync(messageData);
      setNewMessage('');
      setAttachments([]);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).filter(file => {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(language === 'ar' ? 'حجم الملف كبير جداً (أقصى حد 10 ميجابايت)' : 'File size too large (max 10MB)');
          return false;
        }
        // Validate file type
        const allowedTypes = ['image/', 'application/pdf', 'text/', '.doc', '.docx'];
        if (!allowedTypes.some(type => file.type.startsWith(type) || file.name.includes(type))) {
          alert(language === 'ar' ? 'نوع الملف غير مدعوم' : 'File type not supported');
          return false;
        }
        return true;
      });
      
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return language === 'ar' ? 
        `منذ ${minutes} دقيقة` : 
        `${minutes}m ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return language === 'ar' ? 
        `منذ ${hours} ساعة` : 
        `${hours}h ago`;
    } else {
      return isRTL ? 
        date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) :
        date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }
  };

  const getMessageStatus = (message: ParentMessage) => {
    if (message.sender_type === 'parent') {
      if (message.is_read) {
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      }
      return <Check className="h-3 w-3 text-gray-400" />;
    }
    return null;
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  if (isProfileLoading || isThreadsLoading) {
    return (
      <div className={cn("flex h-[600px] gap-4", className)} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Threads Skeleton */}
        <div className="w-1/3 space-y-4">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Chat Skeleton */}
        <div className="flex-1 space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <Skeleton className={`h-12 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'} rounded-lg`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (threadsError) {
    return (
      <Alert variant="destructive" className={cn("max-w-md mx-auto", className)}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {language === 'ar' ? 'خطأ في تحميل الرسائل' : 'Error loading messages'}
          <br />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchThreads()}
            className="mt-2"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("flex h-[600px] bg-gray-50 rounded-lg overflow-hidden", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Threads Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">
              {language === 'ar' ? 'المحادثات' : 'Messages'}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsComposing(true)}
              className="shrink-0"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={language === 'ar' ? 'البحث في المحادثات...' : 'Search conversations...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">
                {language === 'ar' ? 'لا توجد محادثات' : 'No conversations'}
              </p>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <div
                key={thread.thread_id}
                onClick={() => setSelectedThread(thread)}
                className={cn(
                  "p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
                  selectedThread?.thread_id === thread.thread_id && "bg-blue-50 border-blue-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <div className="w-full h-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                      {(language === 'ar' ? thread.therapist_name_ar : thread.therapist_name_en)?.charAt(0)}
                    </div>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {language === 'ar' ? thread.therapist_name_ar : thread.therapist_name_en}
                      </h4>
                      {thread.unread_count > 0 && (
                        <Badge variant="destructive" className="shrink-0 text-xs">
                          {thread.unread_count}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 truncate mb-1">
                      {language === 'ar' ? 
                        thread.last_message?.message_text_ar : 
                        thread.last_message?.message_text_en}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {thread.last_message?.created_at && formatMessageTime(thread.last_message.created_at)}
                      </span>
                      {thread.last_message?.sender_type === 'parent' && getMessageStatus(thread.last_message)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <div className="w-full h-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-semibold text-xs">
                      {(language === 'ar' ? selectedThread.therapist_name_ar : selectedThread.therapist_name_en)?.charAt(0)}
                    </div>
                  </Avatar>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {language === 'ar' ? selectedThread.therapist_name_ar : selectedThread.therapist_name_en}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {language === 'ar' ? selectedThread.specialization_ar : selectedThread.specialization_en}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {selectedThread.messages?.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender_type === 'parent' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-sm",
                      message.sender_type === 'parent' 
                        ? "bg-blue-500 text-white" 
                        : "bg-white text-gray-900 border border-gray-200"
                    )}
                  >
                    <p className="text-sm leading-relaxed">
                      {language === 'ar' ? message.message_text_ar : message.message_text_en}
                    </p>
                    
                    {/* Attachments */}
                    {message.attachment_urls && message.attachment_urls.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachment_urls.map((url, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded bg-gray-100 text-gray-700">
                            {getFileIcon(url)}
                            <span className="text-xs truncate flex-1">{url.split('/').pop()}</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className={cn(
                      "flex items-center gap-1 mt-2",
                      message.sender_type === 'parent' ? "justify-end" : "justify-start"
                    )}>
                      <span className={cn(
                        "text-xs",
                        message.sender_type === 'parent' ? "text-blue-100" : "text-gray-400"
                      )}>
                        {formatMessageTime(message.created_at)}
                      </span>
                      {message.sender_type === 'parent' && getMessageStatus(message)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm">
                      {getFileIcon(file.name)}
                      <span className="truncate max-w-20">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <div className="flex-1 relative">
                  <Textarea
                    placeholder={language === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-[44px] max-h-32 resize-none pr-12"
                    disabled={sendMessageMutation.isPending}
                  />
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">
                {language === 'ar' ? 'اختر محادثة' : 'Select a conversation'}
              </p>
              <p className="text-sm">
                {language === 'ar' ? 'اختر محادثة من القائمة لبدء المراسلة' : 'Choose a conversation from the sidebar to start messaging'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentMessaging;