/**
 * Parent Progress Dashboard Component Tests
 * Unit tests for ParentProgressDashboard component with real data integration
 * اختبارات وحدة مكون لوحة تتبع تقدم أولياء الأمور
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ParentProgressDashboard from '@/components/parent/ParentProgressDashboard';
import { useParentPortal } from '@/hooks/useParentProgress';
import { useLanguage } from '@/contexts/LanguageContext';

// Mock the hooks
vi.mock('@/hooks/useParentProgress');
vi.mock('@/contexts/LanguageContext');

const mockUseLanguage = useLanguage as Mock;
const mockUseParentPortal = useParentPortal as Mock;

// Mock recharts components to avoid canvas issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('ParentProgressDashboard', () => {
  let queryClient: QueryClient;

  // Mock data
  const mockProfile = {
    id: 'parent-1',
    user_id: 'user-1',
    student_id: 'student-1',
    parent_name_ar: 'أحمد محمد',
    parent_name_en: 'Ahmed Mohammed',
    preferred_language: 'ar' as const,
  };

  const mockProgress = {
    progress_summary: [{
      id: 'summary-1',
      student_id: 'student-1',
      parent_id: 'parent-1',
      reporting_period_start: '2025-08-01',
      reporting_period_end: '2025-08-31',
      total_sessions: 20,
      attended_sessions: 18,
      goals_achieved: 8,
      goals_in_progress: 12,
      overall_progress_percentage: 75,
      key_achievements_ar: ['تحسن في التواصل', 'زيادة الثقة'],
      key_achievements_en: ['Improved communication', 'Increased confidence'],
      areas_for_improvement_ar: ['التركيز', 'التفاعل الاجتماعي'],
      areas_for_improvement_en: ['Focus', 'Social interaction'],
      therapist_recommendations_ar: 'يُنصح بزيادة الأنشطة التفاعلية',
      therapist_recommendations_en: 'Recommend more interactive activities',
      generated_at: '2025-09-01T10:00:00Z',
      generated_by: 'therapist-1'
    }],
    chart_data: [
      {
        date: '2025-08-01',
        progress_percentage: 70,
        sessions_attended: 1,
        goals_achieved: 1,
        home_programs_completed: 1
      },
      {
        date: '2025-08-02', 
        progress_percentage: 75,
        sessions_attended: 1,
        goals_achieved: 0,
        home_programs_completed: 1
      }
    ]
  };

  const mockDashboard = {
    parent_profile: mockProfile,
    student_info: {
      id: 'student-1',
      name_ar: 'محمد أحمد',
      name_en: 'Mohammed Ahmed',
      age: 8
    },
    unread_messages_count: 3,
    pending_home_programs: 2,
    upcoming_sessions: []
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mocks
    vi.clearAllMocks();

    // Setup default language mock
    mockUseLanguage.mockReturnValue({
      language: 'en',
      isRTL: false,
      toggleLanguage: vi.fn(),
      setLanguage: vi.fn(),
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ParentProgressDashboard />
      </QueryClientProvider>
    );
  };

  describe('Loading State', () => {
    it('should display loading skeleton while data is loading', () => {
      // Arrange
      mockUseParentPortal.mockReturnValue({
        profile: null,
        progress: null,
        dashboard: null,
        isLoading: true,
        isProgressLoading: true,
        isError: false,
        error: null,
        progressError: null,
        refetchAll: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      // Should show loading skeletons instead of actual content
      expect(screen.queryByText('Progress Dashboard')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when data loading fails', () => {
      // Arrange
      const errorMessage = 'Failed to load progress data';
      mockUseParentPortal.mockReturnValue({
        profile: null,
        progress: null,
        dashboard: null,
        isLoading: false,
        isProgressLoading: false,
        isError: true,
        error: { message: errorMessage },
        progressError: null,
        refetchAll: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Error loading data')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should call refetchAll when retry button is clicked', async () => {
      // Arrange
      const mockRefetchAll = vi.fn();
      mockUseParentPortal.mockReturnValue({
        profile: null,
        progress: null,
        dashboard: null,
        isLoading: false,
        isProgressLoading: false,
        isError: true,
        error: { message: 'Network error' },
        progressError: null,
        refetchAll: mockRefetchAll,
      });

      renderComponent();

      // Act
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      // Assert
      await waitFor(() => {
        expect(mockRefetchAll).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Success State - English Interface', () => {
    beforeEach(() => {
      mockUseLanguage.mockReturnValue({
        language: 'en',
        isRTL: false,
        toggleLanguage: vi.fn(),
        setLanguage: vi.fn(),
      });

      mockUseParentPortal.mockReturnValue({
        profile: mockProfile,
        progress: mockProgress,
        dashboard: mockDashboard,
        isLoading: false,
        isProgressLoading: false,
        isError: false,
        error: null,
        progressError: null,
        refetchAll: vi.fn(),
      });
    });

    it('should render dashboard header with report period', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Progress Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Report Period:/)).toBeInTheDocument();
    });

    it('should display key metrics cards with correct values', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Attendance Rate')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument(); // 18/20 * 100

      expect(screen.getByText('Goal Achievement')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument(); // 8/(8+12) * 100

      expect(screen.getByText('Session Participation')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument(); // from overall_progress_percentage

      expect(screen.getByText('Home Programs')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument(); // 100 - (2 * 5)
    });

    it('should display overall progress summary', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Overall Progress Summary')).toBeInTheDocument();
      expect(screen.getByText('Improving')).toBeInTheDocument(); // 75% >= 75

      expect(screen.getByText('Key Achievements')).toBeInTheDocument();
      expect(screen.getByText('Improved communication')).toBeInTheDocument();
      expect(screen.getByText('Increased confidence')).toBeInTheDocument();

      expect(screen.getByText('Areas for Improvement')).toBeInTheDocument();
      expect(screen.getByText('Focus')).toBeInTheDocument();
      expect(screen.getByText('Social interaction')).toBeInTheDocument();

      expect(screen.getByText('Therapist Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Recommend more interactive activities')).toBeInTheDocument();
    });

    it('should render chart tabs and navigation', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('Attendance')).toBeInTheDocument();
      expect(screen.getByText('Goals')).toBeInTheDocument();
      expect(screen.getByText('Programs')).toBeInTheDocument();

      // Should show chart containers
      expect(screen.getAllByTestId('chart-container')).toHaveLength(1); // Default tab
    });

    it('should handle tab switching correctly', async () => {
      // Act
      renderComponent();

      // Switch to attendance tab
      const attendanceTab = screen.getByText('Attendance');
      fireEvent.click(attendanceTab);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Attendance Record')).toBeInTheDocument();
      });
    });

    it('should handle period selection changes', () => {
      // Act
      renderComponent();

      // Change period to year
      const periodSelect = screen.getByDisplayValue('Month');
      fireEvent.change(periodSelect, { target: { value: 'year' } });

      // Assert
      expect(periodSelect).toHaveValue('year');
    });

    it('should handle refresh button functionality', async () => {
      // Arrange
      const mockRefetchAll = vi.fn();
      mockUseParentPortal.mockReturnValue({
        ...mockUseParentPortal(),
        refetchAll: mockRefetchAll,
      });

      renderComponent();

      // Act
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      // Assert
      await waitFor(() => {
        expect(mockRefetchAll).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Success State - Arabic Interface', () => {
    beforeEach(() => {
      mockUseLanguage.mockReturnValue({
        language: 'ar',
        isRTL: true,
        toggleLanguage: vi.fn(),
        setLanguage: vi.fn(),
      });

      mockUseParentPortal.mockReturnValue({
        profile: mockProfile,
        progress: mockProgress,
        dashboard: mockDashboard,
        isLoading: false,
        isProgressLoading: false,
        isError: false,
        error: null,
        progressError: null,
        refetchAll: vi.fn(),
      });
    });

    it('should render Arabic interface correctly', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('لوحة تتبع التقدم')).toBeInTheDocument();
      expect(screen.getByText('معدل الحضور')).toBeInTheDocument();
      expect(screen.getByText('تحقيق الأهداف')).toBeInTheDocument();
      expect(screen.getByText('المشاركة في الجلسات')).toBeInTheDocument();
      expect(screen.getByText('البرامج المنزلية')).toBeInTheDocument();
    });

    it('should display Arabic content from progress data', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('تحسن في التواصل')).toBeInTheDocument();
      expect(screen.getByText('زيادة الثقة')).toBeInTheDocument();
      expect(screen.getByText('التركيز')).toBeInTheDocument();
      expect(screen.getByText('التفاعل الاجتماعي')).toBeInTheDocument();
      expect(screen.getByText('يُنصح بزيادة الأنشطة التفاعلية')).toBeInTheDocument();
    });

    it('should have RTL direction applied', () => {
      // Act
      const { container } = renderComponent();

      // Assert
      const dashboard = container.querySelector('[dir="rtl"]');
      expect(dashboard).toBeInTheDocument();
    });
  });

  describe('Data Processing Edge Cases', () => {
    it('should handle missing progress summary gracefully', () => {
      // Arrange
      mockUseParentPortal.mockReturnValue({
        profile: mockProfile,
        progress: { progress_summary: [], chart_data: [] },
        dashboard: mockDashboard,
        isLoading: false,
        isProgressLoading: false,
        isError: false,
        error: null,
        progressError: null,
        refetchAll: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Progress Dashboard')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument(); // Default metrics should be 0
    });

    it('should generate fallback chart data when API data is missing', () => {
      // Arrange
      mockUseParentPortal.mockReturnValue({
        profile: mockProfile,
        progress: { progress_summary: [], chart_data: [] },
        dashboard: mockDashboard,
        isLoading: false,
        isProgressLoading: false,
        isError: false,
        error: null,
        progressError: null,
        refetchAll: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      // Component should still render charts with fallback data
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('should calculate trend correctly based on progress percentage', () => {
      // Arrange - High progress (improving trend)
      const highProgressMock = {
        ...mockProgress,
        progress_summary: [{
          ...mockProgress.progress_summary[0],
          overall_progress_percentage: 85 // Should be "improving"
        }]
      };

      mockUseParentPortal.mockReturnValue({
        profile: mockProfile,
        progress: highProgressMock,
        dashboard: mockDashboard,
        isLoading: false,
        isProgressLoading: false,
        isError: false,
        error: null,
        progressError: null,
        refetchAll: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Improving')).toBeInTheDocument();
    });
  });
});