import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import IEPBulkOperations from '@/components/iep/IEPBulkOperations';
import { render, TestProviders } from '@/test/utils/test-utils';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'iep.bulk_operations': 'Bulk Operations',
        'common.selected': 'selected',
        'tabs.batch_operations': 'Batch Operations',
        'tabs.import': 'Import',
        'tabs.export': 'Export',
        'alerts.select_ieps_for_batch_operations': 'Please select IEPs to perform batch operations',
        'alerts.select_ieps_for_export': 'Please select IEPs to export',
        'forms.new_status': 'New Status',
        'forms.select_status': 'Select Status',
        'forms.assigned_therapist': 'Assigned Therapist',
        'forms.select_therapist': 'Select Therapist',
        'actions.apply': 'Apply',
        'actions.cancel': 'Cancel',
        'actions.export': 'Export',
        'actions.select_file': 'Select File',
        'import.supported_formats': 'Supported Formats',
        'import.drag_drop_or_click': 'Drag and drop files or click to browse',
        'import.supported_file_types': 'CSV, Excel, and JSON files are supported',
        'import.importing': 'Importing...',
        'export.format': 'Export Format',
        'export.include_sections': 'Include Sections',
        'export.metadata': 'Metadata',
        'export.goals': 'Goals',
        'export.services': 'Services',
        'export.accommodations': 'Accommodations',
        'export.exporting': 'Exporting...',
        'status.draft': 'Draft',
        'status.active': 'Active',
        'status.under_review': 'Under Review',
        'success.bulk_import_completed': 'Bulk import completed',
        'success.export_completed': 'Export completed',
        'success.batch_update_completed': 'Batch update completed',
        'errors.bulk_import_failed': 'Bulk import failed',
        'errors.export_failed': 'Export failed',
        'errors.batch_update_failed': 'Batch update failed',
        'common.items': 'items'
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

describe('IEPBulkOperations', () => {
  const defaultProps = {
    selectedIEPs: [],
    onSelectionChange: vi.fn(),
    language: 'en' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Functionality Tests', () => {
    it('renders bulk operations interface', () => {
      render(<IEPBulkOperations {...defaultProps} />);

      expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
      expect(screen.getByText('Batch Operations')).toBeInTheDocument();
      expect(screen.getByText('Import')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('shows selection count when IEPs are selected', () => {
      render(<IEPBulkOperations {...defaultProps} selectedIEPs={['iep-1', 'iep-2', 'iep-3']} />);

      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });

    it('displays warning when no IEPs are selected for batch operations', () => {
      render(<IEPBulkOperations {...defaultProps} />);

      expect(screen.getByText('Please select IEPs to perform batch operations')).toBeInTheDocument();
    });

    it('allows selecting batch operations when IEPs are selected', () => {
      render(<IEPBulkOperations {...defaultProps} selectedIEPs={['iep-1', 'iep-2']} />);

      const statusUpdateOperation = screen.getByText('Update IEP Status');
      expect(statusUpdateOperation).toBeInTheDocument();
      
      const workflowUpdateOperation = screen.getByText('Update Workflow Stage');
      expect(workflowUpdateOperation).toBeInTheDocument();
    });

    it('shows batch update form when operation is selected', async () => {
      const user = userEvent.setup();
      
      render(<IEPBulkOperations {...defaultProps} selectedIEPs={['iep-1', 'iep-2']} />);

      const statusUpdateOperation = screen.getByText('Update IEP Status');
      await user.click(statusUpdateOperation);

      await waitFor(() => {
        expect(screen.getByText('New Status')).toBeInTheDocument();
        expect(screen.getByText('Apply')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('performs batch status update', async () => {
      const user = userEvent.setup();
      
      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ updated: 2 }),
      });

      render(<IEPBulkOperations {...defaultProps} selectedIEPs={['iep-1', 'iep-2']} />);

      // Select status update operation
      const statusUpdateOperation = screen.getByText('Update IEP Status');
      await user.click(statusUpdateOperation);

      // Select status
      const statusSelect = screen.getByText('Select Status');
      await user.click(statusSelect);
      
      const activeStatus = screen.getByText('Active');
      await user.click(activeStatus);

      // Apply the update
      const applyButton = screen.getByText('Apply');
      await user.click(applyButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/iep/batch-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'active',
            iepIds: ['iep-1', 'iep-2'],
            operation: 'status_update'
          })
        });
      });
    });
  });

  describe('Import Functionality Tests', () => {
    it('shows import interface in import tab', async () => {
      const user = userEvent.setup();
      
      render(<IEPBulkOperations {...defaultProps} />);

      const importTab = screen.getByText('Import');
      await user.click(importTab);

      expect(screen.getByText('Supported Formats')).toBeInTheDocument();
      expect(screen.getByText('Drag and drop files or click to browse')).toBeInTheDocument();
      expect(screen.getByText('Select File')).toBeInTheDocument();
    });

    it('handles file selection for import', async () => {
      const user = userEvent.setup();
      
      // Mock successful import
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          successful: 5,
          failed: 1,
          errors: ['Row 3: Invalid student ID'],
          warnings: []
        }),
      });

      render(<IEPBulkOperations {...defaultProps} />);

      const importTab = screen.getByText('Import');
      await user.click(importTab);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Simulate file selection
      const file = new File(['test content'], 'ieps.csv', { type: 'text/csv' });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/iep/bulk-import', {
          method: 'POST',
          body: expect.any(FormData),
        });
      });
    });
  });

  describe('Export Functionality Tests', () => {
    it('shows export interface when IEPs are selected', async () => {
      const user = userEvent.setup();
      
      render(<IEPBulkOperations {...defaultProps} selectedIEPs={['iep-1', 'iep-2']} />);

      const exportTab = screen.getByText('Export');
      await user.click(exportTab);

      expect(screen.getByText('Export Format')).toBeInTheDocument();
      expect(screen.getByText('Include Sections')).toBeInTheDocument();
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    it('shows warning when no IEPs selected for export', async () => {
      const user = userEvent.setup();
      
      render(<IEPBulkOperations {...defaultProps} />);

      const exportTab = screen.getByText('Export');
      await user.click(exportTab);

      expect(screen.getByText('Please select IEPs to export')).toBeInTheDocument();
    });

    it('configures export options', async () => {
      const user = userEvent.setup();
      
      render(<IEPBulkOperations {...defaultProps} selectedIEPs={['iep-1']} />);

      const exportTab = screen.getByText('Export');
      await user.click(exportTab);

      // Check metadata checkbox
      const metadataCheckbox = screen.getByRole('checkbox', { name: /metadata/i });
      expect(metadataCheckbox).toBeChecked();

      // Uncheck goals checkbox
      const goalsCheckbox = screen.getByRole('checkbox', { name: /goals/i });
      await user.click(goalsCheckbox);
      expect(goalsCheckbox).not.toBeChecked();
    });
  });

  describe('Localization Tests', () => {
    it('renders correctly in Arabic (RTL)', () => {
      render(<IEPBulkOperations {...defaultProps} language="ar" />, { language: 'ar' });

      const card = screen.getByRole('tabpanel');
      expect(card.closest('[dir]')).toHaveAttribute('dir', 'rtl');
    });

    it('renders correctly in English (LTR)', () => {
      render(<IEPBulkOperations {...defaultProps} language="en" />, { language: 'en' });

      const card = screen.getByRole('tabpanel');
      expect(card.closest('[dir]')).toHaveAttribute('dir', 'ltr');
    });
  });

  describe('Accessibility Tests', () => {
    it('has proper ARIA labels and roles', () => {
      render(<IEPBulkOperations {...defaultProps} selectedIEPs={['iep-1']} />);

      // Tabs should have proper roles
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);

      // Tab panels should be accessible
      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel).toBeInTheDocument();
    });

    it('supports keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      
      render(<IEPBulkOperations {...defaultProps} />);

      const batchTab = screen.getByText('Batch Operations');
      batchTab.focus();
      
      // Navigate to import tab with arrow keys
      await user.keyboard('{ArrowRight}');
      
      const importTab = screen.getByText('Import');
      expect(importTab).toHaveFocus();
    });
  });
});