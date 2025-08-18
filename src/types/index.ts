// Re-export all types for easier imports
export * from './plans'
export * from './categories'
export * from './auth'

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
  THERAPY_PLANS: 'therapy_plans',
  PLAN_CATEGORIES: 'plan_categories',
  PLAN_SESSIONS: 'plan_sessions',
  PLAN_TEMPLATES: 'plan_templates',
  USERS: 'profiles',
} as const