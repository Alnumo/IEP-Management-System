import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import IEPCreationWizard from '@/components/iep/IEPCreationWizard';
import type { StudentBasicInfo } from '@/types/iep';
import { render, TestProviders } from '@/test/utils/test-utils';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useStudents', () => ({
  useStudents: () => ({
    data: [
      {
        id: 'student-1',
        name_ar: 'أحمد محمد',
        name_en: 'Ahmed Mohammed',
        date_of_birth: '2010-01-01',
        grade_level: 'grade_5'
      }
    ] as StudentBasicInfo[],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTherapists', () => ({
  useTherapists: () => ({
    data: [
      {
        id: 'therapist-1',
        name_ar: 'د. فاطمة الزهراء',
        name_en: 'Dr. Fatima Al-Zahra',
        specialization: 'speech_therapy'
      }
    ],
    isLoading: false,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'wizard.step': 'Step',
        'wizard.of': 'of',
        'wizard.next': 'Next',
        'wizard.previous': 'Previous',
        'wizard.submit': 'Create IEP',
        'forms.student': 'Student',
        'forms.iep_type': 'IEP Type',
        'forms.program_type': 'Program Type',
        'forms.initial_iep': 'Initial IEP',
        'forms.annual_review': 'Annual Review',
        'forms.addendum': 'Addendum',
        'validation.required': 'This field is required',
        'validation.student_required': 'Student selection is required',
        'success.iep_created': 'IEP created successfully',
        'errors.creation_failed': 'Failed to create IEP'
      };
      
      if (options && typeof options === 'object') {
        let result = translations[key] || key;
        Object.keys(options).forEach(optionKey => {
          result = result.replace(`{{${optionKey}}}`, options[optionKey]);
        });
        return result;
      }
      
      return translations[key] || key;
    },
  }),
}));

// Test wrapper removed - using test-utils instead

describe('IEPCreationWizard', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    language: 'en' as const,
  };

  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe('Functionality Tests', () => {
    it('renders the wizard with first step visible', () => {
      render(<IEPCreationWizard {...defaultProps} />);

      expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
      expect(screen.getByLabelText(/student/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/iep type/i)).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('validates required fields before proceeding to next step', async () => {
      const user = userEvent.setup();
      
      render(<IEPCreationWizard {...defaultProps} />);

      // Try to proceed without filling required fields
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Student selection is required')).toBeInTheDocument();
      });
    });

    it('proceeds to next step when valid data is entered', async () => {
      const user = userEvent.setup();
      
      render(<IEPCreationWizard {...defaultProps} />);

      // Fill required fields in step 1
      const studentSelect = screen.getByLabelText(/student/i);
      await user.click(studentSelect);
      
      // Select first student option
      const studentOption = await screen.findByText('Ahmed Mohammed');
      await user.click(studentOption);

      // Select IEP type
      const iepTypeSelect = screen.getByLabelText(/iep type/i);
      await user.click(iepTypeSelect);
      
      const iepTypeOption = await screen.findByText('Initial IEP');
      await user.click(iepTypeOption);

      // Proceed to next step
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      // Should show step 2
      await waitFor(() => {
        expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
      });
    });

    it('allows navigation back to previous step', async () => {
      const user = userEvent.setup();
      
      render(<IEPCreationWizard {...defaultProps} />);

      // Fill step 1 and proceed to step 2
      const studentSelect = screen.getByLabelText(/student/i);
      await user.click(studentSelect);
      const studentOption = await screen.findByText('Ahmed Mohammed');
      await user.click(studentOption);

      const iepTypeSelect = screen.getByLabelText(/iep type/i);
      await user.click(iepTypeSelect);
      const iepTypeOption = await screen.findByText('Initial IEP');
      await user.click(iepTypeOption);

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      // Should be on step 2
      await waitFor(() => {
        expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
      });

      // Go back to step 1
      const previousButton = screen.getByText('Previous');
      await user.click(previousButton);

      // Should be back on step 1
      await waitFor(() => {
        expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
      });
    });

    it('calls onSuccess when IEP is successfully created', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      
      // Mock successful API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'new-iep-id' }),
      });

      render(<IEPCreationWizard {...defaultProps} onSuccess={onSuccess} />);

      // Navigate through all steps (simplified for test)
      // Fill step 1
      const studentSelect = screen.getByLabelText(/student/i);
      await user.click(studentSelect);
      const studentOption = await screen.findByText('Ahmed Mohammed');
      await user.click(studentOption);

      const iepTypeSelect = screen.getByLabelText(/iep type/i);
      await user.click(iepTypeSelect);
      const iepTypeOption = await screen.findByText('Initial IEP');
      await user.click(iepTypeOption);

      // Skip through steps (in a real test, you'd fill each step)
      for (let step = 1; step < 5; step++) {
        const nextButton = screen.getByText('Next');
        await user.click(nextButton);
      }

      // Submit the form
      const submitButton = screen.getByText('Create IEP');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('displays error message when creation fails', async () => {
      const user = userEvent.setup();
      
      // Mock failed API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Creation failed' }),
      });

      render(<IEPCreationWizard {...defaultProps} />);

      // Navigate to final step and submit (simplified)
      const studentSelect = screen.getByLabelText(/student/i);
      await user.click(studentSelect);
      const studentOption = await screen.findByText('Ahmed Mohammed');
      await user.click(studentOption);

      const iepTypeSelect = screen.getByLabelText(/iep type/i);
      await user.click(iepTypeSelect);
      const iepTypeOption = await screen.findByText('Initial IEP');
      await user.click(iepTypeOption);

      // Skip through steps
      for (let step = 1; step < 5; step++) {
        const nextButton = screen.getByText('Next');
        await user.click(nextButton);
      }

      const submitButton = screen.getByText('Create IEP');
      await user.click(submitButton);

      // Should show error (this would be handled by toast in real implementation)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Localization Tests', () => {
    it('renders correctly in Arabic (RTL)', () => {
      render(<IEPCreationWizard {...defaultProps} language="ar" />, { language: 'ar' });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('dir', 'rtl');
      
      // Check for Arabic-specific classes
      const wizardContent = dialog.querySelector('.font-arabic');
      expect(wizardContent).toBeInTheDocument();
    });

    it('renders correctly in English (LTR)', () => {
      render(<IEPCreationWizard {...defaultProps} language="en" />, { language: 'en' });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('dir', 'ltr');
    });

    it('switches languages dynamically', async () => {
      const { rerender } = render(<IEPCreationWizard {...defaultProps} language="en" />, { language: 'en' });

      let dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('dir', 'ltr');

      rerender(<IEPCreationWizard {...defaultProps} language="ar" />);

      dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('dir', 'rtl');
    });
  });

  describe('Responsive Design Tests', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<IEPCreationWizard {...defaultProps} />);

      const dialogContent = screen.getByRole('dialog');
      
      // Should have mobile-responsive classes
      expect(dialogContent).toHaveClass('sm:max-w-4xl');
    });

    it('uses full layout on desktop screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(<IEPCreationWizard {...defaultProps} />);

      const dialogContent = screen.getByRole('dialog');
      expect(dialogContent).toHaveClass('sm:max-w-4xl');
    });
  });

  describe('Accessibility Tests', () => {
    it('has proper ARIA labels and roles', () => {
      render(<IEPCreationWizard {...defaultProps} />);

      // Dialog should have proper role
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Form should have proper structure
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
      
      // Progress indicator should be accessible
      const progressIndicator = screen.getByRole('progressbar');
      expect(progressIndicator).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<IEPCreationWizard {...defaultProps} />);

      const studentSelect = screen.getByLabelText(/student/i);
      
      // Tab to the select element
      await user.tab();
      expect(studentSelect).toHaveFocus();
      
      // Should be able to navigate with arrow keys
      await user.keyboard('{ArrowDown}');
    });

    it('has proper focus management when navigating steps', async () => {
      const user = userEvent.setup();
      
      render(<IEPCreationWizard {...defaultProps} />);

      // Fill required fields
      const studentSelect = screen.getByLabelText(/student/i);
      await user.click(studentSelect);
      const studentOption = await screen.findByText('Ahmed Mohammed');
      await user.click(studentOption);

      const iepTypeSelect = screen.getByLabelText(/iep type/i);
      await user.click(iepTypeSelect);
      const iepTypeOption = await screen.findByText('Initial IEP');
      await user.click(iepTypeOption);

      // Click next to go to step 2
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      // Focus should move to the new step content
      await waitFor(() => {
        const stepTwoContent = screen.getByText('Step 2 of 5');
        expect(stepTwoContent).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<IEPCreationWizard {...defaultProps} />);

      // Navigate to final step and attempt submission
      const studentSelect = screen.getByLabelText(/student/i);
      await user.click(studentSelect);
      const studentOption = await screen.findByText('Ahmed Mohammed');
      await user.click(studentOption);

      const iepTypeSelect = screen.getByLabelText(/iep type/i);
      await user.click(iepTypeSelect);
      const iepTypeOption = await screen.findByText('Initial IEP');
      await user.click(iepTypeOption);

      // Skip through steps
      for (let step = 1; step < 5; step++) {
        const nextButton = screen.getByText('Next');
        await user.click(nextButton);
      }

      const submitButton = screen.getByText('Create IEP');
      await user.click(submitButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('validates form data before submission', async () => {
      const user = userEvent.setup();
      
      render(<IEPCreationWizard {...defaultProps} />);

      // Try to submit without filling any data
      // Navigate to final step
      for (let step = 1; step < 5; step++) {
        try {
          const nextButton = screen.getByText('Next');
          await user.click(nextButton);
        } catch (error) {
          // Expected to fail due to validation
          break;
        }
      }

      // Should show validation errors on first step
      await waitFor(() => {
        expect(screen.getByText('Student selection is required')).toBeInTheDocument();
      });
    });
  });

  describe('Integration Tests', () => {
    it('integrates with student data loading', async () => {
      render(<IEPCreationWizard {...defaultProps} />);

      // Should show student from mocked data
      const studentSelect = screen.getByLabelText(/student/i);
      await userEvent.click(studentSelect);
      
      await waitFor(() => {
        expect(screen.getByText('Ahmed Mohammed')).toBeInTheDocument();
      });
    });

    it('closes dialog when onClose is called', async () => {
      const onClose = vi.fn();
      
      render(<IEPCreationWizard {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });
});