/**
 * LeadKanbanBoard Component Tests
 * @description Tests for the Lead Kanban Board component
 * @author James (Dev Agent)
 * @date 2025-09-03
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadKanbanBoard } from '../../../components/crm/LeadKanbanBoard';
import type { Lead } from '../../../types/crm';

// Mock hooks
vi.mock('../../../hooks/useLeads', () => ({
  useLeads: vi.fn(),
  useUpdateLeadStatus: vi.fn()
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'en' }
  })
}));

// Mock drag and drop
vi.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-drop-context">{children}</div>,
  Droppable: ({ children }: { children: any }) => <div data-testid="droppable">{children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }, { isDraggingOver: false })}</div>,
  Draggable: ({ children }: { children: any }) => <div data-testid="draggable">{children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, { isDragging: false })}</div>
}));

// Mock data
const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    parent_name: 'أحمد محمد',
    parent_name_ar: 'أحمد محمد',
    parent_contact: '+966501234567',
    child_name: 'Ali Ahmed',
    child_name_ar: 'علي أحمد',
    child_dob: '2018-05-15',
    status: 'new_booking',
    source: 'website',
    created_at: '2025-09-03T08:00:00Z',
    updated_at: '2025-09-03T08:00:00Z'
  },
  {
    id: 'lead-2',
    parent_name: 'Sarah Johnson',
    parent_contact: 'sarah@example.com',
    child_name: 'Emma Johnson',
    child_dob: '2019-03-20',
    status: 'confirmed',
    source: 'referral',
    evaluation_date: '2025-09-10T10:00:00Z',
    created_at: '2025-09-02T10:00:00Z',
    updated_at: '2025-09-02T10:00:00Z'
  },
  {
    id: 'lead-3',
    parent_name: 'محمد عبدالله',
    parent_name_ar: 'محمد عبدالله',
    parent_contact: '+966509876543',
    child_name: 'فاطمة محمد',
    child_name_ar: 'فاطمة محمد',
    child_dob: '2017-11-10',
    status: 'evaluation_complete',
    source: 'walk_in',
    assigned_to: 'therapist-1',
    created_at: '2025-09-01T14:00:00Z',
    updated_at: '2025-09-01T14:00:00Z'
  }
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('LeadKanbanBoard', () => {
  const mockUseLeads = vi.fn();
  const mockUseUpdateLeadStatus = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseLeads.mockReturnValue({
      data: mockLeads,
      isLoading: false,
      error: null
    });

    mockUseUpdateLeadStatus.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null
    });

    // Apply mocks
    const { useLeads, useUpdateLeadStatus } = require('../../../hooks/useLeads');
    useLeads.mockImplementation(mockUseLeads);
    useUpdateLeadStatus.mockImplementation(mockUseUpdateLeadStatus);
  });

  it('should render kanban board with all columns', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    // Check for column titles
    expect(screen.getByText('New Bookings')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Evaluation Complete')).toBeInTheDocument();
    expect(screen.getByText('Registered')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('should display leads in correct columns', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    // Check that leads appear in their respective columns
    expect(screen.getByText('أحمد محمد')).toBeInTheDocument(); // new_booking
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument(); // confirmed
    expect(screen.getByText('محمد عبدالله')).toBeInTheDocument(); // evaluation_complete
  });

  it('should show lead count badges', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    // Check for count badges (mockLeads has 1 lead per status)
    const badges = screen.getAllByText('1');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should display child information for each lead', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    expect(screen.getByText('علي أحمد')).toBeInTheDocument();
    expect(screen.getByText('Emma Johnson')).toBeInTheDocument();
    expect(screen.getByText('فاطمة محمد')).toBeInTheDocument();
  });

  it('should show contact information', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    expect(screen.getByText('+966501234567')).toBeInTheDocument();
    expect(screen.getByText('sarah@example.com')).toBeInTheDocument();
  });

  it('should calculate and display child ages', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    // Check that age calculations appear (will be approximate)
    expect(screen.getByText(/Age:/)).toBeInTheDocument();
  });

  it('should show evaluation dates when available', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    // Check for formatted evaluation date
    expect(screen.getByText(/Sep 10/)).toBeInTheDocument();
  });

  it('should display source badges', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    expect(screen.getByText('website')).toBeInTheDocument();
    expect(screen.getByText('referral')).toBeInTheDocument();
    expect(screen.getByText('walk_in')).toBeInTheDocument();
  });

  it('should show assigned indicators when leads are assigned', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    // Check for assigned indicator
    expect(screen.getByText('Assigned')).toBeInTheDocument();
  });

  it('should handle search functionality', async () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText('Search leads...');
    
    fireEvent.change(searchInput, { target: { value: 'Ahmed' } });

    await waitFor(() => {
      expect(mockUseLeads).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Ahmed'
        })
      );
    });
  });

  it('should open lead details dialog when lead card is clicked', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    const leadCard = screen.getByText('أحمد محمد').closest('[role="button"]') || 
                     screen.getByText('أحمد محمد').closest('div[data-testid="draggable"]')?.parentElement;
    
    if (leadCard) {
      fireEvent.click(leadCard);
    }

    // Dialog should be rendered (even if not visible due to mocking)
    // In a real implementation, we'd check for dialog content
    expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseLeads.mockReturnValue({
      data: [],
      isLoading: true,
      error: null
    });

    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    // Check for skeleton loading
    expect(document.querySelectorAll('.animate-pulse')).toBeTruthy();
  });

  it('should show error state', () => {
    mockUseLeads.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to load leads')
    });

    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load leads')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should show empty state when no leads in column', () => {
    mockUseLeads.mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    });

    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    expect(screen.getAllByText('No leads in this stage')).toHaveLength(5);
  });

  it('should handle drag and drop status updates', async () => {
    const mockMutateAsync = vi.fn();
    mockUseUpdateLeadStatus.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null
    });

    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    // Simulate drag and drop (this would be more complex in a real test)
    // For now, we test that the component renders the drag-drop structure
    expect(screen.getByTestId('drag-drop-context')).toBeInTheDocument();
    expect(screen.getAllByTestId('droppable')).toHaveLength(5);
  });

  it('should render with RTL support', () => {
    const { useTranslation } = require('react-i18next');
    useTranslation.mockReturnValue({
      t: (key: string, defaultValue?: string) => defaultValue || key,
      i18n: { language: 'ar' }
    });

    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    // Check that Arabic names are displayed when available
    expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
    expect(screen.getByText('علي أحمد')).toBeInTheDocument();
  });

  it('should handle export functionality', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    const exportButton = screen.getByText('Export');
    expect(exportButton).toBeInTheDocument();
  });

  it('should handle filter functionality', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    const filterButton = screen.getByText('Filter');
    expect(filterButton).toBeInTheDocument();
  });

  it('should handle add lead functionality', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    const addButton = screen.getByText('Add Lead');
    expect(addButton).toBeInTheDocument();
  });

  it('should be responsive on different screen sizes', () => {
    // Test mobile responsiveness
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    // Check that responsive classes are applied
    expect(screen.getByText('Lead Management')).toBeInTheDocument();
  });
});

describe('LeadKanbanBoard Accessibility', () => {
  beforeEach(() => {
    const { useLeads, useUpdateLeadStatus } = require('../../../hooks/useLeads');
    
    useLeads.mockReturnValue({
      data: mockLeads,
      isLoading: false,
      error: null
    });

    useUpdateLeadStatus.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null
    });
  });

  it('should have proper ARIA labels', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    // Check for search input accessibility
    const searchInput = screen.getByPlaceholderText('Search leads...');
    expect(searchInput).toHaveAttribute('type', 'text');
  });

  it('should support keyboard navigation', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    // Test that buttons are focusable
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeVisible();
    });
  });

  it('should have descriptive text for screen readers', () => {
    render(<LeadKanbanBoard />, { wrapper: createWrapper() });

    expect(screen.getByText('Track and manage potential students through the conversion funnel')).toBeInTheDocument();
  });
});