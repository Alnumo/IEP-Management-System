// Communication Platform Types
// Real-time Messaging, Voice Communication, and Assignment Automation
// Arkan Al-Numo Center - TypeScript Interfaces

// =============================================================================
// BASE COMMUNICATION TYPES AND ENUMS
// =============================================================================

export type MessageType = 'text' | 'media' | 'voice_note' | 'system' | 'session_update' | 'progress_update'
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent'
export type ConversationStatus = 'active' | 'archived' | 'blocked' | 'muted'
export type CallStatus = 'initiated' | 'ringing' | 'answered' | 'ended' | 'missed' | 'rejected' | 'failed'
export type CallType = 'voice' | 'video'
export type ConnectionQuality = 'poor' | 'fair' | 'good' | 'excellent'
export type ReactionType = 'like' | 'love' | 'helpful' | 'important' | 'question' | 'acknowledge'

export type ParticipantRole = 
  | 'primary_parent' 
  | 'secondary_parent' 
  | 'primary_therapist' 
  | 'secondary_therapist' 
  | 'supervisor' 
  | 'administrator' 
  | 'observer'

export type ParticipantStatus = 'active' | 'inactive' | 'restricted'

// =============================================================================
// CORE CONVERSATION INTERFACES
// =============================================================================

export interface Conversation {
  id: string
  parent_id: string
  therapist_id: string
  student_id: string
  title_ar?: string
  title_en?: string
  description_ar?: string
  description_en?: string
  status: ConversationStatus
  last_message_at: string
  last_message_by?: string
  message_count: number
  unread_count_parent: number
  unread_count_therapist: number
  parent_notifications_enabled: boolean
  therapist_notifications_enabled: boolean
  voice_calls_enabled: boolean
  media_sharing_enabled: boolean
  created_at: string
  updated_at: string
  created_by: string
  
  // Encryption settings
  encryption_enabled?: boolean
  encryption_key_rotation_at?: string

  // Populated via joins
  student?: {
    id: string
    first_name_ar: string
    last_name_ar: string
    first_name_en?: string
    last_name_en?: string
    registration_number: string
  }
  parent?: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
  therapist?: {
    id: string
    name: string
    email: string
    avatar_url?: string
    specialization?: string
  }
  latest_message?: Message
  participants?: ConversationParticipant[]
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  recipient_id: string
  content_ar?: string
  content_en?: string
  message_type: MessageType
  priority_level: MessagePriority
  requires_response: boolean
  response_deadline?: string
  media_attachments: MediaAttachment[]
  read_status: boolean
  read_at?: string
  delivered_at: string
  alert_processed: boolean
  alert_level?: string
  escalation_triggered: boolean
  escalation_at?: string
  related_session_id?: string
  related_goal_id?: string
  related_assessment_id?: string
  reply_to_message_id?: string
  thread_id?: string
  created_at: string
  updated_at: string
  
  // Encryption fields
  encryption_key_id?: string
  iv?: string
  auth_tag?: string
  content_hash?: string
  encrypted_at?: string
  decrypted?: boolean

  // Populated via joins
  sender?: {
    id: string
    name: string
    avatar_url?: string
  }
  recipient?: {
    id: string
    name: string
    avatar_url?: string
  }
  reply_to?: Message
  reactions?: MessageReaction[]
}

export interface MediaAttachment {
  id: string
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  thumbnail_path?: string
  thumbnail_url?: string
  width?: number
  height?: number
  duration?: number // for videos/audio
  compressed: boolean
  compression_ratio?: number
  uploaded_at: string
  dimensions?: {
    width: number
    height: number
  }
  
  // Encryption fields for media
  encrypted_file_path?: string
  encryption_metadata?: {
    keyId: string
    iv: string
    authTag?: string
    originalFilename: string
    encryptedSize: number
  }
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  reaction_type: ReactionType
  reaction_emoji?: string
  created_at: string

  // Populated via joins
  user?: {
    id: string
    name: string
    avatar_url?: string
  }
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  role: ParticipantRole
  notifications_enabled: boolean
  can_initiate_calls: boolean
  can_share_media: boolean
  can_view_history: boolean
  status: ParticipantStatus
  last_seen_at?: string
  joined_at: string
  added_by: string

  // Populated via joins
  user?: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
}

// =============================================================================
// VOICE COMMUNICATION INTERFACES
// =============================================================================

export interface VoiceCall {
  id: string
  conversation_id: string
  caller_id: string
  callee_id: string
  call_type: CallType
  call_status: CallStatus
  initiated_at: string
  answered_at?: string
  ended_at?: string
  duration_seconds: number
  call_quality_score?: number
  connection_quality?: ConnectionQuality
  audio_issues_reported: boolean
  peer_connection_id?: string
  ice_connection_state?: string
  signaling_state?: string
  recording_enabled: boolean
  recording_path?: string
  recording_duration_seconds?: number
  call_reason_ar?: string
  call_reason_en?: string
  related_session_id?: string
  emergency_call: boolean
  call_notes_ar?: string
  call_notes_en?: string
  follow_up_required: boolean
  follow_up_notes_ar?: string
  follow_up_notes_en?: string
  created_at: string
  updated_at: string

  // Populated via joins
  caller?: {
    id: string
    name: string
    avatar_url?: string
  }
  callee?: {
    id: string
    name: string
    avatar_url?: string
  }
  conversation?: Conversation
}

// =============================================================================
// CREATE/UPDATE DATA INTERFACES
// =============================================================================

export interface CreateConversationData {
  parent_id: string
  therapist_id: string
  student_id: string
  title_ar?: string
  title_en?: string
  description_ar?: string
  description_en?: string
}

export interface UpdateConversationData extends Partial<CreateConversationData> {
  status?: ConversationStatus
  parent_notifications_enabled?: boolean
  therapist_notifications_enabled?: boolean
  voice_calls_enabled?: boolean
  media_sharing_enabled?: boolean
}

export interface SendMessageData {
  conversation_id: string
  recipient_id: string
  content_ar?: string
  content_en?: string
  message_type: MessageType
  priority_level?: MessagePriority
  requires_response?: boolean
  response_deadline?: string
  media_attachments?: MediaAttachment[]
  related_session_id?: string
  related_goal_id?: string
  reply_to_message_id?: string
}

export interface CreateVoiceCallData {
  conversation_id: string
  callee_id: string
  call_type: CallType
  call_reason_ar?: string
  call_reason_en?: string
  emergency_call?: boolean
}

export interface UpdateVoiceCallData {
  call_status?: CallStatus
  answered_at?: string
  ended_at?: string
  duration_seconds?: number
  call_quality_score?: number
  connection_quality?: ConnectionQuality
  audio_issues_reported?: boolean
  call_notes_ar?: string
  call_notes_en?: string
  follow_up_required?: boolean
  follow_up_notes_ar?: string
  follow_up_notes_en?: string
}

// =============================================================================
// PRIORITY ALERT INTERFACES
// =============================================================================

export interface PriorityAnalysisResult {
  priority: MessagePriority
  requiresImmediateResponse: boolean
  escalationRequired: boolean
  detectedConcerns: string[]
  confidenceScore: number
}

export interface AlertEscalationRule {
  trigger_keywords: string[]
  priority_threshold: MessagePriority
  escalation_delay_minutes: number
  notification_channels: string[]
  escalation_roles: string[]
}

// =============================================================================
// FILTER AND SEARCH INTERFACES
// =============================================================================

export interface ConversationFilters {
  status?: ConversationStatus
  student_id?: string
  has_unread?: boolean
  priority_level?: MessagePriority
  search?: string
  created_after?: string
  created_before?: string
}

export interface MessageFilters {
  conversation_id?: string
  sender_id?: string
  message_type?: MessageType
  priority_level?: MessagePriority
  has_media?: boolean
  unread_only?: boolean
  search?: string
  created_after?: string
  created_before?: string
}

// =============================================================================
// ASSIGNMENT AUTOMATION INTERFACES
// =============================================================================

export interface AssignmentValidationResult {
  isValid: boolean
  conflictType?: 'therapist_already_assigned' | 'schedule_conflict' | 'capacity_exceeded'
  currentTherapist?: string
  requiresSubstitution: boolean
  recommendedAction: 'notify_parent_of_change' | 'suggest_alternative_time' | 'escalate_to_supervisor'
  alternativeOptions?: AlternativeAssignmentOption[]
}

export interface AlternativeAssignmentOption {
  therapist_id: string
  therapist_name: string
  available_times: string[]
  specialization_match: number // 0-1 score
  experience_level: 'junior' | 'senior' | 'expert'
}

export interface AssignmentWorkflowRule {
  id: string
  rule_type: 'one_therapist_per_session_type' | 'capacity_limit' | 'specialization_required'
  conditions: Record<string, any>
  actions: string[]
  priority: number
  enabled: boolean
}

// =============================================================================
// REAL-TIME EVENT INTERFACES
// =============================================================================

export interface TypingEvent {
  userId: string
  conversationId: string
  isTyping: boolean
  timestamp: string
}

export interface MessageReadEvent {
  userId: string
  messageId: string
  conversationId: string
  timestamp: string
}

export interface VoiceCallEvent {
  conversationId: string
  callId: string
  eventType: 'offer' | 'answer' | 'ice_candidate' | 'end_call'
  data: any
}

export interface PresenceEvent {
  userId: string
  status: 'online' | 'away' | 'offline'
  lastSeen: string
}

// =============================================================================
// STATISTICS AND DASHBOARD INTERFACES
// =============================================================================

export interface ConversationStats {
  total_conversations: number
  active_conversations: number
  unread_messages: number
  priority_messages: number
  voice_calls_today: number
  media_shared_today: number
  response_time_avg_minutes: number
  user_engagement_score: number
}

export interface MessageStats {
  total_sent: number
  total_received: number
  media_messages: number
  priority_messages: number
  average_response_time: number
  read_rate_percentage: number
}

// =============================================================================
// WEBHOOKS AND EXTERNAL INTEGRATIONS
// =============================================================================

export interface MessageWebhookPayload {
  conversation_id: string
  message_id: string
  sender_id: string
  recipient_id: string
  message_type: MessageType
  priority_level: MessagePriority
  content_preview: string
  timestamp: string
  metadata: Record<string, any>
}

export interface VoiceCallWebhookPayload {
  call_id: string
  conversation_id: string
  caller_id: string
  callee_id: string
  call_status: CallStatus
  duration_seconds?: number
  timestamp: string
}