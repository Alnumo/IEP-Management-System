import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SecurityService, TwoFactorSettings } from '../services/security-service'
import { useAuth } from '../components/auth/AuthGuard'
import { toast } from 'sonner'
import { useLanguage } from '../contexts/LanguageContext'

// Alias for consistency with component naming
const useI18n = useLanguage

export interface UseTwoFactorOptions {
  enabled?: boolean
  onSetupComplete?: () => void
  onDisableComplete?: () => void
}

export const useTwoFactor = (options: UseTwoFactorOptions = {}) => {
  const { enabled = true, onSetupComplete, onDisableComplete } = options
  const { user } = useAuth()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [setupState, setSetupState] = useState({
    step: 'idle' as 'idle' | 'generating' | 'verifying' | 'complete',
    secret: '',
    qrCodeUrl: '',
    backupCodes: [] as string[]
  })

  // Query: Check if 2FA is enabled
  const {
    data: is2FAEnabled,
    isLoading: isCheckingStatus,
    error: statusError
  } = useQuery({
    queryKey: ['user-2fa-status', user?.id],
    queryFn: () => user ? SecurityService.is2FAEnabled(user.id) : Promise.resolve(false),
    enabled: enabled && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Query: Get 2FA settings
  const {
    data: settings,
    isLoading: isLoadingSettings
  } = useQuery({
    queryKey: ['user-2fa-settings', user?.id],
    queryFn: () => user ? SecurityService.get2FASettings(user.id) : Promise.resolve(null),
    enabled: enabled && !!user && is2FAEnabled,
    staleTime: 5 * 60 * 1000,
  })

  // Query: Get unused backup codes count
  const {
    data: backupCodesCount,
    isLoading: isLoadingBackupCount
  } = useQuery({
    queryKey: ['backup-codes-count', user?.id],
    queryFn: () => user ? SecurityService.getUnusedBackupCodesCount(user.id) : Promise.resolve(0),
    enabled: enabled && !!user && is2FAEnabled,
    staleTime: 5 * 60 * 1000,
  })

  // Query: Check if 2FA is required for user role
  const {
    data: is2FARequired,
    isLoading: isCheckingRequirement
  } = useQuery({
    queryKey: ['2fa-role-requirement', user?.user_metadata?.role],
    queryFn: () => user?.user_metadata?.role 
      ? SecurityService.is2FARequiredForRole(user.user_metadata.role)
      : Promise.resolve(false),
    enabled: enabled && !!user?.user_metadata?.role,
    staleTime: 10 * 60 * 1000, // 10 minutes (role requirements don't change often)
  })

  // Query: Get recent verification attempts
  const {
    data: recentAttempts,
    isLoading: isLoadingAttempts
  } = useQuery({
    queryKey: ['verification-attempts', user?.id],
    queryFn: () => user ? SecurityService.getVerificationAttempts(user.id, 5) : Promise.resolve([]),
    enabled: enabled && !!user && is2FAEnabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Mutation: Generate TOTP secret
  const generateSecretMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('User not authenticated')
      return SecurityService.generateTotpSecret(user.id)
    },
    onSuccess: (secret) => {
      const qrCodeUrl = SecurityService.generateQRCodeURL(
        secret,
        user?.email || user?.phone || 'user'
      )
      
      setSetupState(prev => ({
        ...prev,
        step: 'verifying',
        secret,
        qrCodeUrl
      }))
    },
    onError: (error: any) => {
      console.error('Error generating secret:', error)
      toast.error(t('auth.2fa.setup.error', 'Failed to initialize two-factor authentication'))
    }
  })

  // Mutation: Verify TOTP code and complete setup
  const setupMutation = useMutation({
    mutationFn: async ({ totpCode }: { totpCode: string }) => {
      if (!user) throw new Error('User not authenticated')
      
      // Verify TOTP code
      const isValid = await SecurityService.verifyTotpCode(user.id, totpCode)
      if (!isValid) {
        throw new Error(t('auth.2fa.verify.invalid', 'Invalid verification code'))
      }
      
      // Generate backup codes
      const backupCodes = await SecurityService.generateBackupCodes(user.id)
      
      return backupCodes
    },
    onSuccess: (backupCodes) => {
      setSetupState(prev => ({
        ...prev,
        step: 'complete',
        backupCodes
      }))
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user-2fa-status', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-2fa-settings', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['backup-codes-count', user?.id] })
      
      toast.success(t('auth.2fa.setup.success', 'Two-factor authentication enabled successfully'))
      
      if (onSetupComplete) {
        onSetupComplete()
      }
    },
    onError: (error: any) => {
      console.error('Error setting up 2FA:', error)
      toast.error(error.message || t('auth.2fa.verify.error', 'Failed to verify code'))
    }
  })

  // Mutation: Verify TOTP code (for login)
  const verifyMutation = useMutation({
    mutationFn: ({ totpCode }: { totpCode: string }) => {
      if (!user) throw new Error('User not authenticated')
      return SecurityService.verifyTotpCode(user.id, totpCode)
    },
    onError: (error: any) => {
      console.error('Error verifying 2FA:', error)
      toast.error(error.message || t('auth.2fa.verify.error', 'Failed to verify code'))
    }
  })

  // Mutation: Verify backup code
  const verifyBackupCodeMutation = useMutation({
    mutationFn: ({ backupCode }: { backupCode: string }) => {
      if (!user) throw new Error('User not authenticated')
      return SecurityService.verifyBackupCode(user.id, backupCode)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-codes-count', user?.id] })
      toast.success(t('auth.2fa.backup.success', 'Backup code verified successfully'))
    },
    onError: (error: any) => {
      console.error('Error verifying backup code:', error)
      toast.error(error.message || t('auth.2fa.backup.error', 'Invalid backup code'))
    }
  })

  // Mutation: Disable 2FA
  const disableMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('User not authenticated')
      return SecurityService.disable2FA(user.id)
    },
    onSuccess: () => {
      // Reset setup state
      setSetupState({
        step: 'idle',
        secret: '',
        qrCodeUrl: '',
        backupCodes: []
      })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user-2fa-status', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-2fa-settings', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['backup-codes-count', user?.id] })
      
      toast.success(t('auth.2fa.disable.success', 'Two-factor authentication disabled'))
      
      if (onDisableComplete) {
        onDisableComplete()
      }
    },
    onError: (error: any) => {
      console.error('Error disabling 2FA:', error)
      toast.error(error.message || t('auth.2fa.disable.error', 'Failed to disable two-factor authentication'))
    }
  })

  // Mutation: Generate new backup codes
  const regenerateBackupCodesMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('User not authenticated')
      return SecurityService.generateBackupCodes(user.id)
    },
    onSuccess: (backupCodes) => {
      queryClient.invalidateQueries({ queryKey: ['backup-codes-count', user?.id] })
      toast.success(t('auth.2fa.backup.regenerated', 'New backup codes generated'))
      return backupCodes
    },
    onError: (error: any) => {
      console.error('Error regenerating backup codes:', error)
      toast.error(error.message || t('auth.2fa.backup.regenerate.error', 'Failed to generate new backup codes'))
    }
  })

  // Helper functions
  const startSetup = () => {
    setSetupState(prev => ({ ...prev, step: 'generating' }))
    generateSecretMutation.mutate()
  }

  const completeSetup = (totpCode: string) => {
    setupMutation.mutate({ totpCode })
  }

  const verifyCode = (totpCode: string) => {
    return verifyMutation.mutateAsync({ totpCode })
  }

  const verifyBackupCode = (backupCode: string) => {
    return verifyBackupCodeMutation.mutateAsync({ backupCode })
  }

  const disable2FA = () => {
    disableMutation.mutate()
  }

  const regenerateBackupCodes = () => {
    return regenerateBackupCodesMutation.mutateAsync()
  }

  // Check if user is rate limited
  const checkRateLimit = async () => {
    if (!user) return false
    return SecurityService.checkRecentFailedAttempts(user.id)
  }

  // Validation helpers
  const validateTotpCode = (code: string) => {
    return SecurityService.validateTotpCodeFormat(code)
  }

  const validateBackupCode = (code: string) => {
    return SecurityService.validateBackupCodeFormat(code)
  }

  return {
    // State
    is2FAEnabled: is2FAEnabled || false,
    is2FARequired: is2FARequired || false,
    settings,
    backupCodesCount: backupCodesCount || 0,
    recentAttempts: recentAttempts || [],
    setupState,

    // Loading states
    isLoading: isCheckingStatus || isLoadingSettings,
    isCheckingRequirement,
    isLoadingBackupCount,
    isLoadingAttempts,
    isSettingUp: generateSecretMutation.isPending || setupMutation.isPending,
    isVerifying: verifyMutation.isPending,
    isVerifyingBackupCode: verifyBackupCodeMutation.isPending,
    isDisabling: disableMutation.isPending,
    isRegenerating: regenerateBackupCodesMutation.isPending,

    // Actions
    startSetup,
    completeSetup,
    verifyCode,
    verifyBackupCode,
    disable2FA,
    regenerateBackupCodes,
    checkRateLimit,

    // Validation
    validateTotpCode,
    validateBackupCode,

    // Errors
    error: statusError,
    setupError: generateSecretMutation.error || setupMutation.error,
    verifyError: verifyMutation.error,
    backupCodeError: verifyBackupCodeMutation.error,
    disableError: disableMutation.error,
    regenerateError: regenerateBackupCodesMutation.error,
  }
}

export default useTwoFactor