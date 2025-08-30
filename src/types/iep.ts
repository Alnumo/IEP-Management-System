// IEP Management System Types
// IDEA 2024 Compliant - Individualized Education Program Types
// Arkan Al-Numo Center - TypeScript Interfaces

// =============================================================================
// BASE IEP TYPES AND ENUMS
// =============================================================================

export type IEPType = 'initial' | 'annual' | 'triennial' | 'amendment'

export type IEPStatus = 'draft' | 'review' | 'approved' | 'active' | 'expired' | 'archived'

export type IEPWorkflowStage = 
  | 'drafting' 
  | 'team_review' 
  | 'parent_review' 
  | 'signatures_pending' 
  | 'approved' 
  | 'active' 
  | 'monitoring' 
  | 'expired'

export type GoalDomain = 
  | 'academic_reading'
  | 'academic_writing'
  | 'academic_math'
  | 'academic_science'
  | 'communication_expressive'
  | 'communication_receptive'
  | 'communication_social'
  | 'behavioral_social'
  | 'behavioral_attention'
  | 'behavioral_self_regulation'
  | 'functional_daily_living'
  | 'functional_mobility'
  | 'functional_self_care'
  | 'motor_fine'
  | 'motor_gross'
  | 'vocational'
  | 'transition'

export type MeasurementMethod = 
  | 'frequency'
  | 'percentage'
  | 'duration'
  | 'trials'
  | 'observation'
  | 'checklist'
  | 'rating_scale'
  | 'portfolio'
  | 'other'

export type EvaluationFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly'

export type ProgressStatus = 
  | 'not_started'
  | 'introduced'
  | 'progressing'
  | 'mastered'
  | 'maintained'
  | 'discontinued'

export type GoalStatus = 'active' | 'achieved' | 'modified' | 'discontinued'

export type ServiceCategory = 
  | 'special_education'
  | 'speech_therapy'
  | 'occupational_therapy'
  | 'physical_therapy'
  | 'behavioral_support'
  | 'counseling'
  | 'transportation'
  | 'nursing'
  | 'other_related_service'

export type ServiceLocation = 
  | 'general_education_classroom'
  | 'special_education_classroom'
  | 'therapy_room'
  | 'home'
  | 'community'
  | 'online'
  | 'other'

export type ServiceStatus = 'active' | 'completed' | 'discontinued' | 'modified'

export type TeamMemberRole = 
  | 'parent_guardian'
  | 'special_education_teacher'
  | 'general_education_teacher'
  | 'speech_therapist'
  | 'occupational_therapist'
  | 'physical_therapist'
  | 'school_psychologist'
  | 'behavior_specialist'
  | 'administrator'
  | 'related_service_provider'
  | 'student'
  | 'advocate'
  | 'interpreter'

export type MeetingType = 
  | 'initial_meeting'
  | 'annual_review'
  | 'quarterly_review'
  | 'amendment_meeting'
  | 'transition_meeting'
  | 'disciplinary_meeting'

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'

export type MeetingMode = 'in_person' | 'virtual' | 'hybrid'

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'partial'

export type ApprovalType = 
  | 'parent_consent'
  | 'team_member_signature'
  | 'administrator_approval'
  | 'student_signature'
  | 'external_agency_approval'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'

export type SignatureMethod = 'digital' | 'electronic' | 'wet_signature'

export type AlertType = 
  | 'annual_review_due'
  | 'quarterly_review_due'
  | 'service_hours_missing'
  | 'goal_progress_overdue'
  | 'meeting_not_scheduled'
  | 'approval_missing'
  | 'document_incomplete'
  | 'compliance_violation'

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed'

export type SupportLevel = 
  | 'independent'
  | 'verbal_prompt'
  | 'gestural_prompt'
  | 'physical_prompt'
  | 'full_assistance'

export type DataReliability = 'reliable' | 'questionable' | 'invalid'

export type ParticipationStatus = 'active' | 'inactive' | 'excused'

// =============================================================================
// CORE IEP DOCUMENT INTERFACE
// =============================================================================

export interface IEP {
  id: string
  student_id: string
  
  // IEP Classification and Dates (IDEA Required)
  academic_year: string // e.g., "2024-2025"
  iep_type: IEPType
  effective_date: string
  review_date?: string
  annual_review_date: string
  triennial_evaluation_due?: string
  
  // Present Levels of Academic and Functional Performance (IDEA Required - Bilingual)
  present_levels_academic_ar: string
  present_levels_academic_en?: string
  present_levels_functional_ar: string
  present_levels_functional_en?: string
  
  // Measurable Annual Goals (stored separately in iep_goals)
  annual_goals_count: number
  
  // Special Education Services (IDEA Required)
  special_education_services: IEPService[]
  related_services: IEPService[]
  supplementary_services: IEPService[]
  
  // Program Modifications/Accommodations (IDEA Required - Bilingual)
  accommodations_ar: string[]
  accommodations_en: string[]
  modifications_ar: string[]
  modifications_en: string[]
  
  // Assessment Accommodations (IDEA Required - Bilingual)
  state_assessment_accommodations_ar: string[]
  state_assessment_accommodations_en: string[]
  alternate_assessment_justification_ar?: string
  alternate_assessment_justification_en?: string
  
  // Least Restrictive Environment (LRE) Information (IDEA Required - Bilingual)
  lre_justification_ar: string
  lre_justification_en?: string
  mainstreaming_percentage: number
  special_education_setting: string
  
  // Transition Planning (Required at age 16+ - Bilingual)
  transition_services_needed: boolean
  post_secondary_goals_ar?: string
  post_secondary_goals_en?: string
  transition_services: Record<string, any>
  
  // Behavior Intervention Plan (if needed - Bilingual)
  behavior_plan_needed: boolean
  behavior_goals_ar?: string
  behavior_goals_en?: string
  behavior_interventions: Record<string, any>
  
  // Extended School Year (ESY) Services
  esy_services_needed: boolean
  esy_justification_ar?: string
  esy_justification_en?: string
  esy_services: Record<string, any>
  
  // Workflow and Status Management
  status: IEPStatus
  workflow_stage: IEPWorkflowStage
  
  // Compliance and Quality Assurance
  compliance_check_passed: boolean
  compliance_issues: ComplianceIssue[]
  quality_review_passed: boolean
  quality_review_notes_ar?: string
  quality_review_notes_en?: string
  
  // Meeting Information
  last_iep_meeting_date?: string
  next_iep_meeting_date?: string
  meeting_frequency: 'monthly' | 'quarterly' | 'annually'
  
  // Document Management
  version_number: number
  is_current_version: boolean
  parent_iep_id?: string
  
  // File Attachments
  pdf_file_path?: string
  attachments: IEPAttachment[]
  
  // Relationships (populated via joins)
  goals?: IEPGoal[]
  services?: IEPService[]
  team_members?: IEPTeamMember[]
  meetings?: IEPMeeting[]
  approvals?: IEPApproval[]
  compliance_alerts?: IEPComplianceAlert[]
  student?: {
    id: string
    first_name_ar: string
    last_name_ar: string
    first_name_en?: string
    last_name_en?: string
    registration_number: string
  }
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  updated_by?: string
}

// =============================================================================
// IEP GOAL INTERFACES
// =============================================================================

export interface IEPGoal {
  id: string
  iep_id: string
  
  // Goal Classification
  goal_number: number
  domain: GoalDomain
  
  // Present Level of Performance (Baseline - Bilingual)
  baseline_performance_ar: string
  baseline_performance_en?: string
  baseline_date: string
  
  // Measurable Annual Goal Statement (IDEA Required - Bilingual)
  goal_statement_ar: string
  goal_statement_en?: string
  
  // Measurement Criteria (IDEA Required)
  measurement_method: MeasurementMethod
  measurement_criteria: string
  evaluation_frequency: EvaluationFrequency
  evaluation_method_ar: string
  evaluation_method_en?: string
  
  // Target Criteria for Success
  target_percentage?: number
  target_frequency?: number
  target_duration_minutes?: number
  target_accuracy_percentage?: number
  mastery_criteria_ar: string
  mastery_criteria_en?: string
  
  // Goal Timeline
  target_completion_date: string
  is_continuing_goal: boolean
  
  // Progress Tracking
  current_progress_percentage: number
  progress_status: ProgressStatus
  last_progress_update?: string
  
  // Service Delivery Information
  responsible_provider?: string
  service_frequency?: string
  service_location?: string
  
  // Goal Status
  is_active: boolean
  goal_status: GoalStatus
  
  // Goal Hierarchy
  parent_goal_id?: string
  goal_order: number
  
  // Relationships
  objectives?: IEPGoalObjective[]
  progress_data?: IEPProgressData[]
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  updated_by?: string
}

export interface IEPGoalObjective {
  id: string
  goal_id: string
  
  // Objective Information (Bilingual)
  objective_number: number
  objective_statement_ar: string
  objective_statement_en?: string
  
  // Measurement Criteria
  measurement_criteria: string
  target_percentage?: number
  target_frequency?: number
  evaluation_method_ar: string
  evaluation_method_en?: string
  
  // Progress Tracking
  current_progress_percentage: number
  mastery_date?: string
  is_mastered: boolean
  
  // Timeline
  target_date: string
  
  // Metadata
  created_at: string
  updated_at: string
}

// =============================================================================
// PROGRESS TRACKING INTERFACES
// =============================================================================

export interface IEPProgressData {
  id: string
  goal_id: string
  objective_id?: string
  
  // Data Collection Information
  collection_date: string
  collected_by: string
  
  // Progress Data
  score_achieved?: number
  score_possible?: number
  percentage_achieved?: number
  duration_minutes?: number
  frequency_count?: number
  
  // Trial Data (for discrete trial teaching)
  trials_attempted?: number
  trials_successful?: number
  
  // Qualitative Data (Bilingual)
  observations_ar?: string
  observations_en?: string
  notes_ar?: string
  notes_en?: string
  
  // Context Information
  setting?: string
  activity?: string
  support_level?: SupportLevel
  
  // Data Quality
  data_reliability: DataReliability
  
  // Metadata
  created_at: string
  updated_at: string
}

// =============================================================================
// SERVICE INTERFACES
// =============================================================================

export interface IEPService {
  id: string
  iep_id: string
  
  // Service Information (Bilingual)
  service_name_ar: string
  service_name_en?: string
  service_category: ServiceCategory
  
  // Service Provider
  provider_name?: string
  provider_qualification?: string
  provider_id?: string
  
  // Service Delivery Details
  frequency_per_week: number
  session_duration_minutes: number
  total_minutes_per_week: number
  
  // Service Location and Setting
  service_location: ServiceLocation
  service_setting_ar?: string
  service_setting_en?: string
  
  // Service Timeline
  start_date: string
  end_date?: string
  total_service_hours?: number
  
  // Service Goals and Objectives
  related_goal_ids: string[]
  
  // Progress and Outcomes
  service_status: ServiceStatus
  progress_notes_ar?: string
  progress_notes_en?: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  updated_by?: string
}

// =============================================================================
// TEAM MEMBER INTERFACES
// =============================================================================

export interface IEPTeamMember {
  id: string
  iep_id: string
  
  // Team Member Information
  user_id?: string
  external_member_name?: string
  email?: string
  phone?: string
  
  // Role Information (Bilingual)
  role: TeamMemberRole
  role_description_ar?: string
  role_description_en?: string
  
  // Participation Details
  is_required_member: boolean
  participation_status: ParticipationStatus
  
  // Meeting Participation
  attends_meetings: boolean
  meeting_participation_mode: MeetingMode
  
  // Contact Preferences (Bilingual)
  preferred_language: 'ar' | 'en'
  communication_notes_ar?: string
  communication_notes_en?: string
  
  // User Information (populated via join)
  user?: {
    id: string
    name: string
    email: string
  }
  
  // Metadata
  added_date: string
  added_by: string
  created_at: string
}

// =============================================================================
// MEETING INTERFACES
// =============================================================================

export interface IEPMeeting {
  id: string
  iep_id: string
  
  // Meeting Information (Bilingual)
  meeting_title_ar: string
  meeting_title_en?: string
  meeting_type: MeetingType
  
  // Meeting Scheduling
  scheduled_date: string
  scheduled_time: string
  duration_minutes: number
  meeting_location_ar?: string
  meeting_location_en?: string
  meeting_mode: MeetingMode
  
  // Meeting Status
  status: MeetingStatus
  
  // Meeting Documentation (Bilingual)
  agenda_ar?: string
  agenda_en?: string
  minutes_ar?: string
  minutes_en?: string
  decisions_made_ar?: string
  decisions_made_en?: string
  action_items_ar?: string
  action_items_en?: string
  
  // Meeting Outcomes
  iep_changes_made: boolean
  next_meeting_scheduled: boolean
  next_meeting_date?: string
  
  // Attendance
  total_invited: number
  total_attended: number
  
  // File Attachments
  meeting_recording_path?: string
  presentation_files: IEPAttachment[]
  supporting_documents: IEPAttachment[]
  
  // Relationships
  attendance?: IEPMeetingAttendance[]
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  updated_by?: string
}

export interface IEPMeetingAttendance {
  id: string
  meeting_id: string
  team_member_id: string
  
  // Attendance Information
  attendance_status: AttendanceStatus
  arrival_time?: string
  departure_time?: string
  
  // Participation Notes (Bilingual)
  participation_notes_ar?: string
  participation_notes_en?: string
  
  // Team Member Information (populated via join)
  team_member?: IEPTeamMember
  
  // Metadata
  recorded_at: string
  recorded_by: string
}

// =============================================================================
// APPROVAL INTERFACES
// =============================================================================

export interface IEPApproval {
  id: string
  iep_id: string
  
  // Approver Information
  approver_id?: string
  approver_name: string
  approver_role: string
  approver_email?: string
  
  // Approval Details
  approval_type: ApprovalType
  approval_status: ApprovalStatus
  
  // Digital Signature
  signature_data?: string
  signature_method: SignatureMethod
  ip_address?: string
  user_agent?: string
  
  // Approval Timestamps
  requested_at: string
  responded_at?: string
  expires_at?: string
  
  // Comments and Notes (Bilingual)
  approval_comments_ar?: string
  approval_comments_en?: string
  rejection_reason_ar?: string
  rejection_reason_en?: string
  
  // Metadata
  created_at: string
  updated_at: string
}

// =============================================================================
// COMPLIANCE ALERT INTERFACES
// =============================================================================

export interface IEPComplianceAlert {
  id: string
  iep_id: string
  
  // Alert Information (Bilingual)
  alert_type: AlertType
  alert_title_ar: string
  alert_title_en?: string
  alert_message_ar: string
  alert_message_en?: string
  
  // Alert Severity and Priority
  severity_level: AlertSeverity
  priority: number // 1-5, 1 = highest priority
  
  // Alert Status
  status: AlertStatus
  
  // Timeline Information
  alert_date: string
  due_date?: string
  days_until_due?: number
  
  // Assignment and Resolution
  assigned_to?: string
  acknowledged_by?: string
  acknowledged_at?: string
  resolved_by?: string
  resolved_at?: string
  resolution_notes_ar?: string
  resolution_notes_en?: string
  
  // Notification Status
  notification_sent: boolean
  notification_sent_at?: string
  reminder_count: number
  last_reminder_sent?: string
  
  // Metadata
  created_at: string
  updated_at: string
}

// =============================================================================
// HELPER INTERFACES
// =============================================================================

export interface IEPAttachment {
  id: string
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_at: string
  uploaded_by: string
}

export interface ComplianceIssue {
  issue_type: string
  description_ar: string
  description_en?: string
  severity: AlertSeverity
  resolution_required: boolean
}

// =============================================================================
// CREATE/UPDATE DATA INTERFACES
// =============================================================================

export interface CreateIEPData {
  student_id: string
  academic_year: string
  iep_type: IEPType
  effective_date: string
  annual_review_date: string
  present_levels_academic_ar: string
  present_levels_academic_en?: string
  present_levels_functional_ar: string
  present_levels_functional_en?: string
  lre_justification_ar: string
  lre_justification_en?: string
  mainstreaming_percentage: number
  special_education_setting: string
  accommodations_ar?: string[]
  accommodations_en?: string[]
  modifications_ar?: string[]
  modifications_en?: string[]
  transition_services_needed?: boolean
  behavior_plan_needed?: boolean
  esy_services_needed?: boolean
}

export interface UpdateIEPData extends Partial<CreateIEPData> {
  id: string
  status?: IEPStatus
  workflow_stage?: IEPWorkflowStage
  compliance_check_passed?: boolean
  quality_review_passed?: boolean
}

export interface CreateIEPGoalData {
  iep_id: string
  goal_number: number
  domain: GoalDomain
  baseline_performance_ar: string
  baseline_performance_en?: string
  goal_statement_ar: string
  goal_statement_en?: string
  measurement_method: MeasurementMethod
  measurement_criteria: string
  evaluation_frequency: EvaluationFrequency
  evaluation_method_ar: string
  evaluation_method_en?: string
  mastery_criteria_ar: string
  mastery_criteria_en?: string
  target_completion_date: string
  responsible_provider?: string
  service_frequency?: string
  service_location?: string
}

export interface UpdateIEPGoalData extends Partial<CreateIEPGoalData> {
  id: string
  current_progress_percentage?: number
  progress_status?: ProgressStatus
  goal_status?: GoalStatus
}

export interface CreateIEPServiceData {
  iep_id: string
  service_name_ar: string
  service_name_en?: string
  service_category: ServiceCategory
  frequency_per_week: number
  session_duration_minutes: number
  service_location: ServiceLocation
  start_date: string
  end_date?: string
  provider_id?: string
  provider_name?: string
  related_goal_ids?: string[]
}

export interface UpdateIEPServiceData extends Partial<CreateIEPServiceData> {
  id: string
  service_status?: ServiceStatus
}

// =============================================================================
// FILTER AND QUERY INTERFACES
// =============================================================================

export interface IEPFilters {
  status?: IEPStatus
  iep_type?: IEPType
  academic_year?: string
  student_id?: string
  due_for_review?: boolean
  compliance_issues?: boolean
  workflow_stage?: IEPWorkflowStage
  search?: string
}

export interface IEPGoalFilters {
  iep_id?: string
  domain?: GoalDomain
  progress_status?: ProgressStatus
  goal_status?: GoalStatus
  overdue?: boolean
}

export interface IEPStats {
  total: number
  draft: number
  active: number
  due_for_review: number
  compliance_issues: number
  goals_on_track: number
  goals_behind: number
  services_active: number
}

