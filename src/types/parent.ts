// Parent Portal TypeScript Type Definitions
// Comprehensive type system for parent portal functionality

export type Language = 'ar' | 'en';
export type ParentRelationship = 'father' | 'mother' | 'guardian';
export type MessageSenderType = 'parent' | 'therapist';
export type MessageType = 'text' | 'attachment' | 'system';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type DocumentAccessLevel = 'view' | 'download' | 'restricted';
export type NotificationType = 'message' | 'session_reminder' | 'progress_update' | 'milestone' | 'document';
export type DocumentType = 'therapy_report' | 'assessment_result' | 'session_summary' | 'iep_document';
export type DocumentCategory = 'progress' | 'assessment' | 'medical' | 'administrative';
export type ProgramFrequency = 'daily' | 'weekly' | 'multiple_times_daily';
export type DeliveryChannel = 'in_app' | 'email' | 'sms' | 'whatsapp';

// Parent Profile Interfaces
export interface ParentProfile {
  id: string;
  user_id: string;
  student_id: string;
  parent_name_ar: string;
  parent_name_en: string;
  relationship_ar: string;
  relationship_en: string;
  phone_number?: string;
  email?: string;
  preferred_language: Language;
  notification_preferences: NotificationPreferences;
  last_login?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  in_app: boolean;
  progress_updates: boolean;
  session_reminders: boolean;
  messages: boolean;
}

export interface CreateParentProfileData {
  student_id: string;
  parent_name_ar: string;
  parent_name_en: string;
  relationship_ar: string;
  relationship_en: string;
  phone_number?: string;
  email?: string;
  preferred_language?: Language;
  notification_preferences?: Partial<NotificationPreferences>;
}

export interface UpdateParentProfileData {
  parent_name_ar?: string;
  parent_name_en?: string;
  phone_number?: string;
  email?: string;
  preferred_language?: Language;
  notification_preferences?: Partial<NotificationPreferences>;
}

// Messaging System Interfaces
export interface ParentMessage {
  id: string;
  thread_id: string;
  parent_id: string;
  therapist_id: string;
  student_id: string;
  sender_type: MessageSenderType;
  sender_id: string;
  message_text_ar?: string;
  message_text_en?: string;
  message_type: MessageType;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  is_read: boolean;
  read_at?: string;
  priority: Priority;
  reply_to_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface MessageThread {
  thread_id: string;
  parent_id: string;
  therapist_id: string;
  student_id: string;
  messages: ParentMessage[];
  last_message?: ParentMessage;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMessageData {
  thread_id: string;
  therapist_id: string;
  student_id: string;
  message_text_ar?: string;
  message_text_en?: string;
  message_type?: MessageType;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  priority?: Priority;
  reply_to_id?: string;
}

export interface MessageFilters {
  student_id?: string;
  therapist_id?: string;
  is_read?: boolean;
  priority?: Priority;
  message_type?: MessageType;
  date_from?: string;
  date_to?: string;
  search_text?: string;
}

// Home Programs Interfaces
export interface HomeProgram {
  id: string;
  student_id: string;
  therapist_id: string;
  program_name_ar: string;
  program_name_en: string;
  description_ar?: string;
  description_en?: string;
  instructions_ar: string;
  instructions_en: string;
  frequency: ProgramFrequency;
  duration_minutes?: number;
  target_goal_ar?: string;
  target_goal_en?: string;
  assigned_date: string;
  due_date?: string;
  is_active: boolean;
  difficulty_level?: number;
  required_materials_ar?: string[];
  required_materials_en?: string[];
  video_tutorial_url?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface HomeProgramCompletion {
  id: string;
  home_program_id: string;
  parent_id: string;
  student_id: string;
  completion_date: string;
  completion_time?: string;
  duration_minutes?: number;
  difficulty_rating?: number;
  success_rating?: number;
  notes_ar?: string;
  notes_en?: string;
  evidence_photos?: string[];
  evidence_videos?: string[];
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  therapist_feedback_ar?: string;
  therapist_feedback_en?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHomeProgramCompletionData {
  home_program_id: string;
  completion_date: string;
  completion_time?: string;
  duration_minutes?: number;
  difficulty_rating?: number;
  success_rating?: number;
  notes_ar?: string;
  notes_en?: string;
  evidence_photos?: string[];
  evidence_videos?: string[];
}

export interface HomeProgramWithCompletions extends HomeProgram {
  completions: HomeProgramCompletion[];
  completion_rate: number;
  last_completion?: HomeProgramCompletion;
}

// Document Access Interfaces
export interface ParentDocumentAccess {
  id: string;
  parent_id: string;
  student_id: string;
  document_type: DocumentType;
  document_title_ar: string;
  document_title_en: string;
  document_url: string;
  document_category: DocumentCategory;
  access_level: DocumentAccessLevel;
  is_sensitive: boolean;
  expiry_date?: string;
  created_by?: string;
  created_at: string;
  last_accessed?: string;
  access_count: number;
}

export interface DocumentFilters {
  student_id?: string;
  document_type?: DocumentType;
  document_category?: DocumentCategory;
  access_level?: DocumentAccessLevel;
  is_sensitive?: boolean;
  date_from?: string;
  date_to?: string;
  search_text?: string;
}

// Notifications Interfaces
export interface ParentNotification {
  id: string;
  parent_id: string;
  student_id: string;
  notification_type: NotificationType;
  title_ar: string;
  title_en: string;
  content_ar: string;
  content_en: string;
  priority: Priority;
  is_read: boolean;
  read_at?: string;
  action_url?: string;
  action_required: boolean;
  expires_at?: string;
  delivery_channels: DeliveryChannel[];
  delivery_status: Record<string, any>;
  created_at: string;
  scheduled_for: string;
}

export interface CreateNotificationData {
  student_id: string;
  notification_type: NotificationType;
  title_ar: string;
  title_en: string;
  content_ar: string;
  content_en: string;
  priority?: Priority;
  action_url?: string;
  action_required?: boolean;
  expires_at?: string;
  delivery_channels?: DeliveryChannel[];
  scheduled_for?: string;
}

export interface NotificationFilters {
  student_id?: string;
  notification_type?: NotificationType;
  is_read?: boolean;
  priority?: Priority;
  action_required?: boolean;
  date_from?: string;
  date_to?: string;
}

// Progress Tracking Interfaces
export interface ParentProgressSummary {
  id: string;
  student_id: string;
  parent_id: string;
  reporting_period_start: string;
  reporting_period_end: string;
  total_sessions: number;
  attended_sessions: number;
  goals_achieved: number;
  goals_in_progress: number;
  overall_progress_percentage: number;
  key_achievements_ar: string[];
  key_achievements_en: string[];
  areas_for_improvement_ar: string[];
  areas_for_improvement_en: string[];
  therapist_recommendations_ar?: string;
  therapist_recommendations_en?: string;
  generated_at: string;
  generated_by?: string;
}

export interface ProgressMetrics {
  attendance_rate: number;
  goal_achievement_rate: number;
  session_participation_rate: number;
  home_program_completion_rate: number;
  overall_progress_trend: 'improving' | 'stable' | 'declining';
}

export interface ProgressChartData {
  date: string;
  progress_percentage: number;
  sessions_attended: number;
  goals_achieved: number;
  home_programs_completed: number;
}

// Dashboard Data Interfaces
export interface ParentDashboardData {
  parent_profile: ParentProfile;
  student_info: {
    id: string;
    name_ar: string;
    name_en: string;
    age: number;
    enrollment_date: string;
  };
  progress_summary: ParentProgressSummary;
  unread_messages_count: number;
  pending_home_programs: number;
  upcoming_sessions: Array<{
    id: string;
    date: string;
    time: string;
    therapist_name: string;
    session_type: string;
  }>;
  recent_notifications: ParentNotification[];
  progress_metrics: ProgressMetrics;
}

// API Response Interfaces
export interface ParentPortalApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Real-time Updates Interfaces
export interface RealtimeMessageUpdate {
  type: 'new_message' | 'message_read' | 'message_deleted';
  message: ParentMessage;
  thread_id: string;
}

export interface RealtimeNotificationUpdate {
  type: 'new_notification' | 'notification_read' | 'notification_dismissed';
  notification: ParentNotification;
}

export interface RealtimeProgressUpdate {
  type: 'progress_updated' | 'session_completed' | 'goal_achieved';
  student_id: string;
  data: any;
}

// Form Validation Interfaces
export interface ParentFormErrors {
  parent_name_ar?: string;
  parent_name_en?: string;
  phone_number?: string;
  email?: string;
  message_text?: string;
  completion_date?: string;
  difficulty_rating?: string;
  success_rating?: string;
}

// Utility Types
export type LocalizedContent = {
  ar: string;
  en: string;
};

export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export type ParentPortalEntity = 
  | 'parent_profile'
  | 'message'
  | 'home_program'
  | 'completion'
  | 'document'
  | 'notification'
  | 'progress_summary';

// Hook Return Types
export interface UseParentProfileReturn {
  profile: ParentProfile | null;
  isLoading: boolean;
  error: Error | null;
  updateProfile: (data: UpdateParentProfileData) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface UseParentMessagesReturn {
  threads: MessageThread[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (data: CreateMessageData) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  hasMore: boolean;
}

export interface UseHomeProgramsReturn {
  programs: HomeProgramWithCompletions[];
  isLoading: boolean;
  error: Error | null;
  completeProgram: (data: CreateHomeProgramCompletionData) => Promise<void>;
  refreshPrograms: () => Promise<void>;
}

export interface UseParentDocumentsReturn {
  documents: ParentDocumentAccess[];
  isLoading: boolean;
  error: Error | null;
  downloadDocument: (documentId: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;
}

// Document Access Tracking
export interface DocumentAccessLog {
  id: string;
  document_id: string;
  parent_id: string;
  action_type: 'view' | 'download' | 'bookmark' | 'unbookmark';
  access_timestamp: string;
  user_agent?: string;
  ip_address?: string;
  session_id?: string;
}

export interface UseParentNotificationsReturn {
  notifications: ParentNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
}

export interface UseParentDashboardReturn {
  dashboardData: ParentDashboardData | null;
  isLoading: boolean;
  error: Error | null;
  refreshDashboard: () => Promise<void>;
}