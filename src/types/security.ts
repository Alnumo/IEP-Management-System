// Two-Factor Authentication Types
export interface TwoFactorSettings {
  id: string
  user_id: string
  is_enabled: boolean
  secret_key: string
  backup_codes_used: number
  created_at: string
  updated_at: string
}

export interface BackupCode {
  id: string
  user_id: string
  code_hash: string
  is_used: boolean
  used_at: string | null
  created_at: string
}

export interface TotpVerificationAttempt {
  id: string
  user_id: string
  attempt_type: 'totp' | 'backup_code'
  is_successful: boolean
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// 2FA Setup Flow Types
export interface TwoFactorSetupState {
  step: 'idle' | 'generating' | 'verifying' | 'complete'
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

export interface TwoFactorVerificationData {
  totpCode?: string
  backupCode?: string
  rememberDevice?: boolean
}

// Security Event Types
export interface SecurityEvent {
  id: string
  user_id: string
  event_type: SecurityEventType
  event_data: Record<string, any>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type SecurityEventType = 
  | '2fa_enabled'
  | '2fa_disabled' 
  | '2fa_verified'
  | 'backup_code_used'
  | 'failed_2fa_attempt'
  | 'rate_limit_exceeded'
  | 'emergency_2fa_reset'
  | 'backup_codes_regenerated'

// Role-based 2FA Requirements
export interface RoleSecuritySettings {
  role: UserRole
  requires_2fa: boolean
  max_failed_attempts: number
  lockout_duration_minutes: number
  backup_codes_required: boolean
}

export type UserRole = 
  | 'admin'
  | 'manager' 
  | 'medical_consultant'
  | 'therapist_lead'
  | 'receptionist'

// Emergency Access Types
export interface EmergencyAccessRequest {
  id: string
  requesting_user_id: string
  target_user_id?: string
  target_table: string
  reason: string
  is_approved: boolean
  approved_by: string | null
  expires_at: string
  created_at: string
}

// Audit Trail Types
export interface AuditLogEntry {
  id: string
  user_id: string
  action: AuditAction
  table_name: string
  record_id: string | null
  changes: Record<string, any>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type AuditAction =
  | 'create'
  | 'update' 
  | 'delete'
  | 'view'
  | 'export'
  | 'login'
  | 'logout'
  | '2fa_setup'
  | '2fa_verification'
  | 'password_change'
  | 'emergency_access'
  | 'data_export'
  | 'backup_restore'

// Encryption Types
export interface EncryptionStatus {
  table_name: string
  record_id: string
  encrypted_fields: string[]
  encryption_key_id: string
  encrypted_at: string
  last_accessed: string | null
}

export interface DataRetentionPolicy {
  id: string
  table_name: string
  retention_period_days: number
  auto_delete_enabled: boolean
  encryption_required: boolean
  backup_before_deletion: boolean
  created_at: string
  updated_at: string
}

// API Security Types
export interface RateLimit {
  endpoint: string
  method: string
  max_requests: number
  window_minutes: number
  user_specific: boolean
}

export interface ApiSecurityEvent {
  id: string
  endpoint: string
  method: string
  user_id: string | null
  ip_address: string
  user_agent: string
  status_code: number
  response_time_ms: number
  rate_limited: boolean
  created_at: string
}

// Session Security Types
export interface SessionSecuritySettings {
  max_concurrent_sessions: number
  session_timeout_minutes: number
  require_2fa_for_sensitive_operations: boolean
  log_all_session_events: boolean
  force_logout_on_role_change: boolean
}

// Compliance Types
export interface ComplianceStatus {
  domain: ComplianceDomain
  status: 'compliant' | 'non_compliant' | 'partially_compliant' | 'under_review'
  last_audit_date: string | null
  next_audit_due: string
  compliance_score: number
  issues: ComplianceIssue[]
}

export type ComplianceDomain = 
  | 'hipaa'
  | 'pdpl' 
  | 'ferpa'
  | 'gdpr'
  | 'data_encryption'
  | 'access_control'
  | 'audit_logging'

export interface ComplianceIssue {
  id: string
  domain: ComplianceDomain
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  remediation_steps: string[]
  due_date: string
  assigned_to: string | null
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix'
  created_at: string
  updated_at: string
}

// Security Configuration Types
export interface SecurityConfig {
  encryption: {
    algorithm: 'AES-256-GCM'
    key_rotation_days: number
    field_level_encryption_enabled: boolean
  }
  authentication: {
    require_2fa_for_roles: UserRole[]
    max_login_attempts: number
    lockout_duration_minutes: number
    password_policy: PasswordPolicy
  }
  session: SessionSecuritySettings
  api: {
    rate_limits: RateLimit[]
    cors_origins: string[]
    require_https: boolean
  }
  audit: {
    log_all_queries: boolean
    log_retention_days: number
    real_time_monitoring: boolean
  }
  compliance: {
    enabled_domains: ComplianceDomain[]
    audit_frequency_days: number
    auto_remediation_enabled: boolean
  }
}

export interface PasswordPolicy {
  min_length: number
  require_uppercase: boolean
  require_lowercase: boolean
  require_numbers: boolean
  require_symbols: boolean
  prevent_reuse_count: number
  max_age_days: number
}

// Security Dashboard Types
export interface SecurityMetrics {
  total_users: number
  users_with_2fa: number
  failed_login_attempts_24h: number
  security_events_24h: number
  compliance_score: number
  encrypted_records: number
  recent_security_alerts: SecurityAlert[]
}

export interface SecurityAlert {
  id: string
  type: SecurityAlertType
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  description: string
  user_id: string | null
  ip_address: string | null
  auto_resolved: boolean
  resolved_at: string | null
  created_at: string
}

export type SecurityAlertType =
  | 'multiple_failed_logins'
  | 'suspicious_login_location'
  | 'rate_limit_exceeded'
  | 'unauthorized_data_access'
  | 'compliance_violation'
  | 'encryption_failure'
  | 'audit_log_tampering'
  | 'emergency_access_used'

// Hook Return Types
export interface UseTwoFactorReturn {
  is2FAEnabled: boolean
  is2FARequired: boolean
  settings: TwoFactorSettings | null
  backupCodesCount: number
  recentAttempts: TotpVerificationAttempt[]
  setupState: TwoFactorSetupState
  
  isLoading: boolean
  isCheckingRequirement: boolean
  isLoadingBackupCount: boolean
  isLoadingAttempts: boolean
  isSettingUp: boolean
  isVerifying: boolean
  isVerifyingBackupCode: boolean
  isDisabling: boolean
  isRegenerating: boolean
  
  startSetup: () => void
  completeSetup: (totpCode: string) => void
  verifyCode: (totpCode: string) => Promise<boolean>
  verifyBackupCode: (backupCode: string) => Promise<boolean>
  disable2FA: () => void
  regenerateBackupCodes: () => Promise<string[]>
  checkRateLimit: () => Promise<boolean>
  
  validateTotpCode: (code: string) => boolean
  validateBackupCode: (code: string) => boolean
  
  error: Error | null
  setupError: Error | null
  verifyError: Error | null
  backupCodeError: Error | null
  disableError: Error | null
  regenerateError: Error | null
}

// Form Types
export interface TwoFactorSetupFormData {
  verificationCode: string
}

export interface TwoFactorVerificationFormData {
  code: string
  useBackupCode: boolean
  rememberDevice: boolean
}

export interface EmergencyAccessFormData {
  reason: string
  targetUserId?: string
  duration: number
}

// Export utility type helpers
export type SecurityServiceMethod = keyof typeof import('../services/security-service').SecurityService
export type TwoFactorHookOptions = Parameters<typeof import('../hooks/useTwoFactor').useTwoFactor>[0]