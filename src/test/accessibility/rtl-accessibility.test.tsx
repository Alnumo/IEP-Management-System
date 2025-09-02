/**
 * Arabic RTL Accessibility Tests
 * اختبارات إمكانية الوصول للواجهة العربية RTL
 * 
 * Tests WCAG 2.1 AA compliance for Arabic RTL layouts
 * اختبار مطابقة WCAG 2.1 AA للتخطيطات العربية RTL
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Test components
import ParentMessaging from '@/components/parent/ParentMessaging';
import ParentProgressDashboard from '@/components/parent/ParentProgressDashboard';
import HomeProgramManager from '@/components/parent/HomeProgramManager';
import ParentDocuments from '@/components/parent/ParentDocuments';
import NotificationPreferences from '@/components/parent/NotificationPreferences';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

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
const mockData = {
  parentProfile: {
    id: 'parent-1',
    user_id: 'user-1',
    student_id: 'student-1',
    parent_name_ar: 'أحمد محمد',
    parent_name_en: 'Ahmed Mohamed',
    preferred_language: 'ar' as const,
    notification_preferences: {
      email_enabled: true,
      whatsapp_enabled: true,
      push_enabled: true
    }
  },
  messages: [
    {
      id: 'msg-1',
      subject_ar: 'موضوع الرسالة',
      subject_en: 'Message Subject',
      content_ar: 'محتوى الرسالة باللغة العربية',
      content_en: 'Message content in English',
      is_read: false,
      sent_by_therapist: true,
      priority: 'medium' as const,
      created_at: new Date().toISOString()
    }
  ],
  documents: [
    {
      id: 'doc-1',
      title_ar: 'تقرير العلاج',
      title_en: 'Therapy Report',
      file_path: 'reports/therapy-report.pdf',
      file_size: 1024000,
      is_sensitive: false,
      created_at: new Date().toISOString()
    }
  ],
  progressData: [
    {
      id: 'progress-1',
      goal_title_ar: 'هدف التواصل',
      goal_title_en: 'Communication Goal',
      progress_percentage: 75,
      notes_ar: 'تحسن ملحوظ',
      notes_en: 'Notable improvement',
      session_date: new Date().toISOString()
    }
  ],
  homePrograms: [
    {
      id: 'program-1',
      title_ar: 'برنامج منزلي',
      title_en: 'Home Program',
      description_ar: 'وصف البرنامج',
      description_en: 'Program description',
      instructions: [
        {
          step_number: 1,
          instruction_ar: 'الخطوة الأولى',
          instruction_en: 'First step'
        }
      ],
      is_active: true
    }
  ]
};

// Test wrapper component
const RTLTestWrapper: React.FC<{ 
  children: React.ReactNode;
  language?: 'ar' | 'en';
}> = ({ children, language = 'ar' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider initialLanguage={language}>
          <div dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language}>
            {children}
          </div>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('Arabic RTL Accessibility Tests', () => {
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = require('@/lib/supabase').mockQuery;
    
    // Setup default auth and data responses
    const mockSupabase = require('@/lib/supabase').supabase;
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: { role: 'parent' } } }
    });
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } }
    });
    
    mockQuery.mockResolvedValue({ data: [], error: null });
  });

  describe('RTL Layout Structure Tests', () => {
    it('should have proper RTL direction and language attributes for Arabic', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockData.messages, error: null });

      const { container } = render(
        <RTLTestWrapper language="ar">
          <ParentMessaging />
        </RTLTestWrapper>
      );

      // Check RTL direction
      const rtlContainer = container.querySelector('[dir="rtl"]');
      expect(rtlContainer).toBeInTheDocument();

      // Check Arabic language attribute
      const arabicContainer = container.querySelector('[lang="ar"]');
      expect(arabicContainer).toBeInTheDocument();

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('الرسائل')).toBeInTheDocument();
      });

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should properly switch between RTL and LTR layouts', async () => {
      mockQuery.mockResolvedValue({ data: [mockData.parentProfile], error: null });

      const user = userEvent.setup();

      const { container, rerender } = render(
        <RTLTestWrapper language="ar">
          <ParentProgressDashboard />
        </RTLTestWrapper>
      );

      // Verify RTL layout
      expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument();

      // Switch to English
      rerender(
        <RTLTestWrapper language="en">
          <ParentProgressDashboard />
        </RTLTestWrapper>
      );

      // Verify LTR layout
      expect(container.querySelector('[dir="ltr"]')).toBeInTheDocument();

      // Run accessibility audit for both layouts
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Arabic Typography and Text Tests', () => {
    it('should handle Arabic text rendering with proper text alignment', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockData.documents, error: null });

      const { container } = render(
        <RTLTestWrapper language="ar">
          <ParentDocuments />
        </RTLTestWrapper>
      );

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('المستندات')).toBeInTheDocument();
      });

      // Check for Arabic text content
      expect(screen.getByText('تقرير العلاج')).toBeInTheDocument();

      // Verify text alignment for RTL
      const textElements = container.querySelectorAll('h1, h2, h3, p, span');
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        // Arabic text should be right-aligned in RTL layout
        expect(['right', 'start'].includes(styles.textAlign) || styles.direction === 'rtl').toBe(true);
      });

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle mixed Arabic-English text properly', async () => {
      const mixedTextData = {
        ...mockData.messages[0],
        content_ar: 'النص العربي مع English text والأرقام 123'
      };

      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: [mixedTextData], error: null });

      const { container } = render(
        <RTLTestWrapper language="ar">
          <ParentMessaging />
        </RTLTestWrapper>
      );

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText(/النص العربي مع English text والأرقام 123/)).toBeInTheDocument();
      });

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Controls RTL Tests', () => {
    it('should have proper RTL form layout and label association', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });

      const { container } = render(
        <RTLTestWrapper language="ar">
          <NotificationPreferences />
        </RTLTestWrapper>
      );

      const user = userEvent.setup();

      // Open preferences dialog
      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('قنوات الإشعارات')).toBeInTheDocument();
      });

      // Check form controls have proper labels
      const emailSwitch = screen.getByRole('switch', { name: /البريد الإلكتروني/i });
      const whatsappSwitch = screen.getByRole('switch', { name: /واتساب/i });
      const pushSwitch = screen.getByRole('switch', { name: /إشعارات الدفع/i });

      expect(emailSwitch).toBeInTheDocument();
      expect(whatsappSwitch).toBeInTheDocument();
      expect(pushSwitch).toBeInTheDocument();

      // Verify all controls are accessible via keyboard
      emailSwitch.focus();
      expect(document.activeElement).toBe(emailSwitch);

      // Test keyboard navigation in RTL
      await user.keyboard('{Tab}');
      expect(document.activeElement).toBe(whatsappSwitch);

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle RTL form validation messages', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockData.messages, error: null });
      mockQuery.mockRejectedValueOnce(new Error('Validation error'));

      const user = userEvent.setup();

      const { container } = render(
        <RTLTestWrapper language="ar">
          <ParentMessaging />
        </RTLTestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /رسالة جديدة/i })).toBeInTheDocument();
      });

      // Open compose dialog
      const composeButton = screen.getByRole('button', { name: /رسالة جديدة/i });
      await user.click(composeButton);

      // Try to submit empty form to trigger validation
      const sendButton = screen.getByRole('button', { name: /إرسال/i });
      await user.click(sendButton);

      // Wait for validation errors
      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);
      });

      // Run accessibility audit with error states
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Navigation RTL Tests', () => {
    it('should have proper RTL navigation structure', async () => {
      mockQuery.mockResolvedValue({ data: [mockData.parentProfile], error: null });

      const { container } = render(
        <RTLTestWrapper language="ar">
          <div>
            <nav role="navigation" aria-label="التنقل الرئيسي">
              <ul>
                <li><a href="/messages">الرسائل</a></li>
                <li><a href="/progress">التقدم</a></li>
                <li><a href="/documents">المستندات</a></li>
                <li><a href="/programs">البرامج المنزلية</a></li>
              </ul>
            </nav>
            <ParentProgressDashboard />
          </div>
        </RTLTestWrapper>
      );

      // Verify navigation landmarks
      const navigation = screen.getByRole('navigation', { name: 'التنقل الرئيسي' });
      expect(navigation).toBeInTheDocument();

      // Check RTL navigation order (right to left visual order)
      const navLinks = screen.getAllByRole('link');
      expect(navLinks[0]).toHaveTextContent('الرسائل');
      expect(navLinks[1]).toHaveTextContent('التقدم');

      // Test keyboard navigation in RTL context
      const user = userEvent.setup();
      navLinks[0].focus();
      
      await user.keyboard('{ArrowRight}');
      // In RTL, right arrow should move to previous item
      
      await user.keyboard('{ArrowLeft}');
      // In RTL, left arrow should move to next item

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Data Table RTL Tests', () => {
    it('should render data tables with proper RTL column order', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockData.progressData, error: null });

      const { container } = render(
        <RTLTestWrapper language="ar">
          <ParentProgressDashboard />
        </RTLTestWrapper>
      );

      // Wait for table to render
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });

      // Check table headers are in Arabic and properly ordered
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);

      // Verify table has proper accessibility attributes
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('dir', 'rtl');

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Interactive Elements RTL Tests', () => {
    it('should handle RTL dialog and modal positioning', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });

      const user = userEvent.setup();

      const { container } = render(
        <RTLTestWrapper language="ar">
          <NotificationPreferences />
        </RTLTestWrapper>
      );

      // Open dialog
      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('dir', 'rtl');
      });

      // Verify dialog content is in Arabic
      expect(screen.getByText('قنوات الإشعارات')).toBeInTheDocument();

      // Test keyboard navigation within dialog
      const firstFocusableElement = container.querySelector('[tabindex="0"], button, input, select, textarea');
      if (firstFocusableElement) {
        firstFocusableElement.focus();
        expect(document.activeElement).toBe(firstFocusableElement);
      }

      // Test escape key closes dialog
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle RTL dropdown and select positioning', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockData.homePrograms, error: null });

      const user = userEvent.setup();

      const { container } = render(
        <RTLTestWrapper language="ar">
          <HomeProgramManager />
        </RTLTestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('البرامج المنزلية')).toBeInTheDocument();
      });

      // Look for any select elements or dropdowns
      const selectElements = container.querySelectorAll('select, [role="combobox"]');
      
      if (selectElements.length > 0) {
        const firstSelect = selectElements[0];
        firstSelect.focus();
        
        // Test keyboard interaction
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{Enter}');
      }

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color Contrast and Visual Tests', () => {
    it('should meet WCAG AA color contrast requirements in RTL layout', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockData.messages, error: null });

      const { container } = render(
        <RTLTestWrapper language="ar">
          <ParentMessaging />
        </RTLTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('الرسائل')).toBeInTheDocument();
      });

      // Run accessibility audit focusing on color contrast
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should handle focus indicators properly in RTL layout', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockData.documents, error: null });

      const user = userEvent.setup();

      const { container } = render(
        <RTLTestWrapper language="ar">
          <ParentDocuments />
        </RTLTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('المستندات')).toBeInTheDocument();
      });

      // Test focus indicators on interactive elements
      const buttons = screen.getAllByRole('button');
      const links = screen.getAllByRole('link');
      const interactiveElements = [...buttons, ...links];

      for (const element of interactiveElements.slice(0, 3)) {
        element.focus();
        expect(document.activeElement).toBe(element);
        
        // Verify focus indicator is visible
        const styles = window.getComputedStyle(element);
        expect(
          styles.outline !== 'none' || 
          styles.boxShadow !== 'none' ||
          styles.border !== 'none'
        ).toBe(true);
      }

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Screen Reader RTL Tests', () => {
    it('should have proper ARIA labels and descriptions in Arabic', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockData.progressData, error: null });

      const { container } = render(
        <RTLTestWrapper language="ar">
          <ParentProgressDashboard />
        </RTLTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('لوحة تتبع التقدم')).toBeInTheDocument();
      });

      // Check for Arabic ARIA labels
      const buttons = container.querySelectorAll('button[aria-label]');
      buttons.forEach(button => {
        const ariaLabel = button.getAttribute('aria-label');
        if (ariaLabel) {
          // Verify Arabic text in ARIA labels (contains Arabic characters)
          const hasArabic = /[\u0600-\u06FF]/.test(ariaLabel);
          expect(hasArabic).toBe(true);
        }
      });

      // Check for proper heading structure
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings.length).toBeGreaterThan(0);

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce content changes properly in RTL context', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });
      mockQuery.mockResolvedValue({ data: mockData.messages, error: null });

      const user = userEvent.setup();

      const { container } = render(
        <RTLTestWrapper language="ar">
          <ParentMessaging />
        </RTLTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('الرسائل')).toBeInTheDocument();
      });

      // Look for live regions that announce changes
      const liveRegions = container.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
      expect(liveRegions.length).toBeGreaterThan(0);

      // Test that content updates are announced
      const composeButton = screen.getByRole('button', { name: /رسالة جديدة/i });
      await user.click(composeButton);

      await waitFor(() => {
        // Check that dialog opening is properly announced
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-labelledby');
      });

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Mobile RTL Tests', () => {
    it('should handle mobile RTL layout and touch interactions', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });

      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockData.homePrograms, error: null });

      const { container } = render(
        <RTLTestWrapper language="ar">
          <HomeProgramManager />
        </RTLTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('البرامج المنزلية')).toBeInTheDocument();
      });

      // Check mobile-specific elements
      const touchTargets = container.querySelectorAll('button, a, input, [role="button"]');
      touchTargets.forEach(target => {
        const rect = target.getBoundingClientRect();
        // Touch targets should be at least 44px (iOS) or 48dp (Android)
        expect(rect.width >= 44 || rect.height >= 44).toBe(true);
      });

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Performance RTL Tests', () => {
    it('should not cause layout shifts during RTL rendering', async () => {
      mockQuery.mockResolvedValueOnce({ data: [mockData.parentProfile], error: null });
      mockQuery.mockResolvedValueOnce({ data: mockData.messages, error: null });

      const { container } = render(
        <RTLTestWrapper language="ar">
          <ParentMessaging />
        </RTLTestWrapper>
      );

      // Initial measurement
      const initialRect = container.getBoundingClientRect();

      await waitFor(() => {
        expect(screen.getByText('الرسائل')).toBeInTheDocument();
      });

      // Final measurement after content loads
      const finalRect = container.getBoundingClientRect();

      // Layout should be stable (minimal shift)
      const layoutShift = Math.abs(finalRect.width - initialRect.width);
      expect(layoutShift).toBeLessThan(10); // Allow for small variations

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});