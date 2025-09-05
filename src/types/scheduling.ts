/**
 * Scheduling System Types
 * Story 3.1: Automated Scheduling Engine
 * 
 * Comprehensive TypeScript types for scheduling data models and algorithms
 * Supporting bilingual Arabic/English interfaces and complex scheduling logic
 */

// =====================================================
// Core Scheduling Enums
// =====================================================

export enum SchedulePattern {
  DAILY = 'daily',
  WEEKLY = 'weekly', 
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}

export enum SessionCategory {
  THERAPY = 'therapy',
  ASSESSMENT = 'assessment',
  CONSULTATION = 'consultation',
  GROUP_SESSION = 'group_session',
  EVALUATION = 'evaluation'
}

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled'
}

export enum ConflictType {
  THERAPIST_DOUBLE_BOOKING = 'therapist_double_booking',
  ROOM_UNAVAILABLE = 'room_unavailable',
  EQUIPMENT_CONFLICT = 'equipment_conflict',
  STUDENT_UNAVAILABLE = 'student_unavailable',
  TIME_CONSTRAINT = 'time_constraint'
}

export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ConflictResolution {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  IGNORED = 'ignored'
}

export enum TemplateType {
  PROGRAM_BASED = 'program_based',
  CUSTOM = 'custom',
  RECURRING = 'recurring'
}

export enum PriorityLevel {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4,
  CRITICAL = 5
}

// =====================================================
// Base Types and Interfaces
// =====================================================

export interface TimeSlot {
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  duration_minutes: number;
}

export interface DateTimeSlot extends TimeSlot {
  date: string; // YYYY-MM-DD format
  datetime_start: Date;
  datetime_end: Date;
}

export interface BilingualText {
  en: string;
  ar: string;
}

// =====================================================
// Therapist Availability Types
// =====================================================

export interface TherapistAvailability {
  id: string;
  therapist_id: string;
  
  // Time slot definition
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;
  end_time: string;
  
  // Availability management
  is_available: boolean;
  is_recurring: boolean;
  specific_date?: string; // YYYY-MM-DD format
  
  // Capacity management
  max_sessions_per_slot: number;
  current_bookings: number;
  
  // Time off management
  is_time_off: boolean;
  time_off_reason?: string;
  
  // Metadata
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Computed properties
  available_slots?: number;
  utilization_rate?: number;
}

export interface AvailabilityTemplate {
  id: string;
  name: BilingualText;
  description?: BilingualText;
  therapist_id: string;
  weekly_schedule: TherapistAvailability[];
  exceptions: AvailabilityException[];
  is_active: boolean;
}

export interface AvailabilityException {
  date: string;
  is_available: boolean;
  reason?: string;
  alternative_times?: TimeSlot[];
}

// =====================================================
// Schedule Template Types
// =====================================================

export interface ScheduleTemplate {
  id: string;
  
  // Template identification
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  
  // Template configuration
  template_type: TemplateType;
  is_active: boolean;
  
  // Scheduling rules
  session_duration: number; // minutes
  sessions_per_week: number;
  preferred_times: TimeSlot[];
  
  // Pattern configuration
  scheduling_pattern: SchedulePattern;
  pattern_config: SchedulePatternConfig;
  
  // Resource requirements
  required_room_type?: string;
  required_equipment: string[];
  special_requirements?: string;
  special_requirements_ar?: string;
  
  // Optimization preferences
  allow_back_to_back: boolean;
  max_gap_between_sessions: number; // minutes
  preferred_therapist_id?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface SchedulePatternConfig {
  // Weekly pattern
  preferred_days?: number[]; // Array of day numbers
  avoid_days?: number[];
  
  // Daily pattern  
  preferred_time_blocks?: TimeSlot[];
  avoid_time_blocks?: TimeSlot[];
  
  // Frequency controls
  frequency_multiplier?: number;
  max_sessions_per_day?: number;
  min_gap_between_sessions?: number; // minutes
  
  // Special scheduling rules
  allow_weekend?: boolean;
  allow_evening?: boolean;
  require_consecutive_days?: boolean;
  
  // Program-specific rules
  therapy_intensity?: 'low' | 'medium' | 'high';
  requires_preparation_time?: boolean;
  requires_cleanup_time?: boolean;
}

// =====================================================
// Scheduled Session Types
// =====================================================

export interface ScheduledSession {
  id: string;
  session_number: string;
  
  // Relationships
  student_subscription_id: string;
  therapist_id: string;
  template_id?: string;
  
  // Schedule details
  scheduled_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  duration_minutes: number;
  
  // Session categorization
  session_category: SessionCategory;
  session_type?: string;
  priority_level: PriorityLevel;
  
  // Status tracking
  status: SessionStatus;
  
  // Conflict management
  has_conflicts: boolean;
  conflict_details: ConflictDetail[];
  resolution_status: ConflictResolution;
  
  // Resource allocation
  room_id?: string;
  equipment_ids: string[];
  
  // Rescheduling tracking
  original_session_id?: string;
  reschedule_reason?: string;
  reschedule_count: number;
  
  // Generation metadata
  generation_algorithm?: string;
  optimization_score?: number; // 0-100
  
  // Billing integration
  is_billable: boolean;
  billing_rate?: number;
  
  // Notes
  therapist_notes?: string;
  admin_notes?: string;
  parent_notification_sent: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Computed properties
  full_datetime?: Date;
  is_past?: boolean;
  is_today?: boolean;
  time_until_session?: number; // minutes
}

export interface ConflictDetail {
  type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  description_ar?: string;
  detected_at: string;
  affected_resources: string[];
  suggested_resolution?: string;
}

// =====================================================
// Schedule Conflict Types
// =====================================================

export interface ScheduleConflict {
  id: string;
  
  // Conflict identification
  conflict_type: ConflictType;
  severity: ConflictSeverity;
  
  // Related sessions
  primary_session_id: string;
  conflicting_session_id?: string;
  
  // Conflict details
  conflict_description: string;
  conflict_description_ar?: string;
  detected_at: string;
  
  // Resolution tracking
  resolution_status: ConflictResolution;
  resolution_method?: string;
  resolution_notes?: string;
  resolved_at?: string;
  resolved_by?: string;
  
  // Alternative suggestions
  suggested_alternatives: SchedulingSuggestion[];
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface SchedulingSuggestion {
  date: string;
  start_time: string;
  end_time: string;
  therapist_id: string;
  confidence_score: number; // 0-100
  reasons: string[];
  trade_offs: string[];
  resource_availability: ResourceAvailability;
}

export interface ResourceAvailability {
  therapist_available: boolean;
  room_available: boolean;
  equipment_available: boolean;
  student_available: boolean;
  conflicts: string[];
}

// =====================================================
// Scheduling Algorithm Types
// =====================================================

export interface SchedulingRequest {
  student_subscription_id: string;
  template_id?: string;
  
  // Scheduling preferences
  preferred_therapist_id?: string;
  preferred_times: TimeSlot[];
  avoid_times?: TimeSlot[];
  preferred_days?: number[];
  avoid_days?: number[];
  
  // Constraints
  start_date: string;
  end_date: string;
  total_sessions: number;
  sessions_per_week: number;
  session_duration: number;
  
  // Priority and flexibility
  priority_level: PriorityLevel;
  flexibility_score: number; // 0-100, higher = more flexible
  
  // Special requirements
  requires_consecutive_sessions?: boolean;
  max_gap_between_sessions?: number;
  allow_rescheduling?: boolean;
  
  // Resource requirements
  required_room_type?: string;
  required_equipment?: string[];
}

export interface SchedulingResult {
  success: boolean;
  generated_sessions: ScheduledSession[];
  conflicts: ScheduleConflict[];
  suggestions: SchedulingSuggestion[];
  
  // Quality metrics
  optimization_score: number; // 0-100
  therapist_utilization: number; // 0-100
  preference_match_score: number; // 0-100
  
  // Warnings and issues
  warnings: string[];
  unscheduled_sessions: number;
  total_conflicts: number;
  
  // Algorithm metadata
  algorithm_used: string;
  generation_time_ms: number;
  alternative_solutions?: SchedulingResult[];
}

export interface OptimizationRule {
  id: string;
  name: string;
  name_ar: string;
  
  // Rule configuration
  rule_type: 'preference' | 'constraint' | 'optimization';
  priority: number; // 1-10
  is_active: boolean;
  
  // Rule logic
  condition: OptimizationCondition;
  action: OptimizationAction;
  weight: number; // Impact on optimization score
  
  // Application scope
  applies_to: 'all' | 'therapist' | 'program' | 'student';
  target_ids?: string[];
}

export interface OptimizationCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: any;
  additional_params?: Record<string, any>;
}

export interface OptimizationAction {
  type: 'boost_score' | 'penalize_score' | 'reject' | 'prefer' | 'suggest_alternative';
  parameters: Record<string, any>;
  score_impact: number; // -100 to +100
}

// =====================================================
// Calendar and UI Types
// =====================================================

export interface CalendarView {
  type: 'day' | 'week' | 'month' | 'agenda';
  start_date: string;
  end_date: string;
  timezone: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  title_ar?: string;
  start: Date;
  end: Date;
  
  // Event styling
  color?: string;
  background_color?: string;
  border_color?: string;
  text_color?: string;
  
  // Event metadata
  session_id?: string;
  therapist_id: string;
  student_id: string;
  status: SessionStatus;
  
  // Interactive properties
  is_editable: boolean;
  is_draggable: boolean;
  is_resizable: boolean;
  
  // Conflict indicators
  has_conflicts: boolean;
  conflict_severity?: ConflictSeverity;
  
  // Additional data
  resource_ids: string[];
  notes?: string;
  url?: string;
}

export interface DragDropOperation {
  session_id: string;
  original_datetime: Date;
  new_datetime: Date;
  new_therapist_id?: string;
  operation_type: 'move' | 'resize' | 'copy';
  
  // Validation results
  is_valid: boolean;
  conflicts: ScheduleConflict[];
  warnings: string[];
  
  // Preview data
  preview_session: ScheduledSession;
  affected_sessions: string[];
}

// =====================================================
// Bulk Operations Types
// =====================================================

export interface BulkReschedulingRequest {
  session_ids: string[];
  operation_type: 'reschedule' | 'cancel' | 'modify';
  
  // Rescheduling parameters
  new_date_range?: {
    start_date: string;
    end_date: string;
  };
  new_therapist_id?: string;
  reason: string;
  
  // Batch processing options
  process_in_batches: boolean;
  batch_size?: number;
  notify_parents: boolean;
  create_backup: boolean;
}

export interface BulkReschedulingResult {
  total_requested: number;
  successful_operations: number;
  failed_operations: number;
  
  // Results breakdown
  successful_session_ids: string[];
  failed_session_ids: string[];
  conflict_session_ids: string[];
  
  // Generated data
  new_sessions: ScheduledSession[];
  conflicts: ScheduleConflict[];
  warnings: string[];
  
  // Operation metadata
  operation_id: string;
  processing_time_ms: number;
  rollback_available: boolean;
}

// =====================================================
// Performance and Analytics Types
// =====================================================

export interface SchedulingMetrics {
  // Utilization metrics
  therapist_utilization: Record<string, number>; // therapist_id -> utilization %
  room_utilization: Record<string, number>;
  equipment_utilization: Record<string, number>;
  
  // Conflict metrics
  total_conflicts: number;
  conflicts_by_type: Record<ConflictType, number>;
  conflicts_by_severity: Record<ConflictSeverity, number>;
  average_resolution_time: number; // hours
  
  // Efficiency metrics
  schedule_optimization_score: number; // 0-100
  average_gap_between_sessions: number; // minutes
  back_to_back_session_percentage: number;
  
  // Quality metrics
  reschedule_rate: number; // percentage
  no_show_rate: number; // percentage
  cancellation_rate: number; // percentage
  
  // Time period
  period_start: string;
  period_end: string;
  last_updated: string;
}

export interface PerformanceTarget {
  metric_name: string;
  target_value: number;
  current_value: number;
  unit: string;
  status: 'on_target' | 'below_target' | 'above_target';
  trend: 'improving' | 'stable' | 'declining';
}

// =====================================================
// API Response Types  
// =====================================================

export interface SchedulingApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  message_ar?: string;
  errors?: ValidationError[];
  warnings?: string[];
  metadata?: {
    total_count?: number;
    page?: number;
    page_size?: number;
    processing_time_ms?: number;
  };
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  message_ar?: string;
  value?: any;
}

export interface PaginationParams {
  page: number;
  page_size: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// =====================================================
// Form and UI State Types
// =====================================================

export interface SchedulingFormData {
  // Basic information
  student_subscription_id: string;
  template_id?: string;
  therapist_id?: string;
  
  // Schedule preferences
  start_date: string;
  end_date: string;
  session_duration: number;
  sessions_per_week: number;
  total_sessions: number;
  
  // Time preferences
  preferred_times: TimeSlot[];
  avoid_times: TimeSlot[];
  preferred_days: number[];
  avoid_days: number[];
  
  // Special requirements
  special_requirements?: string;
  priority_level: PriorityLevel;
  flexibility_score: number;
  
  // Resource requirements
  required_room_type?: string;
  required_equipment: string[];
}

export interface SchedulingUIState {
  // View state
  current_view: CalendarView;
  selected_date: string;
  selected_session_id?: string;
  
  // Loading states
  is_loading: boolean;
  is_generating: boolean;
  is_optimizing: boolean;
  
  // Modal states
  show_conflict_modal: boolean;
  show_bulk_operations_modal: boolean;
  show_template_selector: boolean;
  
  // Filter states
  active_filters: Record<string, any>;
  visible_therapists: string[];
  visible_session_types: SessionCategory[];
  
  // Error states
  errors: ValidationError[];
  warnings: string[];
  
  // Drag & drop state
  dragging_session?: string;
  drop_target?: string;
  preview_operation?: DragDropOperation;
}

// =====================================================
// Subscription Management Types (Story 3.3)
// =====================================================

export enum SubscriptionStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen', 
  SUSPENDED = 'suspended',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum BillingCycle {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually'
}

export enum FreezeOperationType {
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze',
  EXTEND_FREEZE = 'extend_freeze',
  MODIFY_FREEZE = 'modify_freeze'
}

export enum OperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

export interface StudentSubscription {
  id: string;
  
  // Core relationships
  student_id: string;
  therapy_program_id: string;
  
  // Subscription timeline
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  original_end_date: string; // Original end date before freezes
  
  // Freeze management
  freeze_days_allowed: number;
  freeze_days_used: number;
  
  // Status tracking
  is_active: boolean;
  status: SubscriptionStatus;
  
  // Billing integration
  billing_cycle: BillingCycle;
  total_amount: number;
  amount_paid: number;
  
  // Current freeze tracking
  current_freeze_start?: string;
  current_freeze_end?: string;
  total_frozen_days: number;
  
  // Metadata
  notes?: string;
  notes_ar?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Computed properties
  remaining_freeze_days?: number;
  days_until_expiry?: number;
  is_currently_frozen?: boolean;
  freeze_progress_percentage?: number;
}

export interface SubscriptionFreezeHistory {
  id: string;
  subscription_id: string;
  
  // Freeze operation details
  operation_type: FreezeOperationType;
  freeze_start_date: string;
  freeze_end_date: string;
  freeze_duration_days: number;
  
  // Business context
  reason?: string;
  reason_ar?: string;
  admin_notes?: string;
  admin_notes_ar?: string;
  
  // Impact tracking
  original_end_date: string;
  new_end_date: string;
  affected_sessions_count: number;
  rescheduled_sessions_count: number;
  
  // Operation metadata
  operation_status: OperationStatus;
  rollback_data?: any;
  
  // Metadata
  created_at: string;
  created_by: string;
}

export interface SubscriptionFreezeOperation {
  id: string;
  operation_id: string; // Human-readable identifier
  subscription_id: string;
  
  // Operation details
  operation_type: FreezeOperationType;
  freeze_start_date: string;
  freeze_end_date: string;
  
  // Status tracking
  status: OperationStatus;
  current_step?: string;
  total_steps: number;
  completed_steps: number;
  
  // Recovery data
  rollback_data: any;
  error_details?: any;
  
  // Progress tracking
  progress_percentage: number;
  estimated_completion?: string;
  
  // Metadata
  started_at: string;
  completed_at?: string;
  created_by: string;
}

export interface FreezeRequest {
  subscription_id: string;
  freeze_start_date: string; // YYYY-MM-DD
  freeze_end_date: string; // YYYY-MM-DD
  reason: string;
  reason_ar?: string;
  admin_notes?: string;
  admin_notes_ar?: string;
  
  // Preview options
  preview_only?: boolean;
  notify_parents?: boolean;
  auto_reschedule?: boolean;
}

export interface FreezePreview {
  is_valid: boolean;
  freeze_duration_days: number;
  remaining_freeze_days: number;
  new_end_date: string;
  
  // Affected sessions
  affected_sessions: ScheduledSession[];
  sessions_to_reschedule: number;
  sessions_to_cancel: number;
  
  // Conflicts and warnings
  conflicts: ScheduleConflict[];
  warnings: string[];
  
  // Financial impact
  billing_adjustment: {
    amount: number;
    description: string;
    description_ar?: string;
  };
  
  // Rescheduling preview
  rescheduling_options: {
    successful_reschedules: number;
    manual_resolution_needed: number;
    alternative_therapists: string[];
    estimated_delay_days: number;
  };
}

export interface FreezeResult {
  success: boolean;
  operation_id?: string;
  subscription_id: string;
  message: string;
  message_ar?: string;
  
  // Results data
  freeze_duration_days?: number;
  new_end_date?: string;
  remaining_freeze_days?: number;
  affected_sessions_count?: number;
  
  // Error information
  error?: string;
  errors?: ValidationError[];
  warnings?: string[];
}

// =====================================================
// Hook Return Types
// =====================================================

export interface UseSchedulingReturn {
  // Data
  sessions: ScheduledSession[];
  conflicts: ScheduleConflict[];
  templates: ScheduleTemplate[];
  availability: TherapistAvailability[];
  
  // Actions
  generateSchedule: (request: SchedulingRequest) => Promise<SchedulingResult>;
  rescheduleSession: (sessionId: string, newDateTime: Date) => Promise<void>;
  resolveConflict: (conflictId: string, resolution: ConflictResolution) => Promise<void>;
  bulkReschedule: (request: BulkReschedulingRequest) => Promise<BulkReschedulingResult>;
  
  // State
  isLoading: boolean;
  isGenerating: boolean;
  error: Error | null;
  
  // Utilities
  exportSchedule: (format: 'pdf' | 'csv' | 'ical') => Promise<void>;
  validateSchedule: (sessions: ScheduledSession[]) => ValidationError[];
  optimizeSchedule: (sessions: ScheduledSession[]) => Promise<SchedulingResult>;
}