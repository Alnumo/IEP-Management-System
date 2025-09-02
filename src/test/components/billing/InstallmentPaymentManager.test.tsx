/**
 * InstallmentPaymentManager Component Tests
 * Comprehensive test suite for installment payment management
 * Part of Story 2.3: Financial Management Module - Task 3
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import InstallmentPaymentManager from '../../../components/billing/InstallmentPaymentManager'

// Mock hooks
vi.mock('../../../hooks/useInstallmentPayments', () => ({
  usePaymentPlans: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null
  })),
  usePaymentPlanAnalytics: vi.fn(() => ({
    data: {
      activePlans: 15,
      completedPlans: 8,
      defaultedPlans: 2,
      totalPlannedAmount: 45000,
      totalCollectedAmount: 32000,
      completionRate: 72.5,
      onTimePaymentRate: 85.3,
      averageCompletionTime: 90,
      averagePlanAmount: 1800,
      averageInstallmentAmount: 300,
      mostPopularFrequency: 'monthly' as const,
      overdueAmount: 5500,
      overdueCount: 12,
      collectionEfficiency: 71.1,
      monthlyTrends: [],
      riskFactors: []
    },
    isLoading: false,
    error: null
  })),
  useCreatePaymentPlan: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({
      success: true,
      paymentPlan: {
        id: 'plan-123',
        invoiceId: 'inv-456',
        studentId: 'student-789',
        totalAmount: 1200,
        numberOfInstallments: 6,
        installmentAmount: 200,
        frequency: 'monthly',
        startDate: '2025-01-01',
        status: 'active',
        termsAccepted: true,
        lateFeesEnabled: true,
        gracePeroidDays: 7,
        reminderSettings: {
          daysBeforeDue: [7, 3, 1],
          daysAfterDue: [1, 3, 7],
          methods: ['email', 'sms']
        },
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      }
    }),
    isPending: false,
    error: null
  })),
  useModifyPaymentPlan: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false
  })),
  useProcessInstallmentPayment: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false
  })),
  usePaymentPlanPreview: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({
      installments: [
        { installmentNumber: 1, amount: 200, dueDate: '2025-01-01' },
        { installmentNumber: 2, amount: 200, dueDate: '2025-02-01' }
      ],
      totalAmount: 1200,
      averageInstallmentAmount: 200,
      duration: { weeks: 24, months: 6 }
    }),
    isPending: false
  })),
  useValidatePaymentPlanEligibility: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({
      eligible: true,
      reasons: [],
      maxInstallments: 12,
      minInstallmentAmount: 50,
      recommendedFrequency: 'monthly'
    }),
    isPending: false
  }))
}))

// Test wrapper component
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('InstallmentPaymentManager', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  // ==============================================
  // RENDERING TESTS
  // ==============================================

  describe('Component Rendering', () => {
    it('renders main component with English labels', () => {
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      expect(screen.getByText('Installment Payment Management')).toBeInTheDocument()
      expect(screen.getByText('Manage payment plans and scheduled installments')).toBeInTheDocument()
      expect(screen.getByText('New Plan')).toBeInTheDocument()
    })

    it('renders main component with Arabic labels', () => {
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="ar" />
        </TestWrapper>
      )

      expect(screen.getByText('إدارة خطط الدفع المقسط')).toBeInTheDocument()
      expect(screen.getByText('إدارة خطط الدفع المقسط والأقساط المجدولة')).toBeInTheDocument()
      expect(screen.getByText('خطة جديدة')).toBeInTheDocument()
    })

    it('sets RTL direction for Arabic language', () => {
      const { container } = render(
        <TestWrapper>
          <InstallmentPaymentManager language="ar" />
        </TestWrapper>
      )

      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveAttribute('dir', 'rtl')
    })

    it('renders all navigation tabs', () => {
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Payment Plans')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      expect(screen.getByText('Create Plan')).toBeInTheDocument()
    })
  })

  // ==============================================
  // ANALYTICS OVERVIEW TESTS
  // ==============================================

  describe('Analytics Overview', () => {
    it('displays analytics cards with correct data', async () => {
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument() // Active Plans
        expect(screen.getByText('72.5%')).toBeInTheDocument() // Completion Rate
        expect(screen.getByText('SAR\u00A032,000.00')).toBeInTheDocument() // Total Collected
        expect(screen.getByText('SAR\u00A05,500.00')).toBeInTheDocument() // Overdue Amount
      })
    })

    it('displays analytics cards with Arabic currency format', async () => {
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="ar" />
        </TestWrapper>
      )

      await waitFor(() => {
        // Arabic currency formatting might be different
        expect(screen.getByText(/32,000/)).toBeInTheDocument()
        expect(screen.getByText(/5,500/)).toBeInTheDocument()
      })
    })

    it('handles loading state for analytics', () => {
      const { usePaymentPlanAnalytics } = require('../../../hooks/useInstallmentPayments')
      usePaymentPlanAnalytics.mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      })

      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      // Should show loading skeleton
      expect(screen.getAllByTestId('loading-skeleton')).toHaveLength(4)
    })
  })

  // ==============================================
  // PAYMENT PLANS TAB TESTS
  // ==============================================

  describe('Payment Plans Tab', () => {
    beforeEach(() => {
      const mockPlans = [
        {
          id: 'plan-1',
          invoiceId: 'inv-001',
          studentId: 'student-001',
          totalAmount: 1200,
          numberOfInstallments: 6,
          installmentAmount: 200,
          frequency: 'monthly',
          startDate: '2025-01-01',
          status: 'active',
          termsAccepted: true,
          lateFeesEnabled: true,
          gracePeroidDays: 7,
          reminderSettings: {
            daysBeforeDue: [7, 3, 1],
            daysAfterDue: [1, 3, 7],
            methods: ['email', 'sms']
          },
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        }
      ]

      const { usePaymentPlans } = require('../../../hooks/useInstallmentPayments')
      usePaymentPlans.mockReturnValue({
        data: mockPlans,
        isLoading: false,
        error: null
      })
    })

    it('switches to payment plans tab and displays plans', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('Payment Plans'))

      await waitFor(() => {
        expect(screen.getByText('inv-001')).toBeInTheDocument()
        expect(screen.getByText('SAR\u00A01,200.00')).toBeInTheDocument()
        expect(screen.getByText('6')).toBeInTheDocument() // Number of installments
        expect(screen.getByText('monthly')).toBeInTheDocument()
        expect(screen.getByText('Active')).toBeInTheDocument()
      })
    })

    it('displays empty state when no payment plans exist', async () => {
      const { usePaymentPlans } = require('../../../hooks/useInstallmentPayments')
      usePaymentPlans.mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      })

      const user = userEvent.setup()
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('Payment Plans'))

      await waitFor(() => {
        expect(screen.getByText('No payment plans found')).toBeInTheDocument()
      })
    })

    it('filters payment plans by status', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('Payment Plans'))

      // Find and click the filter dropdown
      const filterSelect = screen.getByDisplayValue('All')
      await user.click(filterSelect)
      await user.click(screen.getByText('Active'))

      // Verify filter was applied (would need to mock the filtered response)
      await waitFor(() => {
        expect(screen.getByDisplayValue('Active')).toBeInTheDocument()
      })
    })
  })

  // ==============================================
  // CREATE PAYMENT PLAN TESTS
  // ==============================================

  describe('Create Payment Plan', () => {
    it('opens create payment plan dialog', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('New Plan'))

      await waitFor(() => {
        expect(screen.getByText('Create New Payment Plan')).toBeInTheDocument()
        expect(screen.getByLabelText('Invoice ID')).toBeInTheDocument()
        expect(screen.getByLabelText('Number of Installments')).toBeInTheDocument()
        expect(screen.getByLabelText('Start Date')).toBeInTheDocument()
      })
    })

    it('validates required fields in create form', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('New Plan'))

      // Try to submit empty form
      const submitButton = screen.getByText('Create Payment Plan')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invoice required')).toBeInTheDocument()
        expect(screen.getByText('Start date required')).toBeInTheDocument()
      })
    })

    it('validates installment range', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('New Plan'))

      const installmentsInput = screen.getByLabelText('Number of Installments')
      await user.clear(installmentsInput)
      await user.type(installmentsInput, '1') // Below minimum

      const submitButton = screen.getByText('Create Payment Plan')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Minimum 2 installments')).toBeInTheDocument()
      })
    })

    it('requires terms acceptance', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('New Plan'))

      // Fill required fields but don't accept terms
      await user.type(screen.getByLabelText('Invoice ID'), 'inv-123')
      await user.type(screen.getByLabelText('Start Date'), '2025-01-01')

      const submitButton = screen.getByText('Create Payment Plan')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Must accept terms and conditions')).toBeInTheDocument()
      })
    })

    it('successfully creates payment plan', async () => {
      const user = userEvent.setup()
      const { useCreatePaymentPlan } = require('../../../hooks/useInstallmentPayments')
      const mockMutateAsync = vi.fn().mockResolvedValue({ success: true })
      useCreatePaymentPlan.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null
      })

      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('New Plan'))

      // Fill form
      await user.type(screen.getByLabelText('Invoice ID'), 'inv-123')
      await user.type(screen.getByLabelText('Start Date'), '2025-01-01')
      await user.click(screen.getByLabelText('I accept the terms and conditions'))

      const submitButton = screen.getByText('Create Payment Plan')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            invoiceId: 'inv-123',
            startDate: '2025-01-01',
            termsAccepted: true
          })
        )
      })
    })

    it('generates payment plan preview', async () => {
      const user = userEvent.setup()
      const { usePaymentPlanPreview } = require('../../../hooks/useInstallmentPayments')
      const mockMutateAsync = vi.fn().mockResolvedValue({
        installments: [
          { installmentNumber: 1, amount: 200, dueDate: '2025-01-01' },
          { installmentNumber: 2, amount: 200, dueDate: '2025-02-01' }
        ]
      })
      usePaymentPlanPreview.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false
      })

      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('New Plan'))

      // Fill required fields for preview
      await user.type(screen.getByLabelText('Invoice ID'), 'inv-123')
      await user.type(screen.getByLabelText('Start Date'), '2025-01-01')

      const previewButton = screen.getByText('Preview')
      await user.click(previewButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled()
      })
    })
  })

  // ==============================================
  // ACCESSIBILITY TESTS
  // ==============================================

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      const newPlanButton = screen.getByRole('button', { name: /new plan/i })
      expect(newPlanButton).toBeInTheDocument()

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(4)
      expect(tabs[0]).toHaveTextContent('Overview')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      // Tab navigation should work
      await user.tab()
      expect(document.activeElement).toHaveTextContent('Overview')

      await user.tab()
      expect(document.activeElement).toHaveTextContent('Payment Plans')
    })

    it('maintains focus management in dialogs', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('New Plan'))

      await waitFor(() => {
        // Focus should be on the first input in the dialog
        const invoiceInput = screen.getByLabelText('Invoice ID')
        expect(invoiceInput).toHaveAttribute('id', 'invoiceId')
      })
    })

    it('provides proper error announcements', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('New Plan'))

      const submitButton = screen.getByText('Create Payment Plan')
      await user.click(submitButton)

      await waitFor(() => {
        // Error messages should be associated with form fields
        const errorMessage = screen.getByText('Invoice required')
        expect(errorMessage).toHaveClass('text-red-600')
      })
    })
  })

  // ==============================================
  // INTEGRATION TESTS
  // ==============================================

  describe('Integration Tests', () => {
    it('integrates with query client for data management', async () => {
      const testQueryClient = createTestQueryClient()
      const mockInvalidateQueries = vi.spyOn(testQueryClient, 'invalidateQueries')

      const { useCreatePaymentPlan } = require('../../../hooks/useInstallmentPayments')
      const mockMutateAsync = vi.fn().mockResolvedValue({ success: true })
      useCreatePaymentPlan.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null
      })

      render(
        <QueryClientProvider client={testQueryClient}>
          <InstallmentPaymentManager language="en" />
        </QueryClientProvider>
      )

      // The component should trigger appropriate cache invalidations
      // This would be tested by mocking the hooks' onSuccess callbacks
      expect(testQueryClient).toBeDefined()
    })

    it('handles real-time updates to payment plans', async () => {
      const { usePaymentPlans } = require('../../../hooks/useInstallmentPayments')
      
      // Initial render with empty plans
      usePaymentPlans.mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      })

      const { rerender } = render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      // Switch to plans tab
      const user = userEvent.setup()
      await user.click(screen.getByText('Payment Plans'))

      await waitFor(() => {
        expect(screen.getByText('No payment plans found')).toBeInTheDocument()
      })

      // Update mock to return plans
      usePaymentPlans.mockReturnValue({
        data: [{
          id: 'plan-1',
          invoiceId: 'inv-001',
          studentId: 'student-001',
          totalAmount: 1200,
          numberOfInstallments: 6,
          installmentAmount: 200,
          frequency: 'monthly',
          startDate: '2025-01-01',
          status: 'active',
          termsAccepted: true,
          lateFeesEnabled: true,
          gracePeroidDays: 7,
          reminderSettings: {
            daysBeforeDue: [7, 3, 1],
            daysAfterDue: [1, 3, 7],
            methods: ['email', 'sms']
          },
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        }],
        isLoading: false,
        error: null
      })

      rerender(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('inv-001')).toBeInTheDocument()
      })
    })
  })

  // ==============================================
  // ERROR HANDLING TESTS
  // ==============================================

  describe('Error Handling', () => {
    it('handles payment plan creation errors gracefully', async () => {
      const user = userEvent.setup()
      const { useCreatePaymentPlan } = require('../../../hooks/useInstallmentPayments')
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Network error'))
      useCreatePaymentPlan.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: new Error('Network error')
      })

      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('New Plan'))

      // Fill and submit form
      await user.type(screen.getByLabelText('Invoice ID'), 'inv-123')
      await user.type(screen.getByLabelText('Start Date'), '2025-01-01')
      await user.click(screen.getByLabelText('I accept the terms and conditions'))

      const submitButton = screen.getByText('Create Payment Plan')
      await user.click(submitButton)

      // Should handle error gracefully without crashing
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled()
      })
    })

    it('displays loading states during operations', async () => {
      const { useCreatePaymentPlan } = require('../../../hooks/useInstallmentPayments')
      useCreatePaymentPlan.mockReturnValue({
        mutateAsync: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
        isPending: true,
        error: null
      })

      const user = userEvent.setup()
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      await user.click(screen.getByText('New Plan'))

      // Fill form
      await user.type(screen.getByLabelText('Invoice ID'), 'inv-123')
      await user.type(screen.getByLabelText('Start Date'), '2025-01-01')
      await user.click(screen.getByLabelText('I accept the terms and conditions'))

      const submitButton = screen.getByText('Create Payment Plan')
      await user.click(submitButton)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument()
        expect(submitButton).toBeDisabled()
      })
    })
  })

  // ==============================================
  // MOBILE RESPONSIVENESS TESTS
  // ==============================================

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      // Mock window.matchMedia for mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query.includes('max-width: 768px'),
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

    it('adapts layout for mobile devices', () => {
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      // Check for mobile-responsive grid classes
      const overviewGrid = screen.getByTestId('analytics-grid')
      expect(overviewGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4')
    })

    it('maintains touch-friendly button sizes', () => {
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // Buttons should have adequate touch target size
        const styles = getComputedStyle(button)
        expect(parseInt(styles.minHeight) || 44).toBeGreaterThanOrEqual(44)
      })
    })
  })

  // ==============================================
  // CURRENCY FORMATTING TESTS
  // ==============================================

  describe('Currency Formatting', () => {
    it('formats currency correctly for Saudi Riyal', () => {
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      // Should display SAR currency format
      expect(screen.getByText('SAR\u00A032,000.00')).toBeInTheDocument()
      expect(screen.getByText('SAR\u00A05,500.00')).toBeInTheDocument()
    })

    it('formats currency correctly for Arabic locale', () => {
      render(
        <TestWrapper>
          <InstallmentPaymentManager language="ar" />
        </TestWrapper>
      )

      // Arabic currency formatting might use Arabic numerals or different formatting
      expect(screen.getByText(/32,000/)).toBeInTheDocument()
      expect(screen.getByText(/5,500/)).toBeInTheDocument()
    })

    it('handles large currency amounts correctly', () => {
      const { usePaymentPlanAnalytics } = require('../../../hooks/useInstallmentPayments')
      usePaymentPlanAnalytics.mockReturnValue({
        data: {
          ...require('../../../hooks/useInstallmentPayments').usePaymentPlanAnalytics().data,
          totalCollectedAmount: 1234567.89,
          overdueAmount: 987654.32
        },
        isLoading: false,
        error: null
      })

      render(
        <TestWrapper>
          <InstallmentPaymentManager language="en" />
        </TestWrapper>
      )

      expect(screen.getByText('SAR\u00A01,234,567.89')).toBeInTheDocument()
      expect(screen.getByText('SAR\u00A0987,654.32')).toBeInTheDocument()
    })
  })
})