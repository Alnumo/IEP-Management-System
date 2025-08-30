import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, MessageSquare, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface QuickMessageWidgetProps {
  className?: string;
}

export function QuickMessageWidget({ className }: QuickMessageWidgetProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickTemplates = [
    'مرحبا، كيف حال الطفل اليوم؟',
    'شكراً لتحديث التقرير',
    'هل يمكننا تحديد موعد للمتابعة؟',
    'أحتاج مساعدة بخصوص التمارين المنزلية'
  ];

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      // TODO: Implement message sending logic
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast.success('تم إرسال رسالتك بنجاح');
      
      setMessage('');
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateClick = (template: string) => {
    setMessage(template);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="w-4 h-4" />
          رسالة سريعة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Templates */}
        <div className="space-y-2">
          <p className="text-xs text-gray-600">قوالب سريعة:</p>
          <div className="grid grid-cols-1 gap-1">
            {quickTemplates.map((template, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="h-auto p-2 text-xs text-right justify-start"
                onClick={() => handleTemplateClick(template)}
              >
                <Clock className="w-3 h-3 ml-2" />
                {template}
              </Button>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            className="min-h-[80px] text-right"
            dir="rtl"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading}
            className="w-full"
            size="sm"
          >
            <Send className="w-4 h-4 ml-2" />
            {isLoading ? 'جاري الإرسال...' : 'إرسال'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}