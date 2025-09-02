/**
 * React Query hooks for the Notification System
 * Comprehensive hooks for managing notifications, preferences, and system health
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/services/notification-system';
import type {
  BaseNotification,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus,
  NotificationPreferences,
  NotificationDelivery,
  NotificationAnalytics,
  NotificationSystemHealth,
  CreateNotificationRequest,
  NotificationFilters,
  NotificationListResponse,
  NotificationSummary
} from '@/types/notification';

// Notification management hooks
export function useNotifications(filters?: NotificationFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['notifications', filters],
    queryFn: async ({ pageParam = 1 }): Promise<NotificationListResponse> => {
      let query = supabase
        .from('notifications')
        .select(`
          *,
          deliveries:notification_deliveries(*)
        `)
        .order('created_at', { ascending: false })
        .range((pageParam - 1) * 20, pageParam * 20 - 1);

      // Apply filters
      if (filters?.type?.length) {
        query = query.in('type', filters.type);
      }
      if (filters?.priority?.length) {
        query = query.in('priority', filters.priority);
      }
      if (filters?.recipient_id) {
        query = query.eq('recipient_id', filters.recipient_id);
      }
      if (filters?.related_entity_type) {
        query = query.eq('related_entity_type', filters.related_entity_type);
      }
      if (filters?.related_entity_id) {
        query = query.eq('related_entity_id', filters.related_entity_id);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters?.search) {
        query = query.or(`title_ar.ilike.%${filters.search}%,title_en.ilike.%${filters.search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('user_id', filters?.recipient_id || '');

      return {
        notifications: data || [],
        total: count || 0,
        page: pageParam,
        limit: 20,
        has_more: data?.length === 20,
        unread_count: unreadCount || 0
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.page + 1 : undefined;
    },
    enabled,
    staleTime: 30000, // 30 seconds
  });
}

export function useNotification(notificationId: string, enabled = true) {
  return useQuery({
    queryKey: ['notification', notificationId],
    queryFn: async (): Promise<BaseNotification> => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          deliveries:notification_deliveries(*)
        `)
        .eq('id', notificationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: enabled && !!notificationId,
    staleTime: 60000, // 1 minute
  });
}

export function useUserNotifications(userId: string, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ['user-notifications', userId, limit],
    queryFn: async (): Promise<NotificationSummary[]> => {
      const { data, error } = await supabase
        .from('user_notifications')
        .select(`
          notification_id,
          is_read,
          created_at,
          notification:notifications(
            id,
            type,
            priority,
            title_ar,
            title_en,
            scheduled_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.notification_id,
        type: item.notification.type,
        priority: item.notification.priority,
        title_ar: item.notification.title_ar,
        title_en: item.notification.title_en,
        recipient_id: userId,
        scheduled_at: item.notification.scheduled_at,
        delivery_status: 'delivered' as NotificationStatus,
        is_read: item.is_read
      }));
    },
    enabled: enabled && !!userId,
    staleTime: 30000,
  });
}

export function useUnreadCount(userId: string, enabled = true) {
  return useQuery({
    queryKey: ['unread-count', userId],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: enabled && !!userId,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Notification creation mutations
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateNotificationRequest): Promise<BaseNotification> => {
      return await notificationService.createNotification(request);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications', data.recipient_id] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', data.recipient_id] });
    },
  });
}

export function useCreateDeadlineReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      iepId,
      deadlineType,
      deadlineDate,
      recipientId,
      daysUntilDeadline
    }: {
      iepId: string;
      deadlineType: string;
      deadlineDate: string;
      recipientId: string;
      daysUntilDeadline: number;
    }) => {
      return await notificationService.createDeadlineReminder(
        iepId,
        deadlineType,
        deadlineDate,
        recipientId,
        daysUntilDeadline
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications', data.recipient_id] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', data.recipient_id] });
    },
  });
}

export function useCreateApprovalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      iepId,
      approvalId,
      approvalType,
      approverRole,
      approverId,
      requestedBy,
      dueDate,
      isUrgent = false
    }: {
      iepId: string;
      approvalId: string;
      approvalType: string;
      approverRole: string;
      approverId: string;
      requestedBy: string;
      dueDate: string;
      isUrgent?: boolean;
    }) => {
      return await notificationService.createApprovalRequest(
        iepId,
        approvalId,
        approvalType,
        approverRole,
        approverId,
        requestedBy,
        dueDate,
        isUrgent
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications', data.recipient_id] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', data.recipient_id] });
    },
  });
}

export function useCreateMeetingReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      attendeeId,
      meetingDate,
      meetingType,
      hoursBeforeMeeting
    }: {
      meetingId: string;
      attendeeId: string;
      meetingDate: string;
      meetingType: string;
      hoursBeforeMeeting: number;
    }) => {
      return await notificationService.createMeetingReminder(
        meetingId,
        attendeeId,
        meetingDate,
        meetingType,
        hoursBeforeMeeting
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications', data.recipient_id] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', data.recipient_id] });
    },
  });
}

export function useCreateComplianceAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityId,
      entityType,
      riskLevel,
      complianceArea,
      affectedStudents,
      correctiveActions
    }: {
      entityId: string;
      entityType: string;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      complianceArea: string;
      affectedStudents: number;
      correctiveActions: Array<{
        action_ar: string;
        action_en: string;
        deadline: string;
        responsible_party: string;
      }>;
    }) => {
      return await notificationService.createComplianceAlert(
        entityId,
        entityType,
        riskLevel,
        complianceArea,
        affectedStudents,
        correctiveActions
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

// Notification actions
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationId, userId }: { notificationId: string; userId: string }) => {
      const { error } = await supabase
        .from('user_notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('notification_id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', variables.userId] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', userId] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationId, userId }: { notificationId: string; userId: string }) => {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('notification_id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', variables.userId] });
    },
  });
}

// Notification preferences
export function useNotificationPreferences(userId: string, enabled = true) {
  return useQuery({
    queryKey: ['notification-preferences', userId],
    queryFn: async (): Promise<NotificationPreferences[]> => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!userId,
    staleTime: 300000, // 5 minutes
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      preferences
    }: {
      userId: string;
      preferences: Partial<NotificationPreferences>[];
    }) => {
      const updates = preferences.map(pref => ({
        ...pref,
        user_id: userId,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('notification_preferences')
        .upsert(updates);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', variables.userId] });
    },
  });
}

// Analytics and reporting
export function useNotificationAnalytics(
  dateFrom: string,
  dateTo: string,
  type?: NotificationType,
  enabled = true
) {
  return useQuery({
    queryKey: ['notification-analytics', dateFrom, dateTo, type],
    queryFn: async (): Promise<NotificationAnalytics[]> => {
      let query = supabase
        .from('notification_analytics')
        .select('*')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: true });

      if (type) {
        query = query.eq('notification_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!dateFrom && !!dateTo,
    staleTime: 300000, // 5 minutes
  });
}

export function useNotificationDeliveryStats(notificationId: string, enabled = true) {
  return useQuery({
    queryKey: ['notification-delivery-stats', notificationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_deliveries')
        .select('channel, status, delivered_at, failed_at, retry_count')
        .eq('notification_id', notificationId);

      if (error) throw error;

      const stats = {
        total: data.length,
        delivered: data.filter(d => d.status === 'delivered').length,
        failed: data.filter(d => d.status === 'failed').length,
        pending: data.filter(d => ['scheduled', 'sent'].includes(d.status)).length,
        by_channel: {} as Record<NotificationChannel, { total: number; delivered: number; failed: number }>
      };

      // Group by channel
      data.forEach(delivery => {
        if (!stats.by_channel[delivery.channel]) {
          stats.by_channel[delivery.channel] = { total: 0, delivered: 0, failed: 0 };
        }
        stats.by_channel[delivery.channel].total++;
        if (delivery.status === 'delivered') {
          stats.by_channel[delivery.channel].delivered++;
        } else if (delivery.status === 'failed') {
          stats.by_channel[delivery.channel].failed++;
        }
      });

      return stats;
    },
    enabled: enabled && !!notificationId,
    staleTime: 60000, // 1 minute
  });
}

// System health monitoring
export function useNotificationSystemHealth(enabled = true) {
  return useQuery({
    queryKey: ['notification-system-health'],
    queryFn: async (): Promise<NotificationSystemHealth> => {
      return await notificationService.getSystemHealth();
    },
    enabled,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refetch every minute
  });
}

// Real-time subscriptions
export function useNotificationSubscription(userId: string) {
  const queryClient = useQueryClient();

  const subscribeToNotifications = useCallback(() => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'broadcast',
        { event: 'new_notification' },
        (payload) => {
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['user-notifications', userId] });
          queryClient.invalidateQueries({ queryKey: ['unread-count', userId] });
          
          // Optionally, show a toast notification
          console.log('New notification received:', payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return { subscribeToNotifications };
}

// Bulk operations
export function useBulkMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationIds, userId }: { notificationIds: string[]; userId: string }) => {
      const { error } = await supabase
        .from('user_notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('notification_id', notificationIds)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', variables.userId] });
    },
  });
}

export function useBulkDeleteNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationIds, userId }: { notificationIds: string[]; userId: string }) => {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .in('notification_id', notificationIds)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', variables.userId] });
    },
  });
}