import React, { useState } from 'react'
import { MessageCircle, Send, X, Minimize2, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

interface QuickMessageWidgetProps {
  isOpen: boolean
  onToggle: () => void
  onSendMessage: (message: string) => Promise<void>
}

export const QuickMessageWidget: React.FC<QuickMessageWidgetProps> = ({
  isOpen,
  onToggle,
  onSendMessage
}) => {
  const [message, setMessage] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return

    setSending(true)
    try {
      await onSendMessage(message)
      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          onClick={onToggle}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <Card className="w-80 shadow-xl">
        {/* Header */}
        <div className="bg-blue-600 text-white p-3 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-right">رسالة سريعة</h3>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-blue-700 h-6 w-6 p-0"
              >
                {isMinimized ? (
                  <Maximize2 className="w-3 h-3" />
                ) : (
                  <Minimize2 className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="text-white hover:bg-blue-700 h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <CardContent className="p-4">
            <div className="mb-3">
              <p className="text-sm text-gray-600 text-right">
                أرسل رسالة سريعة للفريق العلاجي
              </p>
            </div>

            {/* Quick Options */}
            <div className="mb-3 space-y-2">
              <p className="text-xs font-medium text-gray-700 text-right">رسائل سريعة:</p>
              <div className="grid grid-cols-1 gap-1">
                {[
                  'استفسار عن التقدم',
                  'طلب موعد إضافي',
                  'سؤال عن النشاط المنزلي',
                  'تغيير في الجدول'
                ].map((quickMessage) => (
                  <Button
                    key={quickMessage}
                    variant="ghost"
                    size="sm"
                    onClick={() => setMessage(quickMessage)}
                    className="text-xs h-7 text-right justify-end hover:bg-gray-50"
                  >
                    {quickMessage}
                  </Button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="اكتب رسالتك هنا..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className="text-right"
                dir="rtl"
              />

              <div className="flex items-center justify-between">
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                  ) : (
                    <Send className="w-4 h-4 ml-2" />
                  )}
                  إرسال
                </Button>
                
                <p className="text-xs text-gray-500">
                  {message.length}/500
                </p>
              </div>
            </div>

            {/* Quick Contact */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 text-right mb-2">
                للحالات العاجلة:
              </p>
              <div className="flex space-x-2 space-x-reverse">
                <Button variant="outline" size="sm" className="flex-1 text-xs">
                  📞 اتصال مباشر
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs">
                  📱 واتساب
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}