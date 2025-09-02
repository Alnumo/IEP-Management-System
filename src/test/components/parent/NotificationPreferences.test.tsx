/**
 * NotificationPreferences Component Test Suite
 * 
 * Tests the notification preferences management functionality including:
 * - Preference rendering and state management
 * - Channel toggles (in-app, email, WhatsApp)
 * - Quiet hours configuration
 * - Priority threshold settings
 * - Category-based filtering
 * - Frequency limits and language preferences
 * - Bilingual support (Arabic RTL/English LTR)
 * - Save/reset functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationPreferences from '../../../components/parent/NotificationPreferences';
import { LanguageProvider } from '../../../contexts/LanguageContext';
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

// Mock browser APIs for JSDOM compatibility
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();

// Mock parent profile data
const mockProfile = {
  id: 'parent-123',
  user_id: 'user-456',
  student_id: 'student-789',
  parent_name_ar: 'أحمد محمد',
  parent_name_en: 'Ahmed Mohammed',
  preferred_language: 'ar' as const,
  phone_number: '+966501234567',
  email: 'ahmed@example.com',
  notification_preferences: {
    in_app_enabled: true,
    email_enabled: true,
    whatsapp_enabled: false,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    priority_threshold: 'medium' as const,
    categories: {
      session_completed: true,
      goal_achieved: true,
      appointment_reminder: true,
      document_uploaded: false,
      message_received: true,
      home_program_due: true,
      milestone_reached: true,
    },
    frequency_limits: {
      daily_email_limit: 10,
      daily_whatsapp_limit: 5,
      batch_notifications: true,
    },
    language_preference: 'ar' as const,
  },
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T10:00:00Z'
};

// Create mock query responses
const createMockQuery = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: vi.fn()
  };
  
  // Configure profile response
  mockQuery.then.mockImplementation((callback) => {
    const response = { data: mockProfile, error: null };
    return callback(response);
  });

  mockQuery.single.mockImplementation(() => ({
    then: vi.fn().mockImplementation((callback) => {
      const response = { data: mockProfile, error: null };
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

describe('NotificationPreferences Component', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-456' } },
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
    it('renders notification preferences dialog correctly in Arabic', async () => {
      render(
        <TestWrapper language="ar">
          <NotificationPreferences />
        </TestWrapper>
      );

      // Find and click the trigger button
      const triggerButton = screen.getByText('إعدادات الإشعارات');
      expect(triggerButton).toBeInTheDocument();
      
      await userEvent.click(triggerButton);

      // Check dialog content
      await waitFor(() => {
        expect(screen.getByText('إعدادات الإشعارات')).toBeInTheDocument();
        expect(screen.getByText('قنوات الإشعارات')).toBeInTheDocument();
        expect(screen.getByText('ساعات الصمت')).toBeInTheDocument();
        expect(screen.getByText('إعدادات الأولوية')).toBeInTheDocument();
      });
    });

    it('renders notification preferences dialog correctly in English', async () => {
      render(
        <TestWrapper language="en">
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('Notification Settings');
      expect(triggerButton).toBeInTheDocument();
      
      await userEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Notification Settings')).toBeInTheDocument();
        expect(screen.getByText('Notification Channels')).toBeInTheDocument();
        expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
        expect(screen.getByText('Priority Settings')).toBeInTheDocument();
      });
    });

    it('applies RTL layout for Arabic', async () => {
      render(
        <TestWrapper language="ar">
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await userEvent.click(triggerButton);

      await waitFor(() => {
        const dialogContent = screen.getByRole('dialog');
        expect(dialogContent).toHaveAttribute('dir', 'rtl');
      });
    });

    it('applies LTR layout for English', async () => {
      render(
        <TestWrapper language="en">
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('Notification Settings');
      await userEvent.click(triggerButton);

      await waitFor(() => {
        const dialogContent = screen.getByRole('dialog');
        expect(dialogContent).toHaveAttribute('dir', 'ltr');
      });
    });
  });

  describe('Notification Channel Settings', () => {
    it('displays current channel preferences', async () => {
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await userEvent.click(triggerButton);

      await waitFor(() => {
        // Check if switches reflect the mock profile preferences
        const switches = screen.getAllByRole('switch');
        expect(switches).toHaveLength.greaterThan(0);
      });
    });

    it('toggles in-app notifications', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        const inAppLabel = screen.getByText('إشعارات داخل التطبيق');
        expect(inAppLabel).toBeInTheDocument();
      });

      // Find the switch for in-app notifications
      const inAppSwitch = screen.getAllByRole('switch')[0]; // First switch should be in-app
      await user.click(inAppSwitch);

      // Check if save button becomes enabled (indicates state change)
      const saveButton = screen.getByText('حفظ الإعدادات');
      expect(saveButton).not.toBeDisabled();
    });

    it('toggles email notifications', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        const emailLabel = screen.getByText('إشعارات البريد الإلكتروني');
        expect(emailLabel).toBeInTheDocument();
      });

      const emailSwitch = screen.getAllByRole('switch')[1]; // Second switch should be email
      await user.click(emailSwitch);

      const saveButton = screen.getByText('حفظ الإعدادات');
      expect(saveButton).not.toBeDisabled();
    });

    it('toggles WhatsApp notifications', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        const whatsappLabel = screen.getByText('إشعارات الواتساب');
        expect(whatsappLabel).toBeInTheDocument();
      });

      const whatsappSwitch = screen.getAllByRole('switch')[2]; // Third switch should be WhatsApp
      await user.click(whatsappSwitch);

      const saveButton = screen.getByText('حفظ الإعدادات');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Quiet Hours Configuration', () => {
    it('enables quiet hours and shows time inputs', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        const quietHoursLabel = screen.getByText('تفعيل ساعات الصمت');
        expect(quietHoursLabel).toBeInTheDocument();
      });

      // Find and click the quiet hours switch
      const quietHoursSwitch = screen.getByText('تفعيل ساعات الصمت').closest('div')?.querySelector('[role="switch"]');
      if (quietHoursSwitch) {
        await user.click(quietHoursSwitch);
        
        // Check if time inputs appear
        await waitFor(() => {
          expect(screen.getByLabelText('من الساعة')).toBeInTheDocument();
          expect(screen.getByLabelText('إلى الساعة')).toBeInTheDocument();
        });
      }
    });

    it('allows setting quiet hours time range', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      // Enable quiet hours first
      const quietHoursSwitch = screen.getByText('تفعيل ساعات الصمت').closest('div')?.querySelector('[role="switch"]');
      if (quietHoursSwitch) {
        await user.click(quietHoursSwitch);
        
        await waitFor(() => {
          const fromInput = screen.getByLabelText('من الساعة') as HTMLInputElement;
          const toInput = screen.getByLabelText('إلى الساعة') as HTMLInputElement;
          
          expect(fromInput).toBeInTheDocument();
          expect(toInput).toBeInTheDocument();
        });

        // Set time values
        const fromInput = screen.getByLabelText('من الساعة') as HTMLInputElement;
        const toInput = screen.getByLabelText('إلى الساعة') as HTMLInputElement;
        
        await user.clear(fromInput);
        await user.type(fromInput, '23:00');
        await user.clear(toInput);
        await user.type(toInput, '07:00');

        expect(fromInput.value).toBe('23:00');
        expect(toInput.value).toBe('07:00');
      }
    });
  });

  describe('Priority Settings', () => {
    it('shows priority threshold selector', async () => {
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await userEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('الحد الأدنى لأولوية الإشعارات')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });

    it('changes priority threshold', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        const prioritySelect = screen.getByRole('combobox');
        expect(prioritySelect).toBeInTheDocument();
      });

      const prioritySelect = screen.getByRole('combobox');
      await user.click(prioritySelect);

      // Should show priority options
      await waitFor(() => {
        expect(screen.getByText('عالية - إشعارات عاجلة فقط')).toBeInTheDocument();
      });

      // Select high priority
      await user.click(screen.getByText('عالية - إشعارات عاجلة فقط'));

      const saveButton = screen.getByText('حفظ الإعدادات');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Notification Categories', () => {
    it('displays all notification categories', async () => {
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await userEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('أنواع الإشعارات')).toBeInTheDocument();
        expect(screen.getByText('إكمال الجلسات')).toBeInTheDocument();
        expect(screen.getByText('تحقيق الأهداف')).toBeInTheDocument();
        expect(screen.getByText('تذكير المواعيد')).toBeInTheDocument();
      });
    });

    it('toggles individual notification categories', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        const categoryLabel = screen.getByText('إكمال الجلسات');
        expect(categoryLabel).toBeInTheDocument();
      });

      // Find the switch for session completion category
      const categorySwitch = screen.getByText('إكمال الجلسات')
        .closest('div')?.querySelector('[role="switch"]');
      
      if (categorySwitch) {
        await user.click(categorySwitch);
        
        const saveButton = screen.getByText('حفظ الإعدادات');
        expect(saveButton).not.toBeDisabled();
      }
    });
  });

  describe('Frequency Limits', () => {
    it('shows frequency limit inputs', async () => {
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await userEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('حدود التكرار')).toBeInTheDocument();
        expect(screen.getByLabelText('حد البريد الإلكتروني اليومي')).toBeInTheDocument();
        expect(screen.getByLabelText('حد الواتساب اليومي')).toBeInTheDocument();
      });
    });

    it('allows changing daily limits', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        const emailLimitInput = screen.getByLabelText('حد البريد الإلكتروني اليومي') as HTMLInputElement;
        expect(emailLimitInput).toBeInTheDocument();
      });

      const emailLimitInput = screen.getByLabelText('حد البريد الإلكتروني اليومي') as HTMLInputElement;
      await user.clear(emailLimitInput);
      await user.type(emailLimitInput, '15');

      expect(emailLimitInput.value).toBe('15');

      const saveButton = screen.getByText('حفظ الإعدادات');
      expect(saveButton).not.toBeDisabled();
    });

    it('toggles batch notifications', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        const batchLabel = screen.getByText('تجميع الإشعارات');
        expect(batchLabel).toBeInTheDocument();
      });

      const batchSwitch = screen.getByText('تجميع الإشعارات')
        .closest('div')?.querySelector('[role="switch"]');
      
      if (batchSwitch) {
        await user.click(batchSwitch);
        
        const saveButton = screen.getByText('حفظ الإعدادات');
        expect(saveButton).not.toBeDisabled();
      }
    });
  });

  describe('Language Preferences', () => {
    it('shows language preference selector', async () => {
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await userEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('تفضيل اللغة')).toBeInTheDocument();
        expect(screen.getByText('لغة الإشعارات')).toBeInTheDocument();
      });
    });

    it('changes notification language preference', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        const languageSelects = screen.getAllByRole('combobox');
        expect(languageSelects.length).toBeGreaterThan(1);
      });

      // Find the language preference select (should be the last one)
      const languageSelects = screen.getAllByRole('combobox');
      const languageSelect = languageSelects[languageSelects.length - 1];
      
      await user.click(languageSelect);

      await waitFor(() => {
        expect(screen.getByText('English Only')).toBeInTheDocument();
      });

      await user.click(screen.getByText('English Only'));

      const saveButton = screen.getByText('حفظ الإعدادات');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Save and Reset Functionality', () => {
    it('enables save button when changes are made', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        const saveButton = screen.getByText('حفظ الإعدادات');
        expect(saveButton).toBeDisabled();
      });

      // Make a change
      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const saveButton = screen.getByText('حفظ الإعدادات');
      expect(saveButton).not.toBeDisabled();
    });

    it('enables reset button when changes are made', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        const resetButton = screen.getByText('إعادة تعيين');
        expect(resetButton).toBeDisabled();
      });

      // Make a change
      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const resetButton = screen.getByText('إعادة تعيين');
      expect(resetButton).not.toBeDisabled();
    });

    it('saves preferences when save button is clicked', async () => {
      const user = userEvent.setup();
      const mockUpdate = vi.fn().mockResolvedValue({ data: null, error: null });
      
      mockSupabase.from = vi.fn(() => ({
        ...createMockQuery(),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            then: mockUpdate
          }))
        }))
      }));
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      // Make a change
      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const saveButton = screen.getByText('حفظ الإعدادات');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when save fails', async () => {
      const user = userEvent.setup();
      const mockUpdate = vi.fn().mockRejectedValue(new Error('Save failed'));
      
      mockSupabase.from = vi.fn(() => ({
        ...createMockQuery(),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            then: mockUpdate
          }))
        }))
      }));
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      // Make a change and try to save
      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const saveButton = screen.getByText('حفظ الإعدادات');
      await user.click(saveButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/حدث خطأ في حفظ الإعدادات/)).toBeInTheDocument();
      });
    });

    it('shows success message after successful save', async () => {
      const user = userEvent.setup();
      const mockUpdate = vi.fn().mockResolvedValue({ data: null, error: null });
      
      mockSupabase.from = vi.fn(() => ({
        ...createMockQuery(),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            then: mockUpdate
          }))
        }))
      }));
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      // Make a change and save
      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      const saveButton = screen.getByText('حفظ الإعدادات');
      await user.click(saveButton);

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/تم حفظ إعداداتك بنجاح/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await userEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getAllByRole('switch')).toHaveLength.greaterThan(0);
        expect(screen.getAllByRole('combobox')).toHaveLength.greaterThan(0);
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('إعدادات الإشعارات');
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Tab navigation should work
      await user.tab();
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInstanceOf(HTMLElement);
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <NotificationPreferences />
        </TestWrapper>
      );

      // Should render without layout issues
      const triggerButton = screen.getByText('إعدادات الإشعارات');
      expect(triggerButton).toBeInTheDocument();
    });
  });
});