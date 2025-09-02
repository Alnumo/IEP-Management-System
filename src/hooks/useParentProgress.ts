/**
 * Parent Progress Hooks
 * React Query hooks for parent portal progress data
 * تخصيص hooks لبيانات تقدم الطلاب في بوابة أولياء الأمور
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ParentPortalService } from '@/services/parent-portal-service';
import type {
  ParentProfile,
  DashboardData,
  MessageThread,
  HomeProgram,
  StudentProgressSummary,
  NotificationData,
  ParentDocument
} from '@/types/parent';
import { withParentAuth } from '@/lib/auth-utils';

// Query keys for consistent caching
export const parentPortalKeys = {
  all: ['parentPortal'] as const,
  profile: () => [...parentPortalKeys.all, 'profile'] as const,
  dashboard: (parentId: string) => [...parentPortalKeys.all, 'dashboard', parentId] as const,
  progress: (studentId: string) => [...parentPortalKeys.all, 'progress', studentId] as const,
  messages: (parentId: string) => [...parentPortalKeys.all, 'messages', parentId] as const,
  homePrograms: (parentId: string, studentId: string) => [...parentPortalKeys.all, 'homePrograms', parentId, studentId] as const,
  documents: (parentId: string) => [...parentPortalKeys.all, 'documents', parentId] as const,
  notifications: (parentId: string) => [...parentPortalKeys.all, 'notifications', parentId] as const,
};

/**
 * Hook to get parent profile information
 * هوك للحصول على معلومات ملف ولي الأمر
 */
export const useParentProfile = () => {
  return useQuery({
    queryKey: parentPortalKeys.profile(),
    queryFn: withParentAuth(async () => {
      return await ParentPortalService.getParentProfile();
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to get parent dashboard data
 * هوك للحصول على بيانات لوحة تحكم ولي الأمر
 */
export const useParentDashboard = (parentId: string) => {
  return useQuery({
    queryKey: parentPortalKeys.dashboard(parentId),
    queryFn: withParentAuth(async () => {
      return await ParentPortalService.getDashboardData(parentId);
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes for frequently updated data
    gcTime: 10 * 60 * 1000,
    enabled: !!parentId,
  });
};

/**
 * Hook to get student progress summary with real-time updates
 * هوك للحصول على ملخص تقدم الطالب مع التحديثات الفورية
 */
export const useStudentProgress = (studentId: string) => {
  return useQuery({
    queryKey: parentPortalKeys.progress(studentId),
    queryFn: withParentAuth(async () => {
      return await ParentPortalService.getStudentProgressSummary(studentId);
    }),
    staleTime: 1 * 60 * 1000, // 1 minute for progress data
    gcTime: 10 * 60 * 1000,
    enabled: !!studentId,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
};

/**
 * Hook to get message threads
 * هوك للحصول على سلاسل الرسائل
 */
export const useMessageThreads = (parentId: string) => {
  return useQuery({
    queryKey: parentPortalKeys.messages(parentId),
    queryFn: withParentAuth(async () => {
      return await ParentPortalService.getMessageThreads(parentId);
    }),
    staleTime: 30 * 1000, // 30 seconds for real-time messaging
    gcTime: 10 * 60 * 1000,
    enabled: !!parentId,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
};

/**
 * Hook to get home programs
 * هوك للحصول على البرامج المنزلية
 */
export const useHomePrograms = (parentId: string, studentId: string) => {
  return useQuery({
    queryKey: parentPortalKeys.homePrograms(parentId, studentId),
    queryFn: withParentAuth(async () => {
      return await ParentPortalService.getHomePrograms(parentId, studentId);
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    enabled: !!parentId && !!studentId,
  });
};

/**
 * Hook to get parent documents
 * هوك للحصول على مستندات ولي الأمر
 */
export const useParentDocuments = (parentId: string) => {
  return useQuery({
    queryKey: parentPortalKeys.documents(parentId),
    queryFn: withParentAuth(async () => {
      return await ParentPortalService.getDocuments(parentId);
    }),
    staleTime: 10 * 60 * 1000, // 10 minutes for documents
    gcTime: 30 * 60 * 1000,
    enabled: !!parentId,
  });
};

/**
 * Hook to get notifications
 * هوك للحصول على الإشعارات
 */
export const useNotifications = (parentId: string) => {
  return useQuery({
    queryKey: parentPortalKeys.notifications(parentId),
    queryFn: withParentAuth(async () => {
      return await ParentPortalService.getNotifications(parentId);
    }),
    staleTime: 1 * 60 * 1000, // 1 minute for notifications
    gcTime: 10 * 60 * 1000,
    enabled: !!parentId,
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });
};

/**
 * Mutation hook to send a message
 * هوك طفرة لإرسال رسالة
 */
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: withParentAuth(async (messageData: any) => {
      return await ParentPortalService.sendMessage(messageData);
    }),
    onSuccess: (data, variables) => {
      // Invalidate and refetch message threads
      queryClient.invalidateQueries({ queryKey: parentPortalKeys.messages(data.parent_id) });
      
      // Update the cache optimistically
      queryClient.setQueryData(
        parentPortalKeys.messages(data.parent_id),
        (old: MessageThread[] | undefined) => {
          if (!old) return old;
          
          const threadIndex = old.findIndex(thread => thread.thread_id === data.thread_id);
          if (threadIndex >= 0) {
            const updatedThreads = [...old];
            updatedThreads[threadIndex] = {
              ...updatedThreads[threadIndex],
              messages: [...updatedThreads[threadIndex].messages, data],
              last_message: data,
              last_message_date: data.created_at,
            };
            return updatedThreads;
          }
          return old;
        }
      );
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    },
  });
};

/**
 * Mutation hook to mark notification as read
 * هوك طفرة لتمييز الإشعار كمقروء
 */
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: withParentAuth(async (notificationId: string) => {
      return await ParentPortalService.markNotificationRead(notificationId);
    }),
    onSuccess: (data, notificationId) => {
      // Update notifications cache
      queryClient.setQueryData(
        parentPortalKeys.notifications(data.parent_id),
        (old: NotificationData[] | undefined) => {
          if (!old) return old;
          return old.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true, read_at: new Date().toISOString() }
              : notification
          );
        }
      );
    },
  });
};

/**
 * Mutation hook to complete a home program activity
 * هوك طفرة لإكمال نشاط برنامج منزلي
 */
export const useCompleteHomeProgram = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: withParentAuth(async (completionData: {
      home_program_id: string;
      completion_date: string;
      success_rating: number;
      parent_notes_ar?: string;
      parent_notes_en?: string;
      evidence_urls?: string[];
    }) => {
      return await ParentPortalService.completeHomeProgram(completionData);
    }),
    onSuccess: (data, variables) => {
      // Invalidate home programs and dashboard data
      queryClient.invalidateQueries({ queryKey: parentPortalKeys.homePrograms(data.parent_id, data.student_id) });
      queryClient.invalidateQueries({ queryKey: parentPortalKeys.dashboard(data.parent_id) });
      queryClient.invalidateQueries({ queryKey: parentPortalKeys.progress(data.student_id) });
    },
  });
};

/**
 * Mutation hook to track document view
 * هوك طفرة لتتبع مشاهدة المستند
 */
export const useTrackDocumentView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: withParentAuth(async ({ documentId, parentId }: { documentId: string; parentId: string }) => {
      return await ParentPortalService.trackDocumentView(documentId, parentId);
    }),
    onSuccess: (_, variables) => {
      // Invalidate documents cache to reflect updated view status
      queryClient.invalidateQueries({ queryKey: parentPortalKeys.documents(variables.parentId) });
    },
  });
};

/**
 * Mutation hook to track document download
 * هوك طفرة لتتبع تحميل المستند
 */
export const useTrackDocumentDownload = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: withParentAuth(async ({ documentId, parentId }: { documentId: string; parentId: string }) => {
      return await ParentPortalService.trackDocumentDownload(documentId, parentId);
    }),
    onSuccess: (fileUrl, variables) => {
      // Invalidate documents cache to reflect updated download count
      queryClient.invalidateQueries({ queryKey: parentPortalKeys.documents(variables.parentId) });
      
      // Trigger actual download
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
  });
};

/**
 * Hook to set up real-time subscriptions for parent portal data
 * هوك لإعداد اشتراكات الوقت الفعلي لبيانات بوابة ولي الأمر
 */
export const useParentRealtime = (parentId: string) => {
  const queryClient = useQueryClient();

  // Set up real-time subscriptions on mount
  React.useEffect(() => {
    if (!parentId) return;

    // Subscribe to message updates
    const messagesSubscription = ParentPortalService.subscribeToMessages(parentId, (payload) => {
      queryClient.invalidateQueries({ queryKey: parentPortalKeys.messages(parentId) });
    });

    // Subscribe to notification updates
    const notificationsSubscription = ParentPortalService.subscribeToNotifications(parentId, (payload) => {
      queryClient.invalidateQueries({ queryKey: parentPortalKeys.notifications(parentId) });
    });

    // Subscribe to progress updates
    const progressSubscription = ParentPortalService.subscribeToProgressUpdates(parentId, (payload) => {
      if (payload.new?.student_id) {
        queryClient.invalidateQueries({ queryKey: parentPortalKeys.progress(payload.new.student_id) });
        queryClient.invalidateQueries({ queryKey: parentPortalKeys.dashboard(parentId) });
      }
    });

    // Cleanup subscriptions
    return () => {
      messagesSubscription?.unsubscribe();
      notificationsSubscription?.unsubscribe();
      progressSubscription?.unsubscribe();
    };
  }, [parentId, queryClient]);

  return {
    // Return connection status or other real-time related data if needed
    isConnected: true, // This would be managed by the subscription logic
  };
};

/**
 * Custom hook to get comprehensive parent portal data
 * هوك مخصص للحصول على بيانات شاملة لبوابة ولي الأمر
 */
export const useParentPortal = () => {
  const profileQuery = useParentProfile();
  const parentId = profileQuery.data?.id;
  const studentId = profileQuery.data?.student_id;

  // Set up real-time subscriptions
  const { isConnected } = useParentRealtime(parentId || '');

  // Get all related data
  const dashboardQuery = useParentDashboard(parentId || '');
  const progressQuery = useStudentProgress(studentId || '');
  const messagesQuery = useMessageThreads(parentId || '');
  const homeProgramsQuery = useHomePrograms(parentId || '', studentId || '');
  const documentsQuery = useParentDocuments(parentId || '');
  const notificationsQuery = useNotifications(parentId || '');

  // Compute loading states
  const isLoading = profileQuery.isLoading;
  const isError = profileQuery.isError || dashboardQuery.isError || progressQuery.isError;
  const error = profileQuery.error || dashboardQuery.error || progressQuery.error;

  return {
    // Profile data
    profile: profileQuery.data,
    isProfileLoading: profileQuery.isLoading,
    profileError: profileQuery.error,

    // Dashboard data
    dashboard: dashboardQuery.data,
    isDashboardLoading: dashboardQuery.isLoading,
    dashboardError: dashboardQuery.error,

    // Progress data
    progress: progressQuery.data,
    isProgressLoading: progressQuery.isLoading,
    progressError: progressQuery.error,

    // Messages data
    messages: messagesQuery.data,
    isMessagesLoading: messagesQuery.isLoading,
    messagesError: messagesQuery.error,

    // Home programs data
    homePrograms: homeProgramsQuery.data,
    isHomeProgramsLoading: homeProgramsQuery.isLoading,
    homeProgramsError: homeProgramsQuery.error,

    // Documents data
    documents: documentsQuery.data,
    isDocumentsLoading: documentsQuery.isLoading,
    documentsError: documentsQuery.error,

    // Notifications data
    notifications: notificationsQuery.data,
    isNotificationsLoading: notificationsQuery.isLoading,
    notificationsError: notificationsQuery.error,

    // Overall states
    isLoading,
    isError,
    error,
    isConnected,

    // Actions
    refetchAll: () => {
      profileQuery.refetch();
      dashboardQuery.refetch();
      progressQuery.refetch();
      messagesQuery.refetch();
      homeProgramsQuery.refetch();
      documentsQuery.refetch();
      notificationsQuery.refetch();
    },
  };
};

/**
 * Hook for dismissing notifications
 * هوك لرفض الإشعارات
 */
export const useDismissNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: withParentAuth(async (notificationId: string) => {
      const { error } = await supabase
        .from('parent_notifications')
        .update({ 
          is_dismissed: true,
          dismissed_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        throw new Error(`Failed to dismiss notification: ${error.message}`);
      }
    }),
    onSuccess: (_, notificationId) => {
      // Update all notification queries
      queryClient.invalidateQueries({ queryKey: ['parent_notifications'] });
    },
  });
};

/**
 * Hook for marking all notifications as read
 * هوك لتعيين جميع الإشعارات كمقروءة
 */
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: withParentAuth(async (parentId: string) => {
      const { error } = await supabase
        .from('parent_notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('parent_id', parentId)
        .eq('is_read', false);

      if (error) {
        throw new Error(`Failed to mark all notifications as read: ${error.message}`);
      }
    }),
    onSuccess: (_, parentId) => {
      // Update notifications cache
      queryClient.invalidateQueries({ queryKey: parentPortalKeys.notifications(parentId) });
    },
  });
};

/**
 * Hook for creating smart notifications
 * هوك لإنشاء الإشعارات الذكية
 */
export const useCreateSmartNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: withParentAuth(async (data: {
      parent_id: string;
      student_id: string;
      trigger_type: string;
      context: any;
      scheduled_for?: string;
    }) => {
      return await ParentPortalService.createSmartNotification(data);
    }),
    onSuccess: (_, variables) => {
      // Invalidate notifications cache
      queryClient.invalidateQueries({ queryKey: parentPortalKeys.notifications(variables.parent_id) });
    },
  });
};

/**
 * Hook for updating notification preferences
 * هوك لتحديث تفضيلات الإشعارات
 */
export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: withParentAuth(async ({ parentId, preferences }: { parentId: string; preferences: any }) => {
      return await ParentPortalService.updateNotificationPreferences(parentId, preferences);
    }),
    onSuccess: (_, variables) => {
      // Invalidate profile cache
      queryClient.invalidateQueries({ queryKey: parentPortalKeys.profile() });
    },
  });
};