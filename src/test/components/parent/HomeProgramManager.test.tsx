/**
 * Home Program Manager Component Tests
 * Unit tests for home program management system
 * اختبارات وحدة مكون إدارة البرامج المنزلية
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomeProgramManager from '@/components/parent/HomeProgramManager';
import { 
  useHomePrograms,
  useCompleteHomeProgram,
  useParentPortal 
} from '@/hooks/useParentProgress';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HomeProgram, HomeProgramCompletion } from '@/types/parent';

// Mock the hooks
vi.mock('@/hooks/useParentProgress');
vi.mock('@/contexts/LanguageContext');

const mockUseLanguage = useLanguage as Mock;
const mockUseHomePrograms = useHomePrograms as Mock;
const mockUseCompleteHomeProgram = useCompleteHomeProgram as Mock;
const mockUseParentPortal = useParentPortal as Mock;

describe('HomeProgramManager', () => {
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

  const mockCompletions: HomeProgramCompletion[] = [
    {
      id: 'completion-1',
      home_program_id: 'program-1',
      parent_id: 'parent-1',
      success_rating: 4,
      completion_date: '2025-09-01',
      parent_notes_ar: 'أداء جيد',
      parent_notes_en: 'Good performance',
      therapist_feedback_ar: 'تحسن ملحوظ',
      therapist_feedback_en: 'Noticeable improvement',
      evidence_urls: ['photo1.jpg'],
      created_at: '2025-09-01T10:00:00Z'
    }
  ];

  const mockPrograms: HomeProgram[] = [
    {
      id: 'program-1',
      student_id: 'student-1',
      therapist_id: 'therapist-1',
      program_name_ar: 'برنامج التواصل',
      program_name_en: 'Communication Program',
      description_ar: 'تطوير مهارات التواصل اللفظي',
      description_en: 'Develop verbal communication skills',
      instructions_ar: 'التعليمات باللغة العربية',
      instructions_en: 'Instructions in English',
      category_ar: 'علاج النطق',
      category_en: 'Speech Therapy',
      difficulty_level: 'medium',
      estimated_duration_minutes: 30,
      target_frequency: 'Daily',
      target_completion_date: '2025-12-31',
      is_active: true,
      assigned_date: '2025-08-01',
      completion_rate: 75,
      materials_needed: ['Cards', 'Mirror'],
      home_program_completions: mockCompletions,
      last_completion: mockCompletions[0]
    },
    {
      id: 'program-2',
      student_id: 'student-1',
      therapist_id: 'therapist-1',
      program_name_ar: 'التمارين الحركية',
      program_name_en: 'Motor Exercises',
      description_ar: 'تطوير المهارات الحركية الدقيقة',
      description_en: 'Develop fine motor skills',
      instructions_ar: 'التعليمات للتمارين الحركية',
      instructions_en: 'Instructions for motor exercises',
      category_ar: 'العلاج الطبيعي',
      category_en: 'Physical Therapy',
      difficulty_level: 'easy',
      estimated_duration_minutes: 20,
      target_frequency: 'Twice daily',
      target_completion_date: '2025-08-15', // Past due
      is_active: true,
      assigned_date: '2025-07-01',
      completion_rate: 50,
      materials_needed: ['Blocks', 'Beads'],
      home_program_completions: [],
      last_completion: null
    },
    {
      id: 'program-3',
      student_id: 'student-1',
      therapist_id: 'therapist-1',
      program_name_ar: 'برنامج مكتمل',
      program_name_en: 'Completed Program',
      description_ar: 'برنامج تم إنجازه بالكامل',
      description_en: 'A fully completed program',
      category_ar: 'علاج سلوكي',
      category_en: 'Behavioral Therapy',
      difficulty_level: 'hard',
      estimated_duration_minutes: 45,
      target_frequency: 'Weekly',
      target_completion_date: '2025-08-30',
      is_active: false,
      assigned_date: '2025-07-01',
      completion_rate: 100,
      materials_needed: [],
      home_program_completions: [],
      last_completion: null
    }
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mocks
    vi.clearAllMocks();

    // Mock scrollIntoView for JSDOM
    Element.prototype.scrollIntoView = vi.fn();

    // Setup default language mock
    mockUseLanguage.mockReturnValue({
      language: 'en',
      isRTL: false,
      toggleLanguage: vi.fn(),
      setLanguage: vi.fn(),
    });

    // Setup default parent portal mock
    mockUseParentPortal.mockReturnValue({
      profile: mockProfile,
      isLoading: false,
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <HomeProgramManager />
      </QueryClientProvider>
    );
  };

  describe('Loading State', () => {
    it('should display loading skeleton while data is loading', () => {
      // Arrange
      mockUseParentPortal.mockReturnValue({
        profile: null,
        isLoading: true,
      });

      mockUseHomePrograms.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should display loading skeleton while programs are loading', () => {
      // Arrange
      mockUseHomePrograms.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should display error message when programs loading fails', () => {
      // Arrange
      const errorMessage = 'Failed to load home programs';
      mockUseHomePrograms.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: errorMessage },
        refetch: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Error loading home programs')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should call refetch when retry button is clicked', async () => {
      // Arrange
      const mockRefetch = vi.fn();
      mockUseHomePrograms.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: 'Network error' },
        refetch: mockRefetch,
      });

      renderComponent();

      // Act
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      // Assert
      expect(mockRefetch).toHaveBeenCalledTimes(1);
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

      mockUseHomePrograms.mockReturnValue({
        data: mockPrograms,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseCompleteHomeProgram.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      });
    });

    it('should render home program manager interface with stats', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Home Programs')).toBeInTheDocument();
      expect(screen.getByText('Track and complete assigned home activities for your child')).toBeInTheDocument();
      
      // Check stats cards
      expect(screen.getByText('Total Programs')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total count
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    it('should display program cards with correct information', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Communication Program')).toBeInTheDocument();
      expect(screen.getByText('Motor Exercises')).toBeInTheDocument();
      expect(screen.getByText('Completed Program')).toBeInTheDocument();
      
      // Check program descriptions
      expect(screen.getByText('Develop verbal communication skills')).toBeInTheDocument();
      expect(screen.getByText('Develop fine motor skills')).toBeInTheDocument();
    });

    it('should display correct status badges for programs', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should show progress bars with correct completion rates', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('75%')).toBeInTheDocument(); // Communication Program
      expect(screen.getByText('50%')).toBeInTheDocument(); // Motor Exercises
      expect(screen.getByText('100%')).toBeInTheDocument(); // Completed Program
    });

    it('should display difficulty levels with star icons', () => {
      // Act
      renderComponent();

      // Assert
      const difficultyLabels = screen.getAllByText(/Difficulty:/);
      expect(difficultyLabels).toHaveLength(3);
    });

    it('should filter programs by status', async () => {
      // Act
      renderComponent();

      // Change filter to "Active"
      const statusFilter = screen.getByDisplayValue('All status');
      fireEvent.change(statusFilter, { target: { value: 'active' } });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Communication Program')).toBeInTheDocument();
        expect(screen.getByText('Motor Exercises')).toBeInTheDocument();
        expect(screen.queryByText('Completed Program')).not.toBeInTheDocument();
      });
    });

    it('should open program details modal when details button is clicked', async () => {
      // Act
      renderComponent();

      const detailsButtons = screen.getAllByText('Details');
      fireEvent.click(detailsButtons[0]);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Instructions')).toBeInTheDocument();
        expect(screen.getByText('Materials Needed')).toBeInTheDocument();
      });
    });

    it('should open completion form modal when mark complete button is clicked', async () => {
      // Act
      renderComponent();

      const markCompleteButtons = screen.getAllByText('Mark Complete');
      fireEvent.click(markCompleteButtons[0]);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Record Program Completion')).toBeInTheDocument();
        expect(screen.getByText('Success Rating')).toBeInTheDocument();
        expect(screen.getByText('Completion Date')).toBeInTheDocument();
        expect(screen.getByText('Additional Notes')).toBeInTheDocument();
      });
    });

    it('should handle success rating selection in completion form', async () => {
      // Act
      renderComponent();

      const markCompleteButtons = screen.getAllByText('Mark Complete');
      fireEvent.click(markCompleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Record Program Completion')).toBeInTheDocument();
      });

      // Click on 3rd star for 3-star rating
      const stars = document.querySelectorAll('[class*="cursor-pointer"]');
      if (stars.length >= 3) {
        fireEvent.click(stars[2]);
      }

      // Assert
      expect(screen.getByText('3/5')).toBeInTheDocument();
    });

    it('should handle file upload for evidence', async () => {
      // Act
      renderComponent();

      const markCompleteButtons = screen.getAllByText('Mark Complete');
      fireEvent.click(markCompleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Evidence of Completion (Optional)')).toBeInTheDocument();
      });

      // Create mock file
      const file = new File(['test content'], 'evidence.jpg', { type: 'image/jpeg' });
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('evidence.jpg')).toBeInTheDocument();
        expect(screen.getByText('Attached Files:')).toBeInTheDocument();
      });
    });

    it('should submit completion form successfully', async () => {
      // Arrange
      const mockCompleteProgram = vi.fn().mockResolvedValue({});
      mockUseCompleteHomeProgram.mockReturnValue({
        mutateAsync: mockCompleteProgram,
        isPending: false,
      });

      renderComponent();

      // Open completion form
      const markCompleteButtons = screen.getAllByText('Mark Complete');
      fireEvent.click(markCompleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Record Program Completion')).toBeInTheDocument();
      });

      // Fill form
      const notesTextarea = screen.getByPlaceholderText('Write your notes about the child\'s performance...');
      fireEvent.change(notesTextarea, { target: { value: 'Great progress!' } });

      // Submit form
      const saveButton = screen.getByText('Save Completion');
      fireEvent.click(saveButton);

      // Assert
      await waitFor(() => {
        expect(mockCompleteProgram).toHaveBeenCalledWith({
          home_program_id: 'program-1',
          success_rating: 5, // Default value
          completion_date: expect.any(String),
          parent_notes_ar: '',
          parent_notes_en: 'Great progress!',
          evidence_urls: []
        });
      });
    });

    it('should validate file size and reject large files', async () => {
      // Arrange
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      renderComponent();

      const markCompleteButtons = screen.getAllByText('Mark Complete');
      fireEvent.click(markCompleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Evidence of Completion (Optional)')).toBeInTheDocument();
      });

      // Act
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.mp4', { type: 'video/mp4' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Assert
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('File size too large (max 50MB)');
      });

      alertSpy.mockRestore();
    });

    it('should close modals when X button is clicked', async () => {
      // Act
      renderComponent();

      // Open details modal
      const detailsButtons = screen.getAllByText('Details');
      fireEvent.click(detailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });

      // Close modal
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.innerHTML.includes('XCircle'));
      if (xButton) {
        fireEvent.click(xButton);
      }

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Description')).not.toBeInTheDocument();
      });
    });

    it('should display no programs message when no programs exist', () => {
      // Arrange
      mockUseHomePrograms.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('No home programs')).toBeInTheDocument();
      expect(screen.getByText('No home programs have been assigned currently')).toBeInTheDocument();
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

      mockUseHomePrograms.mockReturnValue({
        data: mockPrograms,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseCompleteHomeProgram.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      });
    });

    it('should render Arabic interface correctly', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('البرامج المنزلية')).toBeInTheDocument();
      expect(screen.getByText('تتبع وإكمال الأنشطة المنزلية المخصصة للطفل')).toBeInTheDocument();
      
      // Check Arabic program names
      expect(screen.getByText('برنامج التواصل')).toBeInTheDocument();
      expect(screen.getByText('التمارين الحركية')).toBeInTheDocument();
      expect(screen.getByText('برنامج مكتمل')).toBeInTheDocument();
    });

    it('should display Arabic content in program descriptions', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('تطوير مهارات التواصل اللفظي')).toBeInTheDocument();
      expect(screen.getByText('تطوير المهارات الحركية الدقيقة')).toBeInTheDocument();
    });

    it('should have RTL direction applied', () => {
      // Act
      const { container } = renderComponent();

      // Assert
      const programManager = container.querySelector('[dir="rtl"]');
      expect(programManager).toBeInTheDocument();
    });

    it('should handle Arabic notes in completion form', async () => {
      // Arrange
      const mockCompleteProgram = vi.fn().mockResolvedValue({});
      mockUseCompleteHomeProgram.mockReturnValue({
        mutateAsync: mockCompleteProgram,
        isPending: false,
      });

      renderComponent();

      // Open completion form
      const markCompleteButtons = screen.getAllByText('تسجيل الإنجاز');
      fireEvent.click(markCompleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('تسجيل إنجاز البرنامج')).toBeInTheDocument();
      });

      // Fill Arabic notes
      const notesTextarea = screen.getByPlaceholderText('اكتب ملاحظاتك حول أداء الطفل...');
      fireEvent.change(notesTextarea, { target: { value: 'تقدم ممتاز!' } });

      // Submit form
      const saveButton = screen.getByText('حفظ الإنجاز');
      fireEvent.click(saveButton);

      // Assert
      await waitFor(() => {
        expect(mockCompleteProgram).toHaveBeenCalledWith({
          home_program_id: 'program-1',
          success_rating: 5,
          completion_date: expect.any(String),
          parent_notes_ar: 'تقدم ممتاز!',
          parent_notes_en: 'تقدم ممتاز!', // Fallback
          evidence_urls: []
        });
      });
    });
  });

  describe('Program Statistics', () => {
    beforeEach(() => {
      mockUseLanguage.mockReturnValue({
        language: 'en',
        isRTL: false,
        toggleLanguage: vi.fn(),
        setLanguage: vi.fn(),
      });

      mockUseHomePrograms.mockReturnValue({
        data: mockPrograms,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should calculate correct program statistics', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('3')).toBeInTheDocument(); // Total: 3 programs
      expect(screen.getByText('1')).toBeInTheDocument(); // Completed: 1 program (100%)
      expect(screen.getByText('2')).toBeInTheDocument(); // Active: 2 programs (<100%)
      expect(screen.getByText('1')).toBeInTheDocument(); // Overdue: 1 program (past target date)
    });

    it('should show completion history in program details', async () => {
      // Act
      renderComponent();

      const detailsButtons = screen.getAllByText('Details');
      fireEvent.click(detailsButtons[0]); // Communication Program has completion history

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Completion History')).toBeInTheDocument();
        expect(screen.getByText('4/5')).toBeInTheDocument(); // Rating from mock completion
        expect(screen.getByText('Noticeable improvement')).toBeInTheDocument(); // Therapist feedback
      });
    });
  });

  describe('File Handling', () => {
    beforeEach(() => {
      mockUseLanguage.mockReturnValue({
        language: 'en',
        isRTL: false,
        toggleLanguage: vi.fn(),
        setLanguage: vi.fn(),
      });

      mockUseHomePrograms.mockReturnValue({
        data: mockPrograms,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should validate file type and reject unsupported files', async () => {
      // Arrange
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      renderComponent();

      const markCompleteButtons = screen.getAllByText('Mark Complete');
      fireEvent.click(markCompleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Evidence of Completion (Optional)')).toBeInTheDocument();
      });

      // Act
      const unsupportedFile = new File(['test'], 'test.exe', { type: 'application/exe' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [unsupportedFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Assert
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('File type not supported');
      });

      alertSpy.mockRestore();
    });

    it('should remove evidence files when X button is clicked', async () => {
      // Act
      renderComponent();

      const markCompleteButtons = screen.getAllByText('Mark Complete');
      fireEvent.click(markCompleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Evidence of Completion (Optional)')).toBeInTheDocument();
      });

      // Add file
      const file = new File(['test content'], 'evidence.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('evidence.jpg')).toBeInTheDocument();
      });

      // Remove file
      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(btn => btn.innerHTML.includes('XCircle'));
      if (removeButton) {
        fireEvent.click(removeButton);
      }

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('evidence.jpg')).not.toBeInTheDocument();
      });
    });
  });
});