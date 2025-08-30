import React, { useState, useEffect } from 'react'
import { Bell, Mail, MessageSquare, Smartphone, Monitor, Clock, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { 
  NotificationType, 
  NotificationChannel, 
  NotificationTemplates,
  type NotificationPreferences 
} from '@/services/notification-service'

interface NotificationPreferencesProps {
  userId: string
  userType: 'parent' | 'therapist' | 'admin' | 'student'
}

interface ChannelPreference {
  channel: NotificationChannel
  enabled: boolean
  icon: React.ComponentType<any>
  label: { ar: string; en: string }
  description: { ar: string; en: string }
}

interface NotificationGroup {
  key: string
  label: { ar: string; en: string }
  types: NotificationType[]
}

const NOTIFICATION_CHANNELS: ChannelPreference[] = [
  {
    channel: 'in_app',
    enabled: true,
    icon: Bell,
    label: { ar: 'إشعارات التطبيق', en: 'In-App Notifications' },
    description: { ar: 'إشعارات داخل التطبيق', en: 'Notifications within the app' }
  },
  {
    channel: 'email',
    enabled: true,
    icon: Mail,
    label: { ar: 'البريد الإلكتروني', en: 'Email' },
    description: { ar: 'إشعارات عبر البريد الإلكتروني', en: 'Email notifications' }
  },
  {
    channel: 'sms',
    enabled: false,
    icon: MessageSquare,
    label: { ar: 'الرسائل النصية', en: 'SMS' },
    description: { ar: 'رسائل نصية قصيرة', en: 'Text messages' }
  },
  {
    channel: 'push',
    enabled: true,
    icon: Smartphone,
    label: { ar: 'إشعارات الدفع', en: 'Push Notifications' },
    description: { ar: 'إشعارات الهاتف المحمول', en: 'Mobile push notifications' }
  },
  {
    channel: 'browser',
    enabled: false,
    icon: Monitor,
    label: { ar: 'إشعارات المتصفح', en: 'Browser Notifications' },
    description: { ar: 'إشعارات المتصفح', en: 'Browser notifications' }
  }
]

const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    key: 'attendance',
    label: { ar: 'الحضور', en: 'Attendance' },
    types: ['attendance_checkin', 'attendance_checkout', 'attendance_late', 'attendance_absent']
  },
  {
    key: 'sessions',
    label: { ar: 'الجلسات', en: 'Sessions' },
    types: ['session_reminder', 'session_started', 'session_completed', 'session_cancelled', 'session_rescheduled']
  },
  {
    key: 'assessments',
    label: { ar: 'التقييمات', en: 'Assessments' },
    types: ['assessment_due', 'assessment_completed', 'assessment_overdue']
  },
  {
    key: 'progress',
    label: { ar: 'التقدم', en: 'Progress' },
    types: ['goal_achieved', 'progress_update', 'milestone_reached']
  },
  {
    key: 'administrative',
    label: { ar: 'الإدارية', en: 'Administrative' },
    types: ['payment_due', 'payment_received', 'document_required', 'system_update']
  },
  {
    key: 'emergency',
    label: { ar: 'الطوارئ', en: 'Emergency' },
    types: ['emergency_contact']
  }
]

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  userId,
  userType
}) => {
  const { language, isRTL } = useLanguage()
  const [preferences, setPreferences] = useState<Record<NotificationType, NotificationPreferences>>({} as any)
  const [quietHours, setQuietHours] = useState({ start: '22:00', end: '07:00' })
  const [isLoading, setIsLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize preferences
  useEffect(() => {
    const initialPreferences: Record<NotificationType, NotificationPreferences> = {} as any
    
    Object.keys(NotificationTemplates).forEach((type) => {
      const notificationType = type as NotificationType
      const template = NotificationTemplates[notificationType]
      
      initialPreferences[notificationType] = {
        user_id: userId,
        notification_type: notificationType,
        channels: template.default_channels,
        enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    })
    
    setPreferences(initialPreferences)
  }, [userId])

  const handleChannelToggle = (notificationType: NotificationType, channel: NotificationChannel) => {
    setPreferences(prev => {
      const current = prev[notificationType]
      const channels = current.channels.includes(channel)
        ? current.channels.filter(c => c !== channel)
        : [...current.channels, channel]
      
      return {
        ...prev,
        [notificationType]: {
          ...current,
          channels
        }
      }
    })
    setHasChanges(true)
  }

  const handleNotificationToggle = (notificationType: NotificationType, enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [notificationType]: {
        ...prev[notificationType],
        enabled
      }
    }))
    setHasChanges(true)
  }

  const handleQuietHoursChange = (type: 'start' | 'end', value: string) => {
    setQuietHours(prev => ({ ...prev, [type]: value }))
    
    // Update all preferences with new quiet hours
    setPreferences(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(key => {
        updated[key as NotificationType] = {
          ...updated[key as NotificationType],
          [`quiet_hours_${type}`]: value
        }
      })
      return updated
    })
    setHasChanges(true)
  }

  const savePreferences = async () => {
    setIsLoading(true)
    try {
      // TODO: Save preferences to database
      console.log('Saving notification preferences:', preferences)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success(
        language === 'ar' ? 'تم حفظ تفضيلات الإشعارات' : 'Notification preferences saved'
      )
      setHasChanges(false)
    } catch (error) {
      toast.error(
        language === 'ar' ? 'فشل في حفظ التفضيلات' : 'Failed to save preferences'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const getNotificationTypeLabel = (type: NotificationType) => {
    const template = NotificationTemplates[type]
    return template.title[language]
  }

  const getPriorityBadge = (type: NotificationType) => {
    const template = NotificationTemplates[type]
    const priority = template.priority
    
    const variants = {
      low: 'secondary',
      medium: 'outline',
      high: 'destructive',
      urgent: 'destructive'
    }
    
    return (
      <Badge variant={variants[priority] as any} className="text-xs">
        {language === 'ar' 
          ? { low: 'منخفض', medium: 'متوسط', high: 'عالي', urgent: 'عاجل' }[priority]
          : priority.toUpperCase()
        }
      </Badge>
    )
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تفضيلات الإشعارات' : 'Notification Preferences'}
          </h2>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? 'تخصيص كيفية ووقت تلقي الإشعارات'
              : 'Customize how and when you receive notifications'
            }
          </p>
        </div>
        {hasChanges && (
          <Button onClick={savePreferences} disabled={isLoading}>
            <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Quiet Hours Settings */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Clock className="h-5 w-5" />
            {language === 'ar' ? 'ساعات الهدوء' : 'Quiet Hours'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'وقت البدء' : 'Start Time'}
              </Label>
              <Input
                type="time"
                value={quietHours.start}
                onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                className={language === 'ar' ? 'font-arabic' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'وقت الانتهاء' : 'End Time'}
              </Label>
              <Input
                type="time"
                value={quietHours.end}
                onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                className={language === 'ar' ? 'font-arabic' : ''}
              />
            </div>
          </div>
          <p className={`text-sm text-muted-foreground mt-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar'
              ? 'لن تتلقى إشعارات غير عاجلة خلال هذه الأوقات'
              : 'You won\'t receive non-urgent notifications during these hours'
            }
          </p>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'قنوات الإشعارات' : 'Notification Channels'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {NOTIFICATION_CHANNELS.map((channel) => {
              const Icon = channel.icon
              return (
                <div key={channel.channel} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {channel.label[language]}
                      </h3>
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {channel.description[language]}
                      </p>
                    </div>
                  </div>
                  <Switch
                    defaultChecked={channel.enabled}
                    onCheckedChange={(checked) => {
                      // TODO: Handle global channel enable/disable
                      console.log(`${channel.channel} ${checked ? 'enabled' : 'disabled'}`)
                    }}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notification Type Settings */}
      {NOTIFICATION_GROUPS.map((group) => (
        <Card key={group.key}>
          <CardHeader>
            <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {group.label[language]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.types.map((type) => {
              const preference = preferences[type]
              if (!preference) return null

              return (
                <div key={type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {getNotificationTypeLabel(type)}
                      </h4>
                      {getPriorityBadge(type)}
                    </div>
                    <Switch
                      checked={preference.enabled}
                      onCheckedChange={(checked) => handleNotificationToggle(type, checked)}
                    />
                  </div>

                  {preference.enabled && (
                    <div className="space-y-2">
                      <Label className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'القنوات المفعلة:' : 'Active Channels:'}
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {NOTIFICATION_CHANNELS.map((channel) => (
                          <div
                            key={channel.channel}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer transition-colors ${
                              preference.channels.includes(channel.channel)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-muted-foreground/20 hover:border-muted-foreground/40'
                            }`}
                            onClick={() => handleChannelToggle(type, channel.channel)}
                          >
                            <channel.icon className="h-3 w-3" />
                            <span className={`text-xs ${language === 'ar' ? 'font-arabic' : ''}`}>
                              {channel.label[language]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      {/* Save Button (Sticky) */}
      {hasChanges && (
        <div className="sticky bottom-6 flex justify-center">
          <Button 
            onClick={savePreferences} 
            disabled={isLoading}
            className="shadow-lg"
            size="lg"
          >
            <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'حفظ جميع التغييرات' : 'Save All Changes'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default NotificationPreferences