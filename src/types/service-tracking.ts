// Service Hour Tracking Types
// Extension to IEP Management System for Service Delivery Tracking
// IDEA 2024 Compliant - Service Hour Documentation and Validation
// Arkan Al-Numo Center - TypeScript Interfaces

// =============================================================================
// ENUMS AND BASE TYPES
// =============================================================================

export type SessionStatus = 
  | 'scheduled' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show' 
  | 'partial' 
  | 'makeup_needed'

export type ServiceLocation = 
  | 'general_education_classroom'
  | 'special_education_classroom'
  | 'therapy_room'
  | 'home'
  | 'community'
  | 'online'
  | 'other'

export type ComplianceStatus = 
  | 'compliant' 
  | 'at_risk' 
  | 'non_compliant' 
  | 'needs_review'

export type AlertType = 
  | 'service_hours_below_threshold'
  | 'excessive_cancellations'
  | 'missed_sessions_requiring_makeup'
  | 'provider_unavailable'
  | 'documentation_overdue'
  | 'compliance_review_required'
  | 'service_modification_needed'

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical'

export type AlertStatus = 
  | 'active' 
  | 'acknowledged' 
  | 'resolved' 
  | 'dismissed' 
  | 'escalated'

export type SummaryPeriodType = 'weekly' | 'monthly' | 'quarterly' | 'annual'

export type AvailabilityStatus = 
  | 'available' 
  | 'booked' 
  | 'partially_booked' 
  | 'unavailable' 
  | 'break' 
  | 'meeting'

export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly' | 'one_time'

// =============================================================================
// SERVICE DELIVERY SESSION INTERFACES
// =============================================================================

export interface ServiceDeliverySession {
  id: string
  service_id: string
  student_id: string
  
  // Session Information
  session_date: string
  session_time: string
  planned_duration_minutes: number
  actual_duration_minutes?: number
  
  // Service Provider Information
  provider_id?: string
  provider_name?: string
  substitute_provider_id?: string
  substitute_provider_name?: string
  is_substitute_session: boolean
  
  // Session Location and Setting
  actual_location?: ServiceLocation
  location_notes_ar?: string
  location_notes_en?: string
  
  // Session Status and Outcomes
  session_status: SessionStatus
  cancellation_reason_ar?: string
  cancellation_reason_en?: string
  
  // Service Delivery Documentation (Bilingual)
  services_delivered_ar?: string
  services_delivered_en?: string
  session_objectives_met?: boolean
  student_engagement_level?: number // 1-5 scale
  
  // Progress Tracking
  progress_notes_ar?: string
  progress_notes_en?: string
  behavioral_observations_ar?: string
  behavioral_observations_en?: string
  
  // Goals and Objectives Progress
  goals_addressed: string[]
  objective_progress?: Record<string, any>
  
  // Compliance Tracking
  session_documented: boolean
  documentation_complete: boolean
  requires_makeup_session: boolean
  makeup_session_scheduled: boolean
  makeup_for_session_id?: string
  
  // Quality Assurance
  supervisor_review_required: boolean
  supervisor_reviewed_by?: string
  supervisor_review_date?: string
  supervisor_comments_ar?: string
  supervisor_comments_en?: string
  
  // Billing and Administrative
  billable_session: boolean
  billing_code?: string
  administrative_notes_ar?: string
  administrative_notes_en?: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  updated_by?: string
}

// Form data interface for creating/editing sessions
export interface ServiceSessionFormData {
  session_date: Date
  session_time: string
  planned_duration_minutes: number
  actual_duration_minutes?: number
  provider_id?: string
  provider_name?: string
  actual_location?: ServiceLocation
  location_notes_ar?: string
  location_notes_en?: string
  session_status: SessionStatus
  cancellation_reason_ar?: string
  cancellation_reason_en?: string
  services_delivered_ar?: string
  services_delivered_en?: string
  session_objectives_met?: boolean
  student_engagement_level?: number
  progress_notes_ar?: string
  progress_notes_en?: string
  behavioral_observations_ar?: string
  behavioral_observations_en?: string
  goals_addressed: string[]
  billable_session: boolean
  billing_code?: string
}

// =============================================================================
// SERVICE HOUR SUMMARY INTERFACES
// =============================================================================

export interface ServiceHourSummary {
  id: string
  service_id: string
  student_id: string
  
  // Time Period
  summary_period_type: SummaryPeriodType
  period_start_date: string
  period_end_date: string
  
  // Service Hour Tracking
  planned_total_minutes: number
  delivered_total_minutes: number
  missed_total_minutes: number
  makeup_total_minutes: number
  
  // Session Counts
  total_planned_sessions: number
  total_completed_sessions: number
  total_cancelled_sessions: number
  total_no_show_sessions: number
  total_makeup_sessions: number
  
  // Compliance Metrics (calculated field)
  service_delivery_percentage: number
  compliance_status: ComplianceStatus
  
  // Alert Thresholds
  below_threshold_alert: boolean
  makeup_sessions_needed: number
  compliance_notes_ar?: string
  compliance_notes_en?: string
  
  // Metadata
  last_calculated: string
  created_at: string
  updated_at: string
}

// Interface for service hour calculations
export interface ServiceComplianceCalculation {
  planned_minutes: number
  delivered_minutes: number
  compliance_percentage: number
  compliance_status: ComplianceStatus
  makeup_needed: number
  variance_amount: number
}

// =============================================================================
// SERVICE COMPLIANCE ALERT INTERFACES
// =============================================================================

export interface ServiceComplianceAlert {
  id: string
  service_id: string
  student_id: string
  
  // Alert Information
  alert_type: AlertType
  priority_level: AlertPriority
  alert_status: AlertStatus
  
  // Alert Content (Bilingual)
  alert_title_ar: string
  alert_title_en: string
  alert_message_ar: string
  alert_message_en: string
  recommended_action_ar?: string
  recommended_action_en?: string
  
  // Alert Metrics
  threshold_value?: number
  current_value?: number
  variance_amount?: number
  
  // Alert Timeline
  alert_triggered_date: string
  resolution_due_date?: string
  resolved_date?: string
  
  // Assignment and Resolution
  assigned_to_user_id?: string
  resolved_by_user_id?: string
  resolution_notes_ar?: string
  resolution_notes_en?: string
  
  // Follow-up Actions
  requires_iep_team_review: boolean
  requires_service_modification: boolean
  requires_parent_notification: boolean
  parent_notified_date?: string
  
  // Metadata
  created_at: string
  updated_at: string
}

// Alert creation interface
export interface CreateComplianceAlertData {
  service_id: string
  student_id: string
  alert_type: AlertType
  priority_level: AlertPriority
  alert_title_ar: string
  alert_title_en: string
  alert_message_ar: string
  alert_message_en: string
  recommended_action_ar?: string
  recommended_action_en?: string
  threshold_value?: number
  current_value?: number
  resolution_due_date?: Date
  assigned_to_user_id?: string
}

// =============================================================================
// SERVICE PROVIDER SCHEDULE INTERFACES
// =============================================================================

export interface ServiceProviderSchedule {
  id: string
  provider_id: string
  
  // Schedule Information
  schedule_date: string
  day_of_week: number // 0 = Sunday
  start_time: string
  end_time: string
  available_duration_minutes: number // calculated field
  
  // Availability Status
  availability_status: AvailabilityStatus
  
  // Location and Service Type
  available_locations: ServiceLocation[]
  service_categories: string[]
  
  // Recurring Schedule
  is_recurring: boolean
  recurrence_pattern?: RecurrencePattern
  recurrence_end_date?: string
  
  // Special Notes
  schedule_notes_ar?: string
  schedule_notes_en?: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
}

// Schedule creation/editing interface
export interface ProviderScheduleFormData {
  schedule_date: Date
  start_time: string
  end_time: string
  availability_status: AvailabilityStatus
  available_locations: ServiceLocation[]
  service_categories: string[]
  is_recurring: boolean
  recurrence_pattern?: RecurrencePattern
  recurrence_end_date?: Date
  schedule_notes_ar?: string
  schedule_notes_en?: string
}

// =============================================================================
// COMPOSITE INTERFACES FOR UI COMPONENTS
// =============================================================================

// Complete service tracking data for dashboard
export interface ServiceTrackingDashboardData {
  service: {
    id: string
    service_name_ar: string
    service_name_en: string
    service_category: string
    frequency_per_week: number
    session_duration_minutes: number
    total_minutes_per_week: number
    service_status: string
    student_name: string
    provider_name?: string
  }
  summary: ServiceHourSummary
  alerts: ServiceComplianceAlert[]
  recentSessions: ServiceDeliverySession[]
  upcomingSessions: ServiceDeliverySession[]
}

// Service session with related data
export interface ServiceSessionWithRelations extends ServiceDeliverySession {
  service: {
    service_name_ar: string
    service_name_en: string
    service_category: string
    frequency_per_week: number
    session_duration_minutes: number
  }
  student: {
    name_ar: string
    name_en: string
    student_id: string
  }
  provider?: {
    name: string
    email: string
  }
  makeup_session?: ServiceDeliverySession
}

// Alert with related service and student data
export interface ComplianceAlertWithRelations extends ServiceComplianceAlert {
  service: {
    service_name_ar: string
    service_name_en: string
    service_category: string
  }
  student: {
    name_ar: string
    name_en: string
    student_id: string
  }
  assigned_user?: {
    name: string
    email: string
  }
  resolved_by_user?: {
    name: string
    email: string
  }
}

// =============================================================================
// VALIDATION AND FILTER INTERFACES
// =============================================================================

// Service session filters for queries
export interface ServiceSessionFilters {
  service_id?: string
  student_id?: string
  provider_id?: string
  session_status?: SessionStatus[]
  date_range?: {
    start: Date
    end: Date
  }
  location?: ServiceLocation[]
  requires_makeup?: boolean
  documentation_complete?: boolean
}

// Compliance alert filters
export interface ComplianceAlertFilters {
  alert_type?: AlertType[]
  priority_level?: AlertPriority[]
  alert_status?: AlertStatus[]
  assigned_to?: string
  service_id?: string
  student_id?: string
  date_range?: {
    start: Date
    end: Date
  }
  requires_action?: boolean
}

// Service hour summary filters
export interface ServiceSummaryFilters {
  service_id?: string
  student_id?: string
  period_type?: SummaryPeriodType
  compliance_status?: ComplianceStatus[]
  period_range?: {
    start: Date
    end: Date
  }
  below_threshold?: boolean
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Service compliance thresholds configuration
export interface ComplianceThresholds {
  compliant_minimum: number // >= 90%
  at_risk_minimum: number // >= 70%
  alert_threshold: number // < 70%
  critical_threshold: number // < 50%
  makeup_session_threshold_days: number // 7 days
  documentation_deadline_days: number // 3 days
}

// Service tracking statistics
export interface ServiceTrackingStats {
  total_services: number
  active_services: number
  compliant_services: number
  at_risk_services: number
  non_compliant_services: number
  active_alerts: number
  overdue_sessions: number
  pending_documentation: number
  makeup_sessions_needed: number
}

// Export configuration for service reports
export interface ServiceReportConfig {
  include_sessions: boolean
  include_summaries: boolean
  include_alerts: boolean
  date_range: {
    start: Date
    end: Date
  }
  service_ids?: string[]
  student_ids?: string[]
  format: 'pdf' | 'excel' | 'csv'
  language: 'ar' | 'en' | 'both'
}