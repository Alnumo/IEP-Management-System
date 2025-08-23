import { useState, useEffect } from 'react'
import { MessageCircle, Send, Users, Clock, CheckCircle, Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { whatsAppService } from '@/services/whatsapp'
import { toast } from 'sonner'

interface MessageLog {
  id: string
  phoneNumber: string
  parentName: string
  childName: string
  templateName: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  direction: 'outgoing' | 'incoming'
}

export const WhatsAppPage = () => {
  const { language, isRTL } = useLanguage()
  const [messageHistory, setMessageHistory] = useState<MessageLog[]>([])
  const [bulkMessage, setBulkMessage] = useState({
    template: '',
    recipients: 'all_parents',
    customMessage: ''
  })
  const [sessionReminders, setSessionReminders] = useState({
    scheduled: 0,
    sent: 0,
    failed: 0
  })

  // Mock data for demo
  useEffect(() => {
    const mockHistory: MessageLog[] = [
      {
        id: '1',
        phoneNumber: '+966501234567',
        parentName: 'أم أحمد',
        childName: 'أحمد محمد',
        templateName: 'session_reminder',
        status: 'read',
        timestamp: '2025-01-22T10:30:00',
        direction: 'outgoing'
      },
      {
        id: '2',
        phoneNumber: '+966502345678',
        parentName: 'أم فاطمة',
        childName: 'فاطمة علي',
        templateName: 'progress_update',
        status: 'delivered',
        timestamp: '2025-01-22T11:15:00',
        direction: 'outgoing'
      },
      {
        id: '3',
        phoneNumber: '+966503456789',
        parentName: 'أبو محمد',
        childName: 'محمد أحمد',
        templateName: 'incoming_message',
        status: 'sent',
        timestamp: '2025-01-22T12:00:00',
        direction: 'incoming'
      }
    ]
    setMessageHistory(mockHistory)
    
    setSessionReminders({
      scheduled: 15,
      sent: 12,
      failed: 1
    })
  }, [])

  const handleSendBulkMessage = async () => {
    try {
      // Mock implementation - in real app, this would integrate with whatsAppService
      toast.success(language === 'ar' ? 'تم إرسال الرسائل بنجاح' : 'Messages sent successfully')
      
      // Update mock data
      setBulkMessage({
        template: '',
        recipients: 'all_parents',
        customMessage: ''
      })
    } catch (error) {
      toast.error(language === 'ar' ? 'خطأ في إرسال الرسائل' : 'Error sending messages')
    }
  }

  const handleSendSessionReminders = async () => {
    try {
      // Mock session reminder data
      const mockSessions = [
        {
          studentName: 'أحمد محمد',
          parentPhone: '+966501234567',
          parentName: 'أم أحمد',
          sessionTime: '10:00 صباحاً',
          roomNumber: 'A-101',
          therapistName: 'د. سارة أحمد'
        },
        {
          studentName: 'فاطمة علي',
          parentPhone: '+966502345678',
          parentName: 'أم فاطمة',
          sessionTime: '11:30 صباحاً',
          roomNumber: 'B-205',
          therapistName: 'أ. نور الدين'
        }
      ]

      // Use the WhatsApp service
      const results = await whatsAppService.sendSessionReminders(mockSessions)
      
      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length
      
      toast.success(
        language === 'ar' 
          ? `تم إرسال ${successCount} تذكير بنجاح` 
          : `${successCount} reminders sent successfully`
      )
      
      if (failureCount > 0) {
        toast.warning(
          language === 'ar'
            ? `فشل في إرسال ${failureCount} تذكير`
            : `${failureCount} reminders failed`
        )
      }

      setSessionReminders(prev => ({
        ...prev,
        sent: prev.sent + successCount,
        failed: prev.failed + failureCount
      }))
      
    } catch (error) {
      toast.error(language === 'ar' ? 'خطأ في إرسال التذكيرات' : 'Error sending reminders')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'sent': return 'secondary'
      case 'delivered': return 'default'
      case 'read': return 'outline'
      case 'failed': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusText = (status: string) => {
    const statusTexts = {
      ar: {
        sent: 'تم الإرسال',
        delivered: 'تم التسليم',
        read: 'تم القراءة',
        failed: 'فشل الإرسال'
      },
      en: {
        sent: 'Sent',
        delivered: 'Delivered',
        read: 'Read',
        failed: 'Failed'
      }
    }
    return statusTexts[language as keyof typeof statusTexts][status as keyof typeof statusTexts.ar] || status
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة WhatsApp' : 'WhatsApp Management'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'التواصل مع أولياء الأمور عبر WhatsApp Business API'
              : 'Communicate with parents via WhatsApp Business API'
            }
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'الرسائل المرسلة اليوم' : 'Messages Sent Today'}
            </CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageHistory.filter(m => m.direction === 'outgoing').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'الرسائل المقروءة' : 'Messages Read'}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {messageHistory.filter(m => m.status === 'read').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'التذكيرات المجدولة' : 'Scheduled Reminders'}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{sessionReminders.scheduled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'معدل النجاح' : 'Success Rate'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round((sessionReminders.sent / (sessionReminders.sent + sessionReminders.failed)) * 100) || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="send" className="space-y-6">
        <TabsList>
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            {language === 'ar' ? 'إرسال الرسائل' : 'Send Messages'}
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-2">
            <Clock className="h-4 w-4" />
            {language === 'ar' ? 'تذكيرات الجلسات' : 'Session Reminders'}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            {language === 'ar' ? 'سجل الرسائل' : 'Message History'}
          </TabsTrigger>
        </TabsList>

        {/* Send Messages Tab */}
        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'إرسال رسائل جماعية' : 'Send Bulk Messages'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {language === 'ar' ? 'نوع الرسالة' : 'Message Template'}
                  </label>
                  <Select value={bulkMessage.template} onValueChange={(value) => setBulkMessage({...bulkMessage, template: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر نوع الرسالة' : 'Select message template'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session_reminder">
                        {language === 'ar' ? 'تذكير بالجلسة' : 'Session Reminder'}
                      </SelectItem>
                      <SelectItem value="progress_update">
                        {language === 'ar' ? 'تحديث التقدم' : 'Progress Update'}
                      </SelectItem>
                      <SelectItem value="home_program">
                        {language === 'ar' ? 'البرنامج المنزلي' : 'Home Program'}
                      </SelectItem>
                      <SelectItem value="appointment_confirmation">
                        {language === 'ar' ? 'تأكيد الموعد' : 'Appointment Confirmation'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {language === 'ar' ? 'المستلمون' : 'Recipients'}
                  </label>
                  <Select value={bulkMessage.recipients} onValueChange={(value) => setBulkMessage({...bulkMessage, recipients: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_parents">
                        {language === 'ar' ? 'جميع أولياء الأمور' : 'All Parents'}
                      </SelectItem>
                      <SelectItem value="active_students">
                        {language === 'ar' ? 'أولياء أمور الطلاب النشطين' : 'Active Students Parents'}
                      </SelectItem>
                      <SelectItem value="specific_program">
                        {language === 'ar' ? 'برنامج علاجي محدد' : 'Specific Therapy Program'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'رسالة مخصصة (اختيارية)' : 'Custom Message (Optional)'}
                </label>
                <Textarea
                  placeholder={language === 'ar' 
                    ? 'اكتب رسالة مخصصة هنا...' 
                    : 'Write a custom message here...'
                  }
                  value={bulkMessage.customMessage}
                  onChange={(e) => setBulkMessage({...bulkMessage, customMessage: e.target.value})}
                  rows={4}
                />
              </div>

              <Button onClick={handleSendBulkMessage} className="gap-2">
                <Send className="h-4 w-4" />
                {language === 'ar' ? 'إرسال الرسائل' : 'Send Messages'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Reminders Tab */}
        <TabsContent value="reminders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'تذكيرات الجلسات' : 'Session Reminders'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-600">{sessionReminders.scheduled}</div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'مجدولة' : 'Scheduled'}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-600">{sessionReminders.sent}</div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'تم الإرسال' : 'Sent'}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-red-600">{sessionReminders.failed}</div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'فشل' : 'Failed'}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleSendSessionReminders} className="gap-2">
                  <Clock className="h-4 w-4" />
                  {language === 'ar' ? 'إرسال تذكيرات اليوم' : 'Send Today\'s Reminders'}
                </Button>
                <Button variant="outline" className="gap-2">
                  <Users className="h-4 w-4" />
                  {language === 'ar' ? 'جدولة تذكيرات تلقائية' : 'Schedule Auto Reminders'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'سجل الرسائل' : 'Message History'}</CardTitle>
            </CardHeader>
            <CardContent>
              {messageHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا يوجد سجل رسائل' : 'No message history'}
                </div>
              ) : (
                <div className="space-y-3">
                  {messageHistory.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{message.parentName} - {message.childName}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {message.phoneNumber}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(message.status)}>
                            {getStatusText(message.status)}
                          </Badge>
                          <Badge variant={message.direction === 'outgoing' ? 'default' : 'secondary'}>
                            {message.direction === 'outgoing' 
                              ? (language === 'ar' ? 'صادرة' : 'Outgoing')
                              : (language === 'ar' ? 'واردة' : 'Incoming')
                            }
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {language === 'ar' ? 'نوع الرسالة:' : 'Template:'} {message.templateName}
                        </span>
                        <span>
                          {new Date(message.timestamp).toLocaleString(
                            language === 'ar' ? 'ar-SA' : 'en-US'
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}