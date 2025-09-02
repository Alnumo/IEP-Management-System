/**
 * Notification Preferences Component
 * Manage parent notification preferences for all channels
 * إدارة تفضيلات الإشعارات لولي الأمر لجميع القنوات
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Bell,
  Mail,
  MessageSquare,
  Clock,
  Shield,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Save,
  RotateCcw,
  Info,
  CheckCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  useParentPortal,
  useUpdateNotificationPreferences
} from '@/hooks/useParentProgress';
import { cn } from '@/lib/utils';

interface NotificationPreferencesProps {
  className?: string;
  trigger?: React.ReactNode;
}

interface PreferenceSettings {
  in_app_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  priority_threshold: 'low' | 'medium' | 'high' | 'critical';
  categories: {
    session_completed: boolean;
    goal_achieved: boolean;
    appointment_reminder: boolean;
    document_uploaded: boolean;
    message_received: boolean;
    home_program_due: boolean;
    milestone_reached: boolean;
  };
  frequency_limits: {
    daily_email_limit: number;
    daily_whatsapp_limit: number;
    batch_notifications: boolean;
  };
  language_preference: 'ar' | 'en' | 'both';
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ 
  className, 
  trigger 
}) => {
  const { language, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Get parent profile data
  const { profile, isLoading: isProfileLoading } = useParentPortal();
  const updatePreferencesMutation = useUpdateNotificationPreferences();
  
  // Local state for preferences
  const [preferences, setPreferences] = useState<PreferenceSettings>({
    in_app_enabled: true,
    email_enabled: true,
    whatsapp_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    priority_threshold: 'medium',
    categories: {
      session_completed: true,
      goal_achieved: true,
      appointment_reminder: true,
      document_uploaded: true,
      message_received: true,
      home_program_due: true,
      milestone_reached: true,
    },
    frequency_limits: {
      daily_email_limit: 10,
      daily_whatsapp_limit: 5,
      batch_notifications: true,
    },
    language_preference: language,
  });

  // Load existing preferences
  useEffect(() => {
    if (profile?.notification_preferences) {
      setPreferences(prev => ({
        ...prev,
        ...profile.notification_preferences
      }));
    }
  }, [profile]);

  const handlePreferenceChange = (key: keyof PreferenceSettings, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleCategoryChange = (category: keyof PreferenceSettings['categories'], enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      categories: { ...prev.categories, [category]: enabled }
    }));
    setHasChanges(true);
  };

  const handleFrequencyLimitChange = (key: keyof PreferenceSettings['frequency_limits'], value: any) => {
    setPreferences(prev => ({
      ...prev,
      frequency_limits: { ...prev.frequency_limits, [key]: value }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    try {
      await updatePreferencesMutation.mutateAsync({
        parentId: profile.id,
        preferences
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handleReset = () => {
    if (profile?.notification_preferences) {
      setPreferences(prev => ({
        ...prev,
        ...profile.notification_preferences
      }));
    }
    setHasChanges(false);
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      session_completed: {
        ar: 'إكمال الجلسات',
        en: 'Session Completion'
      },
      goal_achieved: {
        ar: 'تحقيق الأهداف',
        en: 'Goal Achievement'
      },
      appointment_reminder: {
        ar: 'تذكير المواعيد',
        en: 'Appointment Reminders'
      },
      document_uploaded: {
        ar: 'رفع المستندات',
        en: 'Document Uploads'
      },
      message_received: {
        ar: 'الرسائل الجديدة',
        en: 'New Messages'
      },
      home_program_due: {
        ar: 'البرامج المنزلية',
        en: 'Home Programs'
      },
      milestone_reached: {
        ar: 'الإنجازات المهمة',
        en: 'Milestones'
      }
    };
    
    return labels[category]?.[language] || category;
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className={className}>
      <Settings className="h-4 w-4 mr-2" />
      {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>

      <DialogContent className={cn(
        "max-w-4xl max-h-[90vh] overflow-y-auto",
        isRTL && "text-right"
      )} dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5" />
            {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
          </DialogTitle>
          
          <DialogDescription>
            {language === 'ar' 
              ? 'تخصيص كيفية ومتى تريد تلقي الإشعارات من مركز أركان للنمو'
              : 'Customize how and when you want to receive notifications from Arkan Growth Center'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Notification Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {language === 'ar' ? 'قنوات الإشعارات' : 'Notification Channels'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* In-App Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    {language === 'ar' ? 'إشعارات داخل التطبيق' : 'In-App Notifications'}
                  </Label>
                  <p className="text-sm text-gray-500">
                    {language === 'ar' 
                      ? 'إشعارات فورية داخل بوابة ولي الأمر'
                      : 'Real-time notifications within the parent portal'
                    }
                  </p>
                </div>
                <Switch
                  checked={preferences.in_app_enabled}
                  onCheckedChange={(checked) => handlePreferenceChange('in_app_enabled', checked)}
                />
              </div>

              <Separator />

              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {language === 'ar' ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}
                  </Label>
                  <p className="text-sm text-gray-500">
                    {language === 'ar' 
                      ? 'إشعارات مفصلة عبر البريد الإلكتروني'
                      : 'Detailed notifications via email'
                    }
                  </p>
                </div>
                <Switch
                  checked={preferences.email_enabled}
                  onCheckedChange={(checked) => handlePreferenceChange('email_enabled', checked)}
                />
              </div>

              <Separator />

              {/* WhatsApp Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {language === 'ar' ? 'إشعارات الواتساب' : 'WhatsApp Notifications'}
                  </Label>
                  <p className="text-sm text-gray-500">
                    {language === 'ar' 
                      ? 'إشعارات سريعة عبر الواتساب للأمور العاجلة'
                      : 'Quick notifications via WhatsApp for urgent matters'
                    }
                  </p>
                </div>
                <Switch
                  checked={preferences.whatsapp_enabled}
                  onCheckedChange={(checked) => handlePreferenceChange('whatsapp_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {language === 'ar' ? 'ساعات الصمت' : 'Quiet Hours'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>
                    {language === 'ar' ? 'تفعيل ساعات الصمت' : 'Enable Quiet Hours'}
                  </Label>
                  <p className="text-sm text-gray-500">
                    {language === 'ar' 
                      ? 'منع الإشعارات غير العاجلة خلال ساعات محددة'
                      : 'Prevent non-urgent notifications during specified hours'
                    }
                  </p>
                </div>
                <Switch
                  checked={preferences.quiet_hours_enabled}
                  onCheckedChange={(checked) => handlePreferenceChange('quiet_hours_enabled', checked)}
                />
              </div>

              {preferences.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'من الساعة' : 'From'}</Label>
                    <Input
                      type="time"
                      value={preferences.quiet_hours_start}
                      onChange={(e) => handlePreferenceChange('quiet_hours_start', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'إلى الساعة' : 'To'}</Label>
                    <Input
                      type="time"
                      value={preferences.quiet_hours_end}
                      onChange={(e) => handlePreferenceChange('quiet_hours_end', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {language === 'ar' ? 'إعدادات الأولوية' : 'Priority Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الحد الأدنى لأولوية الإشعارات' : 'Minimum Notification Priority'}</Label>
                <Select
                  value={preferences.priority_threshold}
                  onValueChange={(value: any) => handlePreferenceChange('priority_threshold', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      {language === 'ar' ? 'منخفضة - جميع الإشعارات' : 'Low - All notifications'}
                    </SelectItem>
                    <SelectItem value="medium">
                      {language === 'ar' ? 'متوسطة - إشعارات مهمة' : 'Medium - Important notifications'}
                    </SelectItem>
                    <SelectItem value="high">
                      {language === 'ar' ? 'عالية - إشعارات عاجلة فقط' : 'High - Urgent notifications only'}
                    </SelectItem>
                    <SelectItem value="critical">
                      {language === 'ar' ? 'حرجة - إشعارات طوارئ فقط' : 'Critical - Emergency notifications only'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {language === 'ar' 
                    ? 'ستتلقى فقط الإشعارات التي تساوي أو تفوق هذه الأولوية'
                    : 'You will only receive notifications that meet or exceed this priority level'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                {language === 'ar' ? 'أنواع الإشعارات' : 'Notification Categories'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(preferences.categories).map(([category, enabled]) => (
                <div key={category} className="flex items-center justify-between">
                  <Label className="cursor-pointer">
                    {getCategoryLabel(category)}
                  </Label>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => handleCategoryChange(category as any, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Frequency Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {language === 'ar' ? 'حدود التكرار' : 'Frequency Limits'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'حد البريد الإلكتروني اليومي' : 'Daily Email Limit'}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={preferences.frequency_limits.daily_email_limit}
                    onChange={(e) => handleFrequencyLimitChange('daily_email_limit', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'حد الواتساب اليومي' : 'Daily WhatsApp Limit'}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={preferences.frequency_limits.daily_whatsapp_limit}
                    onChange={(e) => handleFrequencyLimitChange('daily_whatsapp_limit', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>
                    {language === 'ar' ? 'تجميع الإشعارات' : 'Batch Notifications'}
                  </Label>
                  <p className="text-sm text-gray-500">
                    {language === 'ar' 
                      ? 'جمع الإشعارات المتشابهة في رسالة واحدة'
                      : 'Group similar notifications into a single message'
                    }
                  </p>
                </div>
                <Switch
                  checked={preferences.frequency_limits.batch_notifications}
                  onCheckedChange={(checked) => handleFrequencyLimitChange('batch_notifications', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Language Preference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                {language === 'ar' ? 'تفضيل اللغة' : 'Language Preference'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'لغة الإشعارات' : 'Notification Language'}</Label>
                <Select
                  value={preferences.language_preference}
                  onValueChange={(value: any) => handlePreferenceChange('language_preference', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية فقط</SelectItem>
                    <SelectItem value="en">English Only</SelectItem>
                    <SelectItem value="both">
                      {language === 'ar' ? 'كلا اللغتين' : 'Both Languages'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Status Alert */}
          {updatePreferencesMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {language === 'ar' 
                  ? 'حدث خطأ في حفظ الإعدادات. يرجى المحاولة مرة أخرى.'
                  : 'An error occurred while saving settings. Please try again.'
                }
              </AlertDescription>
            </Alert>
          )}

          {updatePreferencesMutation.isSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {language === 'ar' 
                  ? 'تم حفظ إعداداتك بنجاح!'
                  : 'Your settings have been saved successfully!'
                }
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || updatePreferencesMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updatePreferencesMutation.isPending}
          >
            {updatePreferencesMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationPreferences;