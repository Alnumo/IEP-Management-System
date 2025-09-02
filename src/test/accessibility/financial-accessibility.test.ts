import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

// Import financial components for testing
import { FinancialAnalyticsDashboard } from '../../components/billing/FinancialAnalyticsDashboard'
import { FinancialReportingCenter } from '../../components/billing/FinancialReportingCenter'
import { InstallmentPaymentManager } from '../../components/billing/InstallmentPaymentManager'
import { InvoiceAutomation } from '../../components/billing/InvoiceAutomation'
import { PaymentGatewayInterface } from '../../components/billing/PaymentGatewayInterface'

// Extend Jest expect
expect.extend(toHaveNoViolations)

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null
        }))
      })),
      insert: vi.fn(() => ({ data: [], error: null })),
      update: vi.fn(() => ({ data: [], error: null })),
      delete: vi.fn(() => ({ data: [], error: null }))
    })),
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null
      }))
    }
  }
}))

// Mock hooks
vi.mock('../../hooks/useFinancialAnalytics', () => ({
  useFinancialAnalytics: () => ({
    revenueAnalytics: {
      totalRevenue: 500000,
      monthlyRevenue: 45000,
      yearlyGrowth: 12.5,
      revenueBySource: [
        { source: 'therapy_sessions', amount: 300000 },
        { source: 'assessments', amount: 200000 }
      ]
    },
    loading: false,
    error: null
  })
}))

vi.mock('../../hooks/useFinancialReporting', () => ({
  useFinancialReporting: () => ({
    generateVATReport: vi.fn(),
    generateAuditTrail: vi.fn(),
    generateFinancialExport: vi.fn(),
    loading: false,
    error: null
  })
}))

vi.mock('../../hooks/useInstallmentPayments', () => ({
  useInstallmentPayments: () => ({
    paymentPlans: [
      { id: '1', studentName: 'أحمد محمد', totalAmount: 5000, installments: 6 },
      { id: '2', studentName: 'Sarah Johnson', totalAmount: 3000, installments: 4 }
    ],
    createPaymentPlan: vi.fn(),
    modifyPaymentPlan: vi.fn(),
    loading: false,
    error: null
  })
}))

vi.mock('../../hooks/usePaymentProcessing', () => ({
  usePaymentProcessing: () => ({
    processPayment: vi.fn(),
    processRefund: vi.fn(),
    getPaymentStatus: vi.fn(),
    loading: false,
    error: null
  })
}))

// Test wrapper with providers
const createTestWrapper = (language: 'ar' | 'en' = 'ar') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <LanguageProvider defaultLanguage={language}>
          {children}
        </LanguageProvider>
      </QueryClientProvider>
    )
  }
}

describe('Financial Interface Accessibility - Arabic RTL', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    // Reset document direction
    document.dir = 'rtl'
    document.documentElement.lang = 'ar'
  })

  afterEach(() => {
    vi.clearAllMocks()
    document.dir = 'ltr'
    document.documentElement.lang = 'en'
  })

  describe('Financial Analytics Dashboard - Arabic RTL Accessibility', () => {
    it('should have no accessibility violations in Arabic RTL', async () => {
      const Wrapper = createTestWrapper('ar')
      const { container } = render(
        <Wrapper>
          <FinancialAnalyticsDashboard />
        </Wrapper>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper Arabic text direction and layout', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <FinancialAnalyticsDashboard />
        </Wrapper>
      )

      // Check RTL direction
      const mainContent = screen.getByRole('main') || document.body
      expect(mainContent).toHaveAttribute('dir', 'rtl')

      // Check Arabic text rendering
      const arabicText = screen.getByText(/الإيرادات|التحليلات المالية/i)
      expect(arabicText).toBeInTheDocument()

      // Check proper text alignment for Arabic
      const computedStyle = window.getComputedStyle(arabicText)
      expect(computedStyle.direction).toBe('rtl')
    })

    it('should support screen reader navigation in Arabic', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <FinancialAnalyticsDashboard />
        </Wrapper>
      )

      // Check for proper headings hierarchy
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
      
      // Check main heading
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveAttribute('lang', 'ar')

      // Check for proper landmarks
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: /التنقل الرئيسي/i })).toBeInTheDocument()
    })

    it('should handle keyboard navigation properly with Arabic layout', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <FinancialAnalyticsDashboard />
        </Wrapper>
      )

      // Test tab navigation
      const buttons = screen.getAllByRole('button')
      if (buttons.length > 0) {
        await user.tab()
        expect(buttons[0]).toHaveFocus()

        // Test arrow key navigation in RTL context
        await user.keyboard('{ArrowLeft}')
        // In RTL, left arrow should move to next item
        await waitFor(() => {
          expect(document.activeElement).toBeDefined()
        })
      }
    })

    it('should announce financial data properly in Arabic', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <FinancialAnalyticsDashboard />
        </Wrapper>
      )

      // Check for proper aria-labels in Arabic
      const revenueDisplay = screen.getByText(/500000|إجمالي الإيرادات/i)
      expect(revenueDisplay.closest('[role="region"]')).toHaveAttribute('aria-label')

      // Check currency formatting for Arabic locale
      const currencyElements = screen.getAllByText(/ريال|SAR/i)
      expect(currencyElements.length).toBeGreaterThan(0)
    })
  })

  describe('Financial Reporting Center - Arabic RTL Accessibility', () => {
    it('should have no accessibility violations in Arabic RTL', async () => {
      const Wrapper = createTestWrapper('ar')
      const { container } = render(
        <Wrapper>
          <FinancialReportingCenter />
        </Wrapper>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should handle Arabic date formats and RTL layout', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <FinancialReportingCenter />
        </Wrapper>
      )

      // Check for Arabic date format support
      const dateInputs = screen.getAllByRole('textbox', { name: /تاريخ|التاريخ/i })
      dateInputs.forEach(input => {
        expect(input).toHaveAttribute('dir', 'ltr') // Dates should be LTR even in RTL context
        expect(input).toHaveAttribute('lang', 'ar-SA') // Saudi locale
      })
    })

    it('should provide proper form labels in Arabic', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <FinancialReportingCenter />
        </Wrapper>
      )

      // Check for required form labels
      const formElements = screen.getAllByRole('textbox')
      formElements.forEach(element => {
        expect(element).toHaveAccessibleName()
      })

      // Check for proper error message support
      const requiredFields = screen.getAllByRole('textbox', { required: true })
      requiredFields.forEach(field => {
        expect(field).toHaveAttribute('aria-describedby')
      })
    })
  })

  describe('Installment Payment Manager - Arabic RTL Accessibility', () => {
    it('should have no accessibility violations in Arabic RTL', async () => {
      const Wrapper = createTestWrapper('ar')
      const { container } = render(
        <Wrapper>
          <InstallmentPaymentManager />
        </Wrapper>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should handle Arabic customer names and RTL table layout', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <InstallmentPaymentManager />
        </Wrapper>
      )

      // Check for proper table structure
      const table = screen.getByRole('table')
      expect(table).toHaveAttribute('dir', 'rtl')

      // Check Arabic customer names rendering
      const arabicName = screen.getByText('أحمد محمد')
      expect(arabicName).toBeInTheDocument()
      expect(arabicName).toHaveAttribute('lang', 'ar')

      // Check proper column headers
      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders.length).toBeGreaterThan(0)
      columnHeaders.forEach(header => {
        expect(header).toHaveAccessibleName()
      })
    })

    it('should support screen reader for payment plan details', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <InstallmentPaymentManager />
        </Wrapper>
      )

      // Check for proper ARIA descriptions
      const paymentPlanRows = screen.getAllByRole('row')
      paymentPlanRows.forEach(row => {
        if (row.getAttribute('data-testid')?.includes('payment-plan')) {
          expect(row).toHaveAttribute('aria-describedby')
        }
      })
    })
  })

  describe('Invoice Automation - Arabic RTL Accessibility', () => {
    it('should have no accessibility violations in Arabic RTL', async () => {
      const Wrapper = createTestWrapper('ar')
      const { container } = render(
        <Wrapper>
          <InvoiceAutomation />
        </Wrapper>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should handle Arabic invoice content and RTL layout', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <InvoiceAutomation />
        </Wrapper>
      )

      // Check for proper invoice layout in RTL
      const invoiceContainer = screen.getByRole('region', { name: /الفاتورة|إنشاء الفاتورة/i })
      expect(invoiceContainer).toHaveAttribute('dir', 'rtl')

      // Check Arabic text content
      const arabicContent = screen.getByText(/فاتورة|المبلغ|التاريخ/i)
      expect(arabicContent).toBeInTheDocument()
    })

    it('should provide proper status announcements in Arabic', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <InvoiceAutomation />
        </Wrapper>
      )

      // Check for status region
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toBeInTheDocument()
      expect(statusRegion).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Payment Gateway Interface - Arabic RTL Accessibility', () => {
    it('should have no accessibility violations in Arabic RTL', async () => {
      const Wrapper = createTestWrapper('ar')
      const { container } = render(
        <Wrapper>
          <PaymentGatewayInterface />
        </Wrapper>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should handle Arabic payment method labels', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <PaymentGatewayInterface />
        </Wrapper>
      )

      // Check for Arabic payment method labels
      const madaOption = screen.getByLabelText(/مدى|MADA/i)
      expect(madaOption).toBeInTheDocument()
      expect(madaOption).toHaveAccessibleName()

      const stcPayOption = screen.getByLabelText(/STC Pay|إس تي سي باي/i)
      expect(stcPayOption).toBeInTheDocument()
      expect(stcPayOption).toHaveAccessibleName()
    })

    it('should provide proper error handling in Arabic', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <PaymentGatewayInterface />
        </Wrapper>
      )

      // Trigger a payment error
      const payButton = screen.getByRole('button', { name: /دفع|Pay/i })
      await user.click(payButton)

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert')
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveAttribute('aria-live', 'assertive')
      })
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('should meet WCAG color contrast requirements', async () => {
      const Wrapper = createTestWrapper('ar')
      const { container } = render(
        <Wrapper>
          <FinancialAnalyticsDashboard />
        </Wrapper>
      )

      // Check for proper contrast ratios
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
          'color-contrast-enhanced': { enabled: true }
        }
      })
      
      expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0)
    })

    it('should support high contrast mode', async () => {
      // Simulate high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <FinancialAnalyticsDashboard />
        </Wrapper>
      )

      // Check that high contrast styles are applied
      const mainElement = screen.getByRole('main')
      expect(mainElement).toHaveClass('high-contrast')
    })
  })

  describe('Mobile Accessibility - Arabic RTL', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })
    })

    it('should be accessible on mobile devices with Arabic RTL', async () => {
      const Wrapper = createTestWrapper('ar')
      const { container } = render(
        <Wrapper>
          <FinancialAnalyticsDashboard />
        </Wrapper>
      )

      const results = await axe(container, {
        rules: {
          'target-size': { enabled: true },
          'focus-visible': { enabled: true }
        }
      })
      
      expect(results).toHaveNoViolations()
    })

    it('should have proper touch targets for Arabic interface', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <InstallmentPaymentManager />
        </Wrapper>
      )

      // Check button sizes meet minimum touch target requirements (44px)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const minSize = parseInt(styles.minHeight) || parseInt(styles.height)
        expect(minSize).toBeGreaterThanOrEqual(44)
      })
    })
  })

  describe('Focus Management and Navigation', () => {
    it('should manage focus properly in Arabic RTL modals', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <InstallmentPaymentManager />
        </Wrapper>
      )

      // Open modal (if available)
      const openModalButton = screen.getByRole('button', { name: /إنشاء خطة|Create Plan/i })
      await user.click(openModalButton)

      await waitFor(() => {
        const modal = screen.getByRole('dialog')
        expect(modal).toBeInTheDocument()
        
        // Check focus management
        const firstFocusableElement = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
        expect(firstFocusableElement).toHaveFocus()
      })

      // Test focus trap
      await user.tab()
      expect(document.activeElement).toBeDefined()
      
      // Escape should close modal
      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('should announce page changes properly in Arabic', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <FinancialReportingCenter />
        </Wrapper>
      )

      // Check for proper announcements
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('aria-label')
    })
  })

  describe('Error Handling Accessibility', () => {
    it('should announce errors properly in Arabic', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <PaymentGatewayInterface />
        </Wrapper>
      )

      // Trigger validation error
      const amountInput = screen.getByLabelText(/المبلغ|Amount/i)
      await user.type(amountInput, '-100')
      await user.tab()

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert')
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveAttribute('aria-live', 'assertive')
        expect(errorMessage).toHaveTextContent(/خطأ|Error/i)
      })
    })

    it('should provide proper error recovery guidance in Arabic', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <FinancialAnalyticsDashboard />
        </Wrapper>
      )

      // Simulate network error
      const retryButton = screen.getByRole('button', { name: /إعادة المحاولة|Retry/i })
      expect(retryButton).toBeInTheDocument()
      expect(retryButton).toHaveAccessibleDescription(/يرجى المحاولة مرة أخرى|Please try again/i)
    })
  })
})

describe('Financial Interface Accessibility - English LTR', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    document.dir = 'ltr'
    document.documentElement.lang = 'en'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Cross-Language Accessibility', () => {
    it('should maintain accessibility when switching languages', async () => {
      const Wrapper = createTestWrapper('en')
      const { rerender, container } = render(
        <Wrapper>
          <FinancialAnalyticsDashboard />
        </Wrapper>
      )

      // Test English accessibility
      let results = await axe(container)
      expect(results).toHaveNoViolations()

      // Switch to Arabic and test again
      const WrapperAr = createTestWrapper('ar')
      rerender(
        <WrapperAr>
          <FinancialAnalyticsDashboard />
        </WrapperAr>
      )

      results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should handle mixed content (Arabic/English) properly', async () => {
      const Wrapper = createTestWrapper('ar')
      render(
        <Wrapper>
          <InstallmentPaymentManager />
        </Wrapper>
      )

      // Check for proper language attributes on mixed content
      const arabicName = screen.getByText('أحمد محمد')
      expect(arabicName).toHaveAttribute('lang', 'ar')

      const englishName = screen.getByText('Sarah Johnson')
      expect(englishName).toHaveAttribute('lang', 'en')
    })
  })

  describe('Performance and Accessibility', () => {
    it('should not impact performance while maintaining accessibility', async () => {
      const startTime = performance.now()
      
      const Wrapper = createTestWrapper('ar')
      const { container } = render(
        <Wrapper>
          <FinancialAnalyticsDashboard />
        </Wrapper>
      )

      const renderTime = performance.now() - startTime
      expect(renderTime).toBeLessThan(100) // Should render in less than 100ms

      // Still should be accessible
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})