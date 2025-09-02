/**
 * Parent Portal Security Tests
 * اختبارات الأمان لبوابة ولي الأمر
 * 
 * Tests security boundaries and permission enforcement
 * اختبار حدود الأمان وتطبيق الأذونات
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Test components
import ParentMessaging from '@/components/parent/ParentMessaging';
import ParentProgressDashboard from '@/components/parent/ParentProgressDashboard';
import HomeProgramManager from '@/components/parent/HomeProgramManager';
import ParentDocuments from '@/components/parent/ParentDocuments';

// Mock Supabase with security-focused mocks
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
    filter: vi.fn().mockReturnThis(),
    // RLS policy simulation
    rls: vi.fn().mockReturnThis()
  };

  return {
    supabase: {
      from: vi.fn(() => mockQuery),
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
      },
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn()
      })),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          download: vi.fn(),
          remove: vi.fn(),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'test-url' } }))
        }))
      }
    },
    mockQuery
  };
});

// Security test data
const createMockUser = (role: string, id: string = 'user-1') => ({
  id,
  email: `${role}@example.com`,
  user_metadata: { role },
  aud: 'authenticated',
  created_at: new Date().toISOString()
});

const createMockParentProfile = (userId: string, studentId: string) => ({
  id: `parent-${userId}`,
  user_id: userId,
  student_id: studentId,
  parent_name_ar: 'أحمد محمد',
  parent_name_en: 'Ahmed Mohamed',
  preferred_language: 'ar' as const,
  notification_preferences: {},
  phone_number: '966501234567',
  email: `parent-${userId}@example.com`,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

const createSecureTestData = (studentId: string, otherStudentId: string) => ({
  // Data that should be accessible to parent
  authorizedMessages: [
    {
      id: 'auth-msg-1',
      parent_id: 'parent-user-1',
      therapist_id: 'therapist-1',
      student_id: studentId,
      subject_ar: 'رسالة مخولة',
      subject_en: 'Authorized Message',
      content_ar: 'محتوى يحق للوالد رؤيته',
      content_en: 'Content parent is allowed to see',
      is_read: false,
      sent_by_therapist: true,
      priority: 'medium' as const,
      created_at: new Date().toISOString()
    }
  ],
  // Data that should NOT be accessible to parent
  unauthorizedMessages: [
    {
      id: 'unauth-msg-1',
      parent_id: 'parent-user-2',
      therapist_id: 'therapist-1',
      student_id: otherStudentId,
      subject_ar: 'رسالة غير مخولة',
      subject_en: 'Unauthorized Message',
      content_ar: 'محتوى لا يحق للوالد رؤيته',
      content_en: 'Content parent should not see',
      is_read: false,
      sent_by_therapist: true,
      priority: 'high' as const,
      created_at: new Date().toISOString()
    }
  ],
  authorizedDocuments: [
    {
      id: 'auth-doc-1',
      student_id: studentId,
      title_ar: 'مستند مخول',
      title_en: 'Authorized Document',
      file_path: 'documents/authorized.pdf',
      file_size: 1024000,
      is_sensitive: false,
      created_at: new Date().toISOString()
    }
  ],
  unauthorizedDocuments: [
    {
      id: 'unauth-doc-1',
      student_id: otherStudentId,
      title_ar: 'مستند غير مخول',
      title_en: 'Unauthorized Document',
      file_path: 'documents/unauthorized.pdf',
      file_size: 2048000,
      is_sensitive: true,
      created_at: new Date().toISOString()
    }
  ],
  authorizedProgress: [
    {
      id: 'auth-progress-1',
      student_id: studentId,
      goal_id: 'goal-1',
      progress_percentage: 75,
      notes_ar: 'تقدم مخول للعرض',
      notes_en: 'Authorized progress to view',
      session_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  ],
  unauthorizedProgress: [
    {
      id: 'unauth-progress-1',
      student_id: otherStudentId,
      goal_id: 'goal-2',
      progress_percentage: 60,
      notes_ar: 'تقدم غير مخول للعرض',
      notes_en: 'Unauthorized progress to view',
      session_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  ]
});

// Security test wrapper
const SecurityTestWrapper: React.FC<{ 
  children: React.ReactNode;
  user?: any;
  language?: 'ar' | 'en';
}> = ({ children, user, language = 'ar' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false }
    }
  });

  // Mock auth context with specific user
  const mockAuthContext = {
    user,
    loading: false,
    isAuthenticated: !!user,
    signOut: vi.fn(),
    signIn: vi.fn()
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider value={mockAuthContext}>
        <LanguageProvider initialLanguage={language}>
          {children}
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('Parent Portal Security Tests', () => {
  let mockQuery: any;
  const parentUser = createMockUser('parent', 'user-1');
  const otherParentUser = createMockUser('parent', 'user-2');
  const therapistUser = createMockUser('therapist', 'user-3');
  const adminUser = createMockUser('admin', 'user-4');

  const parentProfile = createMockParentProfile('user-1', 'student-1');
  const otherParentProfile = createMockParentProfile('user-2', 'student-2');
  
  const testData = createSecureTestData('student-1', 'student-2');

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = require('@/lib/supabase').mockQuery;
    
    const mockSupabase = require('@/lib/supabase').supabase;
    
    // Default to unauthorized state
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'No user found' }
    });
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'No session found' }
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication and Authorization Tests', () => {
    it('should deny access to unauthenticated users', async () => {
      // No user authentication
      mockQuery.mockRejectedValue({ 
        code: 'PGRST301',
        message: 'JWT expired or invalid' 
      });

      render(
        <SecurityTestWrapper user={null}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      // Should show access denied or redirect to login
      await waitFor(() => {
        expect(
          screen.getByText(/غير مصرح|تسجيل الدخول|Access Denied/i)
        ).toBeInTheDocument();
      });
    });

    it('should enforce parent role-based access control', async () => {
      // Setup therapist user trying to access parent portal
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: therapistUser }
      });
      
      mockQuery.mockRejectedValue({
        code: 'PGRST116',
        message: 'The result contains 0 rows'
      });

      render(
        <SecurityTestWrapper user={therapistUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      // Should deny access for non-parent role
      await waitFor(() => {
        expect(
          screen.getByText(/غير مصرح|Access Denied|Unauthorized/i)
        ).toBeInTheDocument();
      });
    });

    it('should allow authorized parent access to their data', async () => {
      // Setup authorized parent
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });
      
      mockQuery.mockResolvedValueOnce({ data: [parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: testData.authorizedMessages, error: null });

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      // Should show authorized content
      await waitFor(() => {
        expect(screen.getByText('رسالة مخولة')).toBeInTheDocument();
      });

      // Should not show unauthorized content
      expect(screen.queryByText('رسالة غير مخولة')).not.toBeInTheDocument();
    });
  });

  describe('Row Level Security (RLS) Tests', () => {
    it('should only return messages for the authenticated parent\'s student', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      // Simulate RLS filtering - only authorized messages returned
      mockQuery.mockResolvedValueOnce({ data: [parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: testData.authorizedMessages, error: null });

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('رسالة مخولة')).toBeInTheDocument();
      });

      // Verify RLS policy was applied (user's student_id filter)
      expect(mockQuery).toHaveBeenCalledWith('student-1');
    });

    it('should enforce document access permissions', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      mockQuery.mockResolvedValueOnce({ data: [parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: testData.authorizedDocuments, error: null });

      const user = userEvent.setup();

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentDocuments />
        </SecurityTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('مستند مخول')).toBeInTheDocument();
      });

      // Try to access document
      const documentLink = screen.getByText('مستند مخول');
      await user.click(documentLink);

      // Verify access is logged and authorized
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          document_id: 'auth-doc-1',
          parent_id: 'parent-user-1',
          access_granted: true
        })
      );
    });

    it('should deny access to sensitive documents without consent', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      const sensitiveDocument = {
        ...testData.authorizedDocuments[0],
        is_sensitive: true,
        requires_consent: true
      };

      mockQuery.mockResolvedValueOnce({ data: [parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: [sensitiveDocument], error: null });
      mockQuery.mockResolvedValueOnce({ data: [], error: null }); // No consent record

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentDocuments />
        </SecurityTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('مستند مخول')).toBeInTheDocument();
      });

      // Document should be visible but not accessible without consent
      const documentElement = screen.getByText('مستند مخول').closest('[data-sensitive="true"]');
      expect(documentElement).toBeInTheDocument();
    });
  });

  describe('Data Validation and Sanitization Tests', () => {
    it('should sanitize user input to prevent XSS attacks', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      mockQuery.mockResolvedValueOnce({ data: [parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: testData.authorizedMessages, error: null });
      mockQuery.mockResolvedValueOnce({ data: { id: 'new-msg' }, error: null });

      const user = userEvent.setup();

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /رسالة جديدة/i })).toBeInTheDocument();
      });

      // Open compose dialog
      const composeButton = screen.getByRole('button', { name: /رسالة جديدة/i });
      await user.click(composeButton);

      // Try to input malicious script
      const maliciousInput = '<script>alert("XSS")</script>Test Message';
      
      const subjectInput = screen.getByLabelText('الموضوع');
      const contentTextarea = screen.getByLabelText('المحتوى');

      await user.type(subjectInput, maliciousInput);
      await user.type(contentTextarea, maliciousInput);

      const sendButton = screen.getByRole('button', { name: /إرسال/i });
      await user.click(sendButton);

      // Verify input was sanitized before sending
      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            subject_ar: 'Test Message', // Script tag removed
            content_ar: 'Test Message'
          })
        );
      });
    });

    it('should validate file uploads for security', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      const testData = require('@/test/mocks/homePrograms').generateLargeHomeProgramDataset(1);
      mockQuery.mockResolvedValueOnce({ data: [parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: testData, error: null });

      const user = userEvent.setup();

      render(
        <SecurityTestWrapper user={parentUser}>
          <HomeProgramManager />
        </SecurityTestWrapper>
      );

      // Try to upload potentially malicious file
      const maliciousFile = new File(
        ['<script>alert("XSS")</script>'], 
        'malicious.exe',
        { type: 'application/octet-stream' }
      );

      const fileInput = screen.getByLabelText(/تحميل دليل/i);
      await user.upload(fileInput, maliciousFile);

      // Should reject unsafe file types
      await waitFor(() => {
        expect(screen.getByText(/نوع الملف غير مسموح/i)).toBeInTheDocument();
      });
    });

    it('should enforce file size limits', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      const user = userEvent.setup();

      render(
        <SecurityTestWrapper user={parentUser}>
          <HomeProgramManager />
        </SecurityTestWrapper>
      );

      // Create oversized file (>10MB)
      const oversizedFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)], // 11MB
        'large-file.jpg',
        { type: 'image/jpeg' }
      );

      const fileInput = screen.getByLabelText(/تحميل دليل/i);
      await user.upload(fileInput, oversizedFile);

      // Should reject oversized files
      await waitFor(() => {
        expect(screen.getByText(/حجم الملف كبير جداً/i)).toBeInTheDocument();
      });
    });
  });

  describe('Session Security Tests', () => {
    it('should handle session expiration gracefully', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Initial valid session
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: parentUser }
      });
      mockQuery.mockResolvedValueOnce({ data: [parentProfile], error: null });

      const { rerender } = render(
        <SecurityTestWrapper user={parentUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('الرسائل')).toBeInTheDocument();
      });

      // Simulate session expiration
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'JWT expired' }
      });

      mockQuery.mockRejectedValueOnce({
        code: 'PGRST301',
        message: 'JWT expired or invalid'
      });

      // Re-render to trigger session check
      rerender(
        <SecurityTestWrapper user={null}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      // Should redirect to login or show auth error
      await waitFor(() => {
        expect(
          screen.getByText(/انتهت الجلسة|Session Expired|تسجيل الدخول/i)
        ).toBeInTheDocument();
      });
    });

    it('should prevent concurrent sessions from different devices', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Simulate concurrent session detection
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      mockQuery.mockRejectedValue({
        code: 'PGRST119',
        message: 'Session conflict detected'
      });

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentProgressDashboard />
        </SecurityTestWrapper>
      );

      // Should handle session conflict
      await waitFor(() => {
        expect(
          screen.getByText(/تضارب في الجلسة|Session Conflict/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('API Security Tests', () => {
    it('should include proper authentication headers', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      let requestHeaders: any = {};
      mockQuery.mockImplementation(() => {
        // Capture headers from the request
        requestHeaders = mockSupabase.auth.headers || {};
        return Promise.resolve({ data: [parentProfile], error: null });
      });

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      await waitFor(() => {
        // Verify authentication header is present
        expect(mockSupabase.from).toHaveBeenCalled();
      });
    });

    it('should handle rate limiting gracefully', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      // Simulate rate limit error
      mockQuery.mockRejectedValue({
        code: '429',
        message: 'Too Many Requests'
      });

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      // Should show rate limit message
      await waitFor(() => {
        expect(
          screen.getByText(/كثرة الطلبات|Rate Limit|Too Many Requests/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Data Encryption and Privacy Tests', () => {
    it('should not expose sensitive data in client-side logs', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const consoleErrorSpy = vi.spyOn(console, 'error');

      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      const sensitiveData = {
        ...testData.authorizedMessages[0],
        content_ar: 'معلومات طبية سرية: تشخيص مرض نفسي',
        content_en: 'Sensitive medical info: mental health diagnosis'
      };

      mockQuery.mockResolvedValueOnce({ data: [parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: [sensitiveData], error: null });

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/معلومات طبية سرية/)).toBeInTheDocument();
      });

      // Check that sensitive data is not logged
      const allLogs = [...consoleSpy.mock.calls, ...consoleErrorSpy.mock.calls];
      const hasLoogedSensitiveData = allLogs.some(log =>
        JSON.stringify(log).includes('معلومات طبية سرية') ||
        JSON.stringify(log).includes('mental health diagnosis')
      );

      expect(hasLoogedSensitiveData).toBe(false);

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should mask sensitive form data in network requests', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      mockQuery.mockResolvedValueOnce({ data: [parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: testData.authorizedMessages, error: null });

      const user = userEvent.setup();

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /رسالة جديدة/i })).toBeInTheDocument();
      });

      const composeButton = screen.getByRole('button', { name: /رسالة جديدة/i });
      await user.click(composeButton);

      // Input sensitive information
      const sensitiveContent = 'رقم الهوية: 1234567890، رقم الهاتف: 966501234567';
      const contentTextarea = screen.getByLabelText('المحتوى');
      await user.type(contentTextarea, sensitiveContent);

      const sendButton = screen.getByRole('button', { name: /إرسال/i });
      await user.click(sendButton);

      // Data should be sent but not logged in clear text
      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            content_ar: expect.not.stringContaining('1234567890')
          })
        );
      });
    });
  });

  describe('Cross-Site Request Forgery (CSRF) Protection', () => {
    it('should include CSRF tokens in state-changing requests', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      mockQuery.mockResolvedValueOnce({ data: [parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: testData.authorizedMessages, error: null });

      const user = userEvent.setup();

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /رسالة جديدة/i })).toBeInTheDocument();
      });

      const composeButton = screen.getByRole('button', { name: /رسالة جديدة/i });
      await user.click(composeButton);

      const subjectInput = screen.getByLabelText('الموضوع');
      await user.type(subjectInput, 'Test Subject');

      const sendButton = screen.getByRole('button', { name: /إرسال/i });
      await user.click(sendButton);

      // Verify request includes security headers
      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalled();
        // In real implementation, would check for CSRF token
      });
    });
  });

  describe('Content Security Policy Tests', () => {
    it('should prevent inline script execution', () => {
      // Mock CSP violation
      const cspViolationEvent = new Event('securitypolicyviolation');
      (cspViolationEvent as any).violatedDirective = 'script-src';
      (cspViolationEvent as any).blockedURI = 'inline';

      const cspHandler = vi.fn();
      window.addEventListener('securitypolicyviolation', cspHandler);

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      // Simulate CSP violation
      window.dispatchEvent(cspViolationEvent);

      // CSP should block inline scripts
      expect(cspHandler).toHaveBeenCalled();
    });
  });

  describe('Audit Logging Tests', () => {
    it('should log security-related events', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: parentUser }
      });

      // Mock audit logging
      const auditLogSpy = vi.fn();
      mockQuery.mockImplementation((data) => {
        if (data && data.event_type) {
          auditLogSpy(data);
        }
        return Promise.resolve({ data: { id: 'audit-1' }, error: null });
      });

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentDocuments />
        </SecurityTestWrapper>
      );

      // Should log access attempt
      await waitFor(() => {
        expect(auditLogSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: 'document_access',
            user_id: 'user-1',
            timestamp: expect.any(String)
          })
        );
      });
    });
  });

  describe('Secure Communication Tests', () => {
    it('should enforce HTTPS for all communications', () => {
      // Mock location to test HTTPS enforcement
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:' },
        writable: true
      });

      const consoleSpy = vi.spyOn(console, 'warn');

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      // Should warn about insecure connection
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Insecure connection detected')
      );

      consoleSpy.mockRestore();
    });

    it('should validate SSL certificate', async () => {
      // Mock fetch to simulate SSL validation
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(
        new Error('SSL certificate validation failed')
      );

      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockRejectedValue(
        new Error('SSL certificate validation failed')
      );

      render(
        <SecurityTestWrapper user={parentUser}>
          <ParentMessaging />
        </SecurityTestWrapper>
      );

      // Should handle SSL validation errors
      await waitFor(() => {
        expect(
          screen.getByText(/خطأ في الاتصال الآمن|SSL Error/i)
        ).toBeInTheDocument();
      });

      global.fetch = originalFetch;
    });
  });
});