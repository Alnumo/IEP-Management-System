import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SecurityService } from '../../services/security-service'
import { supabase } from '../../lib/supabase'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          limit: vi.fn(() => ({
            order: vi.fn(() => ({ 
              data: [], 
              error: null 
            }))
          })),
          gte: vi.fn(() => ({ 
            data: [], 
            error: null 
          }))
        })),
        insert: vi.fn(() => ({ error: null })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({ 
            data: [], 
            error: null 
          }))
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ 
              data: [], 
              error: null 
            }))
          }))
        }))
      }))
    }))
  }
}))

describe('SecurityService', () => {
  const mockUserId = 'test-user-123'
  const mockTotpCode = '123456'
  const mockBackupCode = 'ABCD1234EFGH'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateTotpSecret', () => {
    it('should generate TOTP secret successfully', async () => {
      const mockSecret = 'JBSWY3DPEHPK3PXP'
      
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockSecret,
        error: null
      })

      const result = await SecurityService.generateTotpSecret(mockUserId)
      
      expect(supabase.rpc).toHaveBeenCalledWith('generate_totp_secret', {
        target_user_id: mockUserId
      })
      expect(result).toBe(mockSecret)
    })

    it('should throw error when RPC fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Database error')
      })

      await expect(SecurityService.generateTotpSecret(mockUserId))
        .rejects.toThrow('Failed to generate authentication secret')
    })
  })

  describe('verifyTotpCode', () => {
    it('should verify TOTP code successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null
      })

      const result = await SecurityService.verifyTotpCode(mockUserId, mockTotpCode)
      
      expect(supabase.rpc).toHaveBeenCalledWith('verify_totp_code', {
        target_user_id: mockUserId,
        totp_code: mockTotpCode
      })
      expect(result).toBe(true)
    })

    it('should return false for invalid TOTP code', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: false,
        error: null
      })

      const result = await SecurityService.verifyTotpCode(mockUserId, '000000')
      expect(result).toBe(false)
    })

    it('should throw error when verification fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Verification error')
      })

      await expect(SecurityService.verifyTotpCode(mockUserId, mockTotpCode))
        .rejects.toThrow('Failed to verify authentication code')
    })
  })

  describe('generateBackupCodes', () => {
    it('should generate backup codes successfully', async () => {
      const mockBackupCodes = [
        'ABCD1234EFGH',
        'IJKL5678MNOP',
        'QRST9012UVWX'
      ]
      
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockBackupCodes,
        error: null
      })

      const result = await SecurityService.generateBackupCodes(mockUserId)
      
      expect(supabase.rpc).toHaveBeenCalledWith('generate_backup_codes', {
        target_user_id: mockUserId
      })
      expect(result).toEqual(mockBackupCodes)
    })

    it('should throw error when generation fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Generation failed')
      })

      await expect(SecurityService.generateBackupCodes(mockUserId))
        .rejects.toThrow('Failed to generate backup codes')
    })
  })

  describe('verifyBackupCode', () => {
    it('should verify backup code successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null
      })

      const result = await SecurityService.verifyBackupCode(mockUserId, mockBackupCode)
      
      expect(supabase.rpc).toHaveBeenCalledWith('verify_backup_code', {
        target_user_id: mockUserId,
        backup_code: mockBackupCode
      })
      expect(result).toBe(true)
    })

    it('should return false for invalid backup code', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: false,
        error: null
      })

      const result = await SecurityService.verifyBackupCode(mockUserId, 'INVALID12345')
      expect(result).toBe(false)
    })
  })

  describe('is2FAEnabled', () => {
    it('should return true when 2FA is enabled', async () => {
      const mockFromChain = {
        select: vi.fn(() => mockFromChain),
        eq: vi.fn(() => mockFromChain),
        single: vi.fn(() => Promise.resolve({
          data: { is_enabled: true },
          error: null
        }))
      }
      
      vi.mocked(supabase.from).mockReturnValueOnce(mockFromChain as any)

      const result = await SecurityService.is2FAEnabled(mockUserId)
      expect(result).toBe(true)
    })

    it('should return false when 2FA is not enabled', async () => {
      const mockFromChain = {
        select: vi.fn(() => mockFromChain),
        eq: vi.fn(() => mockFromChain),
        single: vi.fn(() => Promise.resolve({
          data: { is_enabled: false },
          error: null
        }))
      }
      
      vi.mocked(supabase.from).mockReturnValueOnce(mockFromChain as any)

      const result = await SecurityService.is2FAEnabled(mockUserId)
      expect(result).toBe(false)
    })

    it('should return false when no 2FA settings found', async () => {
      const mockFromChain = {
        select: vi.fn(() => mockFromChain),
        eq: vi.fn(() => mockFromChain),
        single: vi.fn(() => Promise.resolve({
          data: null,
          error: { code: 'PGRST116' } // No rows found
        }))
      }
      
      vi.mocked(supabase.from).mockReturnValueOnce(mockFromChain as any)

      const result = await SecurityService.is2FAEnabled(mockUserId)
      expect(result).toBe(false)
    })
  })

  describe('disable2FA', () => {
    it('should disable 2FA successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: null
      })

      await expect(SecurityService.disable2FA(mockUserId)).resolves.toBeUndefined()
      
      expect(supabase.rpc).toHaveBeenCalledWith('disable_2fa', {
        target_user_id: mockUserId
      })
    })

    it('should throw error when disable fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Disable failed')
      })

      await expect(SecurityService.disable2FA(mockUserId))
        .rejects.toThrow('Failed to disable two-factor authentication')
    })
  })

  describe('is2FARequiredForRole', () => {
    it('should return true for admin role', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null
      })

      const result = await SecurityService.is2FARequiredForRole('admin')
      
      expect(supabase.rpc).toHaveBeenCalledWith('is_2fa_required_for_role', {
        user_role: 'admin'
      })
      expect(result).toBe(true)
    })

    it('should return true for medical_consultant role', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null
      })

      const result = await SecurityService.is2FARequiredForRole('medical_consultant')
      expect(result).toBe(true)
    })

    it('should return false for receptionist role', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: false,
        error: null
      })

      const result = await SecurityService.is2FARequiredForRole('receptionist')
      expect(result).toBe(false)
    })
  })

  describe('getUnusedBackupCodesCount', () => {
    it('should return correct count of unused backup codes', async () => {
      const mockFromChain = {
        select: vi.fn(() => mockFromChain),
        eq: vi.fn(() => mockFromChain)
      }
      
      // First eq call for user_id
      mockFromChain.eq.mockReturnValueOnce({
        eq: vi.fn(() => Promise.resolve({
          data: [{ id: '1' }, { id: '2' }, { id: '3' }],
          error: null
        }))
      })
      
      vi.mocked(supabase.from).mockReturnValueOnce(mockFromChain as any)

      const result = await SecurityService.getUnusedBackupCodesCount(mockUserId)
      expect(result).toBe(3)
    })

    it('should return 0 when no unused codes', async () => {
      const mockFromChain = {
        select: vi.fn(() => mockFromChain),
        eq: vi.fn(() => mockFromChain)
      }
      
      mockFromChain.eq.mockReturnValueOnce({
        eq: vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      })
      
      vi.mocked(supabase.from).mockReturnValueOnce(mockFromChain as any)

      const result = await SecurityService.getUnusedBackupCodesCount(mockUserId)
      expect(result).toBe(0)
    })
  })

  describe('checkRecentFailedAttempts', () => {
    it('should return false when attempts are below threshold', async () => {
      const mockFromChain = {
        select: vi.fn(() => mockFromChain),
        eq: vi.fn(() => mockFromChain),
        gte: vi.fn(() => Promise.resolve({
          data: [{ id: '1' }], // 1 attempt (below threshold of 5)
          error: null
        }))
      }
      
      // Chain the eq calls
      mockFromChain.eq.mockReturnValueOnce(mockFromChain)
      
      vi.mocked(supabase.from).mockReturnValueOnce(mockFromChain as any)

      const result = await SecurityService.checkRecentFailedAttempts(mockUserId)
      expect(result).toBe(false)
    })

    it('should return true when attempts exceed threshold', async () => {
      const mockFromChain = {
        select: vi.fn(() => mockFromChain),
        eq: vi.fn(() => mockFromChain),
        gte: vi.fn(() => Promise.resolve({
          data: Array(6).fill({ id: 'test' }), // 6 attempts (exceeds threshold of 5)
          error: null
        }))
      }
      
      mockFromChain.eq.mockReturnValueOnce(mockFromChain)
      
      vi.mocked(supabase.from).mockReturnValueOnce(mockFromChain as any)

      const result = await SecurityService.checkRecentFailedAttempts(mockUserId)
      expect(result).toBe(true)
    })
  })

  describe('validation helpers', () => {
    describe('validateTotpCodeFormat', () => {
      it('should validate correct TOTP code format', () => {
        expect(SecurityService.validateTotpCodeFormat('123456')).toBe(true)
        expect(SecurityService.validateTotpCodeFormat('000000')).toBe(true)
      })

      it('should reject invalid TOTP code formats', () => {
        expect(SecurityService.validateTotpCodeFormat('12345')).toBe(false) // Too short
        expect(SecurityService.validateTotpCodeFormat('1234567')).toBe(false) // Too long
        expect(SecurityService.validateTotpCodeFormat('12345a')).toBe(false) // Contains letter
        expect(SecurityService.validateTotpCodeFormat('')).toBe(false) // Empty
        expect(SecurityService.validateTotpCodeFormat('123 456')).toBe(false) // Contains space
      })
    })

    describe('validateBackupCodeFormat', () => {
      it('should validate correct backup code format', () => {
        expect(SecurityService.validateBackupCodeFormat('ABCD1234EFGH')).toBe(true)
        expect(SecurityService.validateBackupCodeFormat('abcd1234efgh')).toBe(true)
        expect(SecurityService.validateBackupCodeFormat('123456789012')).toBe(true)
      })

      it('should reject invalid backup code formats', () => {
        expect(SecurityService.validateBackupCodeFormat('ABCD1234EFG')).toBe(false) // Too short
        expect(SecurityService.validateBackupCodeFormat('ABCD1234EFGHX')).toBe(false) // Too long
        expect(SecurityService.validateBackupCodeFormat('ABCD-1234-EFGH')).toBe(false) // Contains hyphen
        expect(SecurityService.validateBackupCodeFormat('')).toBe(false) // Empty
        expect(SecurityService.validateBackupCodeFormat('ABCD 1234 EFGH')).toBe(false) // Contains spaces
      })
    })
  })

  describe('generateQRCodeURL', () => {
    it('should generate correct QR code URL with default app name', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const userEmail = 'test@example.com'
      
      const result = SecurityService.generateQRCodeURL(secret, userEmail)
      
      const expected = `otpauth://totp/Arkan%20Growth%20Center:test%40example.com?secret=${secret}&issuer=Arkan%20Growth%20Center`
      expect(result).toBe(expected)
    })

    it('should generate correct QR code URL with custom app name', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const userEmail = 'test@example.com'
      const appName = 'Test App'
      
      const result = SecurityService.generateQRCodeURL(secret, userEmail, appName)
      
      const expected = `otpauth://totp/Test%20App:test%40example.com?secret=${secret}&issuer=Test%20App`
      expect(result).toBe(expected)
    })

    it('should properly encode special characters', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const userEmail = 'test+user@example.com'
      const appName = 'Test App & Co'
      
      const result = SecurityService.generateQRCodeURL(secret, userEmail, appName)
      
      expect(result).toContain('test%2Buser%40example.com')
      expect(result).toContain('Test%20App%20%26%20Co')
    })
  })

  describe('emergency2FAReset', () => {
    it('should perform emergency reset with proper permissions', async () => {
      const adminUserId = 'admin-123'
      const targetUserId = 'target-456'
      const reason = 'User locked out'

      // Mock successful permission check
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: null
      })

      // Mock successful 2FA disable
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: null
      })

      // Mock audit log insert
      const mockFromChain = {
        insert: vi.fn(() => Promise.resolve({ error: null }))
      }
      vi.mocked(supabase.from).mockReturnValueOnce(mockFromChain as any)

      await expect(SecurityService.emergency2FAReset(targetUserId, adminUserId, reason))
        .resolves.toBeUndefined()

      expect(supabase.rpc).toHaveBeenCalledWith('emergency_medical_access', {
        requesting_user_id: adminUserId,
        target_table: 'user_2fa_settings',
        reason: `2FA Emergency Reset: ${reason}`
      })

      expect(supabase.rpc).toHaveBeenCalledWith('disable_2fa', {
        target_user_id: targetUserId
      })
    })

    it('should throw error when permissions are insufficient', async () => {
      const adminUserId = 'admin-123'
      const targetUserId = 'target-456'
      const reason = 'User locked out'

      // Mock permission check failure
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Insufficient permissions')
      })

      await expect(SecurityService.emergency2FAReset(targetUserId, adminUserId, reason))
        .rejects.toThrow('Insufficient permissions for emergency reset')
    })
  })

  describe('Arabic RTL and English LTR support', () => {
    it('should handle Arabic email addresses in QR code generation', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const arabicEmail = 'مستخدم@example.com' // Arabic username
      
      const result = SecurityService.generateQRCodeURL(secret, arabicEmail)
      
      // Should properly encode Arabic characters
      expect(result).toContain(encodeURIComponent(arabicEmail))
    })

    it('should validate TOTP codes regardless of input direction', () => {
      // TOTP codes are always numeric, so RTL/LTR doesn't matter
      const arabicNumerals = '١٢٣٤٥٦' // Arabic-Indic numerals
      const westernNumerals = '123456'
      
      // Should only accept Western numerals
      expect(SecurityService.validateTotpCodeFormat(westernNumerals)).toBe(true)
      expect(SecurityService.validateTotpCodeFormat(arabicNumerals)).toBe(false)
    })

    it('should handle mixed language user data in audit logs', async () => {
      const mockEvents = [
        {
          id: '1',
          action: '2fa_enabled',
          user_name_ar: 'أحمد محمد',
          user_name_en: 'Ahmed Mohammed',
          created_at: '2025-01-01T12:00:00Z'
        }
      ]

      const mockFromChain = {
        select: vi.fn(() => mockFromChain),
        eq: vi.fn(() => mockFromChain),
        in: vi.fn(() => mockFromChain),
        order: vi.fn(() => mockFromChain),
        limit: vi.fn(() => Promise.resolve({
          data: mockEvents,
          error: null
        }))
      }
      
      vi.mocked(supabase.from).mockReturnValueOnce(mockFromChain as any)

      const result = await SecurityService.getSecurityEvents(mockUserId)
      expect(result).toEqual(mockEvents)
    })
  })
})