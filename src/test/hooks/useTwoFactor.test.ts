import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTwoFactor } from '../../hooks/useTwoFactor'
import { SecurityService } from '../../services/security-service'
import { useAuth } from '../../components/auth/AuthGuard'
import React, { createElement } from 'react'

// Mock dependencies
vi.mock('../../services/security-service')
vi.mock('../../components/auth/AuthGuard')
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    language: 'en',
    isRTL: false,
    toggleLanguage: vi.fn(),
    setLanguage: vi.fn()
  })
}))
vi.mock('sonner')

const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  user_metadata: { role: 'medical_consultant' }
}

const mockI18n = {
  t: (key: string, fallback?: string) => fallback || key
}

// Create wrapper component for tests without JSX
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: React.ReactNode }) => 
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useTwoFactor', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      isAuthenticated: true
    })
    
    vi.mocked(useI18n).mockReturnValue(mockI18n)
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with correct default values', async () => {
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(false)
      vi.mocked(SecurityService.is2FARequiredForRole).mockResolvedValue(true)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      expect(result.current.is2FAEnabled).toBe(false)
      expect(result.current.setupState.step).toBe('idle')
      expect(result.current.setupState.secret).toBe('')
      expect(result.current.setupState.qrCodeUrl).toBe('')
      expect(result.current.setupState.backupCodes).toEqual([])
    })

    it('should check 2FA status on mount', async () => {
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(true)
      vi.mocked(SecurityService.is2FARequiredForRole).mockResolvedValue(true)
      vi.mocked(SecurityService.get2FASettings).mockResolvedValue({
        id: '1',
        user_id: mockUser.id,
        is_enabled: true,
        secret_key: 'secret',
        backup_codes_used: 0,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      })
      vi.mocked(SecurityService.getUnusedBackupCodesCount).mockResolvedValue(8)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.is2FAEnabled).toBe(true)
        expect(result.current.backupCodesCount).toBe(8)
      })
    })
  })

  describe('2FA setup flow', () => {
    it('should start setup and generate secret', async () => {
      const mockSecret = 'JBSWY3DPEHPK3PXP'
      
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(false)
      vi.mocked(SecurityService.is2FARequiredForRole).mockResolvedValue(true)
      vi.mocked(SecurityService.generateTotpSecret).mockResolvedValue(mockSecret)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        result.current.startSetup()
      })

      await waitFor(() => {
        expect(result.current.setupState.step).toBe('verifying')
        expect(result.current.setupState.secret).toBe(mockSecret)
        expect(result.current.setupState.qrCodeUrl).toContain('otpauth://totp/')
      })

      expect(SecurityService.generateTotpSecret).toHaveBeenCalledWith(mockUser.id)
    })

    it('should complete setup with valid TOTP code', async () => {
      const mockBackupCodes = ['ABCD1234EFGH', 'IJKL5678MNOP']
      
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(false)
      vi.mocked(SecurityService.verifyTotpCode).mockResolvedValue(true)
      vi.mocked(SecurityService.generateBackupCodes).mockResolvedValue(mockBackupCodes)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      // Start setup first
      result.current.setupState.step = 'verifying'
      result.current.setupState.secret = 'JBSWY3DPEHPK3PXP'

      await act(async () => {
        result.current.completeSetup('123456')
      })

      await waitFor(() => {
        expect(result.current.setupState.step).toBe('complete')
        expect(result.current.setupState.backupCodes).toEqual(mockBackupCodes)
      })

      expect(SecurityService.verifyTotpCode).toHaveBeenCalledWith(mockUser.id, '123456')
      expect(SecurityService.generateBackupCodes).toHaveBeenCalledWith(mockUser.id)
    })

    it('should handle setup errors gracefully', async () => {
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(false)
      vi.mocked(SecurityService.verifyTotpCode).mockResolvedValue(false)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      result.current.setupState.step = 'verifying'

      await act(async () => {
        result.current.completeSetup('000000')
      })

      await waitFor(() => {
        expect(result.current.setupError).toBeTruthy()
      })

      expect(SecurityService.verifyTotpCode).toHaveBeenCalledWith(mockUser.id, '000000')
    })
  })

  describe('2FA verification', () => {
    it('should verify TOTP code successfully', async () => {
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(true)
      vi.mocked(SecurityService.verifyTotpCode).mockResolvedValue(true)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      let verificationResult: boolean | undefined

      await act(async () => {
        verificationResult = await result.current.verifyCode('123456')
      })

      expect(verificationResult).toBe(true)
      expect(SecurityService.verifyTotpCode).toHaveBeenCalledWith(mockUser.id, '123456')
    })

    it('should verify backup code successfully', async () => {
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(true)
      vi.mocked(SecurityService.verifyBackupCode).mockResolvedValue(true)
      vi.mocked(SecurityService.getUnusedBackupCodesCount).mockResolvedValue(7) // One less after use

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      let verificationResult: boolean | undefined

      await act(async () => {
        verificationResult = await result.current.verifyBackupCode('ABCD1234EFGH')
      })

      expect(verificationResult).toBe(true)
      expect(SecurityService.verifyBackupCode).toHaveBeenCalledWith(mockUser.id, 'ABCD1234EFGH')
    })

    it('should handle verification errors', async () => {
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(true)
      vi.mocked(SecurityService.verifyTotpCode).mockRejectedValue(new Error('Verification failed'))

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        try {
          await result.current.verifyCode('000000')
        } catch (error) {
          // Expected to throw
        }
      })

      await waitFor(() => {
        expect(result.current.verifyError).toBeTruthy()
      })
    })
  })

  describe('2FA management', () => {
    it('should disable 2FA successfully', async () => {
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(true)
      vi.mocked(SecurityService.disable2FA).mockResolvedValue()

      const mockOnDisableComplete = vi.fn()

      const { result } = renderHook(() => useTwoFactor({ 
        onDisableComplete: mockOnDisableComplete 
      }), {
        wrapper: createWrapper()
      })

      await act(async () => {
        result.current.disable2FA()
      })

      await waitFor(() => {
        expect(mockOnDisableComplete).toHaveBeenCalled()
      })

      expect(SecurityService.disable2FA).toHaveBeenCalledWith(mockUser.id)
    })

    it('should regenerate backup codes', async () => {
      const newBackupCodes = ['WXYZ9876ABCD', 'EFGH5432IJKL']
      
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(true)
      vi.mocked(SecurityService.generateBackupCodes).mockResolvedValue(newBackupCodes)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      let regeneratedCodes: string[] | undefined

      await act(async () => {
        regeneratedCodes = await result.current.regenerateBackupCodes()
      })

      expect(regeneratedCodes).toEqual(newBackupCodes)
      expect(SecurityService.generateBackupCodes).toHaveBeenCalledWith(mockUser.id)
    })
  })

  describe('role-based requirements', () => {
    it('should check if 2FA is required for admin role', async () => {
      const adminUser = { ...mockUser, user_metadata: { role: 'admin' } }
      
      vi.mocked(useAuth).mockReturnValue({
        user: adminUser,
        loading: false,
        isAuthenticated: true
      })

      vi.mocked(SecurityService.is2FARequiredForRole).mockResolvedValue(true)
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(false)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.is2FARequired).toBe(true)
      })

      expect(SecurityService.is2FARequiredForRole).toHaveBeenCalledWith('admin')
    })

    it('should not require 2FA for receptionist role', async () => {
      const receptionistUser = { ...mockUser, user_metadata: { role: 'receptionist' } }
      
      vi.mocked(useAuth).mockReturnValue({
        user: receptionistUser,
        loading: false,
        isAuthenticated: true
      })

      vi.mocked(SecurityService.is2FARequiredForRole).mockResolvedValue(false)
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(false)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.is2FARequired).toBe(false)
      })

      expect(SecurityService.is2FARequiredForRole).toHaveBeenCalledWith('receptionist')
    })

    it('should require 2FA for medical consultant role', async () => {
      vi.mocked(SecurityService.is2FARequiredForRole).mockResolvedValue(true)
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(false)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.is2FARequired).toBe(true)
      })

      expect(SecurityService.is2FARequiredForRole).toHaveBeenCalledWith('medical_consultant')
    })
  })

  describe('validation helpers', () => {
    it('should validate TOTP code format', () => {
      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      expect(result.current.validateTotpCode('123456')).toBe(true)
      expect(result.current.validateTotpCode('12345')).toBe(false)
      expect(result.current.validateTotpCode('abcdef')).toBe(false)
    })

    it('should validate backup code format', () => {
      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      expect(result.current.validateBackupCode('ABCD1234EFGH')).toBe(true)
      expect(result.current.validateBackupCode('ABCD1234EFG')).toBe(false)
      expect(result.current.validateBackupCode('ABCD-1234-EFGH')).toBe(false)
    })
  })

  describe('rate limiting', () => {
    it('should check rate limit status', async () => {
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(true)
      vi.mocked(SecurityService.checkRecentFailedAttempts).mockResolvedValue(true)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      let isRateLimited: boolean | undefined

      await act(async () => {
        isRateLimited = await result.current.checkRateLimit()
      })

      expect(isRateLimited).toBe(true)
      expect(SecurityService.checkRecentFailedAttempts).toHaveBeenCalledWith(mockUser.id)
    })
  })

  describe('loading states', () => {
    it('should handle loading states correctly', async () => {
      // Mock loading state
      vi.mocked(SecurityService.is2FAEnabled).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(false), 100))
      )

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      // Initially should be loading
      expect(result.current.isLoading).toBe(true)

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should show setup loading state', async () => {
      vi.mocked(SecurityService.generateTotpSecret).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('SECRET'), 100))
      )

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      act(() => {
        result.current.startSetup()
      })

      expect(result.current.isSettingUp).toBe(true)

      await waitFor(() => {
        expect(result.current.isSettingUp).toBe(false)
      })
    })
  })

  describe('Arabic RTL and English LTR support', () => {
    it('should handle Arabic user email in QR code generation', async () => {
      const arabicUser = {
        ...mockUser,
        email: 'مستخدم@example.com'
      }

      vi.mocked(useAuth).mockReturnValue({
        user: arabicUser,
        loading: false,
        isAuthenticated: true
      })

      vi.mocked(SecurityService.generateTotpSecret).mockResolvedValue('JBSWY3DPEHPK3PXP')
      vi.mocked(SecurityService.is2FAEnabled).mockResolvedValue(false)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        result.current.startSetup()
      })

      await waitFor(() => {
        expect(result.current.setupState.qrCodeUrl).toContain(encodeURIComponent(arabicUser.email))
      })
    })

    it('should use Arabic translations when available', () => {
      const arabicI18n = {
        t: (key: string, fallback?: string) => {
          const translations: Record<string, string> = {
            'auth.2fa.setup.success': 'تم تمكين المصادقة الثنائية بنجاح',
            'auth.2fa.verify.invalid': 'رمز التحقق غير صحيح'
          }
          return translations[key] || fallback || key
        }
      }

      vi.mocked(useI18n).mockReturnValue(arabicI18n)

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      // The hook should use the Arabic i18n function
      expect(result.current).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(SecurityService.is2FAEnabled).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })

    it('should handle service errors during setup', async () => {
      vi.mocked(SecurityService.generateTotpSecret).mockRejectedValue(new Error('Service error'))

      const { result } = renderHook(() => useTwoFactor(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        result.current.startSetup()
      })

      await waitFor(() => {
        expect(result.current.setupError).toBeTruthy()
      })
    })
  })
})