// Therapist Assignment Management Types
// For Story 1.2: Advanced Therapist Assignment & Substitute Workflow

import type { TherapySpecialization } from './therapist'

// Base assignment interfaces
export interface TherapistSpecializationAssignment {
  id: string
  student_id: string
  primary_therapist_id: string
  specialization_ar: string
  specialization_en?: string
  specialization_key?: TherapySpecialization
  assigned_date: string
  status: 'active' | 'inactive' | 'transferred'
  assignment_reason?: string
  
  // Substitute information
  current_substitute_id?: string
  substitute_start_date?: string
  substitute_end_date?: string
  substitute_reason?: string
  
  // Notification tracking
  parent_notified: boolean
  parent_notification_date?: string
  therapist_notified: boolean
  therapist_notification_date?: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  
  // Joined data (from views)
  student?: {
    id: string
    first_name_ar: string
    first_name_en?: string
    last_name_ar: string
    last_name_en?: string
  }
  primary_therapist?: {
    id: string
    first_name_ar: string
    last_name_ar: string
    first_name_en?: string
    last_name_en?: string
    specialization_ar?: string
    specialization_en?: string
  }
  substitute_therapist?: {
    id: string
    first_name_ar: string
    last_name_ar: string
    first_name_en?: string
    last_name_en?: string
    specialization_ar?: string
    specialization_en?: string
  }
}

export interface CreateTherapistSpecializationAssignmentData {
  student_id: string
  primary_therapist_id: string
  specialization_ar: string
  specialization_en?: string
  specialization_key?: TherapySpecialization
  assignment_reason?: string
}

export interface UpdateTherapistSpecializationAssignmentData extends Partial<CreateTherapistSpecializationAssignmentData> {
  status?: 'active' | 'inactive' | 'transferred'
  current_substitute_id?: string
  substitute_start_date?: string
  substitute_end_date?: string
  substitute_reason?: string
  parent_notified?: boolean
  therapist_notified?: boolean
}

// Assignment History for audit trail
export interface AssignmentHistory {
  id: string
  student_id: string
  specialization_assignment_id: string
  change_type: 'assignment_created' | 'therapist_changed' | 'substitute_assigned' | 'substitute_removed' | 'assignment_deactivated'
  previous_therapist_id?: string
  new_therapist_id?: string
  change_reason?: string
  specialization_ar: string
  specialization_en?: string
  
  // Notification information
  parent_notified: boolean
  notification_method?: 'email' | 'sms' | 'portal' | 'phone'
  notification_language: 'ar' | 'en'
  
  // Metadata
  created_at: string
  created_by?: string
  change_notes?: string
}

// Substitute Pool Management
export interface SubstitutePool {
  id: string
  specialization_ar: string
  specialization_en?: string
  specialization_key?: TherapySpecialization
  therapist_id: string
  
  // Availability information
  is_available: boolean
  max_concurrent_substitutions: number
  current_substitutions_count: number
  
  // Priority and preferences
  priority_level: number // 1-5, 1 is highest priority
  emergency_contact_only: boolean
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  
  // Joined data
  therapist?: {
    id: string
    first_name_ar: string
    last_name_ar: string
    first_name_en?: string
    last_name_en?: string
    specialization_ar?: string
    specialization_en?: string
    status: string
  }
}

export interface CreateSubstitutePoolData {
  specialization_ar: string
  specialization_en?: string
  specialization_key?: TherapySpecialization
  therapist_id: string
  max_concurrent_substitutions?: number
  priority_level?: number
  emergency_contact_only?: boolean
}

export interface UpdateSubstitutePoolData extends Partial<CreateSubstitutePoolData> {
  is_available?: boolean
  current_substitutions_count?: number
}

// Extended CourseAssignment to include specialization data
export interface CourseAssignmentWithSpecialization {
  id: string
  therapist_id: string
  course_id: string
  assignment_date: string
  assignment_type: 'primary' | 'assistant' | 'substitute'
  status: 'active' | 'completed' | 'cancelled'
  hourly_rate?: number
  total_hours?: number
  total_payment?: number
  notes?: string
  
  // Specialization extensions
  is_primary_for_specialization: boolean
  substitute_for_therapist_id?: string
  assignment_notification_sent: boolean
  specialization_override?: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  
  // Joined data
  therapist?: {
    id: string
    first_name_ar: string
    last_name_ar: string
    first_name_en?: string
    last_name_en?: string
    specialization_ar?: string
    specialization_en?: string
  }
  course?: {
    id: string
    course_code: string
    name_ar: string
    name_en?: string
    start_date: string
    end_date: string
    status: string
  }
}

// View interfaces for easy data access
export interface StudentTherapistAssignmentView {
  id: string
  student_id: string
  student_name_ar: string
  student_name_en?: string
  specialization_ar: string
  specialization_en?: string
  specialization_key?: TherapySpecialization
  primary_therapist_id: string
  primary_therapist_name_ar: string
  primary_therapist_name_en: string
  therapist_specialization_ar?: string
  therapist_specialization_en?: string
  substitute_therapist_id?: string
  substitute_therapist_name_ar?: string
  substitute_therapist_name_en?: string
  assigned_date: string
  status: string
  substitute_start_date?: string
  substitute_end_date?: string
  substitute_reason?: string
  parent_notified: boolean
  therapist_notified: boolean
}

export interface AvailableSubstituteView {
  specialization_ar: string
  specialization_en?: string
  specialization_key?: TherapySpecialization
  therapist_id: string
  therapist_name_ar: string
  therapist_name_en: string
  therapist_specialization_ar?: string
  therapist_specialization_en?: string
  priority_level: number
  max_concurrent_substitutions: number
  current_substitutions_count: number
  available_slots: number
  emergency_contact_only: boolean
}

// Assignment management interfaces
export interface AssignmentConflict {
  student_id: string
  student_name_ar: string
  student_name_en?: string
  specialization_ar: string
  existing_therapist_id: string
  existing_therapist_name_ar: string
  proposed_therapist_id: string
  proposed_therapist_name_ar: string
  conflict_reason: string
  can_override: boolean
}

export interface AssignmentValidationResult {
  is_valid: boolean
  conflicts: AssignmentConflict[]
  warnings: string[]
  suggested_actions: string[]
}

export interface BulkAssignmentRequest {
  student_ids: string[]
  primary_therapist_id: string
  specialization_ar: string
  specialization_en?: string
  specialization_key?: TherapySpecialization
  assignment_reason?: string
  override_conflicts: boolean
}

export interface BulkAssignmentResult {
  successful_assignments: string[] // student_ids
  failed_assignments: Array<{
    student_id: string
    student_name_ar: string
    error: string
    conflict?: AssignmentConflict
  }>
  warnings: string[]
}

// Assignment dashboard statistics
export interface AssignmentStatistics {
  total_assignments: number
  active_assignments: number
  students_without_assignments: number
  therapists_overloaded: number
  substitute_assignments_active: number
  conflicts_detected: number
  
  by_specialization: Array<{
    specialization_ar: string
    specialization_en?: string
    assignment_count: number
    therapist_count: number
    substitute_count: number
    average_caseload: number
  }>
  
  recent_changes: Array<{
    change_type: string
    student_name_ar: string
    specialization_ar: string
    therapist_name_ar: string
    created_at: string
  }>
}

// Notification interfaces
export interface AssignmentNotification {
  id: string
  recipient_type: 'parent' | 'therapist' | 'admin'
  recipient_id: string
  notification_type: 'assignment_created' | 'therapist_changed' | 'substitute_assigned' | 'substitute_removed'
  
  // Message content
  title_ar: string
  title_en: string
  message_ar: string
  message_en: string
  
  // Assignment context
  student_id: string
  student_name_ar: string
  specialization_ar: string
  therapist_id: string
  therapist_name_ar: string
  substitute_therapist_id?: string
  substitute_therapist_name_ar?: string
  
  // Delivery information
  delivery_method: 'email' | 'sms' | 'portal' | 'push'
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed'
  language: 'ar' | 'en'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  
  // Metadata
  created_at: string
  sent_at?: string
  delivered_at?: string
}

export interface CreateAssignmentNotificationData {
  recipient_type: 'parent' | 'therapist' | 'admin'
  recipient_id: string
  notification_type: 'assignment_created' | 'therapist_changed' | 'substitute_assigned' | 'substitute_removed'
  student_id: string
  therapist_id: string
  substitute_therapist_id?: string
  delivery_method: 'email' | 'sms' | 'portal' | 'push'
  language: 'ar' | 'en'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

// Filters and search interfaces
export interface AssignmentFilters {
  student_id?: string
  therapist_id?: string
  specialization_ar?: string
  specialization_key?: TherapySpecialization
  status?: 'active' | 'inactive' | 'transferred'
  has_substitute?: boolean
  date_from?: string
  date_to?: string
  search_term?: string
}

export interface SubstituteFilters {
  specialization_ar?: string
  specialization_key?: TherapySpecialization
  is_available?: boolean
  priority_level?: number
  emergency_only?: boolean
  has_availability?: boolean
  search_term?: string
}

export interface AssignmentHistoryFilters {
  student_id?: string
  change_type?: 'assignment_created' | 'therapist_changed' | 'substitute_assigned' | 'substitute_removed' | 'assignment_deactivated'
  therapist_id?: string
  specialization_ar?: string
  date_from?: string
  date_to?: string
  parent_notified?: boolean
}