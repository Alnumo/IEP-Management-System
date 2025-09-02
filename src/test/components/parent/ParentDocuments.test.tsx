/**
 * ParentDocuments Component Test Suite
 * 
 * Tests the secure document access system functionality including:
 * - Document list display and filtering
 * - Search functionality  
 * - Statistics dashboard
 * - PDF document viewing
 * - Bookmark management
 * - Bilingual support (Arabic RTL/English LTR)
 * - Permission handling
 * - Mobile responsive design
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ParentDocuments from '../../components/parent/ParentDocuments';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }))
}));

// Mock scrollIntoView for JSDOM compatibility
Element.prototype.scrollIntoView = vi.fn();

// Mock data
const mockDocuments = [
  {
    id: 'doc-1',
    title: 'تقرير العلاج الطبيعي - يناير 2025',
    title_en: 'Physical Therapy Report - January 2025',
    category: 'therapy_reports' as const,
    file_url: '/documents/therapy-report-jan-2025.pdf',
    file_type: 'pdf',
    file_size: 1024000,
    upload_date: '2025-01-15T10:00:00Z',
    is_viewed: true,
    is_bookmarked: false,
    access_level: 'parent' as const,
    created_at: '2025-01-15T10:00:00Z'
  },
  {
    id: 'doc-2',
    title: 'نتائج تقييم النطق',
    title_en: 'Speech Assessment Results',
    category: 'assessments' as const,
    file_url: '/documents/speech-assessment.pdf',
    file_type: 'pdf',
    file_size: 512000,
    upload_date: '2025-01-10T14:30:00Z',
    is_viewed: false,
    is_bookmarked: true,
    access_level: 'parent' as const,
    created_at: '2025-01-10T14:30:00Z'
  }
];

const mockStats = {
  total_documents: 15,
  new_documents: 3,
  viewed_documents: 12,
  bookmarked_documents: 5,
  documents_this_month: 8
};

// Mock Supabase query responses
const createMockQuery = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn()
  };
  
  // Configure responses
  mockQuery.then.mockImplementation((callback) => {
    const response = { data: mockDocuments, error: null };
    return callback(response);
  });

  mockQuery.single.mockImplementation(() => ({
    then: vi.fn().mockImplementation((callback) => {
      const response = { data: mockStats, error: null };
      return callback(response);
    })
  }));

  return mockQuery;
};

const TestWrapper: React.FC<{ children: React.ReactNode; language?: 'ar' | 'en' }> = ({ 
  children, 
  language = 'ar' 
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider defaultLanguage={language}>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  );
};

describe('ParentDocuments Component', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup Supabase mock
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'parent-123' } },
          error: null
        })
      },
      from: vi.fn(() => createMockQuery())
    };
    
    (createClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders document list correctly in Arabic', async () => {
      render(
        <TestWrapper language="ar">
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('المستندات')).toBeInTheDocument();
        expect(screen.getByText('إحصائيات المستندات')).toBeInTheDocument();
      });

      // Check document items
      await waitFor(() => {
        expect(screen.getByText('تقرير العلاج الطبيعي - يناير 2025')).toBeInTheDocument();
        expect(screen.getByText('نتائج تقييم النطق')).toBeInTheDocument();
      });
    });

    it('renders document list correctly in English', async () => {
      render(
        <TestWrapper language="en">
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
        expect(screen.getByText('Document Statistics')).toBeInTheDocument();
      });

      // Check document items
      await waitFor(() => {
        expect(screen.getByText('Physical Therapy Report - January 2025')).toBeInTheDocument();
        expect(screen.getByText('Speech Assessment Results')).toBeInTheDocument();
      });
    });

    it('applies RTL layout for Arabic', async () => {
      render(
        <TestWrapper language="ar">
          <ParentDocuments />
        </TestWrapper>
      );

      const container = screen.getByTestId('parent-documents-container') || 
                       document.querySelector('[class*="parent-documents"]');
      
      if (container) {
        expect(container).toHaveAttribute('dir', 'rtl');
      }
    });

    it('applies LTR layout for English', async () => {
      render(
        <TestWrapper language="en">
          <ParentDocuments />
        </TestWrapper>
      );

      const container = screen.getByTestId('parent-documents-container') || 
                       document.querySelector('[class*="parent-documents"]');
      
      if (container) {
        expect(container).toHaveAttribute('dir', 'ltr');
      }
    });
  });

  describe('Statistics Dashboard', () => {
    it('displays document statistics correctly', async () => {
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument(); // total documents
        expect(screen.getByText('3')).toBeInTheDocument();  // new documents
        expect(screen.getByText('12')).toBeInTheDocument(); // viewed documents
        expect(screen.getByText('5')).toBeInTheDocument();  // bookmarked documents
        expect(screen.getByText('8')).toBeInTheDocument();  // this month
      });
    });

    it('shows loading state for statistics', () => {
      const slowQuery = {
        ...createMockQuery(),
        single: vi.fn().mockImplementation(() => ({
          then: vi.fn().mockImplementation(() => new Promise(() => {}))
        }))
      };
      
      mockSupabase.from.mockReturnValue(slowQuery);

      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      // Should show skeleton loaders
      expect(document.querySelectorAll('[class*="animate-pulse"]')).toHaveLength.greaterThan(0);
    });
  });

  describe('Document Filtering', () => {
    it('filters documents by category', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      // Wait for documents to load
      await waitFor(() => {
        expect(screen.getByText('تقرير العلاج الطبيعي - يناير 2025')).toBeInTheDocument();
      });

      // Find and click category filter
      const categoryFilter = screen.getByDisplayValue('الكل') || screen.getByRole('combobox');
      await user.click(categoryFilter);
      
      // Select therapy reports
      const therapyOption = screen.getByText('تقارير العلاج') || screen.getByRole('option', { name: /therapy/i });
      await user.click(therapyOption);

      // Should trigger new query
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('filters documents by date range', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('تقرير العلاج الطبيعي - يناير 2025')).toBeInTheDocument();
      });

      // Find date range inputs
      const fromDateInput = screen.getByPlaceholderText('من تاريخ') || screen.getByLabelText(/from date/i);
      const toDateInput = screen.getByPlaceholderText('إلى تاريخ') || screen.getByLabelText(/to date/i);

      await user.type(fromDateInput, '2025-01-01');
      await user.type(toDateInput, '2025-01-31');

      // Should trigger filtered query
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('shows only viewed documents when filtered', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('تقرير العلاج الطبيعي - يناير 2025')).toBeInTheDocument();
      });

      // Find and click viewed filter
      const viewedFilter = screen.getByLabelText('المشاهدة فقط') || screen.getByRole('checkbox');
      await user.click(viewedFilter);

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('searches documents by title', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('تقرير العلاج الطبيعي - يناير 2025')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('البحث في المستندات...') || 
                         screen.getByRole('searchbox');
      
      await user.type(searchInput, 'تقرير العلاج');

      // Should trigger search query with ilike
      await waitFor(() => {
        const mockQuery = createMockQuery();
        expect(mockQuery.ilike).toHaveBeenCalled();
      });
    });

    it('clears search results', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('البحث في المستندات...') || 
                         screen.getByRole('searchbox');
      
      await user.type(searchInput, 'test search');
      
      const clearButton = screen.getByLabelText('مسح البحث') || screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Document Viewing', () => {
    it('opens document viewer when document is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('تقرير العلاج الطبيعي - يناير 2025')).toBeInTheDocument();
      });

      const documentButton = screen.getByText('تقرير العلاج الطبيعي - يناير 2025');
      await user.click(documentButton);

      // Should open document viewer modal
      await waitFor(() => {
        expect(screen.getByRole('dialog') || screen.getByTestId('document-viewer')).toBeInTheDocument();
      });
    });

    it('closes document viewer when close button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('تقرير العلاج الطبيعي - يناير 2025')).toBeInTheDocument();
      });

      // Open viewer
      const documentButton = screen.getByText('تقرير العلاج الطبيعي - يناير 2025');
      await user.click(documentButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog') || screen.getByTestId('document-viewer')).toBeInTheDocument();
      });

      // Close viewer
      const closeButton = screen.getByLabelText('إغلاق') || screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays PDF in document viewer', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('تقرير العلاج الطبيعي - يناير 2025')).toBeInTheDocument();
      });

      const documentButton = screen.getByText('تقرير العلاج الطبيعي - يناير 2025');
      await user.click(documentButton);

      await waitFor(() => {
        const iframe = screen.getByTitle('Document Viewer') || document.querySelector('iframe');
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveAttribute('src', expect.stringContaining('/documents/therapy-report-jan-2025.pdf'));
      });
    });
  });

  describe('Bookmark Management', () => {
    it('toggles bookmark status when bookmark button is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock the bookmark mutation
      const mockMutation = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from = vi.fn(() => ({
        ...createMockQuery(),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            then: mockMutation
          }))
        }))
      }));
      
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('تقرير العلاج الطبيعي - يناير 2025')).toBeInTheDocument();
      });

      // Find bookmark button (should be empty star for unbookmarked document)
      const bookmarkButtons = screen.getAllByLabelText(/إضافة|إزالة/) || 
                              screen.getAllByRole('button', { name: /bookmark/i });
      
      if (bookmarkButtons.length > 0) {
        await user.click(bookmarkButtons[0]);
        expect(mockMutation).toHaveBeenCalled();
      }
    });

    it('shows bookmarked documents with filled star icon', async () => {
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('نتائج تقييم النطق')).toBeInTheDocument();
      });

      // The bookmarked document should have a filled star
      const bookmarkedDoc = screen.getByText('نتائج تقييم النطق').closest('[class*="document-item"]');
      if (bookmarkedDoc) {
        expect(within(bookmarkedDoc).getByLabelText('إزالة من المفضلة')).toBeInTheDocument();
      }
    });
  });

  describe('File Size Formatting', () => {
    it('formats file sizes correctly', async () => {
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('1.0 MB')).toBeInTheDocument(); // 1024000 bytes
        expect(screen.getByText('512.0 KB')).toBeInTheDocument(); // 512000 bytes
      });
    });
  });

  describe('Error Handling', () => {
    it('handles document loading errors gracefully', async () => {
      // Mock error response
      const errorQuery = {
        ...createMockQuery(),
        then: vi.fn().mockImplementation((callback) => {
          const response = { data: null, error: { message: 'Database error' } };
          return callback(response);
        })
      };
      
      mockSupabase.from.mockReturnValue(errorQuery);

      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/خطأ في تحميل|Error loading/)).toBeInTheDocument();
      });
    });

    it('shows empty state when no documents found', async () => {
      // Mock empty response
      const emptyQuery = {
        ...createMockQuery(),
        then: vi.fn().mockImplementation((callback) => {
          const response = { data: [], error: null };
          return callback(response);
        })
      };
      
      mockSupabase.from.mockReturnValue(emptyQuery);

      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/لا توجد مستندات|No documents found/)).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      // Should have responsive classes
      const container = document.querySelector('[class*="grid"]');
      expect(container).toHaveClass(/grid-cols-1|sm:grid-cols-2|md:grid-cols-3/);
    });

    it('handles touch interactions on mobile', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('تقرير العلاج الطبيعي - يناير 2025')).toBeInTheDocument();
      });

      // Touch events should work similar to clicks
      const documentButton = screen.getByText('تقرير العلاج الطبيعي - يناير 2025');
      
      // Simulate touch interaction
      fireEvent.touchStart(documentButton);
      fireEvent.touchEnd(documentButton);
      
      // Should open document viewer
      await waitFor(() => {
        expect(screen.getByRole('dialog') || screen.getByTestId('document-viewer')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for screen readers', () => {
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      // Check for important ARIA labels
      expect(screen.getByLabelText(/البحث في المستندات|Search documents/)).toBeInTheDocument();
      expect(screen.getByRole('main') || screen.getByRole('region')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('تقرير العلاج الطبيعي - يناير 2025')).toBeInTheDocument();
      });

      // Tab to document button
      await user.tab();
      const focusedElement = document.activeElement;
      
      // Press Enter to open document
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByRole('dialog') || screen.getByTestId('document-viewer')).toBeInTheDocument();
      });
    });

    it('has proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <ParentDocuments />
        </TestWrapper>
      );

      // Check heading structure
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument(); // Main title
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument(); // Section titles
    });
  });
});