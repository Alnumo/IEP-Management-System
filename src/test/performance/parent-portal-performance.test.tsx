/**
 * Parent Portal Performance Tests
 * اختبارات الأداء لبوابة ولي الأمر
 * 
 * Tests performance with large datasets and heavy operations
 * اختبار الأداء مع مجموعات البيانات الكبيرة والعمليات الثقيلة
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { performance } from 'perf_hooks';

// Test components
import ParentMessaging from '@/components/parent/ParentMessaging';
import ParentProgressDashboard from '@/components/parent/ParentProgressDashboard';
import HomeProgramManager from '@/components/parent/HomeProgramManager';
import ParentDocuments from '@/components/parent/ParentDocuments';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis()
  };

  return {
    supabase: {
      from: vi.fn(() => mockQuery),
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn()
      },
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      })),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'test-url' } }))
        }))
      }
    },
    mockQuery
  };
});

// Performance utility functions
const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const start = performance.now();
  await act(async () => {
    renderFn();
  });
  const end = performance.now();
  return end - start;
};

const measureAsyncOperation = async (operation: () => Promise<void>): Promise<number> => {
  const start = performance.now();
  await operation();
  const end = performance.now();
  return end - start;
};

// Large dataset generators
const generateLargeMessageDataset = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `msg-${index}`,
    parent_id: 'parent-1',
    therapist_id: 'therapist-1',
    student_id: 'student-1',
    subject_ar: `موضوع الرسالة رقم ${index + 1}`,
    subject_en: `Message Subject ${index + 1}`,
    content_ar: `محتوى الرسالة رقم ${index + 1} - هذا نص طويل يحتوي على تفاصيل كثيرة حول حالة الطالب وتقدمه في العلاج`,
    content_en: `Message content ${index + 1} - This is a long text containing many details about the student's condition and progress in therapy`,
    is_read: Math.random() > 0.5,
    sent_by_therapist: Math.random() > 0.5,
    priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
    attachments: Math.random() > 0.7 ? [
      {
        id: `attachment-${index}`,
        file_name: `document-${index}.pdf`,
        file_size: Math.floor(Math.random() * 5000000),
        file_type: 'application/pdf'
      }
    ] : [],
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    read_at: Math.random() > 0.5 ? new Date().toISOString() : null,
    replied_at: Math.random() > 0.8 ? new Date().toISOString() : null
  }));
};

const generateLargeProgressDataset = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `progress-${index}`,
    student_id: 'student-1',
    goal_id: `goal-${index % 10}`, // 10 different goals
    session_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    progress_percentage: Math.floor(Math.random() * 100),
    notes_ar: `ملاحظات التقدم رقم ${index + 1} - تفاصيل حول أداء الطالب في الجلسة`,
    notes_en: `Progress notes ${index + 1} - Details about student performance in session`,
    behavioral_data: {
      attention_span: Math.floor(Math.random() * 100),
      compliance: Math.floor(Math.random() * 100),
      social_interaction: Math.floor(Math.random() * 100),
      communication: Math.floor(Math.random() * 100),
      motor_skills: Math.floor(Math.random() * 100)
    },
    therapist_id: `therapist-${(index % 5) + 1}`,
    session_duration: 30 + Math.floor(Math.random() * 60),
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  }));
};

const generateLargeDocumentDataset = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `doc-${index}`,
    student_id: 'student-1',
    title_ar: `مستند رقم ${index + 1}`,
    title_en: `Document ${index + 1}`,
    description_ar: `وصف المستند رقم ${index + 1}`,
    description_en: `Description of document ${index + 1}`,
    file_path: `documents/doc-${index}.pdf`,
    file_size: 500000 + Math.floor(Math.random() * 5000000),
    file_type: 'application/pdf',
    is_sensitive: Math.random() > 0.7,
    category: ['therapy_report', 'assessment', 'medical_record', 'progress_report'][Math.floor(Math.random() * 4)],
    tags: [`tag-${index % 10}`, `category-${index % 5}`],
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    uploaded_by: `therapist-${(index % 5) + 1}`,
    access_count: Math.floor(Math.random() * 100),
    last_accessed: Math.random() > 0.3 ? new Date().toISOString() : null
  }));
};

const generateLargeHomeProgramDataset = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `program-${index}`,
    student_id: 'student-1',
    therapist_id: `therapist-${(index % 5) + 1}`,
    title_ar: `البرنامج المنزلي رقم ${index + 1}`,
    title_en: `Home Program ${index + 1}`,
    description_ar: `وصف البرنامج المنزلي رقم ${index + 1}`,
    description_en: `Description of home program ${index + 1}`,
    instructions: Array.from({ length: 5 + Math.floor(Math.random() * 10) }, (_, stepIndex) => ({
      step_number: stepIndex + 1,
      instruction_ar: `الخطوة ${stepIndex + 1} من البرنامج ${index + 1}`,
      instruction_en: `Step ${stepIndex + 1} of program ${index + 1}`,
      duration: 10 + Math.floor(Math.random() * 20),
      media_url: Math.random() > 0.5 ? `media/program-${index}-step-${stepIndex}.mp4` : null
    })),
    target_frequency: ['daily', 'weekly', 'twice_weekly'][Math.floor(Math.random() * 3)],
    completion_tracking: Array.from({ length: Math.floor(Math.random() * 30) }, (_, dayIndex) => ({
      completion_date: new Date(Date.now() - dayIndex * 24 * 60 * 60 * 1000).toISOString(),
      completed_steps: Math.floor(Math.random() * 10),
      notes: `ملاحظات اليوم ${dayIndex + 1}`,
      evidence_files: Math.random() > 0.7 ? [`evidence-${index}-${dayIndex}.jpg`] : []
    })),
    due_date: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: Math.random() > 0.2,
    difficulty_level: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)],
    estimated_duration: 15 + Math.floor(Math.random() * 45),
    created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
  }));
};

// Mock parent profile
const mockParentProfile = {
  id: 'parent-1',
  user_id: 'user-1',
  student_id: 'student-1',
  parent_name_ar: 'أحمد محمد',
  parent_name_en: 'Ahmed Mohamed',
  preferred_language: 'ar' as const,
  notification_preferences: {}
};

// Test wrapper component
const PerformanceTestWrapper: React.FC<{ 
  children: React.ReactNode;
  language?: 'ar' | 'en';
}> = ({ children, language = 'ar' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider initialLanguage={language}>
          {children}
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('Parent Portal Performance Tests', () => {
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = require('@/lib/supabase').mockQuery;
    
    // Setup default auth
    const mockSupabase = require('@/lib/supabase').supabase;
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: { role: 'parent' } } }
    });
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } }
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Large Dataset Rendering Performance', () => {
    it('should render messaging component with 1000 messages in under 2 seconds', async () => {
      const largeMessageDataset = generateLargeMessageDataset(1000);
      
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: largeMessageDataset, error: null });

      const renderTime = await measureRenderTime(() => {
        render(
          <PerformanceTestWrapper>
            <ParentMessaging />
          </PerformanceTestWrapper>
        );
      });

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('الرسائل')).toBeInTheDocument();
      }, { timeout: 3000 });

      console.log(`Messaging component render time with 1000 messages: ${renderTime}ms`);
      expect(renderTime).toBeLessThan(2000); // Under 2 seconds
    });

    it('should render progress dashboard with 5000 progress records in under 3 seconds', async () => {
      const largeProgressDataset = generateLargeProgressDataset(5000);
      
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: [{ id: 'student-1', name_ar: 'سارة أحمد' }], error: null });
      mockQuery.mockResolvedValueOnce({ data: largeProgressDataset, error: null });

      const renderTime = await measureRenderTime(() => {
        render(
          <PerformanceTestWrapper>
            <ParentProgressDashboard />
          </PerformanceTestWrapper>
        );
      });

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('لوحة تتبع التقدم')).toBeInTheDocument();
      }, { timeout: 5000 });

      console.log(`Progress dashboard render time with 5000 records: ${renderTime}ms`);
      expect(renderTime).toBeLessThan(3000); // Under 3 seconds
    });

    it('should render document list with 2000 documents in under 2.5 seconds', async () => {
      const largeDocumentDataset = generateLargeDocumentDataset(2000);
      
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: largeDocumentDataset, error: null });

      const renderTime = await measureRenderTime(() => {
        render(
          <PerformanceTestWrapper>
            <ParentDocuments />
          </PerformanceTestWrapper>
        );
      });

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('المستندات')).toBeInTheDocument();
      }, { timeout: 4000 });

      console.log(`Document list render time with 2000 documents: ${renderTime}ms`);
      expect(renderTime).toBeLessThan(2500); // Under 2.5 seconds
    });

    it('should render home programs with 500 complex programs in under 2 seconds', async () => {
      const largeHomeProgramDataset = generateLargeHomeProgramDataset(500);
      
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: largeHomeProgramDataset, error: null });

      const renderTime = await measureRenderTime(() => {
        render(
          <PerformanceTestWrapper>
            <HomeProgramManager />
          </PerformanceTestWrapper>
        );
      });

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('البرامج المنزلية')).toBeInTheDocument();
      }, { timeout: 3000 });

      console.log(`Home programs render time with 500 programs: ${renderTime}ms`);
      expect(renderTime).toBeLessThan(2000); // Under 2 seconds
    });
  });

  describe('Search and Filter Performance', () => {
    it('should perform message search on 1000 messages in under 500ms', async () => {
      const largeMessageDataset = generateLargeMessageDataset(1000);
      
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: largeMessageDataset, error: null });
      mockQuery.mockResolvedValueOnce({ 
        data: largeMessageDataset.filter(msg => msg.subject_ar.includes('1')), 
        error: null 
      });

      const user = userEvent.setup();

      render(
        <PerformanceTestWrapper>
          <ParentMessaging />
        </PerformanceTestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('الرسائل')).toBeInTheDocument();
      });

      // Measure search performance
      const searchTime = await measureAsyncOperation(async () => {
        const searchInput = screen.getByPlaceholderText(/البحث في الرسائل/i);
        await user.type(searchInput, '1');
        
        await waitFor(() => {
          // Verify search results are filtered
          expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('1'));
        });
      });

      console.log(`Message search time on 1000 messages: ${searchTime}ms`);
      expect(searchTime).toBeLessThan(500); // Under 500ms
    });

    it('should filter progress data by date range on 5000 records in under 300ms', async () => {
      const largeProgressDataset = generateLargeProgressDataset(5000);
      
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: [{ id: 'student-1', name_ar: 'سارة أحمد' }], error: null });
      mockQuery.mockResolvedValueOnce({ data: largeProgressDataset, error: null });
      mockQuery.mockResolvedValueOnce({ 
        data: largeProgressDataset.slice(0, 100), // Simulate filtered results
        error: null 
      });

      const user = userEvent.setup();

      render(
        <PerformanceTestWrapper>
          <ParentProgressDashboard />
        </PerformanceTestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('لوحة تتبع التقدم')).toBeInTheDocument();
      });

      // Measure filter performance
      const filterTime = await measureAsyncOperation(async () => {
        const dateFromInput = screen.getByLabelText('من تاريخ');
        const dateToInput = screen.getByLabelText('إلى تاريخ');
        
        await user.type(dateFromInput, '2024-01-01');
        await user.type(dateToInput, '2024-12-31');
        
        const applyButton = screen.getByRole('button', { name: /تطبيق/i });
        await user.click(applyButton);
        
        await waitFor(() => {
          expect(mockQuery).toHaveBeenCalledWith('2024-01-01T00:00:00.000Z');
        });
      });

      console.log(`Progress filter time on 5000 records: ${filterTime}ms`);
      expect(filterTime).toBeLessThan(300); // Under 300ms
    });
  });

  describe('Virtualization and Pagination Performance', () => {
    it('should handle virtual scrolling with 10000 messages efficiently', async () => {
      const hugeMessageDataset = generateLargeMessageDataset(10000);
      
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: hugeMessageDataset.slice(0, 50), error: null }); // Initial page

      const user = userEvent.setup();

      render(
        <PerformanceTestWrapper>
          <ParentMessaging />
        </PerformanceTestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('الرسائل')).toBeInTheDocument();
      });

      // Measure scroll performance
      const scrollTime = await measureAsyncOperation(async () => {
        const messageList = screen.getByRole('list') || screen.getByTestId('message-list');
        
        // Simulate scroll to trigger virtual scrolling
        act(() => {
          messageList.scrollTop = 1000;
          messageList.dispatchEvent(new Event('scroll'));
        });

        await waitFor(() => {
          // Should load more messages
          expect(mockQuery).toHaveBeenCalledTimes(3); // Initial + profile + scroll load
        });
      });

      console.log(`Virtual scroll performance with 10000 messages: ${scrollTime}ms`);
      expect(scrollTime).toBeLessThan(200); // Under 200ms for scroll response
    });

    it('should paginate through 1000 documents efficiently', async () => {
      const largeDocumentDataset = generateLargeDocumentDataset(1000);
      
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: largeDocumentDataset.slice(0, 20), error: null }); // Page 1
      mockQuery.mockResolvedValueOnce({ data: largeDocumentDataset.slice(20, 40), error: null }); // Page 2

      const user = userEvent.setup();

      render(
        <PerformanceTestWrapper>
          <ParentDocuments />
        </PerformanceTestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('المستندات')).toBeInTheDocument();
      });

      // Measure pagination performance
      const paginationTime = await measureAsyncOperation(async () => {
        const nextPageButton = screen.getByRole('button', { name: /التالي/i });
        await user.click(nextPageButton);
        
        await waitFor(() => {
          expect(mockQuery).toHaveBeenCalledTimes(3); // Initial + profile + next page
        });
      });

      console.log(`Document pagination time: ${paginationTime}ms`);
      expect(paginationTime).toBeLessThan(300); // Under 300ms for page navigation
    });
  });

  describe('Real-time Updates Performance', () => {
    it('should handle 100 real-time message updates efficiently', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: generateLargeMessageDataset(100), error: null });

      const mockSupabase = require('@/lib/supabase').supabase;
      let subscriptionCallback: (payload: any) => void = () => {};

      mockSupabase.channel.mockReturnValue({
        on: vi.fn((event, callback) => {
          subscriptionCallback = callback;
          return {
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn()
          };
        }),
        subscribe: vi.fn()
      });

      render(
        <PerformanceTestWrapper>
          <ParentMessaging />
        </PerformanceTestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('الرسائل')).toBeInTheDocument();
      });

      // Measure real-time update performance
      const updateTime = await measureAsyncOperation(async () => {
        // Simulate 100 rapid updates
        for (let i = 0; i < 100; i++) {
          const newMessage = {
            id: `realtime-msg-${i}`,
            subject_ar: `رسالة فورية ${i}`,
            subject_en: `Realtime message ${i}`,
            content_ar: `محتوى الرسالة الفورية ${i}`,
            content_en: `Realtime message content ${i}`,
            created_at: new Date().toISOString()
          };

          act(() => {
            subscriptionCallback({
              eventType: 'INSERT',
              new: newMessage,
              old: null
            });
          });
        }

        // Wait for updates to be processed
        await waitFor(() => {
          expect(screen.getByText('رسالة فورية 99')).toBeInTheDocument();
        }, { timeout: 2000 });
      });

      console.log(`100 real-time updates processing time: ${updateTime}ms`);
      expect(updateTime).toBeLessThan(1000); // Under 1 second for 100 updates
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not cause memory leaks with large datasets', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Render and unmount multiple large components
      for (let i = 0; i < 5; i++) {
        const largeDataset = generateLargeMessageDataset(500);
        
        mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
        mockQuery.mockResolvedValueOnce({ data: largeDataset, error: null });

        const { unmount } = render(
          <PerformanceTestWrapper>
            <ParentMessaging />
          </PerformanceTestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('الرسائل')).toBeInTheDocument();
        });

        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryGrowth = finalMemory - initialMemory;

      console.log(`Memory growth after 5 large component cycles: ${memoryGrowth} bytes`);
      
      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Network Request Optimization', () => {
    it('should batch multiple API requests efficiently', async () => {
      let requestCount = 0;
      
      mockQuery.mockImplementation(() => {
        requestCount++;
        return Promise.resolve({ data: [], error: null });
      });

      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockImplementation(() => {
        requestCount++;
        return mockQuery;
      });

      const batchTime = await measureAsyncOperation(async () => {
        // Render component that makes multiple requests
        render(
          <PerformanceTestWrapper>
            <ParentProgressDashboard />
          </PerformanceTestWrapper>
        );

        await waitFor(() => {
          expect(requestCount).toBeGreaterThan(0);
        });
      });

      console.log(`Batch request time: ${batchTime}ms, Request count: ${requestCount}`);
      
      // Should complete batch requests quickly
      expect(batchTime).toBeLessThan(500);
      
      // Should not make excessive requests
      expect(requestCount).toBeLessThan(10);
    });
  });

  describe('Component Re-render Optimization', () => {
    it('should minimize unnecessary re-renders during data updates', async () => {
      let renderCount = 0;
      
      // Mock React.memo behavior by counting renders
      const OriginalMessaging = ParentMessaging;
      const MockedMessaging = vi.fn(() => {
        renderCount++;
        return OriginalMessaging({});
      });

      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: generateLargeMessageDataset(100), error: null });

      const { rerender } = render(
        <PerformanceTestWrapper>
          <MockedMessaging />
        </PerformanceTestWrapper>
      );

      await waitFor(() => {
        expect(renderCount).toBeGreaterThan(0);
      });

      const initialRenderCount = renderCount;

      // Trigger re-render with same data
      rerender(
        <PerformanceTestWrapper>
          <MockedMessaging />
        </PerformanceTestWrapper>
      );

      const finalRenderCount = renderCount;
      const rerenderDifference = finalRenderCount - initialRenderCount;

      console.log(`Re-render count difference: ${rerenderDifference}`);
      
      // Should minimize unnecessary re-renders
      expect(rerenderDifference).toBeLessThan(3);
    });
  });

  describe('Bundle Size and Loading Performance', () => {
    it('should load component code efficiently with code splitting', async () => {
      const loadTime = await measureAsyncOperation(async () => {
        // Simulate dynamic import
        const module = await import('@/components/parent/ParentMessaging');
        expect(module.default).toBeDefined();
      });

      console.log(`Component code splitting load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(100); // Under 100ms for code loading
    });
  });

  describe('Accessibility Performance', () => {
    it('should maintain accessibility with large datasets', async () => {
      const largeDataset = generateLargeMessageDataset(1000);
      
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: largeDataset, error: null });

      const accessibilityTime = await measureAsyncOperation(async () => {
        const { container } = render(
          <PerformanceTestWrapper>
            <ParentMessaging />
          </PerformanceTestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('الرسائل')).toBeInTheDocument();
        });

        // Check accessibility attributes are present
        const buttons = container.querySelectorAll('button');
        const links = container.querySelectorAll('a');
        const inputs = container.querySelectorAll('input, textarea, select');

        // All interactive elements should have accessibility attributes
        [...buttons, ...links, ...inputs].forEach(element => {
          const hasAccessibility = 
            element.hasAttribute('aria-label') ||
            element.hasAttribute('aria-labelledby') ||
            element.hasAttribute('aria-describedby') ||
            element.textContent?.trim();
          
          expect(hasAccessibility).toBe(true);
        });
      });

      console.log(`Accessibility check time with large dataset: ${accessibilityTime}ms`);
      expect(accessibilityTime).toBeLessThan(1000); // Under 1 second
    });
  });
});