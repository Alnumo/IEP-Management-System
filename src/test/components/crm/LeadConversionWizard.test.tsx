import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import LeadConversionWizard from '@/components/crm/LeadConversionWizard';
import { useStudentPlans, useCreateStudent, useCreateEnrollment } from '@/hooks/useStudents';
import { useUpdateLeadStatus } from '@/hooks/useLeads';
import type { Lead } from '@/types/crm';

// Mock the hooks
vi.mock('@/hooks/useStudents');
vi.mock('@/hooks/useLeads');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'en' }
  })
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const mockUseStudentPlans = vi.mocked(useStudentPlans);
const mockUseCreateStudent = vi.mocked(useCreateStudent);
const mockUseCreateEnrollment = vi.mocked(useCreateEnrollment);
const mockUseUpdateLeadStatus = vi.mocked(useUpdateLeadStatus);

const mockLead: Lead = {
  id: '1',
  parent_name: 'John Doe',
  parent_contact: '+966501234567',
  parent_contact_secondary: 'john@example.com',
  child_name: 'Jane Doe',
  child_name_ar: 'جين دو',
  child_dob: '2019-01-01',
  child_gender: 'female',
  status: 'evaluation_complete',
  source: 'website',
  evaluation_date: '2025-09-10T10:00:00Z',
  notes: 'Initial evaluation completed',
  created_at: '2025-09-03T09:00:00Z',
  updated_at: '2025-09-03T09:00:00Z'
};

const mockTherapyPlans = [
  {
    id: 'plan-1',
    name_en: 'Speech Therapy Program',
    name_ar: 'برنامج علاج النطق',
    category_id: 'cat-1',
    duration_weeks: 12,
    sessions_per_week: 2,
    price_per_session: 200,
    total_price: 4800,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'plan-2',
    name_en: 'Behavioral Therapy Program',
    name_ar: 'برنامج العلاج السلوكي',
    category_id: 'cat-2',
    duration_weeks: 16,
    sessions_per_week: 3,
    price_per_session: 250,
    total_price: 12000,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];

const createMockMutation = () => ({
  mutateAsync: vi.fn(),
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
  data: null,
  reset: vi.fn()
});

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('LeadConversionWizard', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseStudentPlans.mockReturnValue({
      data: mockTherapyPlans,
      isLoading: false,
      isError: false,
      error: null
    } as any);

    mockUseCreateStudent.mockReturnValue(createMockMutation() as any);
    mockUseCreateEnrollment.mockReturnValue(createMockMutation() as any);
    mockUseUpdateLeadStatus.mockReturnValue(createMockMutation() as any);
  });

  it('renders wizard steps correctly', () => {
    render(
      <TestWrapper>
        <LeadConversionWizard
          lead={mockLead}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    );

    // Check wizard title
    expect(screen.getByText('crm.conversion.convert_lead')).toBeInTheDocument();

    // Check step labels
    expect(screen.getByText('crm.conversion.student_info')).toBeInTheDocument();
    expect(screen.getByText('crm.conversion.guardian_info')).toBeInTheDocument();
    expect(screen.getByText('crm.conversion.enrollment_details')).toBeInTheDocument();
    expect(screen.getByText('crm.conversion.billing_info')).toBeInTheDocument();
    expect(screen.getByText('crm.conversion.confirmation')).toBeInTheDocument();
  });

  it('pre-fills form with lead data', () => {
    render(
      <TestWrapper>
        <LeadConversionWizard
          lead={mockLead}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    );

    // Check pre-filled student information
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('جين دو')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2019-01-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+966501234567')).toBeInTheDocument();
  });

  it('validates required fields on each step', async () => {
    render(
      <TestWrapper>
        <LeadConversionWizard
          lead={mockLead}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    );

    // Clear required field
    const nameInput = screen.getByDisplayValue('Jane Doe');
    fireEvent.change(nameInput, { target: { value: '' } });

    // Try to proceed to next step
    const nextButton = screen.getByText('common.next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('crm.validation.student_name_required')).toBeInTheDocument();
    });
  });

  it('navigates between wizard steps', async () => {
    render(
      <TestWrapper>
        <LeadConversionWizard
          lead={mockLead}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    );

    // Should start on step 0 (student info)
    expect(screen.getByText('crm.conversion.student_name_en')).toBeInTheDocument();

    // Go to next step
    const nextButton = screen.getByText('common.next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('crm.conversion.primary_guardian')).toBeInTheDocument();
    });

    // Go back to previous step
    const previousButton = screen.getByText('common.previous');
    fireEvent.click(previousButton);

    await waitFor(() => {
      expect(screen.getByText('crm.conversion.student_name_en')).toBeInTheDocument();
    });
  });

  it('displays therapy plans in enrollment step', async () => {
    render(
      <TestWrapper>
        <LeadConversionWizard
          lead={mockLead}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    );

    // Navigate to enrollment details step (step 2)
    const nextButton = screen.getByText('common.next');
    
    // Step 0 -> Step 1
    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText('crm.conversion.primary_guardian')).toBeInTheDocument();
    });

    // Step 1 -> Step 2
    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText('crm.conversion.therapy_plan')).toBeInTheDocument();
    });

    // Open therapy plan select
    const planSelect = screen.getByText('crm.conversion.select_therapy_plan');
    fireEvent.click(planSelect);

    // Should show therapy plans
    await waitFor(() => {
      expect(screen.getByText('Speech Therapy Program (برنامج علاج النطق)')).toBeInTheDocument();
      expect(screen.getByText('Behavioral Therapy Program (برنامج العلاج السلوكي)')).toBeInTheDocument();
    });
  });

  it('handles form submission successfully', async () => {
    const mockCreateStudentAsync = vi.fn().mockResolvedValue({ id: 'student-1' });
    const mockCreateEnrollmentAsync = vi.fn().mockResolvedValue({ id: 'enrollment-1' });
    const mockUpdateLeadAsync = vi.fn().mockResolvedValue({});

    mockUseCreateStudent.mockReturnValue({
      ...createMockMutation(),
      mutateAsync: mockCreateStudentAsync
    } as any);

    mockUseCreateEnrollment.mockReturnValue({
      ...createMockMutation(),
      mutateAsync: mockCreateEnrollmentAsync
    } as any);

    mockUseUpdateLeadStatus.mockReturnValue({
      ...createMockMutation(),
      mutateAsync: mockUpdateLeadAsync
    } as any);

    render(
      <TestWrapper>
        <LeadConversionWizard
          lead={mockLead}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    );

    // Navigate through all steps quickly
    const nextButton = screen.getByText('common.next');
    
    // Step 0 -> Step 1
    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText('crm.conversion.primary_guardian')).toBeInTheDocument();
    });

    // Step 1 -> Step 2
    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText('crm.conversion.therapy_plan')).toBeInTheDocument();
    });

    // Select therapy plan
    const planSelect = screen.getByText('crm.conversion.select_therapy_plan');
    fireEvent.click(planSelect);
    const therapyPlan = screen.getByText('Speech Therapy Program (برنامج علاج النطق)');
    fireEvent.click(therapyPlan);

    // Step 2 -> Step 3
    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText('crm.conversion.payment_method')).toBeInTheDocument();
    });

    // Step 3 -> Step 4 (confirmation)
    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText('crm.conversion.confirmation_message')).toBeInTheDocument();
    });

    // Submit conversion
    const convertButton = screen.getByText('crm.conversion.convert_to_student');
    fireEvent.click(convertButton);

    await waitFor(() => {
      expect(mockCreateStudentAsync).toHaveBeenCalled();
      expect(mockCreateEnrollmentAsync).toHaveBeenCalled();
      expect(mockUpdateLeadAsync).toHaveBeenCalledWith({
        id: '1',
        status: 'registered',
        notes: expect.stringContaining('Converted to student')
      });
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays confirmation summary correctly', async () => {
    render(
      <TestWrapper>
        <LeadConversionWizard
          lead={mockLead}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    );

    // Navigate to confirmation step (step 4)
    const nextButton = screen.getByText('common.next');
    
    // Navigate through all steps
    for (let i = 0; i < 4; i++) {
      fireEvent.click(nextButton);
      await waitFor(() => {}, { timeout: 100 });
    }

    await waitFor(() => {
      expect(screen.getByText('crm.conversion.confirmation_message')).toBeInTheDocument();
      expect(screen.getByText('crm.conversion.student_summary')).toBeInTheDocument();
      expect(screen.getByText('crm.conversion.enrollment_summary')).toBeInTheDocument();
    });
  });

  it('handles loading states during conversion', async () => {
    const mockCreateStudentAsync = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ id: 'student-1' }), 100))
    );

    mockUseCreateStudent.mockReturnValue({
      ...createMockMutation(),
      mutateAsync: mockCreateStudentAsync
    } as any);

    render(
      <TestWrapper>
        <LeadConversionWizard
          lead={mockLead}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    );

    // Navigate to confirmation step
    const nextButton = screen.getByText('common.next');
    for (let i = 0; i < 4; i++) {
      fireEvent.click(nextButton);
      await waitFor(() => {}, { timeout: 100 });
    }

    const convertButton = screen.getByText('crm.conversion.convert_to_student');
    fireEvent.click(convertButton);

    // Should show loading state
    expect(screen.getByText('common.processing')).toBeInTheDocument();
  });

  it('supports cancellation', () => {
    render(
      <TestWrapper>
        <LeadConversionWizard
          lead={mockLead}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    );

    const cancelButton = screen.getByText('common.cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('validates discount percentage', async () => {
    render(
      <TestWrapper>
        <LeadConversionWizard
          lead={mockLead}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    );

    // Navigate to billing step
    const nextButton = screen.getByText('common.next');
    for (let i = 0; i < 3; i++) {
      fireEvent.click(nextButton);
      await waitFor(() => {}, { timeout: 100 });
    }

    // Enter invalid discount
    const discountInput = screen.getByLabelText('crm.conversion.discount_percentage');
    fireEvent.change(discountInput, { target: { value: '150' } });

    // Try to proceed
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('crm.validation.discount_invalid')).toBeInTheDocument();
    });
  });

  it('handles Arabic language display', () => {
    vi.mocked(require('react-i18next').useTranslation).mockReturnValue({
      t: (key: string, defaultValue?: string) => defaultValue || key,
      i18n: { language: 'ar' }
    });

    render(
      <TestWrapper>
        <LeadConversionWizard
          lead={mockLead}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    );

    // Should display Arabic name in RTL field
    expect(screen.getByDisplayValue('جين دو')).toBeInTheDocument();
    
    // RTL field should have dir="rtl"
    const arabicField = screen.getByDisplayValue('جين دو');
    expect(arabicField).toHaveAttribute('dir', 'rtl');
  });

  it('handles missing therapy plans gracefully', () => {
    mockUseStudentPlans.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null
    } as any);

    render(
      <TestWrapper>
        <LeadConversionWizard
          lead={mockLead}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </TestWrapper>
    );

    // Should still render without errors
    expect(screen.getByText('crm.conversion.convert_lead')).toBeInTheDocument();
  });
});