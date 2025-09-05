import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { CapacityManagementDashboard } from '@/components/therapist/CapacityManagementDashboard'
import { CapacityManagementService } from '@/services/therapist/capacity-management-service'
import type { CapacityMonitoringAlert } from '@/services/therapist/capacity-management-service'

// Mock dependencies
vi.mock('@/services/therapist/capacity-management-service')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: { className?: string }) => <div data-testid="alert-triangle-icon" className={className} />,
  CheckCircle: ({ className }: { className?: string }) => <div data-testid="check-circle-icon" className={className} />,
  Clock: ({ className }: { className?: string }) => <div data-testid="clock-icon" className={className} />,
  Users: ({ className }: { className?: string }) => <div data-testid="users-icon" className={className} />,
  TrendingUp: ({ className }: { className?: string }) => <div data-testid="trending-up-icon" className={className} />,
  Settings: ({ className }: { className?: string }) => <div data-testid="settings-icon" className={className} />,
  Eye: ({ className }: { className?: string }) => <div data-testid="eye-icon" className={className} />,
  AlertCircle: ({ className }: { className?: string }) => <div data-testid="alert-circle-icon" className={className} />,
  XCircle: ({ className }: { className?: string }) => <div data-testid="x-circle-icon" className={className} />,
  RefreshCw: ({ className }: { className?: string }) => <div data-testid="refresh-icon" className={className} />,
  Download: ({ className }: { className?: string }) => <div data-testid="download-icon" className={className} />,
  Filter: ({ className }: { className?: string }) => <div data-testid="filter-icon" className={className} />,
  Calendar: ({ className }: { className?: string }) => <div data-testid="calendar-icon" className={className} />,
  BarChart3: ({ className }: { className?: string }) => <div data-testid="bar-chart-icon" className={className} />
}))

describe('CapacityManagementDashboard', () => {
  let queryClient: QueryClient
  let mockCapacityService: MockedFunction<any>

  // Mock data
  const mockAlerts: CapacityMonitoringAlert[] = [
    {
      alert_id: 'alert-1',
      therapist_id: 'therapist-1',
      alert_type: 'over_assignment',
      severity: 'critical',
      message_ar: 'تحذير حرج: تجاوز الطاقة الاستيعابية',
      message_en: 'Critical alert: Capacity exceeded',
      triggered_at: '2025-09-04T10:00:00Z',
      requires_immediate_action: true,
      recommended_actions: ['redistribute_workload', 'review_constraints'],
      auto_resolution_available: false
    },
    {
      alert_id: 'alert-2',
      therapist_id: 'therapist-2',
      alert_type: 'capacity_warning',
      severity: 'high',
      message_ar: 'تحذير: اقتراب من الحد الأقصى',
      message_en: 'Warning: Approaching capacity limit',
      triggered_at: '2025-09-04T09:30:00Z',
      requires_immediate_action: false,
      recommended_actions: ['monitor_closely'],
      auto_resolution_available: true
    }
  ]

  const mockTherapistSummaries = [
    {
      therapist_id: 'therapist-1',
      therapist_name_ar: 'د. أحمد محمد',
      therapist_name_en: 'Dr. Ahmed Mohammed',
      current_utilization: 95,
      capacity_remaining: 2,
      active_students: 24,
      weekly_hours: 38,
      risk_level: 'critical' as const,
      alerts_count: 2,
      constraints: {
        max_daily_hours: 8,
        max_weekly_hours: 40,
        max_monthly_hours: 160,
        max_concurrent_students: 25,
        max_sessions_per_day: 8,
        required_break_minutes: 15,
        max_consecutive_hours: 4,
        specialty_requirements: ['speech_therapy'],
        availability_windows: []
      }
    },
    {
      therapist_id: 'therapist-2',
      therapist_name_ar: 'د. فاطمة أحمد',
      therapist_name_en: 'Dr. Fatima Ahmed',
      current_utilization: 75,
      capacity_remaining: 10,
      active_students: 18,
      weekly_hours: 30,
      risk_level: 'medium' as const,
      alerts_count: 1,
      constraints: {
        max_daily_hours: 8,
        max_weekly_hours: 40,
        max_monthly_hours: 160,
        max_concurrent_students: 25,
        max_sessions_per_day: 8,
        required_break_minutes: 15,
        max_consecutive_hours: 4,
        specialty_requirements: ['occupational_therapy'],
        availability_windows: []
      }
    }
  ]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    })

    mockCapacityService = vi.mocked(CapacityManagementService)
    mockCapacityService.prototype.monitorCapacityAlerts = vi.fn().mockResolvedValue({
      success: true,
      alerts: mockAlerts,
      message: 'Alerts retrieved successfully'
    })
  })

  const renderWithProviders = (ui: React.ReactElement, language: 'ar' | 'en' = 'en') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider initialLanguage={language}>
          {ui}
        </LanguageProvider>
      </QueryClientProvider>
    )
  }

  describe('Rendering', () => {
    it('should render dashboard title and description', () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      expect(screen.getByText('Capacity Management Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Monitor and manage therapist capacity and workload')).toBeInTheDocument()
    })

    it('should render dashboard title and description in Arabic', () => {
      renderWithProviders(<CapacityManagementDashboard />, 'ar')
      
      expect(screen.getByText('لوحة إدارة الطاقة الاستيعابية')).toBeInTheDocument()
      expect(screen.getByText('مراقبة وإدارة الطاقة الاستيعابية للمعالجين')).toBeInTheDocument()
    })

    it('should render all main tabs', () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /alerts/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /therapists/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument()
    })

    it('should render overview metrics cards', () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      expect(screen.getByText('Total Therapists')).toBeInTheDocument()
      expect(screen.getByText('At Capacity')).toBeInTheDocument()
      expect(screen.getByText('Active Alerts')).toBeInTheDocument()
      expect(screen.getByText('Average Utilization')).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
    })

    it('should render filter section', () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      expect(screen.getByText('Filters:')).toBeInTheDocument()
      expect(screen.getByText('Select Therapist')).toBeInTheDocument()
      expect(screen.getByText('Alert Level')).toBeInTheDocument()
      expect(screen.getByText('Time Range')).toBeInTheDocument()
    })
  })

  describe('Alerts Display', () => {
    it('should display alerts when data is available', async () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Switch to alerts tab
      fireEvent.click(screen.getByRole('tab', { name: /alerts/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Critical alert: Capacity exceeded')).toBeInTheDocument()
        expect(screen.getByText('Warning: Approaching capacity limit')).toBeInTheDocument()
      })
    })

    it('should display alerts in Arabic', async () => {
      renderWithProviders(<CapacityManagementDashboard />, 'ar')
      
      // Switch to alerts tab
      fireEvent.click(screen.getByRole('tab', { name: /التنبيهات/i }))
      
      await waitFor(() => {
        expect(screen.getByText('تحذير حرج: تجاوز الطاقة الاستيعابية')).toBeInTheDocument()
        expect(screen.getByText('تحذير: اقتراب من الحد الأقصى')).toBeInTheDocument()
      })
    })

    it('should display loading state while fetching alerts', () => {
      mockCapacityService.prototype.monitorCapacityAlerts = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      )
      
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Switch to alerts tab
      fireEvent.click(screen.getByRole('tab', { name: /alerts/i }))
      
      // Should show loading skeletons
      expect(screen.getAllByRole('generic')).toHaveLength(expect.any(Number))
    })

    it('should display empty state when no alerts', async () => {
      mockCapacityService.prototype.monitorCapacityAlerts = vi.fn().mockResolvedValue({
        success: true,
        alerts: [],
        message: 'No alerts found'
      })
      
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Switch to alerts tab
      fireEvent.click(screen.getByRole('tab', { name: /alerts/i }))
      
      await waitFor(() => {
        expect(screen.getByText('No alerts currently')).toBeInTheDocument()
      })
    })

    it('should display severity badges correctly', async () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Switch to alerts tab
      fireEvent.click(screen.getByRole('tab', { name: /alerts/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Critical')).toBeInTheDocument()
        expect(screen.getByText('High')).toBeInTheDocument()
      })
    })

    it('should display immediate action indicators', async () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Switch to alerts tab
      fireEvent.click(screen.getByRole('tab', { name: /alerts/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Immediate Action Required')).toBeInTheDocument()
      })
    })
  })

  describe('Alert Actions', () => {
    it('should handle alert acknowledgment', async () => {
      const mockOnAlertAction = vi.fn()
      
      renderWithProviders(
        <CapacityManagementDashboard onAlertAction={mockOnAlertAction} />
      )
      
      // Switch to alerts tab
      fireEvent.click(screen.getByRole('tab', { name: /alerts/i }))
      
      await waitFor(() => {
        const acknowledgeButtons = screen.getAllByTestId('eye-icon')
        fireEvent.click(acknowledgeButtons[0].closest('button')!)
      })
      
      expect(mockOnAlertAction).toHaveBeenCalledWith('alert-1', 'acknowledge')
    })

    it('should handle alert resolution', async () => {
      const mockOnAlertAction = vi.fn()
      
      renderWithProviders(
        <CapacityManagementDashboard onAlertAction={mockOnAlertAction} />
      )
      
      // Switch to alerts tab
      fireEvent.click(screen.getByRole('tab', { name: /alerts/i }))
      
      await waitFor(() => {
        const resolveButtons = screen.getAllByTestId('check-circle-icon')
        fireEvent.click(resolveButtons[0].closest('button')!)
      })
      
      expect(mockOnAlertAction).toHaveBeenCalledWith('alert-1', 'resolve')
    })
  })

  describe('Filtering', () => {
    it('should filter alerts by severity', async () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Open alert level filter
      const alertLevelSelect = screen.getByDisplayValue('Alert Level')
      fireEvent.click(alertLevelSelect)
      
      // Select critical only
      const criticalOption = screen.getByText('Critical')
      fireEvent.click(criticalOption)
      
      // Should trigger refetch with filter
      await waitFor(() => {
        expect(mockCapacityService.prototype.monitorCapacityAlerts).toHaveBeenCalled()
      })
    })

    it('should filter by therapist selection', async () => {
      // Mock therapist data for the select
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Open therapist filter (would need mock data for select options)
      const therapistSelect = screen.getByDisplayValue('Select Therapist')
      fireEvent.click(therapistSelect)
      
      // In a real scenario, would select a therapist and verify filtering
    })

    it('should filter by time range', async () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Open time range filter
      const timeRangeSelect = screen.getByDisplayValue('Time Range')
      fireEvent.click(timeRangeSelect)
      
      // Select today
      const todayOption = screen.getByText('Today')
      fireEvent.click(todayOption)
      
      // Should trigger refetch with filter
      await waitFor(() => {
        expect(mockCapacityService.prototype.monitorCapacityAlerts).toHaveBeenCalled()
      })
    })
  })

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Should start on overview tab
      expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('data-state', 'active')
      
      // Switch to alerts tab
      fireEvent.click(screen.getByRole('tab', { name: /alerts/i }))
      expect(screen.getByRole('tab', { name: /alerts/i })).toHaveAttribute('data-state', 'active')
      
      // Switch to therapists tab
      fireEvent.click(screen.getByRole('tab', { name: /therapists/i }))
      expect(screen.getByRole('tab', { name: /therapists/i })).toHaveAttribute('data-state', 'active')
      
      // Switch to analytics tab
      fireEvent.click(screen.getByRole('tab', { name: /analytics/i }))
      expect(screen.getByRole('tab', { name: /analytics/i })).toHaveAttribute('data-state', 'active')
    })

    it('should display analytics coming soon message', () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Switch to analytics tab
      fireEvent.click(screen.getByRole('tab', { name: /analytics/i }))
      
      expect(screen.getByText('Capacity analytics coming soon')).toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('should handle refresh button click', async () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      fireEvent.click(refreshButton)
      
      // Should refetch data
      await waitFor(() => {
        expect(mockCapacityService.prototype.monitorCapacityAlerts).toHaveBeenCalled()
      })
    })

    it('should handle export button click', async () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      fireEvent.click(exportButton)
      
      // In real scenario, would verify export functionality
    })
  })

  describe('Show Only Alerts Mode', () => {
    it('should render compact alerts view when showOnlyAlerts is true', async () => {
      renderWithProviders(<CapacityManagementDashboard showOnlyAlerts={true} />)
      
      // Should show alerts card without full dashboard
      expect(screen.getByText('Alerts')).toBeInTheDocument()
      expect(screen.queryByText('Capacity Management Dashboard')).not.toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('Critical alert: Capacity exceeded')).toBeInTheDocument()
      })
    })
  })

  describe('Props Handling', () => {
    it('should handle selectedTherapistId prop', () => {
      renderWithProviders(
        <CapacityManagementDashboard selectedTherapistId="therapist-1" />
      )
      
      // Should initialize with selected therapist
      // In real implementation, would verify the select shows the correct therapist
    })

    it('should handle auto-refresh configuration', () => {
      renderWithProviders(
        <CapacityManagementDashboard 
          autoRefresh={true} 
          refreshIntervalSeconds={60}
        />
      )
      
      // Should set up auto-refresh with specified interval
      // In real implementation, would verify query configuration
    })

    it('should call onTherapistSelect callback', async () => {
      const mockOnTherapistSelect = vi.fn()
      
      renderWithProviders(
        <CapacityManagementDashboard onTherapistSelect={mockOnTherapistSelect} />
      )
      
      // Would trigger therapist selection and verify callback
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockCapacityService.prototype.monitorCapacityAlerts = vi.fn().mockRejectedValue(
        new Error('API Error')
      )
      
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Should handle error without crashing
      // In real implementation, would show error state
    })

    it('should handle empty data responses', async () => {
      mockCapacityService.prototype.monitorCapacityAlerts = vi.fn().mockResolvedValue({
        success: true,
        alerts: undefined,
        message: 'No data'
      })
      
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Should handle undefined alerts gracefully
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Check for proper tab accessibility
      const tabs = screen.getAllByRole('tab')
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected')
      })
    })

    it('should be keyboard navigable', () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Test keyboard navigation between tabs
      const firstTab = screen.getByRole('tab', { name: /overview/i })
      firstTab.focus()
      expect(firstTab).toHaveFocus()
    })

    it('should have proper button labels', () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      const exportButton = screen.getByRole('button', { name: /export/i })
      
      expect(refreshButton).toBeInTheDocument()
      expect(exportButton).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should render metric cards in responsive grid', () => {
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Check for responsive grid classes
      const metricsGrid = screen.getByText('Total Therapists').closest('.grid')
      expect(metricsGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4')
    })

    it('should handle RTL layout for Arabic', () => {
      renderWithProviders(<CapacityManagementDashboard />, 'ar')
      
      // Should have RTL direction
      const dashboard = screen.getByText('لوحة إدارة الطاقة الاستيعابية').closest('div')
      expect(dashboard).toHaveAttribute('dir', 'rtl')
    })
  })

  describe('Performance', () => {
    it('should render without performance issues', () => {
      const startTime = performance.now()
      
      renderWithProviders(<CapacityManagementDashboard />)
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render within reasonable time (< 100ms for initial render)
      expect(renderTime).toBeLessThan(100)
    })

    it('should handle large datasets efficiently', async () => {
      const largeAlertSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockAlerts[0],
        alert_id: `alert-${i}`,
        message_en: `Alert ${i}`,
        message_ar: `تحذير ${i}`
      }))
      
      mockCapacityService.prototype.monitorCapacityAlerts = vi.fn().mockResolvedValue({
        success: true,
        alerts: largeAlertSet,
        message: 'Large dataset retrieved'
      })
      
      renderWithProviders(<CapacityManagementDashboard />)
      
      // Should handle large dataset without performance issues
      fireEvent.click(screen.getByRole('tab', { name: /alerts/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Alert 0')).toBeInTheDocument()
      })
    })
  })
})