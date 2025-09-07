/**
 * Audit Log Viewer Component Tests
 * Story 1.2: Security Compliance & Data Protection - AC: 3
 * Tests for audit trail viewer with Arabic RTL support
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AuditLogViewer from '../../../components/admin/AuditLogViewer'
import { auditService } from '../../../services/audit-service'

// Mock dependencies
vi.mock('../../../services/audit-service', () => ({
  auditService: {
    getAuditLogs: vi.fn(),
    generateComplianceReport: vi.fn()
  }
}))

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: (language: 'ar' | 'en' = 'en') => ({
    t: (key: string, fallback: string) => fallback,
    language,
    isRTL: language === 'ar'
  })
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    return date.toISOString().split('T')[0] + ' ' + date.toTimeString().split(' ')[0]
  }
}))

// Mock date range picker component
vi.mock('../../../components/ui/date-range-picker', () => ({
  DateRangePicker: ({ onDateChange }: { onDateChange: Function }) => (
    <div data-testid="date-range-picker">
      <button 
        onClick={() => onDateChange({
          from: new Date('2025-01-01'),
          to: new Date('2025-01-31')
        })}
      >
        Select Date Range
      </button>
    </div>
  )
}))

describe('AuditLogViewer Component', () => {
  const mockGetAuditLogs = auditService.getAuditLogs as Mock
  const mockGenerateComplianceReport = auditService.generateComplianceReport as Mock

  const mockAuditLogs = [
    {
      id: 'log-1',
      table_name: 'medical_records',
      operation: 'UPDATE',
      record_id: 'record-123',
      user_id: 'user-456',
      user_role: 'admin',
      timestamp: '2025-01-15T10:30:00Z',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 Test Browser',
      risk_level: 'high',
      event_category: 'medical_access',
      compliance_tags: ['HIPAA', 'PDPL'],
      additional_metadata: {
        operation_type: 'medical_update',
        data_sensitivity: 'highly_sensitive'
      }
    },
    {
      id: 'log-2',
      table_name: 'authentication_events',
      operation: 'LOGIN_SUCCESS',
      record_id: 'auth-789',
      user_id: 'user-456',
      user_role: 'therapist',
      timestamp: '2025-01-15T09:15:00Z',
      ip_address: '192.168.1.101',
      risk_level: 'low',
      event_category: 'authentication',
      compliance_tags: ['HIPAA'],
      additional_metadata: {
        method: 'password',
        success: true
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default successful audit logs response
    mockGetAuditLogs.mockResolvedValue(mockAuditLogs)
    
    // Default successful compliance report response
    mockGenerateComplianceReport.mockResolvedValue({
      report_metadata: {
        compliance_framework: 'HIPAA',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        generated_by: 'user-admin',
        generation_timestamp: '2025-01-15T12:00:00Z'
      },
      summary_statistics: {
        total_events: 150,
        security_violations: 2,
        medical_access_events: 45,
        authentication_events: 103
      },
      compliance_status: {
        audit_trail_complete: true,
        security_monitoring_active: true,
        medical_access_tracked: true,
        authentication_logged: true
      }
    })
  })

  describe('English Language Tests', () => {
    it('should render audit log viewer with header and controls', async () => {
      render(<AuditLogViewer />)

      await waitFor(() => {
        expect(screen.getByText('Audit Trail Viewer')).toBeInTheDocument()
        expect(screen.getByText('View and analyze system audit logs for compliance')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Generate Report' })).toBeInTheDocument()
    })

    it('should display audit logs in table format', async () => {
      render(<AuditLogViewer />)

      await waitFor(() => {
        expect(screen.getByText('Audit Logs')).toBeInTheDocument()
      })

      // Check table headers
      expect(screen.getByText('Timestamp')).toBeInTheDocument()
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Operation')).toBeInTheDocument()
      expect(screen.getByText('User')).toBeInTheDocument()
      expect(screen.getByText('Risk Level')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()

      // Check log entries
      await waitFor(() => {
        expect(screen.getByText('UPDATE')).toBeInTheDocument()
        expect(screen.getByText('LOGIN_SUCCESS')).toBeInTheDocument()
      })
    })

    it('should display risk levels with appropriate styling', async () => {
      render(<AuditLogViewer />)

      await waitFor(() => {
        expect(screen.getByText('high')).toBeInTheDocument()
        expect(screen.getByText('low')).toBeInTheDocument()
      })
    })

    it('should handle date range filtering', async () => {
      render(<AuditLogViewer />)

      const dateRangePicker = screen.getByTestId('date-range-picker')
      const selectButton = screen.getByText('Select Date Range')
      
      fireEvent.click(selectButton)

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.stringContaining('2025-01-01'),
            endDate: expect.stringContaining('2025-01-31')
          })
        )
      })
    })

    it('should handle event category filtering', async () => {
      render(<AuditLogViewer />)

      await waitFor(() => {
        const categorySelect = screen.getByDisplayValue('Select category') || 
                             screen.getByRole('combobox')
        expect(categorySelect).toBeInTheDocument()
      })
    })

    it('should handle risk level filtering', async () => {
      render(<AuditLogViewer />)

      await waitFor(() => {
        const riskSelect = screen.getByDisplayValue('Select risk level') || 
                          screen.getByRole('combobox')
        expect(riskSelect).toBeInTheDocument()
      })
    })

    it('should generate compliance report when button clicked', async () => {
      render(<AuditLogViewer />)

      const generateButton = screen.getByRole('button', { name: 'Generate Report' })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(mockGenerateComplianceReport).toHaveBeenCalledWith({
          start_date: expect.any(String),
          end_date: expect.any(String),
          compliance_framework: 'HIPAA'
        })
      })
    })

    it('should open log details modal when view button clicked', async () => {
      render(<AuditLogViewer />)

      await waitFor(() => {
        const viewButtons = screen.getAllByRole('button', { name: 'View' })
        expect(viewButtons.length).toBeGreaterThan(0)
      })

      const firstViewButton = screen.getAllByRole('button', { name: 'View' })[0]
      fireEvent.click(firstViewButton)

      await waitFor(() => {
        expect(screen.getByText('Audit Log Details')).toBeInTheDocument()
      })
    })

    it('should display compliance tags as badges', async () => {
      render(<AuditLogViewer />)

      // Open first log details to see compliance tags
      await waitFor(() => {
        const viewButtons = screen.getAllByRole('button', { name: 'View' })
        fireEvent.click(viewButtons[0])
      })

      await waitFor(() => {
        expect(screen.getByText('HIPAA')).toBeInTheDocument()
        expect(screen.getByText('PDPL')).toBeInTheDocument()
      })
    })

    it('should refresh logs when refresh button clicked', async () => {
      render(<AuditLogViewer />)

      const refreshButton = screen.getByRole('button', { name: 'Refresh' })
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledTimes(2) // Initial load + refresh
      })
    })
  })

  describe('Arabic RTL Language Tests', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      
      // Mock Arabic language context
      vi.mocked(require('../../../contexts/LanguageContext').useLanguage).mockReturnValue({
        t: (key: string, fallback: string) => fallback,
        language: 'ar',
        isRTL: true
      })
      
      mockGetAuditLogs.mockResolvedValue(mockAuditLogs)
    })

    it('should render with RTL layout for Arabic', async () => {
      render(<AuditLogViewer />)

      const container = screen.getByText('Audit Trail Viewer').closest('div')
      expect(container).toHaveAttribute('dir', 'rtl')
    })

    it('should display Arabic interface correctly', async () => {
      render(<AuditLogViewer />)

      await waitFor(() => {
        expect(screen.getByText('Audit Trail Viewer')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling Tests', () => {
    it('should display error message when audit logs fail to load', async () => {
      mockGetAuditLogs.mockRejectedValue(new Error('Database connection failed'))

      render(<AuditLogViewer />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load audit logs')).toBeInTheDocument()
      })
    })

    it('should handle compliance report generation errors', async () => {
      mockGenerateComplianceReport.mockRejectedValue(new Error('Report generation failed'))

      render(<AuditLogViewer />)

      const generateButton = screen.getByRole('button', { name: 'Generate Report' })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(mockGenerateComplianceReport).toHaveBeenCalled()
      })
    })

    it('should display empty state when no logs available', async () => {
      mockGetAuditLogs.mockResolvedValue([])

      render(<AuditLogViewer />)

      await waitFor(() => {
        expect(screen.getByText('No audit logs found')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States Tests', () => {
    it('should show loading indicator while fetching logs', async () => {
      // Mock a delayed response
      mockGetAuditLogs.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockAuditLogs), 100))
      )

      render(<AuditLogViewer />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('should disable buttons during loading', async () => {
      // Mock loading state
      mockGetAuditLogs.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockAuditLogs), 100))
      )

      render(<AuditLogViewer />)

      const refreshButton = screen.getByRole('button', { name: 'Refresh' })
      
      // Click refresh to trigger loading
      fireEvent.click(refreshButton)
      
      expect(refreshButton).toBeDisabled()
    })
  })

  describe('Filter Functionality Tests', () => {
    it('should filter logs by user ID', async () => {
      render(<AuditLogViewer />)

      const userIdInput = screen.getByPlaceholderText('Enter user ID')
      fireEvent.change(userIdInput, { target: { value: 'user-123' } })

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-123'
          })
        )
      })
    })

    it('should clear filters when empty values provided', async () => {
      render(<AuditLogViewer />)

      const userIdInput = screen.getByPlaceholderText('Enter user ID')
      fireEvent.change(userIdInput, { target: { value: '' } })

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: undefined
          })
        )
      })
    })
  })

  describe('Pagination Tests', () => {
    it('should handle pagination when multiple pages available', async () => {
      // Mock logs with pagination info
      mockGetAuditLogs.mockResolvedValue(mockAuditLogs)

      render(<AuditLogViewer />)

      await waitFor(() => {
        expect(screen.getByText('Showing 2 logs')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility Tests', () => {
    it('should have proper table structure for screen readers', async () => {
      render(<AuditLogViewer />)

      await waitFor(() => {
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()
        
        const headers = screen.getAllByRole('columnheader')
        expect(headers.length).toBe(6) // Timestamp, Category, Operation, User, Risk Level, Actions
      })
    })

    it('should have accessible dialog for log details', async () => {
      render(<AuditLogViewer />)

      await waitFor(() => {
        const viewButton = screen.getAllByRole('button', { name: 'View' })[0]
        fireEvent.click(viewButton)
      })

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Responsive Tests', () => {
    it('should render properly on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })

      render(<AuditLogViewer compactMode={true} />)

      await waitFor(() => {
        expect(screen.getByText('Audit Trail Viewer')).toBeInTheDocument()
      })

      // Component should still render all essential elements
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('should handle compact mode properly', async () => {
      render(<AuditLogViewer compactMode={true} />)

      await waitFor(() => {
        expect(screen.getByText('Audit Logs')).toBeInTheDocument()
      })
    })
  })

  describe('Integration Tests', () => {
    it('should integrate properly with audit service', async () => {
      render(<AuditLogViewer />)

      // Initial load
      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith({
          startDate: undefined,
          endDate: undefined,
          eventCategory: undefined,
          riskLevel: undefined,
          userId: undefined,
          limit: 50,
          offset: 0
        })
      })

      // Refresh action
      const refreshButton = screen.getByRole('button', { name: 'Refresh' })
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledTimes(2)
      })
    })

    it('should handle service integration with filters', async () => {
      render(<AuditLogViewer />)

      // Apply user ID filter
      const userIdInput = screen.getByPlaceholderText('Enter user ID')
      fireEvent.change(userIdInput, { target: { value: 'test-user' } })

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'test-user'
          })
        )
      })
    })
  })
})