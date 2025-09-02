// Parent Portal Service
// Comprehensive service layer for parent portal functionality with Supabase integration

import { supabase } from '@/lib/supabase';
import type { 
  ParentProfile, 
  CreateParentProfileData, 
  UpdateParentProfileData,
  ParentMessage,
  MessageThread,
  CreateMessageData,
  MessageFilters,
  HomeProgram,
  HomeProgramCompletion,
  CreateHomeProgramCompletionData,
  HomeProgramWithCompletions,
  ParentDocumentAccess,
  DocumentFilters,
  ParentNotification,
  CreateNotificationData,
  NotificationFilters,
  ParentProgressSummary,
  ParentDashboardData,
  PaginationParams,
  ParentPortalApiResponse
} from '@/types/parent';

// Also import types from parent-portal.ts for compatibility
import type {
  ParentUser,
  ChildProgress,
  ParentDashboardData as PortalDashboardData
} from '@/types/parent-portal';

export class ParentPortalService {
  
  // Parent Profile Management
  static async getParentProfile(userId?: string): Promise<ParentProfile | null> {
    const { data, error } = await supabase
      .from('parent_profiles')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching parent profile:', error);
      return null;
    }

    return data;
  }

  static async createParentProfile(profileData: CreateParentProfileData): Promise<ParentProfile> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('parent_profiles')
      .insert({
        ...profileData,
        user_id: user.data.user.id,
        created_by: user.data.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating parent profile:', error);
      throw new Error(`Failed to create parent profile: ${error.message}`);
    }

    return data;
  }

  static async updateParentProfile(profileData: UpdateParentProfileData): Promise<ParentProfile> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('parent_profiles')
      .update({
        ...profileData,
        updated_by: user.data.user.id
      })
      .eq('user_id', user.data.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating parent profile:', error);
      throw new Error(`Failed to update parent profile: ${error.message}`);
    }

    return data;
  }

  // Messaging System
  static async getMessageThreads(parentId: string, filters?: MessageFilters): Promise<MessageThread[]> {
    let query = supabase
      .from('parent_messages')
      .select(`
        *,
        parent_profiles!parent_id(parent_name_ar, parent_name_en),
        therapists!therapist_id(therapist_name_ar, therapist_name_en)
      `)
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.student_id) {
      query = query.eq('student_id', filters.student_id);
    }
    if (filters?.therapist_id) {
      query = query.eq('therapist_id', filters.therapist_id);
    }
    if (filters?.is_read !== undefined) {
      query = query.eq('is_read', filters.is_read);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.message_type) {
      query = query.eq('message_type', filters.message_type);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching message threads:', error);
      throw new Error(`Failed to fetch message threads: ${error.message}`);
    }

    // Group messages by thread_id
    const threadsMap = new Map<string, MessageThread>();
    
    data?.forEach((message: any) => {
      const threadId = message.thread_id;
      if (!threadsMap.has(threadId)) {
        threadsMap.set(threadId, {
          thread_id: threadId,
          parent_id: message.parent_id,
          therapist_id: message.therapist_id,
          student_id: message.student_id,
          messages: [],
          unread_count: 0,
          created_at: message.created_at,
          updated_at: message.updated_at
        });
      }

      const thread = threadsMap.get(threadId)!;
      thread.messages.push(message);
      
      if (!message.is_read) {
        thread.unread_count++;
      }

      // Update thread timestamps
      if (new Date(message.created_at) > new Date(thread.updated_at)) {
        thread.updated_at = message.created_at;
        thread.last_message = message;
      }
    });

    return Array.from(threadsMap.values());
  }

  static async sendMessage(messageData: CreateMessageData): Promise<ParentMessage> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }

    const parentProfile = await this.getParentProfile(user.data.user.id);
    if (!parentProfile) {
      throw new Error('Parent profile not found');
    }

    const { data, error } = await supabase
      .from('parent_messages')
      .insert({
        ...messageData,
        parent_id: parentProfile.id,
        sender_type: 'parent' as const,
        sender_id: parentProfile.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }

    return data;
  }

  static async markMessageAsRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('parent_messages')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message as read:', error);
      throw new Error(`Failed to mark message as read: ${error.message}`);
    }
  }

  // Home Programs Management
  static async getHomePrograms(
    parentId: string, 
    studentId: string,
    pagination?: PaginationParams
  ): Promise<HomeProgramWithCompletions[]> {
    let query = supabase
      .from('home_programs')
      .select(`
        *,
        home_program_completions(*)
      `)
      .eq('student_id', studentId)
      .eq('is_active', true)
      .order('assigned_date', { ascending: false });

    // Apply pagination
    if (pagination?.page && pagination?.limit) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching home programs:', error);
      throw new Error(`Failed to fetch home programs: ${error.message}`);
    }

    // Calculate completion rates and add completion data
    return data?.map((program: any) => {
      const completions = program.home_program_completions || [];
      const completionRate = completions.length > 0 
        ? (completions.filter((c: any) => c.success_rating >= 3).length / completions.length) * 100
        : 0;
      
      const lastCompletion = completions.sort((a: any, b: any) => 
        new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime()
      )[0];

      return {
        ...program,
        completions,
        completion_rate: completionRate,
        last_completion: lastCompletion
      };
    }) || [];
  }

  static async completeHomeProgram(
    completionData: CreateHomeProgramCompletionData
  ): Promise<HomeProgramCompletion> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }

    const parentProfile = await this.getParentProfile(user.data.user.id);
    if (!parentProfile) {
      throw new Error('Parent profile not found');
    }

    const { data, error } = await supabase
      .from('home_program_completions')
      .insert({
        ...completionData,
        parent_id: parentProfile.id,
        student_id: parentProfile.student_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error completing home program:', error);
      throw new Error(`Failed to complete home program: ${error.message}`);
    }

    return data;
  }

  // Document Access Management
  static async getAccessibleDocuments(
    parentId: string,
    filters?: DocumentFilters,
    pagination?: PaginationParams
  ): Promise<ParentDocumentAccess[]> {
    let query = supabase
      .from('parent_document_access')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.student_id) {
      query = query.eq('student_id', filters.student_id);
    }
    if (filters?.document_type) {
      query = query.eq('document_type', filters.document_type);
    }
    if (filters?.document_category) {
      query = query.eq('document_category', filters.document_category);
    }
    if (filters?.access_level) {
      query = query.eq('access_level', filters.access_level);
    }
    if (filters?.is_sensitive !== undefined) {
      query = query.eq('is_sensitive', filters.is_sensitive);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    // Apply pagination
    if (pagination?.page && pagination?.limit) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching accessible documents:', error);
      throw new Error(`Failed to fetch accessible documents: ${error.message}`);
    }

    return data || [];
  }

  static async trackDocumentAccess(documentId: string): Promise<void> {
    const { error } = await supabase
      .from('parent_document_access')
      .update({ 
        last_accessed: new Date().toISOString(),
        access_count: supabase.sql`access_count + 1`
      })
      .eq('id', documentId);

    if (error) {
      console.error('Error tracking document access:', error);
      throw new Error(`Failed to track document access: ${error.message}`);
    }
  }

  // Notifications Management
  static async getNotifications(
    parentId: string,
    filters?: NotificationFilters,
    pagination?: PaginationParams
  ): Promise<ParentNotification[]> {
    let query = supabase
      .from('parent_notifications')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.student_id) {
      query = query.eq('student_id', filters.student_id);
    }
    if (filters?.notification_type) {
      query = query.eq('notification_type', filters.notification_type);
    }
    if (filters?.is_read !== undefined) {
      query = query.eq('is_read', filters.is_read);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.action_required !== undefined) {
      query = query.eq('action_required', filters.action_required);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    // Apply pagination
    if (pagination?.page && pagination?.limit) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data || [];
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('parent_notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  static async getUnreadNotificationCount(parentId: string): Promise<number> {
    const { count, error } = await supabase
      .from('parent_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', parentId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread notification count:', error);
      return 0;
    }

    return count || 0;
  }

  // Progress Tracking
  static async getProgressSummary(
    parentId: string,
    studentId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<ParentProgressSummary | null> {
    let query = supabase
      .from('parent_progress_summaries')
      .select('*')
      .eq('parent_id', parentId)
      .eq('student_id', studentId)
      .order('reporting_period_end', { ascending: false });

    if (periodStart) {
      query = query.gte('reporting_period_start', periodStart);
    }
    if (periodEnd) {
      query = query.lte('reporting_period_end', periodEnd);
    }

    const { data, error } = await query.limit(1).single();

    if (error) {
      console.error('Error fetching progress summary:', error);
      return null;
    }

    return data;
  }

  // Dashboard Data
  static async getDashboardData(parentId: string): Promise<ParentDashboardData | null> {
    try {
      // Get parent profile
      const parentProfile = await this.getParentProfile();
      if (!parentProfile) {
        throw new Error('Parent profile not found');
      }

      // Get student info
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, student_name_ar, student_name_en, date_of_birth, enrollment_date')
        .eq('id', parentProfile.student_id)
        .single();

      if (studentError) {
        throw new Error(`Failed to fetch student info: ${studentError.message}`);
      }

      // Get progress summary
      const progressSummary = await this.getProgressSummary(
        parentId, 
        parentProfile.student_id
      );

      // Get unread messages count
      const { count: unreadMessagesCount } = await supabase
        .from('parent_messages')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', parentId)
        .eq('is_read', false);

      // Get pending home programs count
      const { count: pendingHomeProgramsCount } = await supabase
        .from('home_programs')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', parentProfile.student_id)
        .eq('is_active', true);

      // Get upcoming sessions
      const { data: upcomingSessions } = await supabase
        .from('therapy_sessions')
        .select(`
          id,
          session_date,
          session_time,
          session_type,
          therapists(therapist_name_ar, therapist_name_en)
        `)
        .eq('student_id', parentProfile.student_id)
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .limit(5);

      // Get recent notifications
      const recentNotifications = await this.getNotifications(
        parentId,
        { is_read: false },
        { page: 1, limit: 5 }
      );

      // Calculate age
      const birthDate = new Date(studentData.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();

      return {
        parent_profile: parentProfile,
        student_info: {
          id: studentData.id,
          name_ar: studentData.student_name_ar,
          name_en: studentData.student_name_en,
          age,
          enrollment_date: studentData.enrollment_date
        },
        progress_summary: progressSummary || {
          id: '',
          student_id: studentData.id,
          parent_id: parentId,
          reporting_period_start: '',
          reporting_period_end: '',
          total_sessions: 0,
          attended_sessions: 0,
          goals_achieved: 0,
          goals_in_progress: 0,
          overall_progress_percentage: 0,
          key_achievements_ar: [],
          key_achievements_en: [],
          areas_for_improvement_ar: [],
          areas_for_improvement_en: [],
          generated_at: new Date().toISOString()
        },
        unread_messages_count: unreadMessagesCount || 0,
        pending_home_programs: pendingHomeProgramsCount || 0,
        upcoming_sessions: upcomingSessions?.map(session => ({
          id: session.id,
          date: session.session_date,
          time: session.session_time,
          therapist_name: session.therapists?.therapist_name_ar || 'Unknown',
          session_type: session.session_type
        })) || [],
        recent_notifications: recentNotifications,
        progress_metrics: {
          attendance_rate: progressSummary?.total_sessions ? 
            (progressSummary.attended_sessions / progressSummary.total_sessions) * 100 : 0,
          goal_achievement_rate: progressSummary?.goals_achieved && progressSummary?.goals_in_progress ?
            (progressSummary.goals_achieved / (progressSummary.goals_achieved + progressSummary.goals_in_progress)) * 100 : 0,
          session_participation_rate: progressSummary?.overall_progress_percentage || 0,
          home_program_completion_rate: 0, // To be calculated from home programs
          overall_progress_trend: 'stable' as const
        }
      };

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return null;
    }
  }

  // Document Access Tracking
  static async trackDocumentView(documentId: string, parentId: string): Promise<void> {
    // First verify access permissions
    await this.verifyDocumentAccess(documentId, parentId, 'view');

    const { error } = await supabase
      .from('parent_document_access')
      .update({ 
        is_viewed: true, 
        last_viewed_at: new Date().toISOString(),
        view_count: supabase.rpc('increment_view_count', { document_id: documentId })
      })
      .eq('id', documentId)
      .eq('parent_id', parentId);

    if (error) {
      console.error('Error tracking document view:', error);
      throw new Error(`Failed to track document view: ${error.message}`);
    }

    // Log access event
    await this.logDocumentAccess(documentId, parentId, 'view');
  }

  static async trackDocumentDownload(documentId: string, parentId: string): Promise<string> {
    // First verify access permissions
    const document = await this.verifyDocumentAccess(documentId, parentId, 'download');

    // Update download count
    const { error } = await supabase
      .from('parent_document_access')
      .update({ 
        download_count: supabase.rpc('increment_download_count', { document_id: documentId }),
        last_downloaded_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('parent_id', parentId);

    if (error) {
      console.error('Error tracking document download:', error);
      throw new Error(`Failed to track document download: ${error.message}`);
    }

    // Log access event
    await this.logDocumentAccess(documentId, parentId, 'download');

    return document.file_url;
  }

  static async verifyDocumentAccess(
    documentId: string, 
    parentId: string, 
    actionType: 'view' | 'download'
  ): Promise<any> {
    // Get document details with security checks
    const { data: document, error: fetchError } = await supabase
      .from('parent_document_access')
      .select(`
        *,
        students!inner(id, student_name_ar, student_name_en),
        parent_profiles!inner(id, user_id)
      `)
      .eq('id', documentId)
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .single();

    if (fetchError || !document) {
      console.error('Document access denied:', fetchError);
      throw new Error('Document not found or access denied');
    }

    // Check if document has expired
    if (document.expiry_date && new Date(document.expiry_date) < new Date()) {
      throw new Error('Document access has expired');
    }

    // Check if document is restricted for the current action
    const restrictedActions = document.restricted_actions || [];
    if (restrictedActions.includes(actionType)) {
      throw new Error(`${actionType} access is restricted for this document`);
    }

    // Verify the current user matches the parent profile
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== document.parent_profiles.user_id) {
      throw new Error('Authentication required or access denied');
    }

    // Additional security checks for sensitive documents
    if (document.is_sensitive) {
      // Check if parent has confirmed consent for sensitive document access
      const { data: consent, error: consentError } = await supabase
        .from('parent_consent_log')
        .select('*')
        .eq('parent_id', parentId)
        .eq('consent_type', 'sensitive_document_access')
        .eq('is_active', true)
        .single();

      if (consentError || !consent) {
        throw new Error('Sensitive document access requires explicit consent');
      }

      // Check consent expiration
      if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
        throw new Error('Consent for sensitive document access has expired');
      }
    }

    return document;
  }

  static async logDocumentAccess(
    documentId: string, 
    parentId: string, 
    actionType: 'view' | 'download' | 'bookmark' | 'unbookmark'
  ): Promise<void> {
    // Create audit log entry
    const { error } = await supabase
      .from('document_access_logs')
      .insert({
        document_id: documentId,
        parent_id: parentId,
        action_type: actionType,
        access_timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ip_address: null, // Will be populated by RLS policy if needed
        session_id: (await supabase.auth.getSession()).data.session?.access_token?.substring(0, 20) || null
      });

    if (error) {
      console.error('Error logging document access:', error);
      // Don't throw error here to avoid blocking the main action
    }
  }

  static async getDocumentAccessLogs(
    documentId: string, 
    parentId: string,
    limit = 50
  ): Promise<DocumentAccessLog[]> {
    const { data, error } = await supabase
      .from('document_access_logs')
      .select('*')
      .eq('document_id', documentId)
      .eq('parent_id', parentId)
      .order('access_timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching document access logs:', error);
      throw new Error(`Failed to fetch document access logs: ${error.message}`);
    }

    return data || [];
  }

  // Enhanced Notification Management
  static async createNotification(notificationData: {
    parent_id: string;
    student_id: string;
    notification_type: string;
    title_ar: string;
    title_en: string;
    content_ar: string;
    content_en: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    action_url?: string;
    action_required?: boolean;
    expires_at?: string;
    delivery_channels?: string[];
    scheduled_for?: string;
    metadata?: any;
  }): Promise<any> {
    const { data, error } = await supabase
      .from('parent_notifications')
      .insert({
        ...notificationData,
        priority: notificationData.priority || 'medium',
        delivery_channels: notificationData.delivery_channels || ['in_app'],
        scheduled_for: notificationData.scheduled_for || new Date().toISOString(),
        delivery_status: {
          in_app: { status: 'pending', attempts: 0 },
          email: { status: 'pending', attempts: 0 },
          whatsapp: { status: 'pending', attempts: 0 }
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    // Trigger real-time notification delivery
    await this.deliverNotification(data.id);

    return data;
  }

  static async deliverNotification(notificationId: string): Promise<void> {
    const { data: notification, error } = await supabase
      .from('parent_notifications')
      .select(`
        *,
        parent_profiles!inner(
          id,
          user_id,
          notification_preferences,
          phone_number,
          email
        )
      `)
      .eq('id', notificationId)
      .single();

    if (error || !notification) {
      console.error('Error fetching notification:', error);
      return;
    }

    const deliveryChannels = notification.delivery_channels || ['in_app'];
    const preferences = notification.parent_profiles.notification_preferences || {};

    // Handle each delivery channel
    for (const channel of deliveryChannels) {
      switch (channel) {
        case 'in_app':
          // Real-time delivery handled by Supabase subscriptions
          await this.markDeliveryStatus(notificationId, 'in_app', 'delivered');
          break;
        
        case 'email':
          if (preferences.email_enabled !== false && notification.parent_profiles.email) {
            await this.sendEmailNotification(notification);
          }
          break;
        
        case 'whatsapp':
          if (preferences.whatsapp_enabled !== false && notification.parent_profiles.phone_number) {
            await this.sendWhatsAppNotification(notification);
          }
          break;
      }
    }
  }

  static async sendEmailNotification(notification: any): Promise<void> {
    try {
      // This would typically integrate with your email service (SendGrid, etc.)
      // For now, we'll mark it as pending and let n8n workflows handle it
      await supabase
        .from('email_queue')
        .insert({
          recipient_email: notification.parent_profiles.email,
          subject_ar: notification.title_ar,
          subject_en: notification.title_en,
          content_ar: notification.content_ar,
          content_en: notification.content_en,
          template_type: 'parent_notification',
          priority: notification.priority,
          metadata: {
            notification_id: notification.id,
            parent_id: notification.parent_id,
            student_id: notification.student_id
          }
        });

      await this.markDeliveryStatus(notification.id, 'email', 'queued');
    } catch (error) {
      console.error('Error queuing email notification:', error);
      await this.markDeliveryStatus(notification.id, 'email', 'failed');
    }
  }

  static async sendWhatsAppNotification(notification: any): Promise<void> {
    try {
      // Queue WhatsApp notification for n8n processing
      await supabase
        .from('whatsapp_queue')
        .insert({
          recipient_phone: notification.parent_profiles.phone_number,
          message_ar: `${notification.title_ar}\n\n${notification.content_ar}`,
          message_en: `${notification.title_en}\n\n${notification.content_en}`,
          template_type: 'parent_notification',
          priority: notification.priority,
          metadata: {
            notification_id: notification.id,
            parent_id: notification.parent_id,
            student_id: notification.student_id
          }
        });

      await this.markDeliveryStatus(notification.id, 'whatsapp', 'queued');
    } catch (error) {
      console.error('Error queuing WhatsApp notification:', error);
      await this.markDeliveryStatus(notification.id, 'whatsapp', 'failed');
    }
  }

  static async markDeliveryStatus(
    notificationId: string, 
    channel: string, 
    status: 'pending' | 'delivered' | 'failed' | 'queued'
  ): Promise<void> {
    const { error } = await supabase
      .rpc('update_notification_delivery_status', {
        notification_id: notificationId,
        channel: channel,
        status: status,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating delivery status:', error);
    }
  }

  static async updateNotificationPreferences(
    parentId: string, 
    preferences: {
      in_app_enabled?: boolean;
      email_enabled?: boolean;
      whatsapp_enabled?: boolean;
      quiet_hours_start?: string;
      quiet_hours_end?: string;
      priority_threshold?: 'low' | 'medium' | 'high' | 'critical';
      categories?: string[];
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('parent_profiles')
      .update({ 
        notification_preferences: preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', parentId);

    if (error) {
      console.error('Error updating notification preferences:', error);
      throw new Error(`Failed to update preferences: ${error.message}`);
    }
  }

  // Smart Notification System
  static async createSmartNotification(data: {
    parent_id: string;
    student_id: string;
    trigger_type: 'session_completed' | 'goal_achieved' | 'milestone_reached' | 'appointment_reminder' | 'document_uploaded' | 'message_received' | 'home_program_due';
    context: any;
    scheduled_for?: string;
  }): Promise<void> {
    // Generate contextual notification content based on trigger type
    const notificationContent = this.generateNotificationContent(data.trigger_type, data.context);
    
    // Determine optimal delivery channels based on urgency and user preferences
    const deliveryChannels = await this.determineDeliveryChannels(data.parent_id, data.trigger_type);
    
    // Create the notification
    await this.createNotification({
      parent_id: data.parent_id,
      student_id: data.student_id,
      notification_type: data.trigger_type,
      ...notificationContent,
      delivery_channels: deliveryChannels,
      scheduled_for: data.scheduled_for
    });
  }

  static generateNotificationContent(triggerType: string, context: any): {
    title_ar: string;
    title_en: string;
    content_ar: string;
    content_en: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    action_url?: string;
    action_required?: boolean;
  } {
    switch (triggerType) {
      case 'session_completed':
        return {
          title_ar: 'تم إكمال جلسة العلاج',
          title_en: 'Therapy Session Completed',
          content_ar: `تم إكمال جلسة العلاج لـ ${context.student_name_ar || 'طفلك'} بنجاح. يمكنك مراجعة التقرير والتقييم في بوابة ولي الأمر.`,
          content_en: `Therapy session for ${context.student_name_en || 'your child'} has been completed successfully. You can review the report and assessment in the parent portal.`,
          priority: 'medium' as const,
          action_url: '/parent-portal/progress',
          action_required: false
        };
      
      case 'goal_achieved':
        return {
          title_ar: 'تحقيق هدف علاجي جديد! 🎉',
          title_en: 'New Therapeutic Goal Achieved! 🎉',
          content_ar: `مبروك! ${context.student_name_ar || 'طفلك'} حقق هدف "${context.goal_title_ar}" بنجاح. هذا إنجاز رائع في رحلة العلاج.`,
          content_en: `Congratulations! ${context.student_name_en || 'Your child'} has successfully achieved the goal "${context.goal_title_en}". This is a wonderful milestone in the therapy journey.`,
          priority: 'high' as const,
          action_url: '/parent-portal/progress',
          action_required: false
        };

      case 'appointment_reminder':
        return {
          title_ar: 'تذكير: موعد العلاج غداً',
          title_en: 'Reminder: Therapy Appointment Tomorrow',
          content_ar: `تذكير ودود: لديك موعد علاج لـ ${context.student_name_ar || 'طفلك'} غداً في تمام الساعة ${context.appointment_time} مع ${context.therapist_name_ar}.`,
          content_en: `Friendly reminder: You have a therapy appointment for ${context.student_name_en || 'your child'} tomorrow at ${context.appointment_time} with ${context.therapist_name_en}.`,
          priority: 'high' as const,
          action_url: '/parent-portal/appointments',
          action_required: true
        };

      case 'document_uploaded':
        return {
          title_ar: 'وثيقة جديدة متاحة',
          title_en: 'New Document Available',
          content_ar: `تم رفع وثيقة جديدة: "${context.document_title_ar}". يمكنك مراجعتها الآن في قسم المستندات.`,
          content_en: `A new document has been uploaded: "${context.document_title_en}". You can review it now in the documents section.`,
          priority: 'medium' as const,
          action_url: '/parent-portal/documents',
          action_required: false
        };

      case 'message_received':
        return {
          title_ar: 'رسالة جديدة من المعالج',
          title_en: 'New Message from Therapist',
          content_ar: `لديك رسالة جديدة من ${context.therapist_name_ar || 'المعالج'}. انقر لقراءة الرسالة والرد عليها.`,
          content_en: `You have a new message from ${context.therapist_name_en || 'your therapist'}. Click to read and respond to the message.`,
          priority: 'medium' as const,
          action_url: '/parent-portal/messages',
          action_required: true
        };

      case 'home_program_due':
        return {
          title_ar: 'البرنامج المنزلي مستحق اليوم',
          title_en: 'Home Program Due Today',
          content_ar: `تذكير: البرنامج المنزلي "${context.program_title_ar}" مستحق اليوم. يرجى إكماله وإرسال التقرير.`,
          content_en: `Reminder: The home program "${context.program_title_en}" is due today. Please complete it and submit your report.`,
          priority: 'medium' as const,
          action_url: '/parent-portal/home-programs',
          action_required: true
        };

      default:
        return {
          title_ar: 'تحديث من بوابة ولي الأمر',
          title_en: 'Update from Parent Portal',
          content_ar: 'لديك تحديث جديد في بوابة ولي الأمر.',
          content_en: 'You have a new update in the parent portal.',
          priority: 'low' as const,
          action_required: false
        };
    }
  }

  static async determineDeliveryChannels(parentId: string, triggerType: string): Promise<string[]> {
    const { data: profile, error } = await supabase
      .from('parent_profiles')
      .select('notification_preferences')
      .eq('id', parentId)
      .single();

    if (error) {
      return ['in_app']; // Default fallback
    }

    const preferences = profile.notification_preferences || {};
    const channels: string[] = [];

    // Always include in-app notifications
    if (preferences.in_app_enabled !== false) {
      channels.push('in_app');
    }

    // Determine additional channels based on trigger urgency
    const urgentTriggers = ['appointment_reminder', 'goal_achieved'];
    const emailTriggers = ['session_completed', 'document_uploaded', 'goal_achieved'];
    
    if (preferences.email_enabled && emailTriggers.includes(triggerType)) {
      channels.push('email');
    }

    if (preferences.whatsapp_enabled && urgentTriggers.includes(triggerType)) {
      channels.push('whatsapp');
    }

    return channels;
  }

  // Real-time subscriptions
  static subscribeToMessages(parentId: string, callback: (payload: any) => void) {
    return supabase
      .channel('parent_messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'parent_messages',
        filter: `parent_id=eq.${parentId}`
      }, callback)
      .subscribe();
  }

  static subscribeToNotifications(parentId: string, callback: (payload: any) => void) {
    return supabase
      .channel('parent_notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'parent_notifications',
        filter: `parent_id=eq.${parentId}`
      }, callback)
      .subscribe();
  }

  static subscribeToProgress(studentId: string, callback: (payload: any) => void) {
    return supabase
      .channel('parent_progress')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'parent_progress_summaries',
        filter: `student_id=eq.${studentId}`
      }, callback)
      .subscribe();
  }
}