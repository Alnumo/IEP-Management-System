/**
 * Two-Factor Authentication Setup Component Tests
 * Story 1.2: Security Compliance & Data Protection
 * Tests for 2FA setup UI with Arabic RTL support
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TwoFactorSetup } from '../../../components/auth/TwoFactorSetup'

// Mock dependencies
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn()
  }
}))

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockQRCode')
  }
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('../../../components/auth/AuthGuard', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin'
    },
    loading: false,
    isAuthenticated: true
  })
}))

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: (lang?: 'ar' | 'en') => ({
    t: (key: string, fallback: string) => fallback,
    language: lang || 'en',
    isRTL: lang === 'ar'
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

import { supabase } from '../../../lib/supabase'

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode, language?: 'ar' | 'en' }> = ({ 
  children, 
  language = 'en' 
}) => {
  return <div>{children}</div>
}

describe('TwoFactorSetup Component', () => {
  const mockSupabaseRpc = supabase.rpc as Mock
  const mockOnSetupComplete = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default successful mocks
    mockSupabaseRpc
      .mockResolvedValueOnce({
        data: 'JBSWY3DPEHPK3PXP', // Mock TOTP secret
        error: null
      })
      .mockResolvedValueOnce({
        data: true, // Mock successful verification
        error: null
      })
      .mockResolvedValueOnce({
        data: ['ABC123DEF456', 'GHI789JKL012', 'MNO345PQR678'], // Mock backup codes
        error: null
      })
  })

  describe('English Language Tests', () => {
    it('should render setup step in English', async () => {
      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Set up Two-Factor Authentication')).toBeInTheDocument()
        expect(screen.getByText('Scan the QR code below with your authenticator app')).toBeInTheDocument()
      })
      
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    })

    it('should display QR code and secret key', async () => {
      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByAltText('QR Code')).toBeInTheDocument()
        expect(screen.getByDisplayValue('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Or enter this code manually:')).toBeInTheDocument()
    })

    it('should copy secret to clipboard', async () => {
      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        const copyButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('svg')
        )
        expect(copyButton).toBeInTheDocument()
      })

      const copyButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')
      )
      
      fireEvent.click(copyButton!)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP')
      expect(toast.success).toHaveBeenCalledWith('Secret key copied to clipboard')
    })

    it('should proceed to verification step', async () => {
      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        const continueButton = screen.getByRole('button', { name: 'Continue' })
        expect(continueButton).toBeInTheDocument()
        expect(continueButton).not.toBeDisabled()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      expect(screen.getByText('Verify Your Setup')).toBeInTheDocument()
      expect(screen.getByText('Enter the 6-digit code from your authenticator app')).toBeInTheDocument()
    })

    it('should handle TOTP verification', async () => {
      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      // Proceed to verification step
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      })

      await waitFor(() => {
        expect(screen.getByText('Verify Your Setup')).toBeInTheDocument()
      })

      const codeInput = screen.getByPlaceholderText('123456')
      fireEvent.change(codeInput, { target: { value: '123456' } })

      expect(codeInput).toHaveValue('123456')

      const verifyButton = screen.getByRole('button', { name: 'Verify & Enable' })
      expect(verifyButton).not.toBeDisabled()

      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(mockSupabaseRpc).toHaveBeenCalledWith('verify_totp_code', {
          target_user_id: 'test-user-id',
          totp_code: '123456'
        })
      })
    })

    it('should display backup codes after successful verification', async () => {
      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      // Proceed through setup and verification
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      })

      await waitFor(() => {
        const codeInput = screen.getByPlaceholderText('123456')
        fireEvent.change(codeInput, { target: { value: '123456' } })
        fireEvent.click(screen.getByRole('button', { name: 'Verify & Enable' }))
      })

      await waitFor(() => {
        expect(screen.getByText('Two-Factor Authentication Enabled!')).toBeInTheDocument()
        expect(screen.getByText('ABC123DEF456')).toBeInTheDocument()
        expect(screen.getByText('GHI789JKL012')).toBeInTheDocument()
        expect(screen.getByText('MNO345PQR678')).toBeInTheDocument()
      })
    })
  })

  describe('Arabic RTL Language Tests', () => {
    it('should render setup step in Arabic with RTL layout', async () => {
      render(
        <TestWrapper language="ar">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        const container = screen.getByText('Set up Two-Factor Authentication').closest('div')
        expect(container).toHaveClass('text-right')
      })
    })

    it('should handle Arabic interface with proper text direction', async () => {
      render(
        <TestWrapper language="ar">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        // Check that secret input maintains LTR for codes
        const secretInput = screen.getByDisplayValue('JBSWY3DPEHPK3PXP')
        expect(secretInput).toHaveAttribute('dir', 'ltr')
      })

      // Proceed to verification step
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        // Verification code input should also be LTR
        const codeInput = screen.getByPlaceholderText('123456')
        expect(codeInput).toHaveAttribute('dir', 'ltr')
      })
    })
  })

  describe('Error Handling Tests', () => {
    it('should handle TOTP secret generation error', async () => {
      mockSupabaseRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to generate secret' }
      })

      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/Failed to initialize two-factor authentication/)).toBeInTheDocument()
      })
    })

    it('should handle invalid verification code', async () => {
      // Mock successful secret generation but failed verification
      mockSupabaseRpc
        .mockResolvedValueOnce({
          data: 'JBSWY3DPEHPK3PXP',
          error: null
        })
        .mockResolvedValueOnce({
          data: false, // Invalid code
          error: null
        })

      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      // Proceed to verification
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      })

      await waitFor(() => {
        const codeInput = screen.getByPlaceholderText('123456')
        fireEvent.change(codeInput, { target: { value: '999999' } })
        fireEvent.click(screen.getByRole('button', { name: 'Verify & Enable' }))
      })

      await waitFor(() => {
        expect(screen.getByText('Invalid verification code')).toBeInTheDocument()
      })
    })

    it('should handle clipboard copy failure gracefully', async () => {
      // Mock clipboard failure
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard not available'))
        }
      })

      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        const copyButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('svg')
        )
        fireEvent.click(copyButton!)
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to copy to clipboard')
    })
  })

  describe('Input Validation Tests', () => {
    it('should only accept 6-digit numeric codes', async () => {
      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      // Proceed to verification step
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      })

      await waitFor(() => {
        const codeInput = screen.getByPlaceholderText('123456')
        
        // Test invalid characters are filtered
        fireEvent.change(codeInput, { target: { value: 'abc123def' } })
        expect(codeInput).toHaveValue('123')
        
        // Test length limitation
        fireEvent.change(codeInput, { target: { value: '1234567890' } })
        expect(codeInput).toHaveValue('123456')
      })
    })

    it('should disable verify button for incomplete codes', async () => {
      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      // Proceed to verification step
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      })

      await waitFor(() => {
        const codeInput = screen.getByPlaceholderText('123456')
        const verifyButton = screen.getByRole('button', { name: 'Verify & Enable' })
        
        // Button should be disabled initially
        expect(verifyButton).toBeDisabled()
        
        // Still disabled for incomplete code
        fireEvent.change(codeInput, { target: { value: '12345' } })
        expect(verifyButton).toBeDisabled()
        
        // Enabled for complete code
        fireEvent.change(codeInput, { target: { value: '123456' } })
        expect(verifyButton).not.toBeDisabled()
      })
    })
  })

  describe('Navigation Tests', () => {
    it('should handle cancel callback', async () => {
      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      })

      expect(mockOnCancel).toHaveBeenCalledOnce()
    })

    it('should handle back navigation from verify step', async () => {
      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      // Proceed to verification step
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      })

      await waitFor(() => {
        expect(screen.getByText('Verify Your Setup')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Back' }))

      await waitFor(() => {
        expect(screen.getByText('Set up Two-Factor Authentication')).toBeInTheDocument()
      })
    })

    it('should call completion callback after successful setup', async () => {
      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      // Complete the entire flow
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      })

      await waitFor(() => {
        const codeInput = screen.getByPlaceholderText('123456')
        fireEvent.change(codeInput, { target: { value: '123456' } })
        fireEvent.click(screen.getByRole('button', { name: 'Verify & Enable' }))
      })

      await waitFor(() => {
        expect(screen.getByText('Two-Factor Authentication Enabled!')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Complete Setup' }))
      })

      expect(mockOnSetupComplete).toHaveBeenCalledOnce()
    })
  })

  describe('Mobile Responsive Tests', () => {
    it('should render properly on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })

      render(
        <TestWrapper language="en">
          <TwoFactorSetup 
            onSetupComplete={mockOnSetupComplete}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        const card = screen.getByRole('region', { hidden: true }) || 
                    screen.getByText('Set up Two-Factor Authentication').closest('.max-w-lg')
        expect(card).toBeInTheDocument()
      })

      // QR code should be responsive
      await waitFor(() => {
        const qrCode = screen.getByAltText('QR Code')
        expect(qrCode).toHaveClass('w-64', 'h-64')
      })
    })
  })
})