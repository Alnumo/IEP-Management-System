/**
 * CRM Lead Management Types
 * @description Type definitions for the CRM lead management system
 * @author James (Dev Agent)
 * @date 2025-09-03
 */

import { Database } from './supabase';

// Lead status enum matching database
export type LeadStatus = 
  | 'new_booking'
  | 'confirmed'
  | 'evaluation_complete'
  | 'registered'
  | 'archived';

// Lead source types
export type LeadSource = 
  | 'website'
  | 'referral'
  | 'walk-in'
  | 'phone'
  | 'social_media'
  | 'other';

// Interaction types
export type InteractionType = 
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'whatsapp'
  | 'sms';

// Interaction outcomes
export type InteractionOutcome = 
  | 'interested'
  | 'not_interested'
  | 'follow_up_needed'
  | 'no_answer'
  | 'scheduled_evaluation';

/**
 * Lead entity matching database schema
 */
export interface Lead {
  id: string;
  // Parent/Guardian Information
  parent_name: string;
  parent_name_ar?: string | null;
  parent_contact: string;
  parent_contact_secondary?: string | null;
  
  // Child Information
  child_name: string;
  child_name_ar?: string | null;
  child_dob: string; // Date as ISO string
  child_gender?: string | null;
  
  // Lead Details
  status: LeadStatus;
  evaluation_date?: string | null; // Timestamp as ISO string
  evaluation_notes?: string | null;
  notes?: string | null;
  
  // Source Tracking
  source?: LeadSource;
  source_details?: Record<string, any> | null;
  
  // Conversion Tracking
  converted_to_student_id?: string | null;
  conversion_date?: string | null;
  
  // Assignment and Follow-up
  assigned_to?: string | null;
  follow_up_date?: string | null;
  follow_up_notes?: string | null;
  
  // Integration Fields
  external_id?: string | null;
  integration_metadata?: Record<string, any> | null;
  
  // Audit Fields
  created_at: string;
  created_by?: string | null;
  updated_at: string;
  updated_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

/**
 * Lead audit trail entry
 */
export interface LeadAuditTrail {
  id: string;
  lead_id: string;
  action: string;
  old_value?: Record<string, any> | null;
  new_value?: Record<string, any> | null;
  performed_by?: string | null;
  performed_at: string;
  notes?: string | null;
}

/**
 * Lead interaction record
 */
export interface LeadInteraction {
  id: string;
  lead_id: string;
  interaction_type: InteractionType;
  interaction_date: string;
  duration_minutes?: number | null;
  subject?: string | null;
  description?: string | null;
  outcome?: InteractionOutcome | null;
  next_action?: string | null;
  created_by?: string | null;
  created_at: string;
}

/**
 * Form data for creating a new lead
 */
export interface CreateLeadInput {
  parent_name: string;
  parent_name_ar?: string;
  parent_contact: string;
  parent_contact_secondary?: string;
  child_name: string;
  child_name_ar?: string;
  child_dob: string;
  child_gender?: string;
  evaluation_date?: string;
  evaluation_notes?: string;
  notes?: string;
  source?: LeadSource;
  source_details?: Record<string, any>;
  external_id?: string;
  integration_metadata?: Record<string, any>;
}

/**
 * Form data for updating a lead
 */
export interface UpdateLeadInput {
  parent_name?: string;
  parent_name_ar?: string;
  parent_contact?: string;
  parent_contact_secondary?: string;
  child_name?: string;
  child_name_ar?: string;
  child_dob?: string;
  child_gender?: string;
  status?: LeadStatus;
  evaluation_date?: string;
  evaluation_notes?: string;
  notes?: string;
  assigned_to?: string;
  follow_up_date?: string;
  follow_up_notes?: string;
}

/**
 * Lead status update request
 */
export interface UpdateLeadStatusInput {
  status: LeadStatus;
  notes?: string;
}

/**
 * Lead assignment request
 */
export interface AssignLeadInput {
  user_id: string;
  notes?: string;
}

/**
 * Lead conversion to student request
 */
export interface ConvertLeadInput {
  lead_id: string;
  student_data?: Record<string, any>;
}

/**
 * Create interaction input
 */
export interface CreateInteractionInput {
  lead_id: string;
  interaction_type: InteractionType;
  interaction_date?: string;
  duration_minutes?: number;
  subject?: string;
  description?: string;
  outcome?: InteractionOutcome;
  next_action?: string;
}

/**
 * Lead filter options for dashboard
 */
export interface LeadFilterOptions {
  status?: LeadStatus[];
  assigned_to?: string;
  source?: LeadSource[];
  date_from?: string;
  date_to?: string;
  search?: string;
}

/**
 * Lead statistics for dashboard
 */
export interface LeadStatistics {
  total_leads: number;
  new_bookings: number;
  confirmed: number;
  evaluation_complete: number;
  registered: number;
  archived: number;
  conversion_rate: number;
  average_conversion_time_days: number;
}

/**
 * Kanban column for lead dashboard
 */
export interface KanbanColumn {
  id: LeadStatus;
  title: string;
  title_ar: string;
  color: string;
  leads: Lead[];
  count: number;
}

/**
 * API response types
 */
export interface LeadResponse {
  success: boolean;
  data?: Lead;
  error?: string;
}

export interface LeadsListResponse {
  success: boolean;
  data?: Lead[];
  total?: number;
  error?: string;
}

export interface LeadStatusUpdateResponse {
  success: boolean;
  lead_id?: string;
  old_status?: LeadStatus;
  new_status?: LeadStatus;
  error?: string;
}

export interface LeadConversionResponse {
  success: boolean;
  lead_id?: string;
  student_id?: string;
  error?: string;
}

export interface LeadAssignmentResponse {
  success: boolean;
  lead_id?: string;
  assigned_to?: string;
  error?: string;
}

/**
 * Export functionality types
 */
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  filters?: LeadFilterOptions;
  columns?: string[];
}

/**
 * Webhook payload from external systems
 */
export interface ExternalBookingWebhook {
  booking_id: string;
  parent_name: string;
  parent_email?: string;
  parent_phone?: string;
  child_name: string;
  child_age?: number;
  evaluation_date: string;
  source: string;
  metadata?: Record<string, any>;
}