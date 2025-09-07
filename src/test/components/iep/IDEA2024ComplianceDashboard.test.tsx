/**
 * IDEA 2024 Compliance Dashboard Tests
 * اختبارات لوحة تحكم امتثال IDEA 2024
 * 
 * @description Test suite for IDEA 2024 compliance monitoring dashboard
 * Story 1.3 - Task 3: IDEA 2024 compliance validation system
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { IDEA2024ComplianceDashboard } from '@/components/iep/IDEA2024ComplianceDashboard'
import { LanguageProvider } from '@/contexts/LanguageContext'
import * as iepService from '@/services/iep-service'

// =============================================================================
// MOCKS
// =============================================================================

// Mock IEP Service
vi.mock('@/services/iep-service', () => ({
  iepService: {
    getAllIEPs: vi.fn(),
  },
  validateIEPCompliance: vi.fn()
}))

// Mock date utilities
vi.mock('@/lib/date-utils', () => ({
  formatDate: vi.fn((date, lang) => `${date} (${lang})`),
  formatRelativeTime: vi.fn((date) => '2 days ago')
}))

// =============================================================================
// TEST DATA
// =============================================================================

const mockCompliantIEP = {
  id: 'iep-001',
  student_id: 'student-001',
  student_name_ar: 'أحمد محمد العلي',
  student_name_en: 'Ahmed Mohammed Al-Ali',
  present_levels_academic_ar: 'الطالب يؤدي أداءً أكاديمياً جيداً في معظم المواد',
  present_levels_academic_en: 'Student performs well academically in most subjects',
  present_levels_functional_ar: 'يحتاج دعماً في المهارات الحياتية اليومية',
  present_levels_functional_en: 'Needs support in daily living skills',
  lre_justification_ar: 'يستفيد من التعليم في الصف العام مع الدعم المناسب',
  lre_justification_en: 'Benefits from general education with appropriate support',
  effective_date: '2024-01-01',
  annual_review_date: '2024-12-01',
  mainstreaming_percentage: 75,
  annual_goals_count: 3
}

const mockNonCompliantIEP = {
  id: 'iep-002',
  student_id: 'student-002',
  student_name_ar: 'فاطمة خالد الحسن',
  student_name_en: 'Fatima Khaled Al-Hassan',
  present_levels_academic_ar: '', // Missing - compliance issue
  present_levels_academic_en: '',
  present_levels_functional_ar: 'تحتاج دعماً شاملاً',
  present_levels_functional_en: 'Needs comprehensive support',
  lre_justification_ar: '', // Missing - compliance issue
  lre_justification_en: '',
  effective_date: '2023-01-01',
  annual_review_date: '2023-12-01', // Overdue - compliance issue
  mainstreaming_percentage: 50,
  annual_goals_count: 0 // Missing goals - compliance issue
}

const mockCompliantValidation = {
  isValid: true,
  issues: [],
  warnings: []
}

const mockNonCompliantValidation = {
  isValid: false,
  issues: [
    {
      issue_type: 'missing_present_levels_academic',
      description_ar: 'الوضع الحالي للأداء الأكاديمي مطلوب',
      description_en: 'Present levels of academic performance required',
      severity: 'critical' as const,
      resolution_required: true
    },
    {
      issue_type: 'missing_lre_justification',
      description_ar: 'مبرر البيئة الأقل تقييداً مطلوب',
      description_en: 'Least Restrictive Environment justification required',
      severity: 'high' as const,
      resolution_required: true
    },
    {
      issue_type: 'annual_review_exceeds_365_days',
      description_ar: 'تاريخ المراجعة السنوية يجب أن يكون خلال 365 يوماً',
      description_en: 'Annual review date must be within 365 days',
      severity: 'critical' as const,
      resolution_required: true
    },
    {
      issue_type: 'no_annual_goals',
      description_ar: 'يجب وجود هدف سنوي واحد على الأقل',
      description_en: 'At least one annual goal is required',
      severity: 'critical' as const,
      resolution_required: true
    }
  ],
  warnings: []
}

// =============================================================================
// TEST SETUP
// =============================================================================

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

const TestWrapper: React.FC<{ 
  children: React.ReactNode
  language?: 'ar' | 'en' 
}> = ({ children, language = 'en' }) => {
  const queryClient = createTestQueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider defaultLanguage={language}>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
}

// =============================================================================
// TESTS
// =============================================================================

describe('IDEA2024ComplianceDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('English Language Tests', () => {
    it('should render dashboard with compliant metrics', async () => {
      const mockIEPs = [mockCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockCompliantValidation)

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      // Check for main title
      expect(screen.getByText('IDEA 2024 Compliance Monitoring')).toBeInTheDocument()

      // Wait for metrics to load
      await waitFor(() => {
        expect(screen.getByText('IDEA Compliance Score')).toBeInTheDocument()
        expect(screen.getByText('Critical Issues')).toBeInTheDocument()
        expect(screen.getByText('Overdue Reviews')).toBeInTheDocument()
        expect(screen.getByText('Upcoming Reviews')).toBeInTheDocument()
      })

      // Should show no compliance issues message
      await waitFor(() => {
        expect(screen.getByText('No compliance issues')).toBeInTheDocument()
        expect(screen.getByText('All IEPs are compliant with IDEA 2024 standards')).toBeInTheDocument()
      })
    })

    it('should render dashboard with compliance alerts', async () => {
      const mockIEPs = [mockNonCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockNonCompliantValidation)

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      // Wait for alerts to load
      await waitFor(() => {
        expect(screen.getByText('IDEA 2024 Compliance Issues')).toBeInTheDocument()
      })

      // Check for compliance issues
      expect(screen.getByText('Present levels of academic performance required')).toBeInTheDocument()
      expect(screen.getByText('Least Restrictive Environment justification required')).toBeInTheDocument()
      expect(screen.getByText('Annual review date must be within 365 days')).toBeInTheDocument()
      expect(screen.getByText('At least one annual goal is required')).toBeInTheDocument()

      // Check student information
      expect(screen.getByText('Fatima Khaled Al-Hassan')).toBeInTheDocument()
    })

    it('should show alert details when view button is clicked', async () => {
      const mockIEPs = [mockNonCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockNonCompliantValidation)

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      // Wait for content to load and click view button
      await waitFor(() => {
        const viewButtons = screen.getAllByRole('button', { name: '' })
        const viewButton = viewButtons.find(btn => 
          btn.querySelector('svg') && btn.querySelector('svg')?.getAttribute('data-testid') !== 'RefreshCw'
        )
        if (viewButton) {
          fireEvent.click(viewButton)
        }
      })

      // Check if modal opens with alert details
      await waitFor(() => {
        expect(screen.getByText('Present levels of academic performance required')).toBeInTheDocument()
        expect(screen.getByText('Student')).toBeInTheDocument()
        expect(screen.getByText('Compliance Area')).toBeInTheDocument()
        expect(screen.getByText('Remediation Steps')).toBeInTheDocument()
      })
    })

    it('should display correct metrics for mixed compliance', async () => {
      const mockIEPs = [mockCompliantIEP, mockNonCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance)
        .mockReturnValueOnce(mockCompliantValidation) // First IEP
        .mockReturnValueOnce(mockNonCompliantValidation) // Second IEP

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        // Should show mixed metrics
        expect(screen.getByText('IDEA Compliance Score')).toBeInTheDocument()
        
        // Check for critical issues count (3 critical issues from mockNonCompliantValidation)
        const criticalIssuesCards = screen.getAllByText('3')
        expect(criticalIssuesCards.length).toBeGreaterThan(0)
      })
    })

    it('should filter alerts by student when studentId provided', async () => {
      const mockIEPs = [mockNonCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockNonCompliantValidation)

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard studentId="student-002" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(iepService.iepService.getAllIEPs).toHaveBeenCalledWith({ student_id: 'student-002' })
      })
    })
  })

  describe('Arabic Language Tests', () => {
    it('should render dashboard in Arabic', async () => {
      const mockIEPs = [mockCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockCompliantValidation)

      render(
        <TestWrapper language="ar">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      // Check for Arabic title
      expect(screen.getByText('مراقبة امتثال IDEA 2024')).toBeInTheDocument()

      // Wait for Arabic metrics to load
      await waitFor(() => {
        expect(screen.getByText('درجة امتثال IDEA')).toBeInTheDocument()
        expect(screen.getByText('مشاكل حرجة')).toBeInTheDocument()
        expect(screen.getByText('مراجعات متأخرة')).toBeInTheDocument()
        expect(screen.getByText('مراجعات قريبة')).toBeInTheDocument()
      })

      // Should show no compliance issues message in Arabic
      await waitFor(() => {
        expect(screen.getByText('لا توجد مشاكل امتثال')).toBeInTheDocument()
        expect(screen.getByText('جميع برامج IEP متوافقة مع معايير IDEA 2024')).toBeInTheDocument()
      })
    })

    it('should render compliance alerts in Arabic', async () => {
      const mockIEPs = [mockNonCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockNonCompliantValidation)

      render(
        <TestWrapper language="ar">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      // Wait for Arabic alerts to load
      await waitFor(() => {
        expect(screen.getByText('مشاكل امتثال IDEA 2024')).toBeInTheDocument()
      })

      // Check for Arabic compliance issues
      expect(screen.getByText('الوضع الحالي للأداء الأكاديمي مطلوب')).toBeInTheDocument()
      expect(screen.getByText('مبرر البيئة الأقل تقييداً مطلوب')).toBeInTheDocument()
      expect(screen.getByText('تاريخ المراجعة السنوية يجب أن يكون خلال 365 يوماً')).toBeInTheDocument()
      expect(screen.getByText('يجب وجود هدف سنوي واحد على الأقل')).toBeInTheDocument()

      // Check Arabic student information
      expect(screen.getByText('فاطمة خالد الحسن')).toBeInTheDocument()
    })

    it('should show Arabic alert details in modal', async () => {
      const mockIEPs = [mockNonCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockNonCompliantValidation)

      render(
        <TestWrapper language="ar">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      // Wait for content to load and click view button
      await waitFor(() => {
        const viewButtons = screen.getAllByRole('button', { name: '' })
        const viewButton = viewButtons.find(btn => 
          btn.querySelector('svg') && btn.querySelector('svg')?.getAttribute('data-testid') !== 'RefreshCw'
        )
        if (viewButton) {
          fireEvent.click(viewButton)
        }
      })

      // Check if modal opens with Arabic alert details
      await waitFor(() => {
        expect(screen.getByText('الوضع الحالي للأداء الأكاديمي مطلوب')).toBeInTheDocument()
        expect(screen.getByText('الطالب')).toBeInTheDocument()
        expect(screen.getByText('منطقة الامتثال')).toBeInTheDocument()
        expect(screen.getByText('خطوات الحل')).toBeInTheDocument()
      })
    })
  })

  describe('Tab Navigation Tests', () => {
    it('should switch between tabs correctly', async () => {
      const mockIEPs = [mockCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockCompliantValidation)

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      // Test Issues tab
      const issuesTab = screen.getByRole('tab', { name: 'Issues' })
      fireEvent.click(issuesTab)
      
      await waitFor(() => {
        expect(issuesTab).toHaveAttribute('aria-selected', 'true')
      })

      // Test Reports tab
      const reportsTab = screen.getByRole('tab', { name: 'Reports' })
      fireEvent.click(reportsTab)
      
      await waitFor(() => {
        expect(reportsTab).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByText('Detailed Compliance Reports')).toBeInTheDocument()
        expect(screen.getByText('Detailed IDEA 2024 compliance reports coming soon')).toBeInTheDocument()
      })
    })
  })

  describe('Data Loading Tests', () => {
    it('should show loading state initially', () => {
      vi.mocked(iepService.iepService.getAllIEPs).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 1000))
      )

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      expect(screen.getByText('جاري تحميل المقاييس...')).toBeInTheDocument()
    })

    it('should handle empty IEP list', async () => {
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue([])

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('No compliance issues')).toBeInTheDocument()
      })
    })
  })

  describe('Priority and Sorting Tests', () => {
    it('should sort alerts by priority level', async () => {
      const mockIEPs = [mockNonCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockNonCompliantValidation)

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        const criticalBadges = screen.getAllByText('Critical')
        expect(criticalBadges.length).toBeGreaterThan(0)
      })
    })

    it('should limit alerts when maxAlerts prop is provided', async () => {
      const mockIEPs = [mockNonCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockNonCompliantValidation)

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard maxAlerts={2} />
        </TestWrapper>
      )

      await waitFor(() => {
        const tableRows = screen.getAllByRole('row')
        // Should have header row + max 2 alert rows = 3 total
        expect(tableRows.length).toBeLessThanOrEqual(3)
      })
    })
  })

  describe('Badge Display Tests', () => {
    it('should display correct badge counts in header', async () => {
      const mockIEPs = [mockNonCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockNonCompliantValidation)

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        // Should show critical and warning counts
        expect(screen.getByText('3 Critical')).toBeInTheDocument() // 3 critical issues
        expect(screen.getByText('1 Warning')).toBeInTheDocument()   // 1 warning (high severity)
      })
    })
  })

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels and roles', async () => {
      const mockIEPs = [mockCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockCompliantValidation)

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      // Check for proper tab roles
      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Issues' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Reports' })).toBeInTheDocument()

      // Check for table structure
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation', async () => {
      const mockIEPs = [mockCompliantIEP]
      vi.mocked(iepService.iepService.getAllIEPs).mockResolvedValue(mockIEPs)
      vi.mocked(iepService.validateIEPCompliance).mockReturnValue(mockCompliantValidation)

      render(
        <TestWrapper language="en">
          <IDEA2024ComplianceDashboard />
        </TestWrapper>
      )

      // Test tab navigation with keyboard
      const overviewTab = screen.getByRole('tab', { name: 'Overview' })
      overviewTab.focus()
      expect(document.activeElement).toBe(overviewTab)
    })
  })
})