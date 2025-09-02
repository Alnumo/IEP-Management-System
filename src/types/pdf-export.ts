/**
 * PDF Export System Types
 * Comprehensive TypeScript interfaces for IEP PDF generation with Arabic typography support
 */

// Core PDF export types
export type PDFFormat = 'standard' | 'compact' | 'detailed' | 'summary' | 'legal' | 'parent_friendly';
export type PDFPageSize = 'A4' | 'Letter' | 'Legal' | 'A3';
export type PDFOrientation = 'portrait' | 'landscape';
export type DocumentLanguage = 'ar' | 'en' | 'bilingual';
export type SecurityLevel = 'none' | 'basic' | 'standard' | 'high' | 'maximum';

// PDF template configuration
export interface PDFTemplate {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  format: PDFFormat;
  page_size: PDFPageSize;
  orientation: PDFOrientation;
  language: DocumentLanguage;
  
  // Template structure
  sections: PDFSection[];
  header_config: PDFHeaderConfig;
  footer_config: PDFFooterConfig;
  styling: PDFStylingConfig;
  
  // Template settings
  is_active: boolean;
  is_default: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// PDF section configuration
export interface PDFSection {
  id: string;
  type: PDFSectionType;
  title_ar: string;
  title_en: string;
  order_index: number;
  is_required: boolean;
  is_visible: boolean;
  
  // Content configuration
  content_fields: PDFContentField[];
  layout: PDFSectionLayout;
  styling: PDFSectionStyling;
  
  // Conditional display
  visibility_conditions?: PDFVisibilityCondition[];
}

export type PDFSectionType = 
  | 'student_info'
  | 'iep_details'
  | 'goals_objectives'
  | 'services'
  | 'team_members'
  | 'meeting_notes'
  | 'assessments'
  | 'accommodations'
  | 'transitions'
  | 'signatures'
  | 'appendices'
  | 'custom';

// PDF content field configuration
export interface PDFContentField {
  id: string;
  field_key: string;
  label_ar: string;
  label_en: string;
  field_type: PDFFieldType;
  data_source: string;
  
  // Formatting
  format_config: PDFFieldFormatConfig;
  validation_rules?: PDFFieldValidation[];
  
  // Layout
  position: PDFFieldPosition;
  width_percentage: number;
  is_required: boolean;
}

export type PDFFieldType = 
  | 'text'
  | 'multiline_text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'list'
  | 'table'
  | 'signature'
  | 'image'
  | 'chart'
  | 'barcode'
  | 'qr_code';

// PDF field formatting
export interface PDFFieldFormatConfig {
  font_family: string;
  font_size: number;
  font_weight: 'normal' | 'bold' | 'light';
  text_align: 'left' | 'right' | 'center' | 'justify';
  text_color: string;
  background_color?: string;
  border_config?: PDFBorderConfig;
  padding: PDFPadding;
  margin: PDFMargin;
}

// PDF styling configuration
export interface PDFStylingConfig {
  // Typography
  primary_font_ar: string;
  primary_font_en: string;
  secondary_font_ar: string;
  secondary_font_en: string;
  
  // Colors
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
  
  // Layout
  margins: PDFMargin;
  spacing: PDFSpacing;
  line_height: number;
  
  // Branding
  logo_config?: PDFLogoConfig;
  watermark_config?: PDFWatermarkConfig;
  
  // Arabic-specific settings
  arabic_font_settings: PDFArabicFontSettings;
  rtl_layout_adjustments: PDFRTLLayoutConfig;
}

// Arabic typography settings
export interface PDFArabicFontSettings {
  font_family: string;
  font_size_adjustment: number;
  line_height_adjustment: number;
  character_spacing: number;
  word_spacing: number;
  text_shaping: boolean;
  ligatures: boolean;
  kashida_justification: boolean;
}

// RTL layout configuration
export interface PDFRTLLayoutConfig {
  text_direction: 'rtl' | 'ltr' | 'auto';
  number_direction: 'rtl' | 'ltr';
  table_direction: 'rtl' | 'ltr';
  margin_adjustments: {
    swap_left_right: boolean;
    header_alignment: 'left' | 'right' | 'center';
    footer_alignment: 'left' | 'right' | 'center';
  };
}

// PDF header and footer
export interface PDFHeaderConfig {
  enabled: boolean;
  height: number;
  content_ar: string;
  content_en: string;
  styling: PDFFieldFormatConfig;
  show_logo: boolean;
  show_page_numbers: boolean;
  show_date: boolean;
}

export interface PDFFooterConfig {
  enabled: boolean;
  height: number;
  content_ar: string;
  content_en: string;
  styling: PDFFieldFormatConfig;
  show_page_numbers: boolean;
  show_generated_timestamp: boolean;
  show_document_id: boolean;
}

// PDF generation request
export interface PDFGenerationRequest {
  iep_id: string;
  template_id: string;
  language: DocumentLanguage;
  format: PDFFormat;
  
  // Custom options
  include_sections: string[];
  exclude_sections?: string[];
  custom_fields?: Record<string, any>;
  
  // Output options
  file_name?: string;
  password_protection?: string;
  digital_signature?: boolean;
  watermark?: string;
  
  // Batch options
  is_batch_generation?: boolean;
  batch_settings?: PDFBatchSettings;
  
  // Metadata
  generated_by: string;
  generation_purpose: string;
  recipient_info?: PDFRecipientInfo;
}

// Batch PDF generation
export interface PDFBatchSettings {
  iep_ids: string[];
  combine_into_single_pdf: boolean;
  individual_passwords: boolean;
  zip_output: boolean;
  naming_convention: PDFNamingConvention;
  
  // Progress tracking
  progress_callback?: (progress: PDFBatchProgress) => void;
}

export interface PDFBatchProgress {
  total_documents: number;
  completed_documents: number;
  current_document: string;
  progress_percentage: number;
  estimated_time_remaining: number;
  errors: PDFGenerationError[];
}

// PDF generation response
export interface PDFGenerationResult {
  success: boolean;
  document_id: string;
  file_path?: string;
  file_url?: string;
  file_size: number;
  
  // Generation details
  template_used: string;
  language_used: DocumentLanguage;
  pages_generated: number;
  generation_time: number;
  
  // Security
  is_password_protected: boolean;
  has_digital_signature: boolean;
  has_watermark: boolean;
  
  // Metadata
  generated_at: string;
  generated_by: string;
  expires_at?: string;
  
  // Error handling
  errors?: PDFGenerationError[];
  warnings?: PDFGenerationWarning[];
}

export interface PDFGenerationError {
  code: string;
  message_ar: string;
  message_en: string;
  section?: string;
  field?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggested_fix?: string;
}

export interface PDFGenerationWarning {
  code: string;
  message_ar: string;
  message_en: string;
  section?: string;
  field?: string;
  impact: string;
}

// PDF security configuration
export interface PDFSecurityConfig {
  level: SecurityLevel;
  password_protection: {
    user_password?: string;
    owner_password?: string;
    password_strength: 'weak' | 'medium' | 'strong';
  };
  
  // Permissions
  permissions: {
    allow_printing: boolean;
    allow_copying: boolean;
    allow_modification: boolean;
    allow_annotation: boolean;
    allow_form_filling: boolean;
    allow_screen_readers: boolean;
  };
  
  // Digital signatures
  digital_signature?: {
    enabled: boolean;
    certificate_path: string;
    signature_reason: string;
    signature_location: string;
    signature_contact: string;
  };
  
  // Watermarking
  watermark?: PDFWatermarkConfig;
  
  // Audit trail
  audit_settings: {
    log_access: boolean;
    log_modifications: boolean;
    retention_period: number;
  };
}

export interface PDFWatermarkConfig {
  enabled: boolean;
  type: 'text' | 'image';
  content: string;
  opacity: number;
  position: 'center' | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  rotation: number;
  font_size: number;
  color: string;
}

export interface PDFLogoConfig {
  enabled: boolean;
  image_path: string;
  position: 'header_left' | 'header_center' | 'header_right' | 'footer_left' | 'footer_center' | 'footer_right';
  width: number;
  height: number;
  opacity: number;
}

// PDF validation and quality
export interface PDFValidationConfig {
  validate_content: boolean;
  validate_formatting: boolean;
  validate_accessibility: boolean;
  validate_arabic_typography: boolean;
  
  // Quality checks
  check_font_embedding: boolean;
  check_image_resolution: boolean;
  check_page_breaks: boolean;
  check_table_formatting: boolean;
  
  // Compliance checks
  check_idea_compliance: boolean;
  check_pdfa_compliance: boolean;
  check_accessibility_standards: boolean;
}

export interface PDFQualityReport {
  overall_score: number;
  content_quality: number;
  formatting_quality: number;
  accessibility_score: number;
  arabic_typography_score: number;
  
  issues: PDFQualityIssue[];
  recommendations: PDFQualityRecommendation[];
}

export interface PDFQualityIssue {
  category: 'content' | 'formatting' | 'accessibility' | 'typography';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description_ar: string;
  description_en: string;
  location: string;
  suggested_fix: string;
}

export interface PDFQualityRecommendation {
  type: 'improvement' | 'optimization' | 'compliance';
  description_ar: string;
  description_en: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'easy' | 'moderate' | 'complex';
}

// Utility types and interfaces
export interface PDFBorderConfig {
  enabled: boolean;
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface PDFPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PDFMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PDFSpacing {
  paragraph: number;
  section: number;
  subsection: number;
  line: number;
}

export interface PDFFieldPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PDFSectionLayout {
  columns: number;
  column_gap: number;
  break_before: boolean;
  break_after: boolean;
  keep_together: boolean;
}

export interface PDFSectionStyling {
  background_color?: string;
  border_config?: PDFBorderConfig;
  padding: PDFPadding;
  margin: PDFMargin;
}

export interface PDFVisibilityCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any;
  logic: 'and' | 'or';
}

export interface PDFFieldValidation {
  type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'custom';
  value: any;
  message_ar: string;
  message_en: string;
}

export interface PDFNamingConvention {
  pattern: string;
  include_student_name: boolean;
  include_iep_date: boolean;
  include_timestamp: boolean;
  include_template_name: boolean;
  date_format: string;
  case_style: 'lowercase' | 'uppercase' | 'camelcase' | 'kebabcase';
}

export interface PDFRecipientInfo {
  name_ar: string;
  name_en: string;
  role: string;
  email?: string;
  phone?: string;
  organization_ar?: string;
  organization_en?: string;
}

// PDF analytics and tracking
export interface PDFAnalytics {
  document_id: string;
  generation_stats: PDFGenerationStats;
  usage_stats: PDFUsageStats;
  performance_stats: PDFPerformanceStats;
  quality_metrics: PDFQualityMetrics;
}

export interface PDFGenerationStats {
  total_generations: number;
  successful_generations: number;
  failed_generations: number;
  average_generation_time: number;
  most_used_template: string;
  most_used_language: DocumentLanguage;
  file_size_distribution: Record<string, number>;
}

export interface PDFUsageStats {
  download_count: number;
  view_count: number;
  print_count: number;
  share_count: number;
  last_accessed: string;
  access_locations: string[];
  user_feedback_score: number;
}

export interface PDFPerformanceStats {
  average_load_time: number;
  cache_hit_rate: number;
  error_rate: number;
  optimization_score: number;
  bandwidth_usage: number;
  storage_efficiency: number;
}

export interface PDFQualityMetrics {
  accessibility_score: number;
  readability_score: number;
  arabic_typography_score: number;
  formatting_consistency: number;
  content_completeness: number;
  user_satisfaction: number;
}

// Export configurations for different IEP types
export interface IEPPDFExportConfig {
  iep_type: 'initial' | 'annual' | 'triennial' | 'amendment' | 'transition';
  required_sections: PDFSectionType[];
  optional_sections: PDFSectionType[];
  signature_requirements: PDFSignatureRequirement[];
  compliance_checks: string[];
  template_recommendations: string[];
}

export interface PDFSignatureRequirement {
  role: string;
  is_required: boolean;
  signature_type: 'handwritten' | 'digital' | 'both';
  position: PDFFieldPosition;
  date_required: boolean;
}

// Template library types
export interface PDFTemplateLibrary {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  category: PDFTemplateCategory;
  templates: PDFTemplate[];
  is_public: boolean;
  created_by: string;
  usage_count: number;
  rating: number;
}

export type PDFTemplateCategory = 
  | 'standard_templates'
  | 'district_templates'
  | 'custom_templates'
  | 'international_templates'
  | 'specialty_templates';

// Export utility types
export type CreatePDFTemplateRequest = Omit<PDFTemplate, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePDFTemplateRequest = Partial<Omit<PDFTemplate, 'id' | 'created_by'>>;
export type PDFGenerationOptions = Partial<PDFGenerationRequest>;

export type PDFExportFilters = {
  template_id?: string;
  language?: DocumentLanguage;
  format?: PDFFormat;
  date_from?: string;
  date_to?: string;
  generated_by?: string;
  file_size_min?: number;
  file_size_max?: number;
};