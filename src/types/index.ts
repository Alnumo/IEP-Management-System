// Re-export all types for easier imports
export * from './plans'
export * from './categories'
export * from './auth'
export * from './student'
export * from './therapist'
export * from './therapist-assignment'
export * from './medical'
export * from './therapy-programs'
export * from './assessment'
export * from './media'
export * from './financial-management'

// Common utility types
export interface ApiResponse<T> {
  data: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface SortParams {
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface SearchParams {
  q?: string
  filters?: Record<string, any>
}

// Form state types
export interface FormState {
  isLoading: boolean
  error?: string
  success?: boolean
}

// UI state types
export interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  language: 'ar' | 'en'
}

// Database table names
export const TABLE_NAMES = {
  // Legacy tables
  THERAPY_PLANS: 'therapy_plans',
  PLAN_CATEGORIES: 'plan_categories',
  PLAN_SESSIONS: 'plan_sessions',
  PLAN_TEMPLATES: 'plan_templates',
  USERS: 'profiles',
  
  // Student Management
  STUDENTS: 'students',
  
  // Medical Foundation
  MEDICAL_RECORDS: 'medical_records',
  MEDICAL_CONSULTANTS: 'medical_consultants',
  CLINICAL_DOCUMENTATION: 'clinical_documentation',
  MEDICAL_SUPERVISION_ASSIGNMENTS: 'medical_supervision_assignments',
  
  // Therapy Programs
  THERAPY_PROGRAMS: 'therapy_programs',
  ABA_DATA_COLLECTION: 'aba_data_collection',
  SPEECH_THERAPY_DATA: 'speech_therapy_data',
  OCCUPATIONAL_THERAPY_DATA: 'occupational_therapy_data',
  ASSESSMENT_TOOLS: 'assessment_tools',
  INTERVENTION_PROTOCOLS: 'intervention_protocols',
  PROGRAM_ENROLLMENTS: 'program_enrollments',
  
  // Assessment & Clinical Documentation
  SOAP_TEMPLATES: 'soap_templates',
  ASSESSMENT_RESULTS: 'assessment_results',
  PROGRESS_TRACKING: 'progress_tracking',
  THERAPEUTIC_GOALS: 'therapeutic_goals',
  DEVELOPMENTAL_MILESTONES: 'developmental_milestones',
  STUDENT_MILESTONE_PROGRESS: 'student_milestone_progress',
  REGRESSION_MONITORING: 'regression_monitoring',
  
  // Therapist Assignment System (Story 1.2)
  THERAPISTS: 'therapists',
  COURSES: 'courses',
  COURSE_ASSIGNMENTS: 'course_assignments',
  THERAPIST_SPECIALIZATION_ASSIGNMENTS: 'therapist_specialization_assignments',
  ASSIGNMENT_HISTORY: 'assignment_history',
  SUBSTITUTE_POOLS: 'substitute_pools',
  
  // Media Documentation System (Story 1.3)
  SESSION_MEDIA: 'session_media',
  MEDIA_GOAL_TAGS: 'media_goal_tags',
  PRACTICE_REVIEWS: 'practice_reviews',
  MEDIA_COLLECTIONS: 'media_collections',
  MEDIA_COLLECTION_ITEMS: 'media_collection_items',
  MEDIA_SHARING_PERMISSIONS: 'media_sharing_permissions',
  MEDIA_ACCESS_LOG: 'media_access_log',
} as const