import { supabase } from '../lib/supabase'

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

export interface VerificationAttempt {
  id: string
  user_id: string
  attempt_type: 'totp' | 'backup_code'
  is_successful: boolean
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export class SecurityService {
  // Generate TOTP secret for user
  static async generateTotpSecret(userId: string): Promise<string> {
    const { data, error } = await supabase.rpc('generate_totp_secret', {
      target_user_id: userId
    })

    if (error) {
      console.error('Error generating TOTP secret:', error)
      throw new Error('Failed to generate authentication secret')
    }

    return data
  }

  // Verify TOTP code
  static async verifyTotpCode(userId: string, totpCode: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('verify_totp_code', {
      target_user_id: userId,
      totp_code: totpCode
    })

    if (error) {
      console.error('Error verifying TOTP code:', error)
      throw new Error('Failed to verify authentication code')
    }

    return data
  }

  // Generate backup codes
  static async generateBackupCodes(userId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('generate_backup_codes', {
      target_user_id: userId
    })

    if (error) {
      console.error('Error generating backup codes:', error)
      throw new Error('Failed to generate backup codes')
    }

    return data
  }

  // Verify backup code
  static async verifyBackupCode(userId: string, backupCode: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('verify_backup_code', {
      target_user_id: userId,
      backup_code: backupCode
    })

    if (error) {
      console.error('Error verifying backup code:', error)
      throw new Error('Failed to verify backup code')
    }

    return data
  }

  // Check if 2FA is enabled for user
  static async is2FAEnabled(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_2fa_settings')
      .select('is_enabled')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No 2FA settings found
        return false
      }
      console.error('Error checking 2FA status:', error)
      throw new Error('Failed to check authentication status')
    }

    return data.is_enabled
  }

  // Get 2FA settings for user
  static async get2FASettings(userId: string): Promise<TwoFactorSettings | null> {
    const { data, error } = await supabase
      .from('user_2fa_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No 2FA settings found
        return null
      }
      console.error('Error fetching 2FA settings:', error)
      throw new Error('Failed to fetch authentication settings')
    }

    return data
  }

  // Disable 2FA for user
  static async disable2FA(userId: string): Promise<void> {
    const { error } = await supabase.rpc('disable_2fa', {
      target_user_id: userId
    })

    if (error) {
      console.error('Error disabling 2FA:', error)
      throw new Error('Failed to disable two-factor authentication')
    }
  }

  // Check if 2FA is required for user role
  static async is2FARequiredForRole(userRole: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('is_2fa_required_for_role', {
      user_role: userRole
    })

    if (error) {
      console.error('Error checking 2FA role requirements:', error)
      throw new Error('Failed to check authentication requirements')
    }

    return data
  }

  // Get unused backup codes count
  static async getUnusedBackupCodesCount(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('backup_codes')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_used', false)

    if (error) {
      console.error('Error fetching backup codes count:', error)
      throw new Error('Failed to fetch backup codes status')
    }

    return data?.length || 0
  }

  // Get verification attempts for user
  static async getVerificationAttempts(
    userId: string,
    limit: number = 10
  ): Promise<VerificationAttempt[]> {
    const { data, error } = await supabase
      .from('totp_verification_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching verification attempts:', error)
      throw new Error('Failed to fetch verification history')
    }

    return data
  }

  // Check for recent failed attempts (rate limiting)
  static async checkRecentFailedAttempts(
    userId: string,
    timeWindowMinutes: number = 15,
    maxAttempts: number = 5
  ): Promise<boolean> {
    const timeThreshold = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('totp_verification_attempts')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_successful', false)
      .gte('created_at', timeThreshold)

    if (error) {
      console.error('Error checking failed attempts:', error)
      return false
    }

    return (data?.length || 0) >= maxAttempts
  }

  // Generate QR code URL for TOTP setup
  static generateQRCodeURL(
    secret: string,
    userEmail: string,
    appName: string = 'Arkan Growth Center'
  ): string {
    const encodedEmail = encodeURIComponent(userEmail)
    const encodedAppName = encodeURIComponent(appName)
    
    return `otpauth://totp/${encodedAppName}:${encodedEmail}?secret=${secret}&issuer=${encodedAppName}`
  }

  // Validate TOTP code format
  static validateTotpCodeFormat(code: string): boolean {
    return /^\d{6}$/.test(code)
  }

  // Validate backup code format
  static validateBackupCodeFormat(code: string): boolean {
    return /^[A-Za-z0-9]{12}$/.test(code)
  }

  // Get security events for user (audit trail)
  static async getSecurityEvents(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .in('action', ['2fa_enabled', '2fa_disabled', '2fa_verified', 'backup_code_used', 'failed_2fa_attempt'])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching security events:', error)
      throw new Error('Failed to fetch security events')
    }

    return data
  }

  // Emergency 2FA reset (admin only)
  static async emergency2FAReset(
    targetUserId: string,
    adminUserId: string,
    reason: string
  ): Promise<void> {
    // First verify admin has emergency access permissions
    const { error: permissionError } = await supabase.rpc('emergency_medical_access', {
      requesting_user_id: adminUserId,
      target_table: 'user_2fa_settings',
      reason: `2FA Emergency Reset: ${reason}`
    })

    if (permissionError) {
      console.error('Error checking emergency permissions:', permissionError)
      throw new Error('Insufficient permissions for emergency reset')
    }

    // Disable 2FA for target user
    const { error: disableError } = await supabase.rpc('disable_2fa', {
      target_user_id: targetUserId
    })

    if (disableError) {
      console.error('Error during emergency 2FA reset:', disableError)
      throw new Error('Failed to perform emergency reset')
    }

    // Log the emergency reset action
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: adminUserId,
        action: 'emergency_2fa_reset',
        table_name: 'user_2fa_settings',
        record_id: targetUserId,
        changes: {
          reason,
          target_user: targetUserId,
          reset_by: adminUserId
        }
      })

    if (logError) {
      console.error('Error logging emergency reset:', logError)
      // Don't throw here as the reset was successful
    }
  }
}

// Export individual functions for easier importing
export const {
  generateTotpSecret,
  verifyTotpCode,
  generateBackupCodes,
  verifyBackupCode,
  is2FAEnabled,
  get2FASettings,
  disable2FA,
  is2FARequiredForRole,
  getUnusedBackupCodesCount,
  getVerificationAttempts,
  checkRecentFailedAttempts,
  generateQRCodeURL,
  validateTotpCodeFormat,
  validateBackupCodeFormat,
  getSecurityEvents,
  emergency2FAReset
} = SecurityService

export default SecurityService