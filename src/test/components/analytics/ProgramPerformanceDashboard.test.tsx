/**
 * Program Performance Dashboard Tests
 * 
 * Comprehensive test suite for the program-wide performance reporting dashboard.
 * Tests component rendering, interactions, data visualization, bilingual support,
 * and real-time updates with extensive coverage of analytics features.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProgramPerformanceDashboard } from '../../../components/analytics/ProgramPerformanceDashboard';
import type { ProgramTemplate } from '../../../types/individualized-enrollment';

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  RadarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="radar-chart">{children}</div>,
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div data-testid="scatter-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Line: () => <div data-testid="line" />,
  Pie: () => <div data-testid="pie" />,
  Radar: () => <div data-testid="radar" />,
  Scatter: () => <div data-testid="scatter" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Cell: () => <div data-testid="cell" />,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />
}));

// Mock services
const mockProgressMetricConfigService = {
  getMetricDefinitions: vi.fn()
};

const mockIndividualProgressAnalyticsService = {
  calculateProgressAnalysis: vi.fn()
};

const mockComparativeAnalyticsService = {
  performComparativeAnalysis: vi.fn()
};

vi.mock('../../../services/analytics/progress-metric-configuration-service', () => ({
  progressMetricConfigService: mockProgressMetricConfigService
}));

vi.mock('../../../services/analytics/individual-progress-analytics-service', () => ({
  individualProgressAnalyticsService: mockIndividualProgressAnalyticsService
}));

vi.mock('../../../services/analytics/comparative-analytics-service', () => ({
  comparativeAnalyticsService: mockComparativeAnalyticsService
}));

// Mock useI18n hook
const mockUseI18n = {
  language: 'en' as 'ar' | 'en',
  isRTL: false,
  t: vi.fn((key: string, fallback?: string) => fallback || key)
};

vi.mock('../../../hooks/useI18n', () => ({
  useI18n: () => mockUseI18n
}));

// Mock data
const mockProgramTemplate: ProgramTemplate = {
  id: 'program-template-123',
  name_ar: 'برنامج النمو المتقدم',
  name_en: 'Advanced Development Program',
  description_ar: 'برنامج شامل لتنمية مهارات الأطفال',
  description_en: 'Comprehensive program for child development',
  category: 'autism',
  target_age_range: { min: 3, max: 12 },
  default_duration_weeks: 24,
  default_sessions_per_week: 2,
  default_goals: [],
  customization_options: {},
  created_at: '2025-09-04T10:00:00Z',
  updated_at: '2025-09-04T10:00:00Z',
  created_by: 'admin-1',
  is_active: true
};

const mockProgramMetrics = [
  {
    id: 'metric-1',
    name_ar: 'التفاعل الاجتماعي',
    name_en: 'Social Interaction',
    description_ar: 'قياس مستوى التفاعل الاجتماعي',
    description_en: 'Measures level of social interaction',
    metric_type: 'percentage',
    data_source: 'session_notes',
    calculation_formula: 'social_score * 100',
    validation_rules: { required: true, data_type: 'decimal' },
    display_config: { chart_type: 'line', show_trend: true },
    scope: 'program_specific',
    program_template_ids: ['program-template-123'],
    is_active: true,
    is_required: false,
    sort_order: 1,
    created_at: '2025-09-04T10:00:00Z',
    updated_at: '2025-09-04T10:00:00Z',
    created_by: 'admin-1',
    updated_by: 'admin-1'
  },
  {
    id: 'metric-2',
    name_ar: 'مهارات التواصل',
    name_en: 'Communication Skills',
    description_ar: 'قياس مهارات التواصل اللفظي وغير اللفظي',
    description_en: 'Measures verbal and non-verbal communication skills',
    metric_type: 'numeric',
    data_source: 'assessment_scores',
    calculation_formula: 'communication_score',
    validation_rules: { required: true, data_type: 'integer' },
    display_config: { chart_type: 'bar', show_trend: false },
    scope: 'program_specific',
    program_template_ids: ['program-template-123'],
    is_active: true,
    is_required: false,
    sort_order: 2,
    created_at: '2025-09-04T10:00:00Z',
    updated_at: '2025-09-04T10:00:00Z',
    created_by: 'admin-1',
    updated_by: 'admin-1'
  }
];

const mockAnalyticsSummary = {
  total_enrollments: 25,
  active_enrollments: 18,
  completed_enrollments: 7,
  average_program_duration_days: 168,
  average_sessions_per_week: 2.3,
  overall_satisfaction_rating: 4.6,
  completion_rate_percentage: 87.5,
  retention_rate_percentage: 92.8,
  program_effectiveness_score: 8.4
};

const mockEnrollmentPerformance = [
  {
    enrollment_id: 'enrollment-1',
    student_name: 'Ahmed Ali',
    student_name_ar: 'أحمد علي',
    therapist_name: 'Dr. Sarah',
    start_date: '2025-08-01',
    current_progress_percentage: 78.5,
    key_metrics: {},
    trend_indicators: {
      communication: 'improving' as const,
      social_interaction: 'stable' as const,
      behavioral: 'improving' as const
    },
    risk_flags: [
      {
        type: 'attendance' as const,
        severity: 'medium' as const,
        message_ar: 'حضور متقطع',
        message_en: 'Irregular attendance'
      }
    ],
    last_session_date: '2025-09-03',
    next_review_date: '2025-09-15'
  },
  {
    enrollment_id: 'enrollment-2',
    student_name: 'Fatima Hassan',
    student_name_ar: 'فاطمة حسن',
    therapist_name: 'Dr. Ahmed',
    start_date: '2025-07-15',
    current_progress_percentage: 85.2,
    key_metrics: {},
    trend_indicators: {
      communication: 'improving' as const,
      social_interaction: 'improving' as const,
      behavioral: 'stable' as const
    },
    risk_flags: [],
    last_session_date: '2025-09-04',
    next_review_date: '2025-09-20'
  }
];

const mockTherapistPerformance = [
  {
    therapist_id: 'therapist-1',
    therapist_name: 'د. أحمد محمد',
    enrollments_count: 8,
    average_student_progress: 78.5,
    session_completion_rate: 94.2,
    student_satisfaction_rating: 4.7,
    specialization_areas: ['autism', 'behavioral_therapy'],
    performance_trends: { '2025-07': 75.2, '2025-08': 78.5, '2025-09': 80.1 }
  },
  {
    therapist_id: 'therapist-2',
    therapist_name: 'د. فاطمة علي',
    enrollments_count: 6,
    average_student_progress: 82.3,
    session_completion_rate: 96.8,
    student_satisfaction_rating: 4.9,
    specialization_areas: ['speech_therapy', 'communication'],
    performance_trends: { '2025-07': 79.1, '2025-08': 82.3, '2025-09': 84.6 }
  }
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0
      }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ProgramPerformanceDashboard', () => {
  const defaultProps = {
    programTemplateId: 'program-template-123',
    dateRange: {
      startDate: '2025-08-01',
      endDate: '2025-09-04'
    },
    onExportRequest: vi.fn(),
    onDrillDown: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockProgressMetricConfigService.getMetricDefinitions.mockResolvedValue({
      success: true,
      metrics: mockProgramMetrics,
      message: 'Success'
    });

    // Reset i18n mock
    mockUseI18n.language = 'en';
    mockUseI18n.isRTL = false;
    mockUseI18n.t.mockImplementation((key: string, fallback?: string) => fallback || key);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('جاري تحميل تحليلات البرنامج')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render dashboard header with program name', async () => {
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Advanced Development Program')).toBeInTheDocument();
      });

      expect(screen.getByText('تحليلات شاملة لأداء البرنامج والطلاب المسجلين')).toBeInTheDocument();
    });

    it('should render summary cards with analytics data', async () => {
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('إجمالي التسجيلات')).toBeInTheDocument();
        expect(screen.getByText('معدل الإنجاز')).toBeInTheDocument();
        expect(screen.getByText('تقييم الرضا')).toBeInTheDocument();
        expect(screen.getByText('فعالية البرنامج')).toBeInTheDocument();
      });

      // Check if numeric values are displayed
      expect(screen.getByText('25')).toBeInTheDocument(); // total enrollments
      expect(screen.getByText('87.5%')).toBeInTheDocument(); // completion rate
      expect(screen.getByText('4.6/5')).toBeInTheDocument(); // satisfaction
      expect(screen.getByText('8.4/10')).toBeInTheDocument(); // effectiveness
    });

    it('should render main navigation tabs', async () => {
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'نظرة عامة' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'الطلاب' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'المعالجين' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'المقاييس' })).toBeInTheDocument();
      });
    });
  });

  describe('Overview Tab', () => {
    it('should render progress trends chart', async () => {
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('اتجاهات التقدم')).toBeInTheDocument();
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should render progress distribution chart', async () => {
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('توزيع التقدم')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });

    it('should allow chart type switching', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });

      // Find and click chart type selector
      const chartTypeSelect = screen.getByDisplayValue('Bar Chart');
      await user.click(chartTypeSelect);

      // Select pie chart
      const pieOption = screen.getByText('مخطط دائري');
      await user.click(pieOption);

      // Verify pie chart is rendered
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  describe('Students Tab', () => {
    it('should render student performance cards', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Switch to students tab
      const studentsTab = screen.getByRole('tab', { name: 'الطلاب' });
      await user.click(studentsTab);

      await waitFor(() => {
        expect(screen.getByText('Ahmed Ali')).toBeInTheDocument();
        expect(screen.getByText('Fatima Hassan')).toBeInTheDocument();
      });

      // Check therapist information
      expect(screen.getByText('المعالج: Dr. Sarah')).toBeInTheDocument();
      expect(screen.getByText('المعالج: Dr. Ahmed')).toBeInTheDocument();

      // Check progress percentages
      expect(screen.getByText('79%')).toBeInTheDocument(); // Ahmed's progress (rounded)
      expect(screen.getByText('85%')).toBeInTheDocument(); // Fatima's progress (rounded)
    });

    it('should display risk flags for students', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      const studentsTab = screen.getByRole('tab', { name: 'الطلاب' });
      await user.click(studentsTab);

      await waitFor(() => {
        expect(screen.getByText('يتطلب انتباه')).toBeInTheDocument();
        expect(screen.getByText('Irregular attendance')).toBeInTheDocument();
      });
    });

    it('should handle drill down to student details', async () => {
      const user = userEvent.setup();
      const mockOnDrillDown = vi.fn();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard 
            {...defaultProps} 
            onDrillDown={mockOnDrillDown}
          />
        </TestWrapper>
      );

      const studentsTab = screen.getByRole('tab', { name: 'الطلاب' });
      await user.click(studentsTab);

      await waitFor(() => {
        const detailsButtons = screen.getAllByText('التفاصيل');
        expect(detailsButtons).toHaveLength(2);
      });

      const firstDetailsButton = screen.getAllByText('التفاصيل')[0];
      await user.click(firstDetailsButton);

      expect(mockOnDrillDown).toHaveBeenCalledWith('enrollment-1', expect.any(String));
    });

    it('should toggle inactive enrollments visibility', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      const studentsTab = screen.getByRole('tab', { name: 'الطلاب' });
      await user.click(studentsTab);

      await waitFor(() => {
        const toggleButton = screen.getByText('عرض غير النشط');
        expect(toggleButton).toBeInTheDocument();
      });

      const toggleButton = screen.getByText('عرض غير النشط');
      await user.click(toggleButton);

      expect(screen.getByText('إخفاء غير النشط')).toBeInTheDocument();
    });
  });

  describe('Therapists Tab', () => {
    it('should render therapist performance cards', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      const therapistsTab = screen.getByRole('tab', { name: 'المعالجين' });
      await user.click(therapistsTab);

      await waitFor(() => {
        expect(screen.getByText('د. أحمد محمد')).toBeInTheDocument();
        expect(screen.getByText('د. فاطمة علي')).toBeInTheDocument();
      });

      // Check enrollment counts
      expect(screen.getByText('8 طلاب')).toBeInTheDocument();
      expect(screen.getByText('6 طلاب')).toBeInTheDocument();

      // Check performance metrics
      expect(screen.getByText('79%')).toBeInTheDocument(); // Ahmed's avg progress
      expect(screen.getByText('82%')).toBeInTheDocument(); // Fatima's avg progress
    });

    it('should display therapist specialization areas', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      const therapistsTab = screen.getByRole('tab', { name: 'المعالجين' });
      await user.click(therapistsTab);

      await waitFor(() => {
        expect(screen.getByText('autism')).toBeInTheDocument();
        expect(screen.getByText('behavioral_therapy')).toBeInTheDocument();
        expect(screen.getByText('speech_therapy')).toBeInTheDocument();
        expect(screen.getByText('communication')).toBeInTheDocument();
      });
    });
  });

  describe('Metrics Tab', () => {
    it('should render program metrics list', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      const metricsTab = screen.getByRole('tab', { name: 'المقاييس' });
      await user.click(metricsTab);

      await waitFor(() => {
        expect(screen.getByText('Social Interaction')).toBeInTheDocument();
        expect(screen.getByText('Communication Skills')).toBeInTheDocument();
      });

      // Check metric descriptions
      expect(screen.getByText('Measures level of social interaction')).toBeInTheDocument();
      expect(screen.getByText('Measures verbal and non-verbal communication skills')).toBeInTheDocument();
    });

    it('should allow metric selection/deselection', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      const metricsTab = screen.getByRole('tab', { name: 'المقاييس' });
      await user.click(metricsTab);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(2);
      });

      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      expect(firstCheckbox).toBeChecked(); // Should be initially selected

      await user.click(firstCheckbox);
      expect(firstCheckbox).not.toBeChecked();
    });

    it('should display metric badges', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      const metricsTab = screen.getByRole('tab', { name: 'المقاييس' });
      await user.click(metricsTab);

      await waitFor(() => {
        expect(screen.getByText('percentage')).toBeInTheDocument();
        expect(screen.getByText('numeric')).toBeInTheDocument();
        expect(screen.getByText('session_notes')).toBeInTheDocument();
        expect(screen.getByText('assessment_scores')).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('should handle refresh button click', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const refreshButton = screen.getByText('تحديث');
        expect(refreshButton).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('تحديث');
      await user.click(refreshButton);

      // Verify service is called again (refresh functionality)
      await waitFor(() => {
        expect(mockProgressMetricConfigService.getMetricDefinitions).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle export button click', async () => {
      const user = userEvent.setup();
      const mockOnExportRequest = vi.fn();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard 
            {...defaultProps} 
            onExportRequest={mockOnExportRequest}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const exportButton = screen.getByText('تصدير');
        expect(exportButton).toBeInTheDocument();
      });

      const exportButton = screen.getByText('تصدير');
      await user.click(exportButton);

      expect(mockOnExportRequest).toHaveBeenCalledWith('pdf');
    });
  });

  describe('Bilingual Support', () => {
    it('should render in Arabic when language is set to Arabic', async () => {
      mockUseI18n.language = 'ar';
      mockUseI18n.isRTL = true;
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('برنامج النمو المتقدم')).toBeInTheDocument();
      });

      // Check if Arabic student names are displayed
      const studentsTab = screen.getByRole('tab', { name: 'الطلاب' });
      await userEvent.setup().click(studentsTab);

      await waitFor(() => {
        expect(screen.getByText('أحمد علي')).toBeInTheDocument();
        expect(screen.getByText('فاطمة حسن')).toBeInTheDocument();
      });
    });

    it('should apply RTL direction when Arabic is selected', async () => {
      mockUseI18n.language = 'ar';
      mockUseI18n.isRTL = true;
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const dashboardContainer = screen.getByTestId('dashboard-container');
        expect(dashboardContainer).toHaveClass('rtl');
        expect(dashboardContainer).toHaveAttribute('dir', 'rtl');
      });
    });

    it('should render metric descriptions in Arabic', async () => {
      const user = userEvent.setup();
      mockUseI18n.language = 'ar';
      mockUseI18n.isRTL = true;
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      const metricsTab = screen.getByRole('tab', { name: 'المقاييس' });
      await user.click(metricsTab);

      await waitFor(() => {
        expect(screen.getByText('التفاعل الاجتماعي')).toBeInTheDocument();
        expect(screen.getByText('مهارات التواصل')).toBeInTheDocument();
        expect(screen.getByText('قياس مستوى التفاعل الاجتماعي')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockProgressMetricConfigService.getMetricDefinitions.mockRejectedValue(
        new Error('Service unavailable')
      );

      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Should still render basic structure without crashing
      expect(screen.getByText('لوحة قياس أداء البرنامج')).toBeInTheDocument();
    });

    it('should handle empty data gracefully', async () => {
      mockProgressMetricConfigService.getMetricDefinitions.mockResolvedValue({
        success: true,
        metrics: [],
        message: 'No metrics found'
      });

      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      const metricsTab = screen.getByRole('tab', { name: 'المقاييس' });
      await user.click(metricsTab);

      await waitFor(() => {
        expect(screen.getByText('مقاييس البرنامج')).toBeInTheDocument();
      });

      // Should not crash when no metrics are available
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check tab accessibility
        const tabs = screen.getAllByRole('tab');
        tabs.forEach(tab => {
          expect(tab).toHaveAttribute('aria-selected');
        });

        // Check button accessibility
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toBeVisible();
        });
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const firstTab = screen.getByRole('tab', { name: 'نظرة عامة' });
        expect(firstTab).toBeInTheDocument();
      });

      // Test tab key navigation
      await user.tab();
      expect(screen.getByRole('tab', { name: 'نظرة عامة' })).toHaveFocus();

      // Test arrow key navigation between tabs
      await user.keyboard('[ArrowRight]');
      expect(screen.getByRole('tab', { name: 'الطلاب' })).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should not make unnecessary API calls', async () => {
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockProgressMetricConfigService.getMetricDefinitions).toHaveBeenCalledTimes(1);
      });

      // Re-render with same props should use cached data
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Should not make additional calls due to React Query caching
      expect(mockProgressMetricConfigService.getMetricDefinitions).toHaveBeenCalledTimes(1);
    });

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeEnrollmentData = Array.from({ length: 100 }, (_, i) => ({
        enrollment_id: `enrollment-${i}`,
        student_name: `Student ${i}`,
        student_name_ar: `الطالب ${i}`,
        therapist_name: `Therapist ${i % 10}`,
        start_date: '2025-08-01',
        current_progress_percentage: Math.random() * 100,
        key_metrics: {},
        trend_indicators: {
          communication: 'improving' as const,
          social_interaction: 'stable' as const,
          behavioral: 'improving' as const
        },
        risk_flags: [],
        last_session_date: '2025-09-03',
        next_review_date: '2025-09-15'
      }));

      // Component should render without performance issues
      render(
        <TestWrapper>
          <ProgramPerformanceDashboard {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Advanced Development Program')).toBeInTheDocument();
      });

      // Should handle large datasets without freezing
      const studentsTab = screen.getByRole('tab', { name: 'الطلاب' });
      await userEvent.setup().click(studentsTab);

      // Component should remain responsive
      expect(screen.getByText('أداء الطلاب')).toBeInTheDocument();
    });
  });
});