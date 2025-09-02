/**
 * Parent Portal Integration Tests
 * اختبارات تكامل بوابة ولي الأمر
 * 
 * Tests end-to-end workflows for messaging and progress tracking
 * اختبار سير العمل من البداية إلى النهاية للرسائل وتتبع التقدم
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Test components
import ParentMessaging from '@/components/parent/ParentMessaging';
import ParentProgressDashboard from '@/components/parent/ParentProgressDashboard';
import HomeProgramManager from '@/components/parent/HomeProgramManager';

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

// Mock data
const mockParentProfile = {
  id: 'parent-1',
  user_id: 'user-1',
  student_id: 'student-1',
  parent_name_ar: 'أحمد محمد',
  parent_name_en: 'Ahmed Mohamed',
  preferred_language: 'ar' as const,
  notification_preferences: {},
  phone_number: '966501234567',
  email: 'parent@example.com',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockStudent = {
  id: 'student-1',
  name_ar: 'سارة أحمد',
  name_en: 'Sarah Ahmed',
  date_of_birth: '2015-01-01',
  diagnosis_codes: ['F84.0'],
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockMessages = [
  {
    id: 'msg-1',
    parent_id: 'parent-1',
    therapist_id: 'therapist-1',
    student_id: 'student-1',
    subject_ar: 'تحديث حول التقدم',
    subject_en: 'Progress Update',
    content_ar: 'تقدمت سارة بشكل ممتاز في جلسة اليوم',
    content_en: 'Sarah made excellent progress in today\'s session',
    is_read: false,
    sent_by_therapist: true,
    priority: 'medium' as const,
    attachments: [],
    created_at: new Date().toISOString(),
    read_at: null,
    replied_at: null
  },
  {
    id: 'msg-2',
    parent_id: 'parent-1',
    therapist_id: 'therapist-1',
    student_id: 'student-1',
    subject_ar: 'رد على التقدم',
    subject_en: 'Reply to Progress',
    content_ar: 'شكراً لك، أتطلع لمزيد من التقدم',
    content_en: 'Thank you, looking forward to more progress',
    is_read: true,
    sent_by_therapist: false,
    priority: 'low' as const,
    attachments: [],
    created_at: new Date().toISOString(),
    read_at: new Date().toISOString(),
    replied_at: null
  }
];

const mockProgressData = [
  {
    id: 'progress-1',
    student_id: 'student-1',
    goal_id: 'goal-1',
    session_date: new Date().toISOString(),
    progress_percentage: 75,
    notes_ar: 'تحسن ملحوظ في التواصل',
    notes_en: 'Notable improvement in communication',
    behavioral_data: {
      attention_span: 85,
      compliance: 90,
      social_interaction: 70
    },
    created_at: new Date().toISOString()
  },
  {
    id: 'progress-2',
    student_id: 'student-1',
    goal_id: 'goal-2',
    session_date: new Date().toISOString(),
    progress_percentage: 60,
    notes_ar: 'استمرار في تطوير المهارات الحركية',
    notes_en: 'Continued development in motor skills',
    behavioral_data: {
      fine_motor: 65,
      gross_motor: 70,
      coordination: 55
    },
    created_at: new Date().toISOString()
  }
];

const mockHomePrograms = [
  {
    id: 'program-1',
    student_id: 'student-1',
    therapist_id: 'therapist-1',
    title_ar: 'برنامج التواصل المنزلي',
    title_en: 'Home Communication Program',
    description_ar: 'تمارين يومية لتحسين التواصل',
    description_en: 'Daily exercises to improve communication',
    instructions: [
      {
        step_number: 1,
        instruction_ar: 'ممارسة الكلمات البسيطة لمدة 10 دقائق',
        instruction_en: 'Practice simple words for 10 minutes'
      }
    ],
    target_frequency: 'daily',
    completion_tracking: [],
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Test wrapper component
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

  const mockUser = {
    id: 'user-1',
    email: 'parent@example.com',
    user_metadata: { role: 'parent' },
    aud: 'authenticated',
    created_at: new Date().toISOString()
  };

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

describe('Parent Portal Integration Tests', () => {
  let mockQuery: any;
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Get reference to mock query
    mockQuery = require('@/lib/supabase').mockQuery;
    
    // Setup default auth state
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

  describe('Messaging Integration Tests', () => {
    it('should display messages and allow sending new message in Arabic', async () => {
      // Setup mock responses
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockMessages, error: null });
      mockQuery.mockResolvedValueOnce({ data: { id: 'new-msg' }, error: null });

      const user = userEvent.setup();

      render(
        <TestWrapper language="ar">
          <ParentMessaging />
        </TestWrapper>
      );

      // Wait for messages to load
      await waitFor(() => {
        expect(screen.getByText('تحديث حول التقدم')).toBeInTheDocument();
      });

      // Verify messages are displayed
      expect(screen.getByText('تقدمت سارة بشكل ممتاز في جلسة اليوم')).toBeInTheDocument();
      expect(screen.getByText('شكراً لك، أتطلع لمزيد من التقدم')).toBeInTheDocument();

      // Test composing new message
      const composeButton = screen.getByRole('button', { name: /رسالة جديدة/i });
      await user.click(composeButton);

      await waitFor(() => {
        expect(screen.getByLabelText('الموضوع')).toBeInTheDocument();
      });

      // Fill in message form
      const subjectInput = screen.getByLabelText('الموضوع');
      const contentTextarea = screen.getByLabelText('المحتوى');

      await user.type(subjectInput, 'استفسار عن التقدم');
      await user.type(contentTextarea, 'أريد معرفة المزيد عن تقدم ابني');

      // Send message
      const sendButton = screen.getByRole('button', { name: /إرسال/i });
      await user.click(sendButton);

      // Verify API calls
      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            subject_ar: 'استفسار عن التقدم',
            content_ar: 'أريد معرفة المزيد عن تقدم ابني'
          })
        );
      });
    });

    it('should handle message attachments and file upload', async () => {
      // Setup mock responses
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockMessages, error: null });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ParentMessaging />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /رسالة جديدة/i })).toBeInTheDocument();
      });

      // Open compose dialog
      const composeButton = screen.getByRole('button', { name: /رسالة جديدة/i });
      await user.click(composeButton);

      // Test file upload
      const fileInput = screen.getByLabelText(/إرفاق ملف/i);
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      await user.upload(fileInput, testFile);

      // Verify file is handled
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });

    it('should mark messages as read when opened', async () => {
      // Setup mock responses
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockMessages, error: null });
      mockQuery.mockResolvedValueOnce({ data: {}, error: null }); // Mark as read response

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ParentMessaging />
        </TestWrapper>
      );

      // Wait for messages to load
      await waitFor(() => {
        expect(screen.getByText('تحديث حول التقدم')).toBeInTheDocument();
      });

      // Click on unread message
      const unreadMessage = screen.getByText('تحديث حول التقدم');
      await user.click(unreadMessage);

      // Verify mark as read API call
      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            is_read: true,
            read_at: expect.any(String)
          })
        );
      });
    });
  });

  describe('Progress Tracking Integration Tests', () => {
    it('should display progress dashboard with real-time updates', async () => {
      // Setup mock responses
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: [mockStudent], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockProgressData, error: null });

      render(
        <TestWrapper>
          <ParentProgressDashboard />
        </TestWrapper>
      );

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText('لوحة تتبع التقدم')).toBeInTheDocument();
      });

      // Verify progress data is displayed
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('تحسن ملحوظ في التواصل')).toBeInTheDocument();
    });

    it('should filter progress by date range', async () => {
      // Setup mock responses
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: [mockStudent], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockProgressData, error: null });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ParentProgressDashboard />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('لوحة تتبع التقدم')).toBeInTheDocument();
      });

      // Test date filter
      const dateFromInput = screen.getByLabelText('من تاريخ');
      const dateToInput = screen.getByLabelText('إلى تاريخ');

      await user.type(dateFromInput, '2024-01-01');
      await user.type(dateToInput, '2024-12-31');

      // Apply filter
      const applyButton = screen.getByRole('button', { name: /تطبيق/i });
      await user.click(applyButton);

      // Verify filtered API call
      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith('2024-01-01T00:00:00.000Z');
        expect(mockQuery).toHaveBeenCalledWith('2024-12-31T23:59:59.999Z');
      });
    });

    it('should export progress data to PDF', async () => {
      // Setup mock responses
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: [mockStudent], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockProgressData, error: null });

      // Mock window.open and URL.createObjectURL
      global.window.open = vi.fn();
      global.URL.createObjectURL = vi.fn(() => 'blob:test-url');

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ParentProgressDashboard />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('لوحة تتبع التقدم')).toBeInTheDocument();
      });

      // Click export button
      const exportButton = screen.getByRole('button', { name: /تصدير PDF/i });
      await user.click(exportButton);

      // Verify export functionality
      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe('Home Program Integration Tests', () => {
    it('should load home programs and track completion', async () => {
      // Setup mock responses
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockHomePrograms, error: null });
      mockQuery.mockResolvedValueOnce({ data: {}, error: null }); // Completion update

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <HomeProgramManager />
        </TestWrapper>
      );

      // Wait for programs to load
      await waitFor(() => {
        expect(screen.getByText('برنامج التواصل المنزلي')).toBeInTheDocument();
      });

      // Verify program details
      expect(screen.getByText('تمارين يومية لتحسين التواصل')).toBeInTheDocument();
      expect(screen.getByText('ممارسة الكلمات البسيطة لمدة 10 دقائق')).toBeInTheDocument();

      // Mark step as complete
      const completeButton = screen.getByRole('button', { name: /إكمال الخطوة/i });
      await user.click(completeButton);

      // Verify completion API call
      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            step_number: 1,
            completed_at: expect.any(String)
          })
        );
      });
    });

    it('should upload evidence files for program completion', async () => {
      // Setup mock responses
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockHomePrograms, error: null });

      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: 'evidence/test-file.jpg' },
        error: null
      });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <HomeProgramManager />
        </TestWrapper>
      );

      // Wait for programs to load
      await waitFor(() => {
        expect(screen.getByText('برنامج التواصل المنزلي')).toBeInTheDocument();
      });

      // Upload evidence file
      const fileInput = screen.getByLabelText(/تحميل دليل/i);
      const testFile = new File(['evidence'], 'evidence.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, testFile);

      // Verify file upload
      await waitFor(() => {
        expect(mockSupabase.storage.from().upload).toHaveBeenCalledWith(
          expect.stringMatching(/evidence/),
          testFile
        );
      });
    });
  });

  describe('Real-time Integration Tests', () => {
    it('should receive real-time message updates', async () => {
      // Setup mock responses
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockMessages, error: null });

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
        <TestWrapper>
          <ParentMessaging />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('تحديث حول التقدم')).toBeInTheDocument();
      });

      // Simulate real-time message
      const newMessage = {
        id: 'msg-new',
        parent_id: 'parent-1',
        subject_ar: 'رسالة جديدة',
        subject_en: 'New Message',
        content_ar: 'رسالة وردت للتو',
        content_en: 'Message just arrived',
        is_read: false,
        sent_by_therapist: true,
        created_at: new Date().toISOString()
      };

      subscriptionCallback({
        eventType: 'INSERT',
        new: newMessage,
        old: null
      });

      // Verify new message appears
      await waitFor(() => {
        expect(screen.getByText('رسالة جديدة')).toBeInTheDocument();
        expect(screen.getByText('رسالة وردت للتو')).toBeInTheDocument();
      });
    });

    it('should update progress data in real-time', async () => {
      // Setup mock responses
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: [mockStudent], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockProgressData, error: null });

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
        <TestWrapper>
          <ParentProgressDashboard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
      });

      // Simulate real-time progress update
      const updatedProgress = {
        ...mockProgressData[0],
        progress_percentage: 85,
        notes_ar: 'تحسن كبير في الأداء'
      };

      subscriptionCallback({
        eventType: 'UPDATE',
        new: updatedProgress,
        old: mockProgressData[0]
      });

      // Verify updated progress appears
      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText('تحسن كبير في الأداء')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration Tests', () => {
    it('should handle network errors gracefully', async () => {
      // Setup error response
      mockQuery.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <ParentMessaging />
        </TestWrapper>
      );

      // Verify error state
      await waitFor(() => {
        expect(screen.getByText(/خطأ في تحميل/i)).toBeInTheDocument();
      });

      // Verify retry functionality
      const retryButton = screen.getByRole('button', { name: /إعادة المحاولة/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should handle unauthorized access', async () => {
      // Setup unauthorized response
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' }
      });

      render(
        <TestWrapper>
          <ParentProgressDashboard />
        </TestWrapper>
      );

      // Verify redirect to login
      await waitFor(() => {
        expect(screen.getByText(/غير مصرح/i)).toBeInTheDocument();
      });
    });
  });

  describe('Bilingual Integration Tests', () => {
    it('should switch language and update all content', async () => {
      // Setup mock responses
      mockQuery.mockResolvedValueOnce({ data: [mockParentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockMessages, error: null });

      const user = userEvent.setup();

      render(
        <TestWrapper language="ar">
          <ParentMessaging />
        </TestWrapper>
      );

      // Verify Arabic content
      await waitFor(() => {
        expect(screen.getByText('تحديث حول التقدم')).toBeInTheDocument();
      });

      // Switch to English
      const languageToggle = screen.getByRole('button', { name: /English/i });
      await user.click(languageToggle);

      // Verify English content
      await waitFor(() => {
        expect(screen.getByText('Progress Update')).toBeInTheDocument();
      });
    });
  });
});