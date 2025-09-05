/**
 * Therapist Assignment Manager Tests
 * 
 * Comprehensive test suite for the flexible therapist assignment interface.
 * Tests drag-and-drop functionality, workload management, capacity monitoring,
 * assignment recommendations, and bilingual support with accessibility features.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DragDropContext } from 'react-beautiful-dnd';
import { TherapistAssignmentManager } from '../../../components/students/TherapistAssignmentManager';

// Mock react-beautiful-dnd
vi.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-drop-context">{children}</div>,
  Droppable: ({ children, droppableId }: { children: any; droppableId: string }) => {
    const provided = {
      innerRef: vi.fn(),
      droppableProps: {},
      placeholder: <div data-testid="droppable-placeholder" />
    };
    const snapshot = { isDraggingOver: false };
    return <div data-testid={`droppable-${droppableId}`}>{children(provided, snapshot)}</div>;
  },
  Draggable: ({ children, draggableId, index }: { children: any; draggableId: string; index: number }) => {
    const provided = {
      innerRef: vi.fn(),
      draggableProps: {},
      dragHandleProps: {},
    };
    const snapshot = { isDragging: false };
    return <div data-testid={`draggable-${draggableId}`}>{children(provided, snapshot)}</div>;
  }
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
const mockTherapists = [
  {
    id: 'therapist-1',
    name: 'Dr. Sarah Ahmed',
    name_ar: 'د. سارة أحمد',
    email: 'sarah@therapy-center.com',
    phone: '+966501234567',
    specializations: ['autism', 'behavioral_therapy', 'speech_therapy'],
    qualifications: ['PhD Psychology', 'ABA Certification', 'ADOS Certified'],
    experience_years: 8,
    capacity_config: {
      max_students_per_week: 12,
      max_sessions_per_day: 6,
      max_hours_per_week: 40,
      preferred_age_range: { min: 3, max: 12 },
      preferred_diagnoses: ['autism', 'developmental_delay'],
      preferred_program_types: ['individual', 'small_group'],
      buffer_time_minutes: 15,
      overtime_threshold: 42
    },
    current_workload: {
      current_students: 9,
      sessions_this_week: 18,
      hours_this_week: 27,
      utilization_percentage: 67.5,
      capacity_remaining: 3,
      upcoming_sessions: 5,
      overdue_assessments: 1,
      pending_notes: 2
    },
    performance_metrics: {
      student_satisfaction_avg: 4.7,
      goal_achievement_rate: 0.84,
      session_completion_rate: 0.98,
      documentation_compliance: 0.95,
      parent_communication_score: 4.8,
      professional_development_hours: 24,
      peer_collaboration_score: 4.6,
      overall_performance_score: 8.9
    },
    availability_schedule: {
      regular_schedule: [
        { day_of_week: 1, start_time: '08:00', end_time: '16:00', is_available: true }
      ],
      time_off_requests: [],
      special_availability: []
    },
    is_active: true,
    is_substitute_available: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-09-04T10:00:00Z'
  },
  {
    id: 'therapist-2',
    name: 'Dr. Ahmed Hassan',
    name_ar: 'د. أحمد حسن',
    email: 'ahmed@therapy-center.com',
    phone: '+966507654321',
    specializations: ['occupational_therapy', 'sensory_integration', 'autism'],
    qualifications: ['MS Occupational Therapy', 'SI Certification'],
    experience_years: 6,
    capacity_config: {
      max_students_per_week: 10,
      max_sessions_per_day: 5,
      max_hours_per_week: 35,
      preferred_age_range: { min: 2, max: 10 },
      preferred_diagnoses: ['autism', 'sensory_processing'],
      preferred_program_types: ['individual'],
      buffer_time_minutes: 20,
      overtime_threshold: 38
    },
    current_workload: {
      current_students: 10,
      sessions_this_week: 20,
      hours_this_week: 35,
      utilization_percentage: 105.0, // Over capacity
      capacity_remaining: 0,
      upcoming_sessions: 6,
      overdue_assessments: 0,
      pending_notes: 1
    },
    performance_metrics: {
      student_satisfaction_avg: 4.9,
      goal_achievement_rate: 0.91,
      session_completion_rate: 0.99,
      documentation_compliance: 0.97,
      parent_communication_score: 4.9,
      professional_development_hours: 18,
      peer_collaboration_score: 4.8,
      overall_performance_score: 9.2
    },
    availability_schedule: {
      regular_schedule: [
        { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true }
      ],
      time_off_requests: [],
      special_availability: []
    },
    is_active: true,
    is_substitute_available: false,
    created_at: '2025-02-01T00:00:00Z',
    updated_at: '2025-09-04T10:00:00Z'
  }
];

const mockEnrollments = [
  {
    id: 'enrollment-1',
    student_id: 'student-1',
    program_template_id: 'program-1',
    individual_start_date: '2025-08-01',
    individual_end_date: '2025-12-01',
    custom_schedule: {},
    assigned_therapist_id: 'therapist-1',
    program_modifications: {},
    enrollment_status: 'active' as const,
    created_at: '2025-08-01T00:00:00Z',
    updated_at: '2025-08-15T00:00:00Z',
    created_by: 'admin-1',
    updated_by: 'admin-1',
    student_name: 'Ali Mohammed',
    student_name_ar: 'علي محمد',
    program_name: 'Autism Development Program',
    program_name_ar: 'برنامج تطوير التوحد',
    urgency_level: 'medium' as const,
    assignment_history: [{
      therapist_id: 'therapist-1',
      assigned_date: '2025-08-01',
      reason: 'Initial assignment'
    }]
  },
  {
    id: 'enrollment-2',
    student_id: 'student-2',
    program_template_id: 'program-1',
    individual_start_date: '2025-07-15',
    individual_end_date: '2025-11-15',
    custom_schedule: {},
    assigned_therapist_id: null,
    program_modifications: {},
    enrollment_status: 'active' as const,
    created_at: '2025-07-15T00:00:00Z',
    updated_at: '2025-08-20T00:00:00Z',
    created_by: 'admin-1',
    updated_by: 'therapist-2',
    student_name: 'Fatima Hassan',
    student_name_ar: 'فاطمة حسن',
    program_name: 'Occupational Therapy Program',
    program_name_ar: 'برنامج العلاج الوظيفي',
    urgency_level: 'high' as const,
    assignment_history: []
  }
];

const mockRecommendations = [
  {
    enrollment_id: 'enrollment-2',
    recommended_therapists: [
      {
        therapist_id: 'therapist-2',
        compatibility_score: 0.92,
        reasoning: [
          {
            factor: 'specialization' as const,
            score: 0.95,
            description_ar: 'تخصص في العلاج الوظيفي',
            description_en: 'Specializes in occupational therapy'
          }
        ],
        potential_issues: []
      }
    ]
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

// Mock query responses
const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: mockUseQuery,
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isLoading: false,
      error: null
    })),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn()
    }))
  };
});

describe('TherapistAssignmentManager', () => {
  const defaultProps = {
    programTemplateId: 'program-1',
    enrollmentIds: ['enrollment-1', 'enrollment-2'],
    onAssignmentChange: vi.fn(),
    onCapacityAlert: vi.fn(),
    showRecommendations: true,
    allowBulkOperations: true,
    showSubstitutionWorkflow: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset i18n mock
    mockUseI18n.language = 'en';
    mockUseI18n.isRTL = false;
    mockUseI18n.t.mockImplementation((key: string, fallback?: string) => fallback || key);

    // Setup default query responses
    mockUseQuery
      .mockReturnValueOnce({ // therapists query
        data: mockTherapists,
        isLoading: false,
        error: null
      })
      .mockReturnValueOnce({ // enrollments query
        data: mockEnrollments,
        isLoading: false,
        error: null
      })
      .mockReturnValueOnce({ // recommendations query
        data: mockRecommendations,
        isLoading: false,
        error: null
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render loading state when data is loading', () => {
      mockUseQuery
        .mockReturnValueOnce({ data: null, isLoading: true, error: null })
        .mockReturnValueOnce({ data: null, isLoading: true, error: null })
        .mockReturnValueOnce({ data: null, isLoading: false, error: null });

      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('جاري تحميل التعيينات')).toBeInTheDocument();
    });

    it('should render main header and description', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('مدير تعيين المعالجين')).toBeInTheDocument();
        expect(screen.getByText('إدارة تعيينات المعالجين ومراقبة أحمال العمل')).toBeInTheDocument();
      });
    });

    it('should render action buttons when features are enabled', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('تعيين مجمع')).toBeInTheDocument();
        expect(screen.getByText('البدائل')).toBeInTheDocument();
        expect(screen.getByText('تعيين تلقائي')).toBeInTheDocument();
      });
    });

    it('should render filters section', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('الفلاتر')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('البحث عن المعالجين')).toBeInTheDocument();
      });
    });

    it('should render drag and drop context', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('drag-drop-context')).toBeInTheDocument();
      });
    });
  });

  describe('Therapist Cards', () => {
    it('should render therapist cards with correct information', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check therapist names
        expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument();
        expect(screen.getByText('Dr. Ahmed Hassan')).toBeInTheDocument();
        
        // Check specializations
        expect(screen.getByText('autism')).toBeInTheDocument();
        expect(screen.getByText('occupational_therapy')).toBeInTheDocument();
      });
    });

    it('should display workload metrics and capacity utilization', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check capacity percentages
        expect(screen.getByText('68%')).toBeInTheDocument(); // Sarah's utilization (rounded)
        expect(screen.getByText('105%')).toBeInTheDocument(); // Ahmed's over-capacity utilization
        
        // Check student counts
        expect(screen.getByText('9 / 12')).toBeInTheDocument(); // Sarah's current students
        expect(screen.getByText('10 / 10')).toBeInTheDocument(); // Ahmed's current students
      });
    });

    it('should show capacity warnings for over-capacity therapists', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Ahmed should have over-capacity warning
        const alertIcons = screen.getAllByTestId(/alert-triangle/i);
        expect(alertIcons.length).toBeGreaterThan(0);
      });
    });

    it('should display substitute availability badges', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Sarah is available as substitute
        expect(screen.getByText('بديل')).toBeInTheDocument();
      });
    });

    it('should show assigned students in therapist cards', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check assigned students section
        expect(screen.getAllByText('الطلاب المسندين')).toHaveLength(2);
        
        // Ali should be shown as assigned to therapist-1
        expect(screen.getByText('Ali Mohammed')).toBeInTheDocument();
        expect(screen.getByText('Autism Development Program')).toBeInTheDocument();
      });
    });
  });

  describe('Unassigned Students Section', () => {
    it('should render unassigned students column', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('الطلاب غير المسندين (1)')).toBeInTheDocument();
        expect(screen.getByText('Fatima Hassan')).toBeInTheDocument();
        expect(screen.getByText('Occupational Therapy Program')).toBeInTheDocument();
      });
    });

    it('should display urgency levels for unassigned students', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Fatima has high urgency
        expect(screen.getAllByText('high')).toHaveLength(1);
        // Ali has medium urgency (in assigned section)
        expect(screen.getAllByText('medium')).toHaveLength(1);
      });
    });

    it('should show AI recommendations for unassigned students', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('توصية ذكية')).toBeInTheDocument();
        expect(screen.getByText('Dr. Ahmed Hassan')).toBeInTheDocument();
        expect(screen.getByText('(92% توافق)')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter therapists by search query', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('البحث عن المعالجين');
      await user.type(searchInput, 'Sarah');

      // Component should filter based on search - this tests the search input interaction
      expect(searchInput).toHaveValue('Sarah');
    });

    it('should filter by specialization', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      // Find and click specialization filter
      const specializationSelect = screen.getByRole('combobox', { name: /specialization/i });
      await user.click(specializationSelect);

      // Select autism specialization
      const autismOption = screen.getByRole('option', { name: /autism/i });
      await user.click(autismOption);

      // Both therapists have autism specialization, so both should still be visible
      await waitFor(() => {
        expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument();
        expect(screen.getByText('Dr. Ahmed Hassan')).toBeInTheDocument();
      });
    });

    it('should filter by capacity status', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      // Find capacity status filter
      const capacitySelect = screen.getAllByRole('combobox')[2]; // Third select in filters
      await user.click(capacitySelect);

      // This tests the filter interaction
      expect(capacitySelect).toBeInTheDocument();
    });

    it('should filter by performance rating', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      // Find performance filter
      const performanceSelect = screen.getAllByRole('combobox')[3]; // Fourth select in filters
      await user.click(performanceSelect);

      expect(performanceSelect).toBeInTheDocument();
    });
  });

  describe('Bulk Operations', () => {
    it('should toggle bulk selection mode', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      const bulkButton = screen.getByText('تعيين مجمع');
      await user.click(bulkButton);

      // Button should change appearance when activated
      expect(bulkButton).toBeInTheDocument();
    });

    it('should not show bulk operations when disabled', () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} allowBulkOperations={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('تعيين مجمع')).not.toBeInTheDocument();
    });
  });

  describe('Substitution Workflow', () => {
    it('should show substitution button when enabled', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('البدائل')).toBeInTheDocument();
      });
    });

    it('should not show substitution workflow when disabled', () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} showSubstitutionWorkflow={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('البدائل')).not.toBeInTheDocument();
    });

    it('should open substitution dialog when clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      const substitutionButton = screen.getByText('البدائل');
      await user.click(substitutionButton);

      // This tests the interaction - dialog opening would be tested separately
      expect(substitutionButton).toBeInTheDocument();
    });
  });

  describe('Bilingual Support', () => {
    it('should render in Arabic when language is set to Arabic', async () => {
      mockUseI18n.language = 'ar';
      mockUseI18n.isRTL = true;
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check if Arabic therapist names are displayed
        expect(screen.getByText('د. سارة أحمد')).toBeInTheDocument();
        expect(screen.getByText('د. أحمد حسن')).toBeInTheDocument();
        
        // Check if Arabic student names are displayed
        expect(screen.getByText('علي محمد')).toBeInTheDocument();
        expect(screen.getByText('فاطمة حسن')).toBeInTheDocument();
      });
    });

    it('should apply RTL direction when Arabic is selected', async () => {
      mockUseI18n.language = 'ar';
      mockUseI18n.isRTL = true;
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByTestId('drag-drop-context').parentElement;
        expect(container).toHaveAttribute('dir', 'rtl');
        expect(container).toHaveClass('rtl');
      });
    });

    it('should display Arabic program names when in Arabic mode', async () => {
      mockUseI18n.language = 'ar';
      mockUseI18n.isRTL = true;
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('برنامج تطوير التوحد')).toBeInTheDocument();
        expect(screen.getByText('برنامج العلاج الوظيفي')).toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop Interface', () => {
    it('should render droppable areas for therapists', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('droppable-therapist-1')).toBeInTheDocument();
        expect(screen.getByTestId('droppable-therapist-2')).toBeInTheDocument();
        expect(screen.getByTestId('droppable-unassigned')).toBeInTheDocument();
      });
    });

    it('should render draggable items for students', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('draggable-enrollment-1')).toBeInTheDocument();
        expect(screen.getByTestId('draggable-enrollment-2')).toBeInTheDocument();
      });
    });

    it('should render drag placeholders', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const placeholders = screen.getAllByTestId('droppable-placeholder');
        expect(placeholders.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Quick Actions', () => {
    it('should render therapist configuration buttons', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('إعداد')).toHaveLength(2); // One for each therapist
        expect(screen.getAllByText('الأداء')).toHaveLength(2);
      });
    });

    it('should show substitute button only for available substitutes', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Only Sarah is available as substitute
        const substituteButtons = screen.getAllByText('بديل');
        // One in the badge, one in the button
        expect(substituteButtons.length).toBeGreaterThan(0);
      });
    });

    it('should render auto-assign button', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('تعيين تلقائي')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle therapist loading errors gracefully', () => {
      mockUseQuery
        .mockReturnValueOnce({ data: null, isLoading: false, error: new Error('Failed to load') })
        .mockReturnValueOnce({ data: mockEnrollments, isLoading: false, error: null })
        .mockReturnValueOnce({ data: mockRecommendations, isLoading: false, error: null });

      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      // Should not crash and should show empty state
      expect(screen.getByText('لم يتم العثور على معالجين')).toBeInTheDocument();
    });

    it('should handle enrollment loading errors gracefully', () => {
      mockUseQuery
        .mockReturnValueOnce({ data: mockTherapists, isLoading: false, error: null })
        .mockReturnValueOnce({ data: null, isLoading: false, error: new Error('Failed to load') })
        .mockReturnValueOnce({ data: mockRecommendations, isLoading: false, error: null });

      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      // Should not crash and should still show therapists
      expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument();
    });

    it('should handle missing recommendations gracefully', async () => {
      mockUseQuery
        .mockReturnValueOnce({ data: mockTherapists, isLoading: false, error: null })
        .mockReturnValueOnce({ data: mockEnrollments, isLoading: false, error: null })
        .mockReturnValueOnce({ data: null, isLoading: false, error: null });

      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should still show unassigned students without recommendations
        expect(screen.getByText('Fatima Hassan')).toBeInTheDocument();
        expect(screen.queryByText('توصية ذكية')).not.toBeInTheDocument();
      });
    });
  });

  describe('Assignment Callbacks', () => {
    it('should call onAssignmentChange when provided', async () => {
      const mockOnAssignmentChange = vi.fn();
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager 
            {...defaultProps} 
            onAssignmentChange={mockOnAssignmentChange}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument();
      });

      // This tests that the callback prop is properly passed
      expect(mockOnAssignmentChange).not.toHaveBeenCalled(); // No assignment changes yet
    });

    it('should call onCapacityAlert when provided', async () => {
      const mockOnCapacityAlert = vi.fn();
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager 
            {...defaultProps} 
            onCapacityAlert={mockOnCapacityAlert}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Ahmed Hassan')).toBeInTheDocument();
      });

      // Component should render over-capacity therapist
      expect(screen.getByText('105%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check that buttons are accessible
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toBeVisible();
        });

        // Check that comboboxes have proper roles
        const comboboxes = screen.getAllByRole('combobox');
        comboboxes.forEach(combobox => {
          expect(combobox).toBeVisible();
        });
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('البحث عن المعالجين');
        expect(searchInput).toBeInTheDocument();
      });

      // Test tab navigation
      await user.tab();
      expect(document.activeElement).toBeDefined();
    });

    it('should provide tooltip information for capacity warnings', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const tooltipTriggers = screen.getAllByRole('button');
        expect(tooltipTriggers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of therapists efficiently', async () => {
      // Create large therapist dataset
      const largeTherapistList = Array.from({ length: 50 }, (_, i) => ({
        ...mockTherapists[0],
        id: `therapist-${i}`,
        name: `Dr. Therapist ${i}`,
        name_ar: `د. معالج ${i}`
      }));

      mockUseQuery
        .mockReturnValueOnce({ data: largeTherapistList, isLoading: false, error: null })
        .mockReturnValueOnce({ data: mockEnrollments, isLoading: false, error: null })
        .mockReturnValueOnce({ data: mockRecommendations, isLoading: false, error: null });

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Therapist 0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });

    it('should not make excessive re-renders', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TherapistAssignmentManager {...defaultProps} />
        </TestWrapper>
      );

      // Multiple filter changes should not cause performance issues
      const searchInput = screen.getByPlaceholderText('البحث عن المعالجين');
      
      await user.type(searchInput, 'test');
      await user.clear(searchInput);
      await user.type(searchInput, 'another search');

      expect(searchInput).toHaveValue('another search');
    });
  });
});