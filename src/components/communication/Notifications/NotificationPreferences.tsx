/**
 * Notification Preferences - Advanced Notification Settings Management
 * Healthcare-grade notification preferences with role-based controls
 * Arkan Al-Numo Center - Notification Configuration System
 */

import React, { useState, useEffect } from 'react'
import {
  Bell,
  BellOff,
  Phone,
  MessageCircle,
  Mail,
  Smartphone,
  Clock,
  Settings,
  Shield,
  Users,
  AlertTriangle,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Calendar,
  Filter,
  Save,
  RotateCcw,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { CommunicationNotificationType } from '@/services/communication-push-notifications'

interface NotificationChannel {
  id: 'push' | 'browser' | 'email' | 'sms' | 'in_app' | 'whatsapp'
  name_ar: string
  name_en: string
  icon: React.ReactNode
  description_ar: string
  description_en: string
}

interface NotificationRule {
  type: CommunicationNotificationType
  enabled: boolean
  channels: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  sound: boolean
  vibration: boolean
  quiet_hours_exempt: boolean
}

interface QuietHours {
  enabled: boolean
  start_time: string
  end_time: string
  days: string[]
  emergency_override: boolean
}

interface NotificationPreferences {
  user_id: string
  global_enabled: boolean
  sound_enabled: boolean
  vibration_enabled: boolean
  quiet_hours: QuietHours
  rules: NotificationRule[]
  created_at: string
  updated_at: string
}

interface NotificationPreferencesProps {
  userId: string
  userRole: 'admin' | 'manager' | 'therapist_lead' | 'receptionist' | 'parent'
  onSave?: (preferences: NotificationPreferences) => void
  className?: string
}

const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  {
    id: 'push',
    name_ar: 'إشعارات الدفع',
    name_en: 'Push Notifications',
    icon: <Bell className="w-4 h-4" />,
    description_ar: 'إشعارات فورية على الجهاز',
    description_en: 'Instant notifications on device'
  },
  {
    id: 'browser',
    name_ar: 'إشعارات المتصفح',
    name_en: 'Browser Notifications',
    icon: <Smartphone className="w-4 h-4" />,
    description_ar: 'إشعارات في المتصفح',
    description_en: 'In-browser notifications'
  },
  {
    id: 'email',
    name_ar: 'البريد الإلكتروني',
    name_en: 'Email',
    icon: <Mail className="w-4 h-4" />,
    description_ar: 'رسائل بريد إلكتروني',
    description_en: 'Email messages'
  },
  {
    id: 'sms',
    name_ar: 'رسائل نصية',
    name_en: 'SMS',
    icon: <MessageCircle className="w-4 h-4" />,
    description_ar: 'رسائل نصية قصيرة',
    description_en: 'Text messages'
  },
  {
    id: 'whatsapp',
    name_ar: 'واتساب',
    name_en: 'WhatsApp',
    icon: <Phone className="w-4 h-4" />,
    description_ar: 'رسائل واتساب',
    description_en: 'WhatsApp messages'
  },
  {
    id: 'in_app',
    name_ar: 'داخل التطبيق',
    name_en: 'In-App',
    icon: <Settings className="w-4 h-4" />,
    description_ar: 'إشعارات داخل التطبيق',
    description_en: 'In-app notifications'
  }
]

const DEFAULT_NOTIFICATION_RULES: Omit<NotificationRule, 'type'>[] = [
  {
    enabled: true,
    channels: ['push', 'in_app'],
    priority: 'medium',
    sound: true,
    vibration: false,
    quiet_hours_exempt: false
  }
]

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  userId,
  userRole,
  onSave,
  className
}) => {
  const { language, isRTL } = useLanguage()
  
  // State
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Load user preferences
  useEffect(() => {
    loadPreferences()
  }, [userId])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (data) {
        setPreferences(data)
      } else {
        // Create default preferences
        const defaultPreferences: Partial<NotificationPreferences> = {
          user_id: userId,
          global_enabled: true,
          sound_enabled: true,
          vibration_enabled: false,
          quiet_hours: {
            enabled: false,
            start_time: '22:00',
            end_time: '07:00',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            emergency_override: true
          },
          rules: generateDefaultRules()
        }
        
        setPreferences(defaultPreferences as NotificationPreferences)
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
      toast.error(language === 'ar' ? 'فشل في تحميل إعدادات الإشعارات' : 'Failed to load notification preferences')
    } finally {
      setLoading(false)
    }
  }

  const generateDefaultRules = (): NotificationRule[] => {
    const notificationTypes: CommunicationNotificationType[] = [
      'new_message',
      'message_reply',
      'message_priority',
      'message_urgent',
      'voice_call_incoming',
      'voice_call_missed',
      'voice_call_emergency',
      'conversation_created',
      'file_upload_complete'
    ]

    return notificationTypes.map(type => ({
      type,
      ...DEFAULT_NOTIFICATION_RULES[0]
    }))
  }

  // Save preferences
  const savePreferences = async () => {
    if (!preferences) return

    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          ...preferences,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setHasChanges(false)
      onSave?.(preferences)
      toast.success(language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully')
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
      toast.error(language === 'ar' ? 'فشل في حفظ الإعدادات' : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Update preferences
  const updatePreferences = (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return

    setPreferences(prev => prev ? { ...prev, ...updates } : null)
    setHasChanges(true)
  }

  // Update rule
  const updateRule = (type: CommunicationNotificationType, updates: Partial<NotificationRule>) => {
    if (!preferences) return

    const updatedRules = preferences.rules.map(rule =>
      rule.type === type ? { ...rule, ...updates } : rule
    )

    updatePreferences({ rules: updatedRules })
  }

  // Get notification type display name
  const getTypeDisplayName = (type: CommunicationNotificationType) => {
    const typeNames = {
      new_message: { ar: 'رسالة جديدة', en: 'New Message' },
      message_reply: { ar: 'رد على رسالة', en: 'Message Reply' },
      message_priority: { ar: 'رسالة مهمة', en: 'Priority Message' },
      message_urgent: { ar: 'رسالة عاجلة', en: 'Urgent Message' },
      voice_call_incoming: { ar: 'مكالمة واردة', en: 'Incoming Call' },
      voice_call_missed: { ar: 'مكالمة فائتة', en: 'Missed Call' },
      voice_call_emergency: { ar: 'مكالمة طوارئ', en: 'Emergency Call' },
      conversation_created: { ar: 'محادثة جديدة', en: 'New Conversation' },
      file_upload_complete: { ar: 'اكتمال رفع الملف', en: 'File Upload Complete' }
    }

    return typeNames[type]?.[language] || type
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  if (loading || !preferences) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Settings className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Preferences'}
          </h2>
          <p className="text-gray-600 mt-1">
            {language === 'ar' ? 
              'تخصيص كيفية تلقي الإشعارات والتنبيهات' : 
              'Customize how you receive notifications and alerts'
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => loadPreferences()}
            variant="outline"
            disabled={loading}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'إعادة تحميل' : 'Reload'}
          </Button>

          <Button
            onClick={savePreferences}
            disabled={!hasChanges || saving}
            className="min-w-[100px]"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 
              (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') :
              (language === 'ar' ? 'حفظ' : 'Save')
            }
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            {language === 'ar' ? 'عام' : 'General'}
          </TabsTrigger>
          <TabsTrigger value="channels">
            {language === 'ar' ? 'القنوات' : 'Channels'}
          </TabsTrigger>
          <TabsTrigger value="rules">
            {language === 'ar' ? 'القواعد' : 'Rules'}
          </TabsTrigger>
          <TabsTrigger value="schedule">
            {language === 'ar' ? 'الجدولة' : 'Schedule'}
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {language === 'ar' ? 'الإعدادات العامة' : 'General Settings'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 
                  'إعدادات الإشعارات الأساسية والتحكم العام' : 
                  'Basic notification settings and overall controls'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Global Enable/Disable */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    {language === 'ar' ? 'تمكين جميع الإشعارات' : 'Enable All Notifications'}
                  </Label>
                  <p className="text-sm text-gray-600">
                    {language === 'ar' ? 
                      'تمكين أو تعطيل جميع الإشعارات بشكل عام' : 
                      'Enable or disable all notifications globally'
                    }
                  </p>
                </div>
                <Switch
                  checked={preferences.global_enabled}
                  onCheckedChange={(enabled) => updatePreferences({ global_enabled: enabled })}
                />
              </div>

              <Separator />

              {/* Sound Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">
                  {language === 'ar' ? 'إعدادات الصوت' : 'Sound Settings'}
                </h4>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {preferences.sound_enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <div>
                      <Label>{language === 'ar' ? 'أصوات الإشعارات' : 'Notification Sounds'}</Label>
                      <p className="text-sm text-gray-600">
                        {language === 'ar' ? 'تشغيل الأصوات مع الإشعارات' : 'Play sounds with notifications'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.sound_enabled}
                    onCheckedChange={(enabled) => updatePreferences({ sound_enabled: enabled })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4" />
                    <div>
                      <Label>{language === 'ar' ? 'الاهتزاز' : 'Vibration'}</Label>
                      <p className="text-sm text-gray-600">
                        {language === 'ar' ? 'تشغيل الاهتزاز مع الإشعارات (إذا كان متاحاً)' : 'Vibrate with notifications (if available)'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.vibration_enabled}
                    onCheckedChange={(enabled) => updatePreferences({ vibration_enabled: enabled })}
                  />
                </div>
              </div>

              <Separator />

              {/* Role-based Notice */}
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  {language === 'ar' ? 
                    `كمستخدم ${userRole}، بعض الإشعارات مطلوبة لأغراض الامتثال والأمان ولا يمكن تعطيلها.` :
                    `As a ${userRole}, some notifications are required for compliance and safety purposes and cannot be disabled.`
                  }
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channels Settings */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {language === 'ar' ? 'قنوات الإشعارات' : 'Notification Channels'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 
                  'تكوين كيفية تلقي الإشعارات عبر القنوات المختلفة' : 
                  'Configure how you receive notifications through different channels'
                }
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4">
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <Card key={channel.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {channel.icon}
                        <div>
                          <h4 className="font-medium">
                            {language === 'ar' ? channel.name_ar : channel.name_en}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {language === 'ar' ? channel.description_ar : channel.description_en}
                          </p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Rules */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                {language === 'ar' ? 'قواعد الإشعارات' : 'Notification Rules'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 
                  'تخصيص سلوك الإشعارات لأنواع مختلفة من الأحداث' : 
                  'Customize notification behavior for different types of events'
                }
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {preferences.rules.map((rule) => (
                  <Card key={rule.type} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {getTypeDisplayName(rule.type)}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", getPriorityColor(rule.priority))}
                            >
                              {rule.priority}
                            </Badge>
                          </div>
                        </div>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(enabled) => updateRule(rule.type, { enabled })}
                        />
                      </div>

                      {rule.enabled && (
                        <div className="pl-4 border-l-2 border-gray-100 space-y-3">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`${rule.type}-sound`}
                                checked={rule.sound}
                                onChange={(e) => updateRule(rule.type, { sound: e.target.checked })}
                                className="rounded"
                              />
                              <label htmlFor={`${rule.type}-sound`} className="text-sm">
                                {language === 'ar' ? 'صوت' : 'Sound'}
                              </label>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`${rule.type}-vibration`}
                                checked={rule.vibration}
                                onChange={(e) => updateRule(rule.type, { vibration: e.target.checked })}
                                className="rounded"
                              />
                              <label htmlFor={`${rule.type}-vibration`} className="text-sm">
                                {language === 'ar' ? 'اهتزاز' : 'Vibration'}
                              </label>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`${rule.type}-exempt`}
                                checked={rule.quiet_hours_exempt}
                                onChange={(e) => updateRule(rule.type, { quiet_hours_exempt: e.target.checked })}
                                className="rounded"
                              />
                              <label htmlFor={`${rule.type}-exempt`} className="text-sm">
                                {language === 'ar' ? 'إعفاء من الساعات الهادئة' : 'Exempt from quiet hours'}
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Settings */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {language === 'ar' ? 'الساعات الهادئة' : 'Quiet Hours'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 
                  'تحديد أوقات تقليل الإشعارات أو إيقافها' : 
                  'Set times to reduce or disable notifications'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {preferences.quiet_hours.enabled ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <div>
                    <Label className="text-base font-medium">
                      {language === 'ar' ? 'تمكين الساعات الهادئة' : 'Enable Quiet Hours'}
                    </Label>
                    <p className="text-sm text-gray-600">
                      {language === 'ar' ? 'تقليل الإشعارات خلال فترات محددة' : 'Reduce notifications during specified periods'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.quiet_hours.enabled}
                  onCheckedChange={(enabled) => updatePreferences({
                    quiet_hours: { ...preferences.quiet_hours, enabled }
                  })}
                />
              </div>

              {preferences.quiet_hours.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-time">
                        {language === 'ar' ? 'وقت البداية' : 'Start Time'}
                      </Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={preferences.quiet_hours.start_time}
                        onChange={(e) => updatePreferences({
                          quiet_hours: { ...preferences.quiet_hours, start_time: e.target.value }
                        })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="end-time">
                        {language === 'ar' ? 'وقت النهاية' : 'End Time'}
                      </Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={preferences.quiet_hours.end_time}
                        onChange={(e) => updatePreferences({
                          quiet_hours: { ...preferences.quiet_hours, end_time: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>
                        {language === 'ar' ? 'السماح بإشعارات الطوارئ' : 'Allow Emergency Notifications'}
                      </Label>
                      <p className="text-sm text-gray-600">
                        {language === 'ar' ? 'السماح بالإشعارات العاجلة حتى خلال الساعات الهادئة' : 'Allow urgent notifications even during quiet hours'}
                      </p>
                    </div>
                    <Switch
                      checked={preferences.quiet_hours.emergency_override}
                      onCheckedChange={(emergency_override) => updatePreferences({
                        quiet_hours: { ...preferences.quiet_hours, emergency_override }
                      })}
                    />
                  </div>
                </div>
              )}

              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {language === 'ar' ? 
                    'إشعارات الطوارئ الطبية والمكالمات العاجلة سيتم تسليمها دائماً بغض النظر عن إعدادات الساعات الهادئة.' :
                    'Medical emergency notifications and urgent calls will always be delivered regardless of quiet hours settings.'
                  }
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Changes Notice */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 left-4 md:left-auto">
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="w-4 h-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {language === 'ar' ? 
                  'لديك تغييرات غير محفوظة' : 
                  'You have unsaved changes'
                }
              </span>
              <Button onClick={savePreferences} size="sm" disabled={saving}>
                {saving ? 
                  (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') :
                  (language === 'ar' ? 'حفظ الآن' : 'Save Now')
                }
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}