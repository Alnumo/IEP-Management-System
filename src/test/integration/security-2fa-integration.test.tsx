import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { TwoFactorSetup } from '../../components/auth/TwoFactorSetup'
import { TwoFactorVerification } from '../../components/auth/TwoFactorVerification'
import { SecurityService } from '../../services/security-service'
import { mark2FASessionVerified } from '../../lib/auth-utils'
import { toast } from 'sonner'
import React from 'react'

// Mock dependencies
vi.mock('../../services/security-service')
vi.mock('../../lib/auth-utils')
vi.mock('sonner')
vi.mock('qrcode')

// Mock i18n context
const mockI18nContext = {
  t: (key: string, fallback?: string) => fallback || key,
  language: 'en',
  isRTL: false,
  toggleLanguage: vi.fn(),
  setLanguage: vi.fn()
}

vi.mock('../../contexts/I18nContext', () => ({
  useI18n: () => mockI18nContext
}))

// Mock auth context
const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  user_metadata: { role: 'medical_consultant' }
}

const mockAuthContext = {
  user: mockUser,
  loading: false,
  isAuthenticated: true
}

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext
}))

// Mock QR Code generation
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockqrcode')
  }
}))

// Create test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('2FA Integration Tests', () => {
  const mockSecret = 'JBSWY3DPEHPK3PXP'
  const mockBackupCodes = [
    'ABCD1234EFGH',
    'IJKL5678MNOP',
    'QRST9012UVWX',
    'YZAB3456CDEF'
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default successful mocks
    vi.mocked(SecurityService.generateTotpSecret).mockResolvedValue(mockSecret)
    vi.mocked(SecurityService.verifyTotpCode).mockResolvedValue(true)
    vi.mocked(SecurityService.generateBackupCodes).mockResolvedValue(mockBackupCodes)
    vi.mocked(mark2FASessionVerified).mockResolvedValue()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('2FA Setup Flow', () => {
    it('should complete full setup flow successfully', async () => {
      const mockOnComplete = vi.fn()
      
      render(
        <TwoFactorSetup onSetupComplete={mockOnComplete} />,
        { wrapper: createWrapper() }
      )

      // Wait for QR code to load
      await waitFor(() => {
        expect(screen.getByText(/scan the qr code/i)).toBeInTheDocument()
      })

      // QR code should be displayed
      const qrImage = screen.getByAltText('QR Code')
      expect(qrImage).toBeInTheDocument()

      // Secret key should be shown
      expect(screen.getByDisplayValue(mockSecret)).toBeInTheDocument()

      // Click continue to verification step
      const continueButton = screen.getByText(/continue/i)
      fireEvent.click(continueButton)

      // Should show verification form
      await waitFor(() => {
        expect(screen.getByText(/verify your setup/i)).toBeInTheDocument()
      })

      // Enter verification code
      const codeInput = screen.getByPlaceholderText('123456')
      fireEvent.change(codeInput, { target: { value: '123456' } })

      // Submit verification
      const verifyButton = screen.getByText(/verify & enable/i)
      fireEvent.click(verifyButton)

      // Should show completion screen
      await waitFor(() => {
        expect(screen.getByText(/two-factor authentication enabled!/i)).toBeInTheDocument()
      })

      // Backup codes should be displayed
      mockBackupCodes.forEach(code => {
        expect(screen.getByText(code)).toBeInTheDocument()
      })

      // Complete setup
      const completeButton = screen.getByText(/complete setup/i)
      fireEvent.click(completeButton)

      // Callbacks should be called
      expect(mockOnComplete).toHaveBeenCalled()
      expect(SecurityService.generateTotpSecret).toHaveBeenCalledWith(mockUser.id)
      expect(SecurityService.verifyTotpCode).toHaveBeenCalledWith(mockUser.id, '123456')
      expect(SecurityService.generateBackupCodes).toHaveBeenCalledWith(mockUser.id)
    })

    it('should handle invalid verification code', async () => {
      vi.mocked(SecurityService.verifyTotpCode).mockResolvedValue(false)
      
      render(<TwoFactorSetup />, { wrapper: createWrapper() })

      // Wait for setup to complete and go to verification
      await waitFor(() => {
        expect(screen.getByText(/continue/i)).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText(/continue/i))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('123456')).toBeInTheDocument()
      })

      // Enter invalid code
      const codeInput = screen.getByPlaceholderText('123456')
      fireEvent.change(codeInput, { target: { value: '000000' } })

      // Submit verification
      const verifyButton = screen.getByText(/verify & enable/i)
      fireEvent.click(verifyButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument()
      })

      expect(SecurityService.verifyTotpCode).toHaveBeenCalledWith(mockUser.id, '000000')
    })

    it('should allow copying secret key', async () => {
      // Mock clipboard API
      const mockWriteText = vi.fn()
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText }
      })

      render(<TwoFactorSetup />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSecret)).toBeInTheDocument()
      })

      // Click copy button
      const copyButton = screen.getByRole('button', { name: /copy/i })
      fireEvent.click(copyButton)

      expect(mockWriteText).toHaveBeenCalledWith(mockSecret)
      expect(toast.success).toHaveBeenCalled()
    })

    it('should handle setup cancellation', async () => {
      const mockOnCancel = vi.fn()
      
      render(
        <TwoFactorSetup onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText(/cancel/i)).toBeInTheDocument()
      })

      // Click cancel button
      const cancelButton = screen.getByText(/cancel/i)
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('2FA Verification Flow', () => {
    it('should verify TOTP code successfully', async () => {
      const mockOnComplete = vi.fn()
      
      render(
        <TwoFactorVerification onVerificationComplete={mockOnComplete} />,
        { wrapper: createWrapper() }
      )

      // TOTP tab should be active by default
      expect(screen.getByText(/app code/i)).toBeInTheDocument()

      // Enter TOTP code
      const codeInput = screen.getByPlaceholderText('123456')
      fireEvent.change(codeInput, { target: { value: '123456' } })

      // Submit verification
      const verifyButton = screen.getByText(/verify/i)
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })

      expect(SecurityService.verifyTotpCode).toHaveBeenCalledWith(mockUser.id, '123456')
      expect(mark2FASessionVerified).toHaveBeenCalled()
    })

    it('should verify backup code successfully', async () => {
      vi.mocked(SecurityService.getUnusedBackupCodesCount).mockResolvedValue(4)
      vi.mocked(SecurityService.verifyBackupCode).mockResolvedValue(true)
      
      const mockOnComplete = vi.fn()
      
      render(
        <TwoFactorVerification 
          onVerificationComplete={mockOnComplete} 
          showBackupCodeOption={true}
        />,
        { wrapper: createWrapper() }
      )

      // Switch to backup code tab
      const backupTab = screen.getByText(/backup code/i)
      fireEvent.click(backupTab)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('XXXXXXXXXXXX')).toBeInTheDocument()
      })

      // Enter backup code
      const backupInput = screen.getByPlaceholderText('XXXXXXXXXXXX')
      fireEvent.change(backupInput, { target: { value: 'abcd1234efgh' } })

      // Should format to uppercase
      expect(backupInput).toHaveValue('ABCD1234EFGH')

      // Submit verification
      const verifyButton = screen.getByText(/verify/i)
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })

      expect(SecurityService.verifyBackupCode).toHaveBeenCalledWith(mockUser.id, 'ABCD1234EFGH')
      expect(mark2FASessionVerified).toHaveBeenCalled()
    })

    it('should disable backup tab when no codes remaining', async () => {
      vi.mocked(SecurityService.getUnusedBackupCodesCount).mockResolvedValue(0)
      
      render(
        <TwoFactorVerification showBackupCodeOption={true} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const backupTab = screen.getByRole('tab', { name: /backup code/i })
        expect(backupTab).toBeDisabled()
      })
    })

    it('should handle rate limiting', async () => {
      vi.mocked(SecurityService.checkRecentFailedAttempts).mockResolvedValue(true)
      
      render(<TwoFactorVerification />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/too many attempts/i)).toBeInTheDocument()
        expect(screen.getByText(/wait 15 minutes/i)).toBeInTheDocument()
      })
    })

    it('should format TOTP code input correctly', async () => {
      render(<TwoFactorVerification />, { wrapper: createWrapper() })

      const codeInput = screen.getByPlaceholderText('123456')
      
      // Should only allow digits
      fireEvent.change(codeInput, { target: { value: 'abc123def' } })
      expect(codeInput).toHaveValue('123')

      // Should limit to 6 digits
      fireEvent.change(codeInput, { target: { value: '1234567890' } })
      expect(codeInput).toHaveValue('123456')
    })

    it('should format backup code input correctly', async () => {
      vi.mocked(SecurityService.getUnusedBackupCodesCount).mockResolvedValue(4)
      
      render(
        <TwoFactorVerification showBackupCodeOption={true} />,
        { wrapper: createWrapper() }
      )

      // Switch to backup tab
      fireEvent.click(screen.getByText(/backup code/i))

      await waitFor(() => {
        const backupInput = screen.getByPlaceholderText('XXXXXXXXXXXX')
        
        // Should convert to uppercase and remove special chars
        fireEvent.change(backupInput, { target: { value: 'abc-123!def@456' } })
        expect(backupInput).toHaveValue('ABC123DEF456')

        // Should limit to 12 characters
        fireEvent.change(backupInput, { target: { value: 'abcdefghijklmnop' } })
        expect(backupInput).toHaveValue('ABCDEFGHIJKL')
      })
    })
  })

  describe('Arabic RTL Support', () => {
    beforeEach(() => {
      mockI18nContext.language = 'ar'
      mockI18nContext.isRTL = true
    })

    it('should render setup with RTL layout', async () => {
      render(<TwoFactorSetup />, { wrapper: createWrapper() })

      await waitFor(() => {
        const setupTitle = screen.getByText(/set up two-factor authentication/i)
        const parent = setupTitle.closest('div')
        expect(parent).toHaveClass('text-right')
      })
    })

    it('should render verification with RTL layout', async () => {
      render(<TwoFactorVerification />, { wrapper: createWrapper() })

      const title = screen.getByText(/two-factor authentication/i)
      const titleContainer = title.closest('.text-right')
      expect(titleContainer).toBeInTheDocument()
    })

    it('should handle Arabic user email in setup', async () => {
      const arabicUser = {
        ...mockUser,
        email: 'مستخدم@example.com'
      }

      vi.mocked(mockAuthContext.user).mockReturnValue(arabicUser)

      render(<TwoFactorSetup />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(SecurityService.generateTotpSecret).toHaveBeenCalled()
      })

      // QR code should be generated with Arabic email
      const qrImage = screen.getByAltText('QR Code')
      expect(qrImage).toBeInTheDocument()
    })
  })

  describe('Error Scenarios', () => {
    it('should handle secret generation failure', async () => {
      vi.mocked(SecurityService.generateTotpSecret).mockRejectedValue(
        new Error('Failed to generate secret')
      )

      render(<TwoFactorSetup />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/failed to initialize two-factor authentication/i))
          .toBeInTheDocument()
      })
    })

    it('should handle verification network errors', async () => {
      vi.mocked(SecurityService.verifyTotpCode).mockRejectedValue(
        new Error('Network error')
      )

      render(<TwoFactorVerification />, { wrapper: createWrapper() })

      const codeInput = screen.getByPlaceholderText('123456')
      fireEvent.change(codeInput, { target: { value: '123456' } })

      const verifyButton = screen.getByText(/verify/i)
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    it('should handle backup code generation failure', async () => {
      vi.mocked(SecurityService.generateBackupCodes).mockRejectedValue(
        new Error('Failed to generate backup codes')
      )

      render(<TwoFactorSetup />, { wrapper: createWrapper() })

      // Complete setup flow to verification
      await waitFor(() => {
        fireEvent.click(screen.getByText(/continue/i))
      })

      await waitFor(() => {
        const codeInput = screen.getByPlaceholderText('123456')
        fireEvent.change(codeInput, { target: { value: '123456' } })
        fireEvent.click(screen.getByText(/verify & enable/i))
      })

      await waitFor(() => {
        expect(screen.getByText(/failed to generate backup codes/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels and ARIA attributes', async () => {
      render(<TwoFactorSetup />, { wrapper: createWrapper() })

      await waitFor(() => {
        // Secret input should have proper label
        const secretInput = screen.getByDisplayValue(mockSecret)
        expect(secretInput).toHaveAttribute('id', 'secret')
        
        const secretLabel = screen.getByLabelText(/enter this code manually/i)
        expect(secretLabel).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation', async () => {
      render(<TwoFactorVerification />, { wrapper: createWrapper() })

      const codeInput = screen.getByPlaceholderText('123456')
      
      // Should be focusable
      codeInput.focus()
      expect(document.activeElement).toBe(codeInput)

      // Should support tab navigation
      fireEvent.keyDown(codeInput, { key: 'Tab' })
      // Verify button should be next focusable element
      const verifyButton = screen.getByText(/verify/i)
      expect(verifyButton).toBeInTheDocument()
    })

    it('should announce verification results to screen readers', async () => {
      const mockOnComplete = vi.fn()
      
      render(
        <TwoFactorVerification onVerificationComplete={mockOnComplete} />,
        { wrapper: createWrapper() }
      )

      const codeInput = screen.getByPlaceholderText('123456')
      fireEvent.change(codeInput, { target: { value: '123456' } })

      const verifyButton = screen.getByText(/verify/i)
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
    })
  })
})