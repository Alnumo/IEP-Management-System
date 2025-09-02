/**
 * Provider Assignment and Scheduling Types
 * أنواع تعيين مقدمي الخدمة والجدولة
 * 
 * @description TypeScript interfaces for provider assignment, scheduling, and availability management
 * واجهات TypeScript لتعيين مقدمي الخدمة والجدولة وإدارة التوفر
 */

import { ServiceLocation, ServiceCategory } from '@/types/service-tracking'

// =============================================================================
// ENUMS AND BASE TYPES
// =============================================================================

export type AvailabilityStatus = 
  | 'available' 
  | 'booked' 
  | 'partially_booked' 
  | 'unavailable' 
  | 'break' 
  | 'meeting'
  | 'training'
  | 'sick_leave'
  | 'vacation'

export type SchedulingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'cancelled' 
  | 'completed' 
  | 'no_show'
  | 'rescheduled'

export type RecurrencePattern = 
  | 'none'
  | 'daily' 
  | 'weekly' 
  | 'biweekly' 
  | 'monthly'
  | 'custom'

export type AssignmentStatus = 
  | 'active' 
  | 'inactive' 
  | 'pending' 
  | 'completed' 
  | 'transferred'
  | 'suspended'

export type ProviderRole = 
  | 'speech_therapist'
  | 'occupational_therapist'
  | 'physical_therapist'
  | 'behavioral_therapist'
  | 'special_education_teacher'
  | 'psychologist'
  | 'social_worker'
  | 'consultant'

export type QualificationLevel = 
  | 'entry_level'
  | 'experienced'
  | 'senior'
  | 'specialist'
  | 'expert'
  | 'consultant'

export type WorkloadStatus = 
  | 'underutilized'  // < 70% capacity
  | 'optimal'        // 70-85% capacity
  | 'overloaded'     // 85-95% capacity
  | 'critical'       // > 95% capacity

// =============================================================================
// PROVIDER PROFILE INTERFACES
// =============================================================================

export interface ServiceProvider {
  id: string
  user_id: string
  
  // Basic Information
  provider_code: string
  name_ar: string
  name_en: string
  email: string
  phone: string
  license_number?: string
  
  // Professional Details
  primary_role: ProviderRole
  secondary_roles: ProviderRole[]
  qualification_level: QualificationLevel
  specializations: string[]
  languages_spoken: string[] // ['ar', 'en', 'fr', etc.]
  
  // Service Capabilities
  service_categories: ServiceCategory[]
  service_locations: ServiceLocation[]
  max_concurrent_students: number
  preferred_age_groups: string[] // ['early_childhood', 'school_age', 'adolescent', 'adult']
  
  // Availability Preferences
  working_hours: {
    start_time: string // HH:mm format
    end_time: string
    days_of_week: number[] // 0=Sunday, 1=Monday, etc.
  }
  max_hours_per_day: number
  max_hours_per_week: number
  break_duration_minutes: number
  travel_time_minutes: number // Time needed between locations
  
  // Status and Metrics
  provider_status: AssignmentStatus
  current_workload_percentage: number
  workload_status: WorkloadStatus
  availability_score: number // 0-100, calculated based on schedule efficiency
  performance_rating: number // 0-5 stars
  
  // Employment Details
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'consultant'
  start_date: string
  end_date?: string
  hourly_rate?: number
  
  // Preferences and Notes
  scheduling_preferences: {
    preferred_session_duration: number[]
    avoid_back_to_back_sessions: boolean
    lunch_break_required: boolean
    lunch_break_duration: number
    notification_preferences: string[]
  }
  
  notes_ar?: string
  notes_en?: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  updated_by?: string
}

// =============================================================================
// PROVIDER AVAILABILITY INTERFACES
// =============================================================================

export interface ProviderAvailability {
  id: string
  provider_id: string
  
  // Time Slot Details
  date: string
  day_of_week: number
  start_time: string
  end_time: string
  duration_minutes: number
  
  // Availability Status
  status: AvailabilityStatus
  available_capacity: number // How many students can be seen in this slot
  booked_capacity: number
  remaining_capacity: number
  
  // Recurrence Information
  is_recurring: boolean
  recurrence_pattern: RecurrencePattern
  recurrence_end_date?: string
  parent_recurrence_id?: string
  
  // Location and Service Type
  available_locations: ServiceLocation[]
  available_services: ServiceCategory[]
  
  // Override Information (for exceptions to recurring patterns)
  is_override: boolean
  override_reason_ar?: string
  override_reason_en?: string
  original_availability_id?: string
  
  // Booking Information
  booking_notes_ar?: string
  booking_notes_en?: string
  booking_restrictions?: {
    min_age?: number
    max_age?: number
    required_service_type?: ServiceCategory[]
    excluded_students?: string[]
  }
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  last_booked_at?: string
}

// =============================================================================
// PROVIDER ASSIGNMENT INTERFACES
// =============================================================================

export interface ProviderAssignment {
  id: string
  service_id: string
  provider_id: string
  student_id: string
  
  // Assignment Details
  assignment_type: 'primary' | 'secondary' | 'substitute' | 'consultant'
  assignment_status: AssignmentStatus
  priority_level: number // 1-10, higher is more important
  
  // Service Specifications
  service_category: ServiceCategory
  service_frequency: number // sessions per week
  session_duration: number // minutes
  preferred_times: {
    day_of_week: number[]
    time_slots: Array<{ start: string; end: string }>
  }
  preferred_locations: ServiceLocation[]
  
  // Assignment Period
  assignment_start_date: string
  assignment_end_date?: string
  estimated_duration_weeks?: number
  
  // Goals and Requirements
  service_goals: string[]
  special_requirements_ar?: string
  special_requirements_en?: string
  equipment_needed: string[]
  
  // Coordination Information
  primary_provider_id?: string // If this is a secondary assignment
  collaboration_level: 'independent' | 'coordinated' | 'joint_sessions'
  communication_frequency: 'weekly' | 'biweekly' | 'monthly' | 'as_needed'
  
  // Progress and Status
  sessions_completed: number
  sessions_planned: number
  completion_percentage: number
  last_session_date?: string
  next_session_date?: string
  
  // Notes and Documentation
  assignment_notes_ar?: string
  assignment_notes_en?: string
  transition_plan?: string
  
  // Metadata
  assigned_date: string
  assigned_by: string
  approved_date?: string
  approved_by?: string
  created_at: string
  updated_at: string
}

// =============================================================================
// SCHEDULING INTERFACES
// =============================================================================

export interface SchedulingRequest {
  id: string
  service_id: string
  student_id: string
  
  // Request Details
  requested_service_category: ServiceCategory
  requested_duration: number
  requested_frequency: number // sessions per week
  
  // Preferred Scheduling
  preferred_provider_ids: string[]
  preferred_locations: ServiceLocation[]
  preferred_times: Array<{
    day_of_week: number
    start_time: string
    end_time: string
  }>
  
  // Constraints and Requirements
  avoid_times: Array<{
    day_of_week: number
    start_time: string
    end_time: string
  }>
  special_requirements: string[]
  equipment_requirements: string[]
  accessibility_needs: string[]
  
  // Request Status
  request_status: 'pending' | 'processing' | 'scheduled' | 'partially_scheduled' | 'failed' | 'cancelled'
  priority_score: number // Calculated based on urgency, compliance, etc.
  
  // Scheduling Results
  scheduled_sessions: string[] // Array of session IDs
  failed_requirements: string[] // What couldn't be accommodated
  alternative_suggestions: Array<{
    provider_id: string
    time_slot: { day: number; start: string; end: string }
    location: ServiceLocation
    match_score: number
  }>
  
  // Timing
  requested_date: string
  requested_by: string
  target_start_date: string
  processed_date?: string
  processed_by?: string
  
  // Metadata
  created_at: string
  updated_at: string
}

// =============================================================================
// SCHEDULING ALGORITHM INTERFACES
// =============================================================================

export interface SchedulingConstraints {
  // Time Constraints
  earliest_time?: string
  latest_time?: string
  excluded_days?: number[]
  excluded_dates?: string[]
  
  // Provider Constraints
  required_qualifications?: string[]
  preferred_providers?: string[]
  excluded_providers?: string[]
  max_travel_distance?: number
  
  // Service Constraints
  required_equipment?: string[]
  required_room_type?: string
  accessibility_requirements?: string[]
  
  // Scheduling Constraints
  min_session_gap?: number // Minutes between sessions
  max_sessions_per_day?: number
  avoid_lunch_hours?: boolean
  prefer_consecutive_days?: boolean
}

export interface SchedulingOptions {
  // Algorithm Parameters
  optimization_goal: 'minimize_travel' | 'maximize_utilization' | 'balance_workload' | 'minimize_gaps'
  allow_partial_scheduling: boolean
  max_alternatives: number
  scoring_weights: {
    time_preference: number
    provider_preference: number
    location_convenience: number
    schedule_efficiency: number
  }
  
  // Flexibility Settings
  time_flexibility_minutes: number
  allow_different_providers: boolean
  allow_alternative_locations: boolean
  consider_substitute_providers: boolean
}

export interface SchedulingResult {
  success: boolean
  confidence_score: number // 0-100
  
  // Scheduled Sessions
  scheduled_sessions: Array<{
    provider_id: string
    date: string
    start_time: string
    end_time: string
    location: ServiceLocation
    match_score: number
  }>
  
  // Issues and Alternatives
  scheduling_conflicts: Array<{
    type: 'provider_unavailable' | 'location_occupied' | 'time_conflict'
    description: string
    suggested_alternatives: string[]
  }>
  
  // Optimization Metrics
  total_travel_time: number
  provider_utilization: Record<string, number>
  schedule_efficiency: number
  student_satisfaction_score: number
}

// =============================================================================
// WORKLOAD MANAGEMENT INTERFACES
// =============================================================================

export interface ProviderWorkload {
  provider_id: string
  calculation_period: {
    start_date: string
    end_date: string
    period_type: 'daily' | 'weekly' | 'monthly'
  }
  
  // Capacity Metrics
  total_available_hours: number
  scheduled_hours: number
  utilized_hours: number
  utilization_percentage: number
  
  // Session Metrics
  total_sessions: number
  completed_sessions: number
  cancelled_sessions: number
  no_show_sessions: number
  
  // Workload Distribution
  sessions_by_day: Record<string, number>
  hours_by_service_type: Record<ServiceCategory, number>
  students_served: number
  locations_covered: ServiceLocation[]
  
  // Efficiency Metrics
  average_session_duration: number
  travel_time_percentage: number
  break_time_percentage: number
  administrative_time_percentage: number
  
  // Quality Indicators
  session_completion_rate: number
  student_satisfaction_average: number
  parent_satisfaction_average: number
  peer_collaboration_score: number
  
  // Recommendations
  workload_status: WorkloadStatus
  recommendations: Array<{
    type: 'increase_capacity' | 'reduce_load' | 'reschedule' | 'training_needed'
    priority: 'high' | 'medium' | 'low'
    description_ar: string
    description_en: string
  }>
  
  // Metadata
  calculated_at: string
  calculated_by: string
}

// =============================================================================
// MATCHING AND OPTIMIZATION INTERFACES
// =============================================================================

export interface ProviderStudentMatch {
  provider_id: string
  student_id: string
  match_score: number // 0-100
  
  // Matching Criteria Scores
  qualification_match: number
  experience_match: number
  specialization_match: number
  language_match: number
  availability_match: number
  location_compatibility: number
  personality_fit: number // Based on historical data
  
  // Potential Issues
  identified_concerns: Array<{
    type: 'scheduling_conflict' | 'qualification_gap' | 'location_issue' | 'workload_concern'
    severity: 'low' | 'medium' | 'high'
    description: string
  }>
  
  // Recommendations
  recommended_trial_period: number // weeks
  suggested_session_frequency: number
  preferred_locations: ServiceLocation[]
  collaboration_requirements: string[]
  
  // Historical Context
  previous_assignments: number
  success_rate_with_similar_cases: number
  average_goal_achievement_time: number
  
  // Calculated Metadata
  calculated_at: string
  calculation_version: string
  expires_at: string
}

// =============================================================================
// FORM AND UI INTERFACES
// =============================================================================

export interface ProviderAssignmentFormData {
  service_id: string
  provider_id: string
  assignment_type: 'primary' | 'secondary' | 'substitute' | 'consultant'
  service_frequency: number
  session_duration: number
  preferred_times: Array<{
    day_of_week: number
    start_time: string
    end_time: string
  }>
  preferred_locations: ServiceLocation[]
  assignment_start_date: Date
  assignment_end_date?: Date
  service_goals: string[]
  special_requirements_ar?: string
  special_requirements_en?: string
  equipment_needed: string[]
  collaboration_level: 'independent' | 'coordinated' | 'joint_sessions'
}

export interface AvailabilityFormData {
  provider_id: string
  date: Date
  start_time: string
  end_time: string
  status: AvailabilityStatus
  available_capacity: number
  is_recurring: boolean
  recurrence_pattern?: RecurrencePattern
  recurrence_end_date?: Date
  available_locations: ServiceLocation[]
  available_services: ServiceCategory[]
  booking_notes_ar?: string
  booking_notes_en?: string
}

export interface SchedulingRequestFormData {
  service_id: string
  student_id: string
  requested_service_category: ServiceCategory
  requested_duration: number
  requested_frequency: number
  preferred_provider_ids: string[]
  preferred_locations: ServiceLocation[]
  preferred_times: Array<{
    day_of_week: number
    start_time: string
    end_time: string
  }>
  target_start_date: Date
  special_requirements: string[]
  equipment_requirements: string[]
  accessibility_needs: string[]
}

// =============================================================================
// FILTER AND QUERY INTERFACES
// =============================================================================

export interface ProviderFilters {
  provider_roles?: ProviderRole[]
  service_categories?: ServiceCategory[]
  qualification_levels?: QualificationLevel[]
  languages_spoken?: string[]
  availability_status?: AvailabilityStatus[]
  assignment_status?: AssignmentStatus[]
  workload_status?: WorkloadStatus[]
  service_locations?: ServiceLocation[]
  min_rating?: number
  max_workload_percentage?: number
  available_date_range?: {
    start: Date
    end: Date
  }
}

export interface AvailabilityFilters {
  provider_ids?: string[]
  date_range?: {
    start: Date
    end: Date
  }
  time_range?: {
    start_time: string
    end_time: string
  }
  days_of_week?: number[]
  availability_status?: AvailabilityStatus[]
  service_categories?: ServiceCategory[]
  service_locations?: ServiceLocation[]
  min_capacity?: number
}

export interface AssignmentFilters {
  provider_ids?: string[]
  student_ids?: string[]
  service_ids?: string[]
  assignment_types?: Array<'primary' | 'secondary' | 'substitute' | 'consultant'>
  assignment_status?: AssignmentStatus[]
  service_categories?: ServiceCategory[]
  date_range?: {
    start: Date
    end: Date
  }
  priority_levels?: number[]
}

// =============================================================================
// REPORTING AND ANALYTICS INTERFACES
// =============================================================================

export interface ProviderUtilizationReport {
  report_period: {
    start_date: string
    end_date: string
  }
  
  overall_metrics: {
    total_providers: number
    active_providers: number
    average_utilization: number
    total_hours_delivered: number
    total_sessions_completed: number
  }
  
  provider_details: Array<{
    provider_id: string
    provider_name: string
    utilization_percentage: number
    hours_worked: number
    sessions_completed: number
    students_served: number
    efficiency_score: number
    quality_rating: number
  }>
  
  trends: {
    utilization_trend: Array<{
      period: string
      average_utilization: number
    }>
    capacity_changes: Array<{
      date: string
      change_type: 'added' | 'removed' | 'modified'
      provider_id: string
      impact_description: string
    }>
  }
  
  recommendations: Array<{
    type: 'hiring' | 'capacity_adjustment' | 'redistribution' | 'training'
    priority: 'high' | 'medium' | 'low'
    description: string
    expected_impact: string
  }>
}

export interface SchedulingEfficiencyMetrics {
  period: string
  
  // Success Metrics
  total_scheduling_requests: number
  successful_schedules: number
  partial_schedules: number
  failed_schedules: number
  success_rate: number
  
  // Time Metrics
  average_scheduling_time: number // minutes from request to schedule
  average_first_session_delay: number // days
  
  // Quality Metrics
  schedule_adherence_rate: number
  provider_satisfaction_score: number
  student_satisfaction_score: number
  parent_satisfaction_score: number
  
  // Efficiency Metrics
  provider_utilization_improvement: number
  travel_time_optimization: number
  schedule_density_score: number
  
  // Issue Analysis
  common_scheduling_issues: Array<{
    issue_type: string
    frequency: number
    impact_level: 'high' | 'medium' | 'low'
    suggested_solutions: string[]
  }>
}

// =============================================================================
// EXPORT CONFIGURATION
// =============================================================================

export interface ProviderReportConfig {
  report_type: 'utilization' | 'availability' | 'assignments' | 'performance' | 'comprehensive'
  date_range: {
    start: Date
    end: Date
  }
  provider_ids?: string[]
  include_metrics: string[]
  format: 'pdf' | 'excel' | 'csv'
  language: 'ar' | 'en' | 'both'
  grouping: 'by_provider' | 'by_service' | 'by_location' | 'by_time_period'
}