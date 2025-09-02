/**
 * Notification Center Component  
 * Real-time notification system for parent portal
 * مركز الإشعارات للحصول على التحديثات الفورية في بوابة أولياء الأمور
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Bell,
  BellOff,
  MessageSquare,
  Calendar,
  FileText,
  Award,
  Clock,
  Check,
  CheckCheck,
  Settings,
  Filter,
  Search,
  Trash2,
  AlertCircle,
  Home,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsAsRead,
  useDismissNotification,
  useParentPortal
} from '@/hooks/useParentProgress';
import type { NotificationData, NotificationType } from '@/types/parent';

interface NotificationCenterProps {
  className?: string;
}

interface NotificationFilters {
  type: 'all' | NotificationType;
  status: 'all' | 'read' | 'unread';
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const { language, isRTL } = useLanguage();
  const [filters, setFilters] = useState<NotificationFilters>({
    type: 'all',
    status: 'all'
  });

  // Get comprehensive parent portal data
  const { profile, isLoading: isProfileLoading } = useParentPortal();
  const parentId = profile?.id;

  // Get notifications with real-time updates
  const {
    data: notifications = [],
    isLoading: isNotificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications
  } = useNotifications(parentId || '');

  // Mutation hooks
  const markNotificationReadMutation = useMarkNotificationRead();
  const markAllNotificationsAsReadMutation = useMarkAllNotificationsAsRead();
  const dismissNotificationMutation = useDismissNotification();

  // Filter notifications based on current filters
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(notification => notification.type === filters.type);
    }

    // Status filter
    if (filters.status === 'read') {
      filtered = filtered.filter(notification => notification.is_read);
    } else if (filters.status === 'unread') {
      filtered = filtered.filter(notification => !notification.is_read);
    }

    // Sort by newest first
    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications, filters]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: NotificationData[] } = {};
    
    filteredNotifications.forEach(notification => {
      const date = new Date(notification.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = language === 'ar' ? 'اليوم' : 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = language === 'ar' ? 'أمس' : 'Yesterday';
      } else {
        groupKey = isRTL ? 
          date.toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' }) :
          date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    return groups;
  }, [filteredNotifications, language, isRTL]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationReadMutation.mutateAsync(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!parentId) return;
    
    try {
      await markAllNotificationsAsReadMutation.mutateAsync(parentId);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDismissNotification = async (notificationId: string) => {
    try {
      await dismissNotificationMutation.mutateAsync(notificationId);
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const iconProps = { className: "h-4 w-4" };
    
    switch (type) {
      case 'message':
        return <MessageSquare {...iconProps} className="h-4 w-4 text-blue-500" />;
      case 'session':
        return <Calendar {...iconProps} className="h-4 w-4 text-green-500" />;
      case 'progress':
        return <Award {...iconProps} className="h-4 w-4 text-yellow-500" />;
      case 'document':
        return <FileText {...iconProps} className="h-4 w-4 text-purple-500" />;
      case 'home_program':
        return <Home {...iconProps} className="h-4 w-4 text-orange-500" />;
      case 'system':
        return <Settings {...iconProps} className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell {...iconProps} className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationTypeLabel = (type: NotificationType) => {
    const labels = {
      ar: {
        message: 'رسالة جديدة',
        session: 'موعد جلسة',
        progress: 'تقرير تقدم',
        document: 'مستند جديد',
        home_program: 'برنامج منزلي',
        system: 'إشعار النظام'
      },
      en: {
        message: 'New Message',
        session: 'Session Appointment', 
        progress: 'Progress Report',
        document: 'New Document',
        home_program: 'Home Program',
        system: 'System Notification'
      }
    };
    return labels[language][type] || type;
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);

    if (diffInMinutes < 1) {
      return language === 'ar' ? 'الآن' : 'Now';
    } else if (diffInMinutes < 60) {
      const minutes = Math.floor(diffInMinutes);
      return language === 'ar' ? 
        `منذ ${minutes} دقيقة` : 
        `${minutes}m ago`;
    } else if (diffInMinutes < 1440) { // Less than 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return language === 'ar' ? 
        `منذ ${hours} ساعة` : 
        `${hours}h ago`;
    } else {
      return isRTL ? 
        date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) :
        date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isProfileLoading || isNotificationsLoading) {
    return (
      <Card className={cn("w-full max-w-2xl mx-auto", className)} dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4 border border-gray-100 rounded-lg">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (notificationsError) {
    return (
      <Alert variant="destructive" className={cn("max-w-2xl mx-auto", className)}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {language === 'ar' ? 'خطأ في تحميل الإشعارات' : 'Error loading notifications'}
          <br />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchNotifications()}
            className="mt-2"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle className="text-lg">
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markNotificationReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'تمييز الكل كمقروء' : 'Mark all read'}
              </Button>
            )}
            
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 pt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">
                {language === 'ar' ? 'جميع الأنواع' : 'All types'}
              </option>
              <option value="message">
                {getNotificationTypeLabel('message')}
              </option>
              <option value="session">
                {getNotificationTypeLabel('session')}
              </option>
              <option value="progress">
                {getNotificationTypeLabel('progress')}
              </option>
              <option value="document">
                {getNotificationTypeLabel('document')}
              </option>
              <option value="home_program">
                {getNotificationTypeLabel('home_program')}
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">
                {language === 'ar' ? 'جميع الحالات' : 'All status'}
              </option>
              <option value="unread">
                {language === 'ar' ? 'غير مقروء' : 'Unread'}
              </option>
              <option value="read">
                {language === 'ar' ? 'مقروء' : 'Read'}
              </option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {Object.keys(groupedNotifications).length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BellOff className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">
              {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
            </p>
            <p className="text-sm">
              {language === 'ar' ? 
                'ستظهر الإشعارات الجديدة هنا عند وصولها' :
                'New notifications will appear here when they arrive'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
              <div key={dateGroup}>
                <h3 className="text-sm font-medium text-gray-700 mb-3 px-2">
                  {dateGroup}
                </h3>
                
                <div className="space-y-2">
                  {groupNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50",
                        !notification.is_read 
                          ? "bg-blue-50 border-blue-200" 
                          : "bg-white border-gray-100"
                      )}
                      onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                    >
                      <div className="shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-sm font-medium",
                              !notification.is_read && "font-semibold"
                            )}>
                              {getNotificationTypeLabel(notification.type)}
                            </span>
                            {!notification.is_read && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center gap-1">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                className="h-6 w-6 p-0 hover:bg-blue-100"
                                disabled={markNotificationReadMutation.isPending}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismissNotification(notification.id);
                              }}
                              className="h-6 w-6 p-0 hover:bg-red-100 text-red-500 hover:text-red-600"
                              disabled={dismissNotificationMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <span className="text-xs text-gray-500 shrink-0">
                            {formatNotificationTime(notification.created_at)}
                          </span>
                        </div>
                        
                        <p className={cn(
                          "text-sm text-gray-600 leading-relaxed",
                          !notification.is_read && "text-gray-900"
                        )}>
                          {language === 'ar' ? 
                            notification.title_ar : 
                            notification.title_en}
                        </p>
                        
                        {(notification.description_ar || notification.description_en) && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {language === 'ar' ? 
                              notification.description_ar : 
                              notification.description_en}
                          </p>
                        )}

                        {notification.action_url && (
                          <Button
                            variant="link" 
                            size="sm"
                            className="p-0 h-auto mt-2 text-blue-600 hover:text-blue-800"
                          >
                            {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredNotifications.length > 0 && (
          <div className="text-center pt-6 border-t border-gray-100 mt-6">
            <p className="text-sm text-gray-600">
              {language === 'ar' ? 
                `عرض ${filteredNotifications.length} من أصل ${notifications.length} إشعار` :
                `Showing ${filteredNotifications.length} of ${notifications.length} notifications`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationCenter;