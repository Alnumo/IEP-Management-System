/**
 * Notification System Types for IEP Management
 * Comprehensive TypeScript interfaces for the notification and alert system
 */

// Core notification types
export type NotificationType = 
  | 'deadline_reminder'
  | 'approval_request'
  | 'approval_completed'
  | 'meeting_reminder'
  | 'overdue_task'
  | 'system_alert'
  | 'compliance_warning'
  | 'goal_milestone'
  | 'service_hours_low'
  | 'document_expiry';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'in_app' | 'push';
export type NotificationStatus = 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';

// Base notification interface
export interface BaseNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  recipient_id: string;
  recipient_role: string;
  related_entity_type: 'iep' | 'meeting' | 'goal' | 'approval' | 'service';
  related_entity_id: string;
  scheduled_at: string;
  expires_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

// Notification delivery tracking
export interface NotificationDelivery {
  id: string;
  notification_id: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  failure_reason?: string;
  retry_count: number;
  max_retries: number;
  external_reference?: string; // Third-party service reference
  metadata: Record<string, any>;
}

// User notification preferences
export interface NotificationPreferences {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  time_zone: string;
  language_preference: 'ar' | 'en' | 'both';
  advance_notice_hours: number;
  digest_frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
  created_at: string;
  updated_at: string;
}

// Deadline-specific notifications
export interface DeadlineNotification extends BaseNotification {
  type: 'deadline_reminder';
  deadline_date: string;
  days_until_deadline: number;
  completion_percentage: number;
  is_overdue: boolean;
  escalation_level: 1 | 2 | 3;
  responsible_parties: string[];
  action_required: {
    description_ar: string;
    description_en: string;
    url?: string;
  };
}

// Approval-specific notifications
export interface ApprovalNotification extends BaseNotification {
  type: 'approval_request' | 'approval_completed';
  approval_id: string;
  approval_type: string;
  approver_role: string;
  requested_by: string;
  due_date: string;
  approval_level: number;
  is_urgent: boolean;
  decision_options: Array<{
    value: string;
    label_ar: string;
    label_en: string;
  }>;
}

// Meeting reminder notifications
export interface MeetingNotification extends BaseNotification {
  type: 'meeting_reminder';
  meeting_id: string;
  meeting_date: string;
  meeting_duration: number;
  meeting_format: 'virtual' | 'in_person' | 'hybrid';
  meeting_link?: string;
  meeting_location?: string;
  attendees: Array<{
    id: string;
    name_ar: string;
    name_en: string;
    role: string;
    attendance_status: 'pending' | 'accepted' | 'declined' | 'tentative';
  }>;
  preparation_items: Array<{
    description_ar: string;
    description_en: string;
    is_required: boolean;
  }>;
}

// Compliance warning notifications
export interface ComplianceNotification extends BaseNotification {
  type: 'compliance_warning';
  compliance_area: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  regulation_reference: string;
  non_compliance_details: {
    description_ar: string;
    description_en: string;
    affected_students: number;
    potential_penalties: string;
  };
  corrective_actions: Array<{
    action_ar: string;
    action_en: string;
    deadline: string;
    responsible_party: string;
    priority: NotificationPriority;
  }>;
}

// Notification template system
export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  subject_template_ar: string;
  subject_template_en: string;
  body_template_ar: string;
  body_template_en: string;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    description_ar: string;
    description_en: string;
    required: boolean;
  }>;
  channels: NotificationChannel[];
  default_priority: NotificationPriority;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

// Notification scheduling
export interface NotificationSchedule {
  id: string;
  name_ar: string;
  name_en: string;
  type: NotificationType;
  template_id: string;
  trigger_conditions: {
    entity_type: string;
    field_conditions: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
      value: any;
    }>;
    time_conditions: Array<{
      type: 'days_before' | 'days_after' | 'at_time' | 'recurring';
      value: number | string;
      reference_field?: string;
    }>;
  };
  recipient_rules: {
    include_roles: string[];
    exclude_roles: string[];
    include_users: string[];
    exclude_users: string[];
    custom_conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
  is_active: boolean;
  last_executed: string;
  execution_count: number;
  created_at: string;
  updated_at: string;
}

// Notification analytics and reporting
export interface NotificationAnalytics {
  id: string;
  date: string;
  notification_type: NotificationType;
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_failed: number;
  delivery_rate: number;
  read_rate: number;
  average_read_time: number;
  channel_breakdown: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;
  priority_breakdown: Record<NotificationPriority, {
    sent: number;
    delivered: number;
    read: number;
  }>;
  response_time_stats: {
    average: number;
    median: number;
    p95: number;
    p99: number;
  };
}

// Notification queue management
export interface NotificationQueue {
  id: string;
  notification_id: string;
  priority_score: number;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  processing_status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  processor_id?: string;
  error_details?: {
    error_code: string;
    error_message: string;
    stack_trace?: string;
  };
  created_at: string;
  updated_at: string;
}

// API interfaces
export interface CreateNotificationRequest {
  type: NotificationType;
  priority: NotificationPriority;
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  recipient_id: string;
  related_entity_type: string;
  related_entity_id: string;
  channels: NotificationChannel[];
  scheduled_at?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface NotificationFilters {
  type?: NotificationType[];
  priority?: NotificationPriority[];
  status?: NotificationStatus[];
  channels?: NotificationChannel[];
  recipient_id?: string;
  date_from?: string;
  date_to?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  search?: string;
}

export interface NotificationListResponse {
  notifications: BaseNotification[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  unread_count: number;
}

// Webhook and external integration types
export interface NotificationWebhook {
  id: string;
  name_ar: string;
  name_en: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  notification_types: NotificationType[];
  is_active: boolean;
  retry_policy: {
    max_retries: number;
    backoff_strategy: 'linear' | 'exponential';
    initial_delay: number;
    max_delay: number;
  };
  authentication?: {
    type: 'bearer' | 'api_key' | 'basic';
    credentials: Record<string, string>;
  };
  created_at: string;
  updated_at: string;
}

// System health and monitoring
export interface NotificationSystemHealth {
  queue_size: number;
  average_processing_time: number;
  error_rate: number;
  channel_status: Record<NotificationChannel, {
    is_operational: boolean;
    last_success: string;
    last_failure?: string;
    error_count_24h: number;
  }>;
  pending_notifications: number;
  failed_notifications: number;
  system_load: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
  };
  last_health_check: string;
}

// Export utility types
export type NotificationWithDelivery = BaseNotification & {
  deliveries: NotificationDelivery[];
};

export type NotificationSummary = Pick<BaseNotification, 
  'id' | 'type' | 'priority' | 'title_ar' | 'title_en' | 'recipient_id' | 'scheduled_at'
> & {
  delivery_status: NotificationStatus;
  is_read: boolean;
};

export type CreateNotificationScheduleRequest = Omit<NotificationSchedule, 
  'id' | 'last_executed' | 'execution_count' | 'created_at' | 'updated_at'
>;

export type UpdateNotificationPreferencesRequest = Partial<Omit<NotificationPreferences,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>>;