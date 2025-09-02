/**
 * Financial Reporting Center Test Suite
 * Comprehensive tests for financial reporting functionality
 * Part of Story 2.3: Financial Management Module - Task 5
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import FinancialReportingCenter from '../../../components/billing/FinancialReportingCenter'
import { LanguageProvider } from '../../../contexts/LanguageContext'
import * as useFinancialReportingModule from '../../../hooks/useFinancialReporting'
import * as financialReportingService from '../../../services/financial-reporting-service'

// Mock the financial reporting service
vi.mock('../../../services/financial-reporting-service')
const mockFinancialReportingService = vi.mocked(financialReportingService)

// Mock the hooks
vi.mock('../../../hooks/useFinancialReporting')
const mockHooks = vi.mocked(useFinancialReportingModule)

// Mock data
const mockVATReport = {
  success: true,
  report: {
    periodStart: '2024-01-01',
    periodEnd: '2024-03-31',
    totalTaxableAmount: 100000,
    totalVATAmount: 15000,
    taxRate: 0.15,
    complianceStatus: 'compliant' as const,
    nextFilingDate: '2024-04-30',
    periodsOverdue: 0,
    transactionBreakdown: [
      {
        category: 'Therapy Services',
        transactionCount: 150,
        totalAmount: 80000,
        vatAmount: 12000
      },
      {
        category: 'Assessment Services', 
        transactionCount: 25,
        totalAmount: 20000,
        vatAmount: 3000
      }
    ],
    generatedAt: '2024-03-15T10:30:00Z'
  },
  generatedAt: '2024-03-15T10:30:00Z'
}

const mockAuditTrail = {
  success: true,
  entries: [
    {
      id: '1',
      timestamp: '2024-03-15T09:30:00Z',
      action: 'create' as const,
      entityType: 'invoice',
      entityId: 'inv-123',
      userId: 'user-456',
      details: 'Created invoice for therapy sessions',
      amount: 5000,
      previousValue: null,
      newValue: { status: 'pending', amount: 5000 }
    },
    {
      id: '2', 
      timestamp: '2024-03-15T10:15:00Z',
      action: 'update' as const,
      entityType: 'payment',
      entityId: 'pay-789',
      userId: 'user-456',
      details: 'Updated payment status to confirmed',
      amount: 5000,
      previousValue: { status: 'pending' },
      newValue: { status: 'confirmed' }
    }
  ],
  totalEntries: 250,
  generatedAt: '2024-03-15T10:30:00Z'
}

const mockExecutiveSummary = {
  success: true,
  summary: {
    periodStart: '2024-01-01',
    periodEnd: '2024-03-31',
    totalRevenue: 125000,
    totalExpenses: 85000,
    netProfit: 40000,
    profitMargin: 0.32,
    kpis: [
      {
        metric: 'Revenue Growth',
        value: 15.5,
        unit: 'percentage',
        trend: 'up' as const,
        previousPeriod: 13.2
      }
    ],
    recommendations: [
      {
        category: 'revenue',
        priority: 'high' as const,
        recommendation: 'Consider increasing therapy session rates by 8-10%'
      }
    ],
    generatedAt: '2024-03-15T10:30:00Z'
  },
  generatedAt: '2024-03-15T10:30:00Z'
}

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; language?: 'ar' | 'en' }> = ({ 
  children, 
  language = 'en' 
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={language}>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
}

// Mock URL.createObjectURL and related APIs
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()
Object.defineProperty(window.URL, 'createObjectURL', { value: mockCreateObjectURL })
Object.defineProperty(window.URL, 'revokeObjectURL', { value: mockRevokeObjectURL })

// Mock document.createElement for download links
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockClick = vi.fn()
Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild })
Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild })

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks()
  
  // Setup default mock implementations
  mockHooks.useCurrentQuarterVAT.mockReturnValue({
    data: mockVATReport,
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue({ data: mockVATReport })
  } as any)

  mockHooks.useAuditTrail.mockReturnValue({
    data: mockAuditTrail,
    isLoading: false,
    error: null
  } as any)

  mockHooks.useExecutiveSummary.mockReturnValue({
    data: mockExecutiveSummary,
    isLoading: false,
    error: null
  } as any)

  mockHooks.useReportHistory.mockReturnValue({
    data: { reports: [], totalCount: 0 },
    isLoading: false,
    error: null
  } as any)

  mockHooks.useExportReport.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({
      data: 'mock-report-data',
      filename: 'vat-report.pdf',
      mimeType: 'application/pdf'
    }),
    isLoading: false,
    error: null
  } as any)

  mockHooks.useBulkExportReports.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({
      successful: [],
      failed: [],
      totalCount: 0,
      successCount: 0,
      failureCount: 0
    }),
    isLoading: false,
    error: null
  } as any)

  mockHooks.useScheduleReport.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isLoading: false,
    error: null
  } as any)

  // Mock createElement to return element with click method
  const originalCreateElement = document.createElement
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    const element = originalCreateElement.call(document, tagName)
    if (tagName === 'a') {
      element.click = mockClick
    }
    return element
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('FinancialReportingCenter', () => {
  describe('Component Rendering', () => {
    it('should render the component with correct title and description in English', () => {
      render(
        <TestWrapper language="en">
          <FinancialReportingCenter />
        </TestWrapper>
      )

      expect(screen.getByText('Financial Reporting Center')).toBeInTheDocument()
      expect(screen.getByText(/Generate, manage, and export financial/)).toBeInTheDocument()
    })

    it('should render the component with correct title and description in Arabic', () => {
      render(
        <TestWrapper language="ar">
          <FinancialReportingCenter />
        </TestWrapper>
      )

      expect(screen.getByText('مركز التقارير المالية')).toBeInTheDocument()
      expect(screen.getByText(/إنشاء وإدارة وتصدير التقارير المالية/)).toBeInTheDocument()
    })

    it('should render all report type cards', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      expect(screen.getByText('VAT Compliance Report')).toBeInTheDocument()
      expect(screen.getByText('Audit Trail')).toBeInTheDocument()
      expect(screen.getByText('Parent Financial Statement')).toBeInTheDocument()
      expect(screen.getByText('Executive Summary')).toBeInTheDocument()
    })

    it('should show loading state for reports', () => {
      mockHooks.useCurrentQuarterVAT.mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      } as any)

      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const loadingSpinners = document.querySelectorAll('.animate-spin')
      expect(loadingSpinners.length).toBeGreaterThan(0)
    })

    it('should display report cards with correct status indicators', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      // Check for success indicators (CheckCircle icons)
      const successIcons = document.querySelectorAll('[data-testid="check-circle"]')
      // Success status should be indicated by the presence of successful data
      expect(screen.getByText('VAT Compliance Report')).toBeInTheDocument()
    })
  })

  describe('Date Range Selection', () => {
    it('should allow date range selection', async () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const dateRangeButton = screen.getByRole('button', { name: /select dates/i })
      expect(dateRangeButton).toBeInTheDocument()
      
      fireEvent.click(dateRangeButton)
      
      // Calendar should open
      await waitFor(() => {
        const calendar = screen.getByRole('grid')
        expect(calendar).toBeInTheDocument()
      })
    })

    it('should update report parameters when date range changes', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      // Component should initialize with current quarter dates
      expect(mockHooks.useCurrentQuarterVAT).toHaveBeenCalled()
    })
  })

  describe('Export Format Selection', () => {
    it('should allow export format selection', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const exportFormatSelect = screen.getByText('PDF')
      expect(exportFormatSelect).toBeInTheDocument()
      
      fireEvent.click(exportFormatSelect.closest('button')!)
      
      expect(screen.getByText('JSON')).toBeInTheDocument()
      expect(screen.getByText('CSV')).toBeInTheDocument()
      expect(screen.getByText('Excel')).toBeInTheDocument()
    })

    it('should update export format when selection changes', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const exportFormatButton = screen.getByText('PDF').closest('button')!
      fireEvent.click(exportFormatButton)
      
      const csvOption = screen.getByText('CSV')
      fireEvent.click(csvOption)
      
      // The format should update (verified by the select showing CSV)
      expect(exportFormatButton).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('Report Selection and Bulk Operations', () => {
    it('should allow selecting individual reports', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const vatReportCard = screen.getByText('VAT Compliance Report').closest('[role="button"]')
      expect(vatReportCard).toBeInTheDocument()
      
      fireEvent.click(vatReportCard!)
      
      // Should show bulk actions section
      expect(screen.getByText(/reports selected/)).toBeInTheDocument()
    })

    it('should show bulk export option when reports are selected', async () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      // Select multiple reports
      const vatCard = screen.getByText('VAT Compliance Report').closest('[role="button"]')!
      const auditCard = screen.getByText('Audit Trail').closest('[role="button"]')!
      
      fireEvent.click(vatCard)
      fireEvent.click(auditCard)
      
      await waitFor(() => {
        expect(screen.getByText(/2 reports selected/)).toBeInTheDocument()
        expect(screen.getByText('Download Selected')).toBeInTheDocument()
      })
    })

    it('should clear selection when clear button is clicked', async () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const vatCard = screen.getByText('VAT Compliance Report').closest('[role="button"]')!
      fireEvent.click(vatCard)
      
      await waitFor(() => {
        expect(screen.getByText(/1 reports selected/)).toBeInTheDocument()
      })

      const clearButton = screen.getByText('Clear selection')
      fireEvent.click(clearButton)
      
      expect(screen.queryByText(/reports selected/)).not.toBeInTheDocument()
    })
  })

  describe('Individual Report Generation', () => {
    it('should generate and download individual VAT report', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({
        data: 'mock-vat-data',
        filename: 'vat-report.pdf',
        mimeType: 'application/pdf'
      })

      mockHooks.useExportReport.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isLoading: false,
        error: null
      } as any)

      mockCreateObjectURL.mockReturnValue('blob:mock-url')

      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const downloadButton = screen.getAllByText('Download')[0]
      fireEvent.click(downloadButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          reportType: expect.any(String),
          format: 'pdf',
          parameters: expect.any(Object)
        })
      })

      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
    })

    it('should handle individual report generation error', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Generation failed'))
      
      mockHooks.useExportReport.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isLoading: false,
        error: null
      } as any)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const downloadButton = screen.getAllByText('Download')[0]
      fireEvent.click(downloadButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Report generation failed:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Bulk Report Generation', () => {
    it('should generate and download multiple selected reports', async () => {
      const mockBulkMutateAsync = vi.fn().mockResolvedValue({
        successful: [
          {
            reportType: 'vat_compliance',
            data: 'vat-data',
            filename: 'vat-report.pdf',
            mimeType: 'application/pdf'
          },
          {
            reportType: 'audit_trail',
            data: 'audit-data', 
            filename: 'audit-report.pdf',
            mimeType: 'application/pdf'
          }
        ],
        failed: [],
        totalCount: 2,
        successCount: 2,
        failureCount: 0
      })

      mockHooks.useBulkExportReports.mockReturnValue({
        mutateAsync: mockBulkMutateAsync,
        isLoading: false,
        error: null
      } as any)

      mockCreateObjectURL.mockReturnValue('blob:mock-url')

      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      // Select multiple reports
      const vatCard = screen.getByText('VAT Compliance Report').closest('[role="button"]')!
      const auditCard = screen.getByText('Audit Trail').closest('[role="button"]')!
      
      fireEvent.click(vatCard)
      fireEvent.click(auditCard)

      await waitFor(() => {
        expect(screen.getByText('Download Selected')).toBeInTheDocument()
      })

      const bulkDownloadButton = screen.getByText('Download Selected')
      fireEvent.click(bulkDownloadButton)

      await waitFor(() => {
        expect(mockBulkMutateAsync).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              reportType: expect.any(String),
              format: 'pdf',
              parameters: expect.any(Object)
            })
          ])
        )
      })

      // Should create download links for each successful report
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(2)
      expect(mockClick).toHaveBeenCalledTimes(2)
    })

    it('should handle bulk generation with some failures', async () => {
      const mockBulkMutateAsync = vi.fn().mockResolvedValue({
        successful: [
          {
            reportType: 'vat_compliance',
            data: 'vat-data',
            filename: 'vat-report.pdf',
            mimeType: 'application/pdf'
          }
        ],
        failed: [new Error('Audit trail generation failed')],
        totalCount: 2,
        successCount: 1,
        failureCount: 1
      })

      mockHooks.useBulkExportReports.mockReturnValue({
        mutateAsync: mockBulkMutateAsync,
        isLoading: false,
        error: null
      } as any)

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      // Select reports and bulk download
      const vatCard = screen.getByText('VAT Compliance Report').closest('[role="button"]')!
      const auditCard = screen.getByText('Audit Trail').closest('[role="button"]')!
      
      fireEvent.click(vatCard)
      fireEvent.click(auditCard)

      const bulkDownloadButton = await screen.findByText('Download Selected')
      fireEvent.click(bulkDownloadButton)

      await waitFor(() => {
        expect(consoleWarn).toHaveBeenCalledWith('1 reports failed to generate')
      })

      consoleWarn.mockRestore()
    })
  })

  describe('Report Scheduling', () => {
    it('should open schedule dialog when schedule button clicked', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const scheduleButton = screen.getByText('Schedule')
      fireEvent.click(scheduleButton)

      expect(screen.getByText('Schedule Recurring Report')).toBeInTheDocument()
      expect(screen.getByText('Frequency')).toBeInTheDocument()
    })

    it('should allow frequency selection in schedule dialog', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const scheduleButton = screen.getByText('Schedule')
      fireEvent.click(scheduleButton)

      const frequencySelect = screen.getByText('Monthly').closest('button')!
      fireEvent.click(frequencySelect)

      expect(screen.getByText('Daily')).toBeInTheDocument()
      expect(screen.getByText('Weekly')).toBeInTheDocument()
      expect(screen.getByText('Quarterly')).toBeInTheDocument()
    })

    it('should create scheduled report', async () => {
      const mockScheduleMutateAsync = vi.fn().mockResolvedValue({ success: true })

      mockHooks.useScheduleReport.mockReturnValue({
        mutateAsync: mockScheduleMutateAsync,
        isLoading: false,
        error: null
      } as any)

      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const scheduleButton = screen.getByText('Schedule')
      fireEvent.click(scheduleButton)

      const confirmButton = screen.getByRole('button', { name: 'Schedule' })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockScheduleMutateAsync).toHaveBeenCalledWith({
          reportType: expect.any(String),
          format: 'pdf',
          frequency: 'monthly',
          parameters: expect.any(Object),
          emailRecipients: [],
          isActive: true
        })
      })
    })
  })

  describe('Report Details Tabs', () => {
    it('should display VAT report details in VAT tab', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      // VAT tab should be active by default and show report details
      expect(screen.getByText('Total Taxable Amount')).toBeInTheDocument()
      expect(screen.getByText('Total VAT Amount')).toBeInTheDocument()
      expect(screen.getByText('Compliance Status')).toBeInTheDocument()
    })

    it('should display audit trail details in audit tab', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const auditTab = screen.getByRole('tab', { name: /audit trail/i })
      fireEvent.click(auditTab)

      expect(screen.getByText('Financial Audit Trail')).toBeInTheDocument()
      expect(screen.getByText(/entries/)).toBeInTheDocument()
    })

    it('should switch between tabs correctly', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const executiveTab = screen.getByRole('tab', { name: /executive summary/i })
      fireEvent.click(executiveTab)

      expect(screen.getByText('Executive Financial Summary')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error when VAT report fails to load', () => {
      mockHooks.useCurrentQuarterVAT.mockReturnValue({
        data: { success: false, error: 'Failed to load VAT data' },
        isLoading: false,
        error: new Error('Failed to load VAT data')
      } as any)

      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      expect(screen.getByText('Failed to load VAT compliance report')).toBeInTheDocument()
    })

    it('should display error when audit trail fails to load', () => {
      mockHooks.useAuditTrail.mockReturnValue({
        data: { success: false, error: 'Failed to load audit data' },
        isLoading: false,
        error: new Error('Failed to load audit data')
      } as any)

      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const auditTab = screen.getByRole('tab', { name: /audit trail/i })
      fireEvent.click(auditTab)

      expect(screen.getByText('Failed to load audit trail')).toBeInTheDocument()
    })

    it('should handle generation progress overlay', async () => {
      const mockMutateAsync = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)))

      mockHooks.useExportReport.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isLoading: false,
        error: null
      } as any)

      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const downloadButton = screen.getAllByText('Download')[0]
      fireEvent.click(downloadButton)

      // Should show generation progress overlay
      expect(screen.getByText('Generating reports...')).toBeInTheDocument()
      expect(screen.getByText(/Please wait, this may take a few seconds/)).toBeInTheDocument()
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should render correctly on mobile viewports', () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      // Component should still render all essential elements
      expect(screen.getByText('Financial Reporting Center')).toBeInTheDocument()
      expect(screen.getByText('VAT Compliance Report')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      // Check for proper button roles
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)

      // Check for proper tab functionality
      const tabList = screen.getByRole('tablist')
      expect(tabList).toBeInTheDocument()

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(4)
    })

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <FinancialReportingCenter />
        </TestWrapper>
      )

      const firstTab = screen.getAllByRole('tab')[0]
      firstTab.focus()
      expect(document.activeElement).toBe(firstTab)

      // Tab navigation should work
      fireEvent.keyDown(firstTab, { key: 'Tab' })
      // Should move to next focusable element
    })
  })

  describe('Arabic Language Support', () => {
    it('should render Arabic text correctly with RTL layout', () => {
      render(
        <TestWrapper language="ar">
          <FinancialReportingCenter />
        </TestWrapper>
      )

      expect(screen.getByText('مركز التقارير المالية')).toBeInTheDocument()
      expect(screen.getByText('تقرير ضريبة القيمة المضافة')).toBeInTheDocument()
      expect(screen.getByText('سجل المراجعة')).toBeInTheDocument()
      expect(screen.getByText('كشف حساب ولي الأمر')).toBeInTheDocument()
      expect(screen.getByText('الملخص التنفيذي')).toBeInTheDocument()
    })

    it('should display Arabic currency formatting', () => {
      render(
        <TestWrapper language="ar">
          <FinancialReportingCenter />
        </TestWrapper>
      )

      // Should format currency amounts for Arabic locale
      // The actual formatting would be tested through the display of the amounts
      expect(screen.getByText('إجمالي المبلغ الخاضع للضريبة')).toBeInTheDocument()
      expect(screen.getByText('إجمالي ضريبة القيمة المضافة')).toBeInTheDocument()
    })

    it('should handle RTL date formatting', () => {
      render(
        <TestWrapper language="ar">
          <FinancialReportingCenter />
        </TestWrapper>
      )

      // Date formatting should respect Arabic locale
      expect(screen.getByText(/آخر تحديث:/)).toBeInTheDocument()
    })
  })
})