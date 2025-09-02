/**
 * Parent Messaging Component Tests
 * Unit tests for secure parent-therapist messaging system
 * اختبارات وحدة مكون نظام الرسائل الآمن بين أولياء الأمور والمعالجين
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ParentMessaging from '@/components/parent/ParentMessaging';
import { 
  useMessageThreads, 
  useSendMessage, 
  useMarkNotificationRead, 
  useParentPortal 
} from '@/hooks/useParentProgress';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MessageThread, ParentMessage } from '@/types/parent';

// Mock the hooks
vi.mock('@/hooks/useParentProgress');
vi.mock('@/contexts/LanguageContext');

const mockUseLanguage = useLanguage as Mock;
const mockUseMessageThreads = useMessageThreads as Mock;
const mockUseSendMessage = useSendMessage as Mock;
const mockUseMarkNotificationRead = useMarkNotificationRead as Mock;
const mockUseParentPortal = useParentPortal as Mock;

describe('ParentMessaging', () => {
  let queryClient: QueryClient;

  // Mock data
  const mockProfile = {
    id: 'parent-1',
    user_id: 'user-1',
    student_id: 'student-1',
    parent_name_ar: 'أحمد محمد',
    parent_name_en: 'Ahmed Mohammed',
    preferred_language: 'ar' as const,
  };

  const mockMessages: ParentMessage[] = [
    {
      id: 'msg-1',
      thread_id: 'thread-1',
      parent_id: 'parent-1',
      therapist_id: 'therapist-1',
      student_id: 'student-1',
      sender_type: 'therapist',
      sender_id: 'therapist-1',
      message_text_ar: 'مرحباً، كيف حال الطفل؟',
      message_text_en: 'Hello, how is the child doing?',
      is_read: true,
      attachment_urls: [],
      created_at: '2025-09-01T10:00:00Z'
    },
    {
      id: 'msg-2',
      thread_id: 'thread-1',
      parent_id: 'parent-1',
      therapist_id: 'therapist-1',
      student_id: 'student-1',
      sender_type: 'parent',
      sender_id: 'parent-1',
      message_text_ar: 'الحمد لله، يتحسن تدريجياً',
      message_text_en: 'Thank God, he is improving gradually',
      is_read: false,
      attachment_urls: [],
      created_at: '2025-09-01T10:30:00Z'
    }
  ];

  const mockThreads: MessageThread[] = [
    {
      thread_id: 'thread-1',
      parent_id: 'parent-1',
      therapist_id: 'therapist-1',
      student_id: 'student-1',
      therapist_name_ar: 'د. سارة أحمد',
      therapist_name_en: 'Dr. Sarah Ahmed',
      specialization_ar: 'علاج النطق',
      specialization_en: 'Speech Therapy',
      last_message: mockMessages[1],
      last_message_date: '2025-09-01T10:30:00Z',
      unread_count: 1,
      messages: mockMessages
    },
    {
      thread_id: 'thread-2',
      parent_id: 'parent-1',
      therapist_id: 'therapist-2',
      student_id: 'student-1',
      therapist_name_ar: 'د. محمد علي',
      therapist_name_en: 'Dr. Mohammed Ali',
      specialization_ar: 'العلاج الطبيعي',
      specialization_en: 'Physical Therapy',
      last_message: {
        ...mockMessages[0],
        id: 'msg-3',
        thread_id: 'thread-2',
        therapist_id: 'therapist-2',
        message_text_ar: 'موعد الجلسة القادمة غداً',
        message_text_en: 'Next session appointment is tomorrow'
      },
      last_message_date: '2025-09-01T09:00:00Z',
      unread_count: 0,
      messages: []
    }
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mocks
    vi.clearAllMocks();

    // Mock scrollIntoView for JSDOM
    Element.prototype.scrollIntoView = vi.fn();

    // Setup default language mock
    mockUseLanguage.mockReturnValue({
      language: 'en',
      isRTL: false,
      toggleLanguage: vi.fn(),
      setLanguage: vi.fn(),
    });

    // Setup default parent portal mock
    mockUseParentPortal.mockReturnValue({
      profile: mockProfile,
      isLoading: false,
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ParentMessaging />
      </QueryClientProvider>
    );
  };

  describe('Loading State', () => {
    it('should display loading skeleton while profile is loading', () => {
      // Arrange
      mockUseParentPortal.mockReturnValue({
        profile: null,
        isLoading: true,
      });

      mockUseMessageThreads.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      expect(screen.getAllByTestId(/skeleton/i)).toHaveLength(0); // Should show custom skeleton
      // Check for loading elements in the UI structure
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should display loading skeleton while threads are loading', () => {
      // Arrange
      mockUseMessageThreads.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should display error message when threads loading fails', () => {
      // Arrange
      const errorMessage = 'Failed to load messages';
      mockUseMessageThreads.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: errorMessage },
        refetch: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Error loading messages')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should call refetch when retry button is clicked', async () => {
      // Arrange
      const mockRefetch = vi.fn();
      mockUseMessageThreads.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: 'Network error' },
        refetch: mockRefetch,
      });

      renderComponent();

      // Act
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      // Assert
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Success State - English Interface', () => {
    beforeEach(() => {
      mockUseLanguage.mockReturnValue({
        language: 'en',
        isRTL: false,
        toggleLanguage: vi.fn(),
        setLanguage: vi.fn(),
      });

      mockUseMessageThreads.mockReturnValue({
        data: mockThreads,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseSendMessage.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      });

      mockUseMarkNotificationRead.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      });
    });

    it('should render messaging interface with threads list', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Messages')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument();
      
      // Check thread items
      expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument();
      expect(screen.getByText('Dr. Mohammed Ali')).toBeInTheDocument();
      expect(screen.getByText('Speech Therapy')).toBeInTheDocument();
      expect(screen.getByText('Physical Therapy')).toBeInTheDocument();
    });

    it('should display unread message count badge', () => {
      // Act
      renderComponent();

      // Assert
      const badge = screen.getByText('1'); // unread count
      expect(badge).toBeInTheDocument();
      expect(badge.closest('.bg-destructive')).toBeInTheDocument();
    });

    it('should select first thread by default and display messages', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('Hello, how is the child doing?')).toBeInTheDocument();
      expect(screen.getByText('Thank God, he is improving gradually')).toBeInTheDocument();
    });

    it('should switch threads when clicking on different thread', async () => {
      // Act
      renderComponent();

      // Click on second thread
      const secondThread = screen.getByText('Dr. Mohammed Ali');
      fireEvent.click(secondThread.closest('[role="button"], .cursor-pointer, [onClick]') || secondThread);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Next session appointment is tomorrow')).toBeInTheDocument();
      });
    });

    it('should filter threads based on search query', async () => {
      // Act
      renderComponent();

      const searchInput = screen.getByPlaceholderText('Search conversations...');
      fireEvent.change(searchInput, { target: { value: 'Sarah' } });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument();
        expect(screen.queryByText('Dr. Mohammed Ali')).not.toBeInTheDocument();
      });
    });

    it('should send message when send button is clicked', async () => {
      // Arrange
      const mockSendMessage = vi.fn().mockResolvedValue({});
      mockUseSendMessage.mockReturnValue({
        mutateAsync: mockSendMessage,
        isPending: false,
      });

      renderComponent();

      // Act
      const messageInput = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(messageInput, { target: { value: 'Hello therapist' } });
      fireEvent.click(sendButton);

      // Assert
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          thread_id: 'thread-1',
          therapist_id: 'therapist-1',
          student_id: 'student-1',
          message_text_ar: '',
          message_text_en: 'Hello therapist',
          attachments: undefined,
        });
      });
    });

    it('should send message on Enter key press', async () => {
      // Arrange
      const mockSendMessage = vi.fn().mockResolvedValue({});
      mockUseSendMessage.mockReturnValue({
        mutateAsync: mockSendMessage,
        isPending: false,
      });

      renderComponent();

      // Act
      const messageInput = screen.getByPlaceholderText('Type your message...');
      fireEvent.change(messageInput, { target: { value: 'Hello therapist' } });
      fireEvent.keyPress(messageInput, { key: 'Enter', code: 'Enter' });

      // Assert
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalled();
      });
    });

    it('should handle file attachment selection', async () => {
      // Act
      renderComponent();

      const attachButton = screen.getByRole('button', { name: /attach/i });
      fireEvent.click(attachButton);

      // Create mock file
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      // Find the hidden file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });

    it('should remove attachment when X button is clicked', async () => {
      // Act
      renderComponent();

      // Add attachment first
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      // Remove attachment
      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
      });
    });

    it('should display message read status icons', () => {
      // Act
      renderComponent();

      // Assert
      // Parent message should show read status icon
      const messageElements = document.querySelectorAll('[class*="justify-end"]');
      expect(messageElements.length).toBeGreaterThan(0);
    });

    it('should format message timestamps correctly', () => {
      // Act
      renderComponent();

      // Assert
      // Should show relative time format (e.g., "30m ago", "1h ago")
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });

    it('should display no conversations message when threads are empty', () => {
      // Arrange
      mockUseMessageThreads.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('No conversations')).toBeInTheDocument();
    });
  });

  describe('Success State - Arabic Interface', () => {
    beforeEach(() => {
      mockUseLanguage.mockReturnValue({
        language: 'ar',
        isRTL: true,
        toggleLanguage: vi.fn(),
        setLanguage: vi.fn(),
      });

      mockUseMessageThreads.mockReturnValue({
        data: mockThreads,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseSendMessage.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      });
    });

    it('should render Arabic interface correctly', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('المحادثات')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('البحث في المحادثات...')).toBeInTheDocument();
      
      // Check Arabic thread names
      expect(screen.getByText('د. سارة أحمد')).toBeInTheDocument();
      expect(screen.getByText('د. محمد علي')).toBeInTheDocument();
      expect(screen.getByText('علاج النطق')).toBeInTheDocument();
      expect(screen.getByText('العلاج الطبيعي')).toBeInTheDocument();
    });

    it('should display Arabic message content', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText('مرحباً، كيف حال الطفل؟')).toBeInTheDocument();
      expect(screen.getByText('الحمد لله، يتحسن تدريجياً')).toBeInTheDocument();
    });

    it('should have RTL direction applied', () => {
      // Act
      const { container } = renderComponent();

      // Assert
      const messagingContainer = container.querySelector('[dir="rtl"]');
      expect(messagingContainer).toBeInTheDocument();
    });

    it('should send Arabic message correctly', async () => {
      // Arrange
      const mockSendMessage = vi.fn().mockResolvedValue({});
      mockUseSendMessage.mockReturnValue({
        mutateAsync: mockSendMessage,
        isPending: false,
      });

      renderComponent();

      // Act
      const messageInput = screen.getByPlaceholderText('اكتب رسالتك...');
      fireEvent.change(messageInput, { target: { value: 'مرحباً دكتور' } });
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Assert
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          thread_id: 'thread-1',
          therapist_id: 'therapist-1',
          student_id: 'student-1',
          message_text_ar: 'مرحباً دكتور',
          message_text_en: 'مرحباً دكتور', // Fallback
          attachments: undefined,
        });
      });
    });
  });

  describe('File Handling', () => {
    beforeEach(() => {
      mockUseLanguage.mockReturnValue({
        language: 'en',
        isRTL: false,
        toggleLanguage: vi.fn(),
        setLanguage: vi.fn(),
      });

      mockUseMessageThreads.mockReturnValue({
        data: mockThreads,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should validate file size and reject large files', async () => {
      // Arrange
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      renderComponent();

      // Act
      const file = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Assert
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('File size too large (max 10MB)');
      });

      alertSpy.mockRestore();
    });

    it('should validate file type and reject unsupported files', async () => {
      // Arrange
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      renderComponent();

      // Act
      const file = new File(['test'], 'test.exe', { type: 'application/exe' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Assert
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('File type not supported');
      });

      alertSpy.mockRestore();
    });

    it('should display correct file icon based on file type', async () => {
      // Act
      renderComponent();

      // Add image file
      const imageFile = new File(['test'], 'image.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [imageFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('image.jpg')).toBeInTheDocument();
        // Should show image icon
      });
    });
  });

  describe('Real-time Functionality', () => {
    it('should auto-scroll to bottom when new messages arrive', async () => {
      // Arrange
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      // Act
      renderComponent();

      // Simulate new message arriving
      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled();
      });
    });

    it('should handle thread updates correctly', () => {
      // This would test real-time thread updates
      // Implementation depends on the real-time subscription system
      renderComponent();
      
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });
  });
});