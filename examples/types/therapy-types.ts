/**
 * Therapy Application Type Definitions
 * 
 * Why: Demonstrates comprehensive TypeScript patterns for therapy applications:
 * - Bilingual content types with Arabic/English support
 * - Therapy-specific domain types and enums
 * - Component prop types with RTL support
 * - API response and request types
 * - Form validation and state management types
 * - Accessibility and responsive design types
 */

// ============================================================================
// LANGUAGE AND LOCALIZATION TYPES
// ============================================================================

export type Language = 'ar' | 'en'

export interface BilingualText {
  ar: string
  en: string
}

export interface LanguageConfig {
  language: Language
  isRTL: boolean
  direction: 'rtl' | 'ltr'
  textAlign: 'right' | 'left'
  fontFamily: string
}

export interface LocalizedContent {
  title: BilingualText
  description?: BilingualText
  content?: BilingualText
  keywords?: BilingualText
}

// ============================================================================
// THERAPY DOMAIN TYPES
// ============================================================================

export type TherapyType = 
  | 'speech' 
  | 'physical' 
  | 'occupational' 
  | 'behavioral' 
  | 'cognitive'

export type SessionStatus = 
  | 'scheduled' 
  | 'in-progress' 
  | 'completed' 
  | 'cancelled' 
  | 'rescheduled'

export type ProgressTrend = 
  | 'improving' 
  | 'stable' 
  | 'declining' 
  | 'unknown'

export type Priority = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'urgent'

export type UserRole = 
  | 'student' 
  | 'parent' 
  | 'therapist' 
  | 'admin' 
  | 'coordinator'

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export interface User {
  id: string
  email: string
  role: UserRole
  profile: UserProfile
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  firstName: string
  firstNameAr: string
  lastName: string
  lastNameAr: string
  avatar?: string
  phone?: string
  dateOfBirth?: string
  gender?: 'male' | 'female'
  language: Language
}

export interface UserPreferences {
  language: Language
  notifications: NotificationPreferences
  accessibility: AccessibilityPreferences
  theme: 'light' | 'dark' | 'auto'
}

export interface NotificationPreferences {
  email: boolean
  sms: boolean
  push: boolean
  sessionReminders: boolean
  progressUpdates: boolean
  weeklyReports: boolean
}

export interface AccessibilityPreferences {
  highContrast: boolean
  reducedMotion: boolean
  largeText: boolean
  screenReader: boolean
}

export interface Student extends User {
  studentId: string
  grade?: string
  school?: string
  parentIds: string[]
  therapistIds: string[]
  iepGoals: IEPGoal[]
  medicalInfo?: MedicalInfo
}

export interface Therapist extends User {
  therapistId: string
  specializations: TherapyType[]
  license: string
  experience: number
  studentIds: string[]
  availability: AvailabilitySlot[]
}

export interface TherapySession {
  id: string
  studentId: string
  therapistId: string
  type: TherapyType
  title: BilingualText
  description: BilingualText
  date: string
  duration: number // minutes
  status: SessionStatus
  progress: number // 0-100
  notes: BilingualText
  goals: string[]
  attachments?: Attachment[]
  location?: string
  isVirtual: boolean
  meetingLink?: string
  createdAt: string
  updatedAt: string
}

export interface IEPGoal {
  id: string
  studentId: string
  title: BilingualText
  description: BilingualText
  category: TherapyType
  targetDate: string
  priority: Priority
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  progress: number
  milestones: Milestone[]
  createdAt: string
  updatedAt: string
}

export interface Milestone {
  id: string
  title: BilingualText
  description: BilingualText
  targetDate: string
  isCompleted: boolean
  completedDate?: string
  notes?: BilingualText
}

export interface ProgressMetric {
  id: string
  sessionId: string
  name: BilingualText
  value: number
  target: number
  unit: BilingualText
  trend: ProgressTrend
  measuredAt: string
}

export interface MedicalInfo {
  conditions: BilingualText[]
  medications: Medication[]
  allergies: BilingualText[]
  emergencyContact: EmergencyContact
  notes?: BilingualText
}

export interface Medication {
  name: string
  dosage: string
  frequency: string
  prescribedBy: string
  startDate: string
  endDate?: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
}

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  uploadedBy: string
  uploadedAt: string
}

export interface AvailabilitySlot {
  dayOfWeek: number // 0-6, Sunday = 0
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  isAvailable: boolean
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
  timestamp: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface SearchFilters {
  query?: string
  type?: TherapyType
  status?: SessionStatus
  dateFrom?: string
  dateTo?: string
  therapistId?: string
  studentId?: string
  priority?: Priority
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
  id?: string
  'data-testid'?: string
}

export interface RTLComponentProps extends BaseComponentProps {
  isRTL?: boolean
  language?: Language
  direction?: 'rtl' | 'ltr'
}

export interface LoadingStateProps {
  isLoading?: boolean
  loadingText?: BilingualText
  skeleton?: boolean
}

export interface ErrorStateProps {
  error?: string | ApiError
  onRetry?: () => void
  fallback?: React.ReactNode
}

export interface ResponsiveProps {
  mobile?: boolean
  tablet?: boolean
  desktop?: boolean
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export interface AccessibilityProps {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  role?: string
  tabIndex?: number
}

// Card Component Props
export interface CardProps extends RTLComponentProps, LoadingStateProps, ErrorStateProps {
  variant?: 'default' | 'outlined' | 'elevated' | 'glass'
  size?: 'sm' | 'md' | 'lg'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  clickable?: boolean
  onClick?: () => void
}

// Button Component Props
export interface ButtonProps extends RTLComponentProps, AccessibilityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

// Text Component Props
export interface TextProps extends RTLComponentProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption' | 'overline'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
  align?: 'left' | 'center' | 'right' | 'justify'
  truncate?: boolean
  maxLines?: number
}

// Form Component Props
export interface FormFieldProps extends RTLComponentProps, AccessibilityProps {
  name: string
  label?: BilingualText
  placeholder?: BilingualText
  helperText?: BilingualText
  error?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
}

export interface InputProps extends FormFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
  maxLength?: number
  minLength?: number
  pattern?: string
}

export interface SelectProps extends FormFieldProps {
  options: SelectOption[]
  value?: string | string[]
  multiple?: boolean
  searchable?: boolean
  clearable?: boolean
  onChange?: (value: string | string[]) => void
}

export interface SelectOption {
  value: string
  label: BilingualText
  disabled?: boolean
  group?: string
}

// Layout Component Props
export interface LayoutProps extends RTLComponentProps, ResponsiveProps {
  header?: React.ReactNode
  sidebar?: React.ReactNode
  footer?: React.ReactNode
  sidebarCollapsed?: boolean
  onSidebarToggle?: () => void
}

export interface GridProps extends RTLComponentProps, ResponsiveProps {
  columns?: number | { sm?: number; md?: number; lg?: number; xl?: number }
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
}

// ============================================================================
// FORM AND VALIDATION TYPES
// ============================================================================

export interface FormState<T = Record<string, any>> {
  values: T
  errors: Record<keyof T, string>
  touched: Record<keyof T, boolean>
  isSubmitting: boolean
  isValid: boolean
}

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
  message?: BilingualText
}

export interface FormSchema {
  [fieldName: string]: ValidationRule
}

// Session Form Types
export interface SessionFormData {
  studentId: string
  therapistId: string
  type: TherapyType
  title: BilingualText
  description: BilingualText
  date: string
  duration: number
  goals: string[]
  isVirtual: boolean
  location?: string
  notes?: BilingualText
}

export interface ProgressFormData {
  sessionId: string
  progress: number
  notes: BilingualText
  metrics: {
    name: BilingualText
    value: number
    target: number
    unit: BilingualText
  }[]
}

// ============================================================================
// STATE MANAGEMENT TYPES
// ============================================================================

export interface AppState {
  user: User | null
  language: Language
  theme: 'light' | 'dark'
  notifications: Notification[]
  isLoading: boolean
  error: string | null
}

export interface SessionState {
  sessions: TherapySession[]
  currentSession: TherapySession | null
  isLoading: boolean
  error: string | null
  filters: SearchFilters
  sort: SortOptions
}

export interface ProgressState {
  metrics: ProgressMetric[]
  isLoading: boolean
  error: string | null
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: BilingualText
  message: BilingualText
  timestamp: string
  read: boolean
  actionUrl?: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys]

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export type Override<T, U> = Omit<T, keyof U> & U

// Arabic Text Utilities
export type ArabicTextVariant = 'body' | 'heading' | 'caption' | 'display'

export interface ArabicTextConfig {
  variant: ArabicTextVariant
  size: 'sm' | 'md' | 'lg' | 'xl'
  weight: 'normal' | 'medium' | 'bold'
  lineHeight: number
  letterSpacing?: number
}

// Responsive Breakpoint Types
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>

export interface MediaQuery {
  up: (breakpoint: Breakpoint) => string
  down: (breakpoint: Breakpoint) => string
  between: (start: Breakpoint, end: Breakpoint) => string
  only: (breakpoint: Breakpoint) => string
}

// Theme Types
export interface ThemeColors {
  primary: string
  secondary: string
  success: string
  warning: string
  error: string
  info: string
  background: string
  surface: string
  text: {
    primary: string
    secondary: string
    disabled: string
  }
}

export interface ThemeSpacing {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
}

export interface ThemeFonts {
  arabic: string
  english: string
  mono: string
}

export interface Theme {
  colors: ThemeColors
  spacing: ThemeSpacing
  fonts: ThemeFonts
  breakpoints: Record<Breakpoint, string>
  borderRadius: Record<string, string>
  shadows: Record<string, string>
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface CustomEvent<T = any> {
  type: string
  payload: T
  timestamp: string
  source?: string
}

export interface SessionEvent extends CustomEvent {
  type: 'session.created' | 'session.updated' | 'session.deleted' | 'session.started' | 'session.completed'
  payload: {
    sessionId: string
    studentId: string
    therapistId: string
    changes?: Partial<TherapySession>
  }
}

export interface ProgressEvent extends CustomEvent {
  type: 'progress.updated' | 'milestone.completed' | 'goal.achieved'
  payload: {
    sessionId: string
    studentId: string
    progress: number
    metrics?: ProgressMetric[]
  }
}

// ============================================================================
// HOOK TYPES
// ============================================================================

export interface UseLanguageReturn {
  language: Language
  isRTL: boolean
  config: LanguageConfig
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  formatText: (text: string) => string
  t: (key: string) => string
}

export interface UseTherapyDataReturn {
  sessions: TherapySession[]
  isLoading: boolean
  error: string | null
  fetchSessions: (filters?: SearchFilters) => Promise<void>
  createSession: (data: SessionFormData) => Promise<void>
  updateSession: (id: string, data: Partial<TherapySession>) => Promise<void>
  deleteSession: (id: string) => Promise<void>
}

export interface UseFormReturn<T> {
  values: T
  errors: Record<keyof T, string>
  touched: Record<keyof T, boolean>
  isSubmitting: boolean
  isValid: boolean
  setValue: (field: keyof T, value: any) => void
  setError: (field: keyof T, error: string) => void
  setTouched: (field: keyof T, touched: boolean) => void
  handleSubmit: (onSubmit: (values: T) => void) => (e: React.FormEvent) => void
  reset: () => void
}
