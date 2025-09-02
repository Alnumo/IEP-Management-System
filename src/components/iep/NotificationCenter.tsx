/**
 * Comprehensive Notification Center Component
 * Complete notification management dashboard with preferences, analytics, and real-time updates
 */

import React, { useState, useEffect, useMemo } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  Bell,
  Settings,
  Filter,
  Search,
  MoreVertical,
  Check,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  MessageSquare,
  Phone,
  Smartphone,
  Eye,
  EyeOff,
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  Calendar,
  FileText,
  Activity,
  Zap
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  useNotifications,
  useUserNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useBulkMarkAsRead,
  useBulkDeleteNotifications,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useNotificationAnalytics,
  useNotificationSystemHealth,
  useNotificationSubscription
} from '@/hooks/useNotificationSystem';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

import type {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationSummary,
  NotificationPreferences
} from '@/types/notification';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'ar' | 'en';
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  language
}) => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const { toast } = useToast();
  
  const [selectedTab, setSelectedTab] = useState<'notifications' | 'preferences' | 'analytics'>('notifications');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<NotificationPriority | 'all'>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  // Notification data hooks
  const {
    data: notificationsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchNotifications
  } = useNotifications(
    {
      recipient_id: user?.id,
      type: filterType !== 'all' ? [filterType] : undefined,
      priority: filterPriority !== 'all' ? [filterPriority] : undefined,
      search: searchQuery || undefined
    },
    !!user?.id
  );

  const { data: userNotifications, refetch: refetchUserNotifications } = useUserNotifications(
    user?.id || '',
    50,
    !!user?.id
  );

  const { data: unreadCount } = useUnreadCount(user?.id || '', !!user?.id);

  const { data: preferences } = useNotificationPreferences(user?.id || '', !!user?.id);
  const { data: systemHealth } = useNotificationSystemHealth();
  const { data: analytics } = useNotificationAnalytics(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    format(new Date(), 'yyyy-MM-dd'),
    undefined,
    selectedTab === 'analytics'
  );

  // Mutations
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const bulkMarkAsRead = useBulkMarkAsRead();
  const bulkDeleteNotifications = useBulkDeleteNotifications();
  const updatePreferences = useUpdateNotificationPreferences();

  // Real-time subscription
  const { subscribeToNotifications } = useNotificationSubscription(user?.id || '');

  // Set up real-time subscription
  useEffect(() => {
    if (user?.id && isOpen) {
      const unsubscribe = subscribeToNotifications();
      return unsubscribe;
    }
  }, [user?.id, isOpen, subscribeToNotifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (!userNotifications) return [];
    
    let filtered = userNotifications;
    
    if (showOnlyUnread) {
      filtered = filtered.filter(n => !n.is_read);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(n =>
        (language === 'ar' ? n.title_ar : n.title_en)
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [userNotifications, showOnlyUnread, searchQuery, language]);

  // Priority styles
  const getPriorityColor = (priority: NotificationPriority): string => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'deadline_reminder': return <Clock className="h-4 w-4" />;
      case 'approval_request': return <CheckCircle className="h-4 w-4" />;
      case 'meeting_reminder': return <Calendar className="h-4 w-4" />;
      case 'compliance_warning': return <AlertTriangle className="h-4 w-4" />;
      case 'goal_milestone': return <TrendingUp className="h-4 w-4" />;
      case 'system_alert': return <Zap className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'push': return <Smartphone className="h-4 w-4" />;
      case 'in_app': return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  // Event handlers
  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.id) return;
    
    try {
      await markAsRead.mutateAsync({ notificationId, userId: user.id });
      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم تمييز الإشعار كمقروء' : 'Notification marked as read',
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في تحديث الإشعار' : 'Failed to update notification',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await markAllAsRead.mutateAsync(user.id);
      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم تمييز جميع الإشعارات كمقروءة' : 'All notifications marked as read',
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في تحديث الإشعارات' : 'Failed to update notifications',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user?.id) return;
    
    try {
      await deleteNotification.mutateAsync({ notificationId, userId: user.id });
      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف الإشعار' : 'Notification deleted',
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في حذف الإشعار' : 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (!user?.id || selectedNotifications.length === 0) return;
    
    try {
      await bulkMarkAsRead.mutateAsync({ 
        notificationIds: selectedNotifications, 
        userId: user.id 
      });
      setSelectedNotifications([]);
      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' 
          ? `تم تمييز ${selectedNotifications.length} إشعار كمقروء`
          : `${selectedNotifications.length} notifications marked as read`,
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في تحديث الإشعارات المحددة' : 'Failed to update selected notifications',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!user?.id || selectedNotifications.length === 0) return;
    
    try {
      await bulkDeleteNotifications.mutateAsync({ 
        notificationIds: selectedNotifications, 
        userId: user.id 
      });
      setSelectedNotifications([]);
      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' 
          ? `تم حذف ${selectedNotifications.length} إشعار`
          : `${selectedNotifications.length} notifications deleted`,
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في حذف الإشعارات المحددة' : 'Failed to delete selected notifications',
        variant: 'destructive',
      });
    }
  };

  const formatNotificationDate = (dateString: string): string => {
    const date = new Date(dateString);
    const locale = language === 'ar' ? ar : enUS;
    
    if (isToday(date)) {
      return language === 'ar' ? 'اليوم' : 'Today';
    } else if (isYesterday(date)) {
      return language === 'ar' ? 'أمس' : 'Yesterday';
    } else {
      return formatDistanceToNow(date, { addSuffix: true, locale });
    }
  };

  // Render notification item
  const renderNotificationItem = (notification: NotificationSummary) => (
    <Card key={notification.id} className={`mb-2 transition-all duration-200 hover:shadow-md ${
      !notification.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedNotifications.includes(notification.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedNotifications([...selectedNotifications, notification.id]);
                } else {
                  setSelectedNotifications(selectedNotifications.filter(id => id !== notification.id));
                }
              }}
            />
            <div className={`p-2 rounded-full ${getPriorityColor(notification.priority)}`}>
              {getTypeIcon(notification.type)}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`text-sm font-medium truncate ${!notification.is_read ? 'font-semibold' : ''}`}>
                {language === 'ar' ? notification.title_ar : notification.title_en}
              </h4>
              <Badge variant="secondary" className="text-xs">
                {notification.type.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={`text-xs ${getPriorityColor(notification.priority)}`}>
                {notification.priority}
              </Badge>
            </div>
            
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {formatNotificationDate(notification.scheduled_at)}
            </p>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {getChannelIcon('in_app')}
                <span className="text-xs text-gray-500">
                  {language === 'ar' ? 'داخل التطبيق' : 'In-app'}
                </span>
              </div>
              {notification.delivery_status === 'delivered' && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
              {notification.delivery_status === 'failed' && (
                <XCircle className="h-3 w-3 text-red-500" />
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
              {!notification.is_read && (
                <DropdownMenuItem onClick={() => handleMarkAsRead(notification.id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'تمييز كمقروء' : 'Mark as read'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => handleDeleteNotification(notification.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'حذف' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  // Render preferences tab
  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'ar' ? 'تفضيلات الإشعارات' : 'Notification Preferences'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'تخصيص كيفية تلقي الإشعارات'
              : 'Customize how you receive notifications'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Notification Types */}
            <div>
              <h4 className="font-medium mb-4">
                {language === 'ar' ? 'أنواع الإشعارات' : 'Notification Types'}
              </h4>
              <div className="space-y-4">
                {[
                  { type: 'deadline_reminder', label_ar: 'تذكيرات المواعيد النهائية', label_en: 'Deadline Reminders' },
                  { type: 'approval_request', label_ar: 'طلبات الموافقة', label_en: 'Approval Requests' },
                  { type: 'meeting_reminder', label_ar: 'تذكيرات الاجتماعات', label_en: 'Meeting Reminders' },
                  { type: 'compliance_warning', label_ar: 'تحذيرات الامتثال', label_en: 'Compliance Warnings' },
                  { type: 'goal_milestone', label_ar: 'إنجازات الأهداف', label_en: 'Goal Milestones' },
                  { type: 'system_alert', label_ar: 'تنبيهات النظام', label_en: 'System Alerts' }
                ].map((item) => {
                  const preference = preferences?.find(p => p.notification_type === item.type);
                  return (
                    <div key={item.type} className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">
                          {language === 'ar' ? item.label_ar : item.label_en}
                        </Label>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {['email', 'sms', 'whatsapp', 'in_app', 'push'].map((channel) => (
                            <Button
                              key={channel}
                              variant={preference?.channels.includes(channel as NotificationChannel) ? 'default' : 'outline'}
                              size="sm"
                              className="p-1 h-8 w-8"
                            >
                              {getChannelIcon(channel as NotificationChannel)}
                            </Button>
                          ))}
                        </div>
                        <Switch
                          checked={preference?.enabled || false}
                          onCheckedChange={(checked) => {
                            // Handle preference update
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <Separator />
            
            {/* Quiet Hours */}
            <div>
              <h4 className="font-medium mb-4">
                {language === 'ar' ? 'ساعات الصمت' : 'Quiet Hours'}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'من' : 'From'}</Label>
                  <Select defaultValue="22:00">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                          {`${i.toString().padStart(2, '0')}:00`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'إلى' : 'To'}</Label>
                  <Select defaultValue="08:00">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                          {`${i.toString().padStart(2, '0')}:00`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render analytics tab
  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* System Health */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {language === 'ar' ? 'حالة النظام' : 'System Health'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{systemHealth.queue_size}</div>
                <div className="text-sm text-gray-600">
                  {language === 'ar' ? 'في الطابور' : 'Queued'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {systemHealth.average_processing_time.toFixed(1)}s
                </div>
                <div className="text-sm text-gray-600">
                  {language === 'ar' ? 'متوسط الوقت' : 'Avg Time'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {systemHealth.pending_notifications}
                </div>
                <div className="text-sm text-gray-600">
                  {language === 'ar' ? 'معلقة' : 'Pending'}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  systemHealth.error_rate < 0.05 ? 'text-green-600' : 
                  systemHealth.error_rate < 0.1 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {(systemHealth.error_rate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  {language === 'ar' ? 'معدل الأخطاء' : 'Error Rate'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Status */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'ar' ? 'حالة القنوات' : 'Channel Status'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(systemHealth.channel_status).map(([channel, status]) => (
                <div key={channel} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getChannelIcon(channel as NotificationChannel)}
                    <span className="font-medium capitalize">{channel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      status.is_operational ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm text-gray-600">
                      {status.is_operational 
                        ? (language === 'ar' ? 'يعمل' : 'Operational')
                        : (language === 'ar' ? 'متوقف' : 'Down')
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`max-w-4xl h-[90vh] ${isRTL ? 'font-arabic' : ''}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Bell className="h-6 w-6" />
            {language === 'ar' ? 'مركز الإشعارات' : 'Notification Center'}
            {unreadCount && unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notifications">
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </TabsTrigger>
            <TabsTrigger value="preferences">
              {language === 'ar' ? 'التفضيلات' : 'Preferences'}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              {language === 'ar' ? 'التحليلات' : 'Analytics'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="mt-6 space-y-4">
            {/* Filters and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={language === 'ar' ? 'البحث في الإشعارات...' : 'Search notifications...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === 'ar' ? 'جميع الأنواع' : 'All Types'}
                    </SelectItem>
                    <SelectItem value="deadline_reminder">
                      {language === 'ar' ? 'تذكيرات المواعيد' : 'Deadlines'}
                    </SelectItem>
                    <SelectItem value="approval_request">
                      {language === 'ar' ? 'طلبات الموافقة' : 'Approvals'}
                    </SelectItem>
                    <SelectItem value="meeting_reminder">
                      {language === 'ar' ? 'تذكيرات الاجتماعات' : 'Meetings'}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="unread-only"
                    checked={showOnlyUnread}
                    onCheckedChange={setShowOnlyUnread}
                  />
                  <Label htmlFor="unread-only" className="text-sm">
                    {language === 'ar' ? 'غير مقروءة فقط' : 'Unread only'}
                  </Label>
                </div>
              </div>

              <div className="flex gap-2">
                {selectedNotifications.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleBulkMarkAsRead}>
                      <Check className="h-4 w-4 mr-1" />
                      {language === 'ar' ? 'تمييز كمقروء' : 'Mark Read'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      {language === 'ar' ? 'حذف' : 'Delete'}
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {language === 'ar' ? 'تمييز الكل كمقروء' : 'Mark All Read'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => refetchUserNotifications()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <ScrollArea className="h-[500px]">
              {filteredNotifications.length > 0 ? (
                <div className="space-y-2">
                  {filteredNotifications.map(renderNotificationItem)}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                  </h3>
                  <p className="text-gray-500">
                    {language === 'ar' 
                      ? 'ستظهر إشعاراتك هنا عند وصولها'
                      : 'Your notifications will appear here when they arrive'
                    }
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preferences">
            <ScrollArea className="h-[500px]">
              {renderPreferencesTab()}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analytics">
            <ScrollArea className="h-[500px]">
              {renderAnalyticsTab()}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationCenter;