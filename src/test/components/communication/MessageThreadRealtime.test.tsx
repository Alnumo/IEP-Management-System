import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageThreadRealtime } from '@/components/communication/MessageThreadRealtime'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Message, Conversation } from '@/types/communication'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        callback('SUBSCRIBED')
        return Promise.resolve()
      }),
      unsubscribe: vi.fn(),
      send: vi.fn().mockResolvedValue({}),
      track: vi.fn().mockResolvedValue({}),
      presenceState: vi.fn(() => ({}))
    }))
  }
}))

vi.mock('@/services/messaging-service', () => ({
  messagingService: {
    sendMessage: vi.fn().mockResolvedValue({
      id: 'msg-1',
      content_ar: 'رسالة اختبار',
      content_en: 'Test message',
      sender_id: 'user-1',
      created_at: new Date().toISOString()
    }),
    markMessagesAsRead: vi.fn().mockResolvedValue(1),
    getConversationMessages: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('@/hooks/useRealTimeMessaging', () => ({
  useRealTimeMessaging: vi.fn(() => ({
    messages: mockMessages,
    isConnected: true,
    isLoading: false,
    error: null,
    typingUsers: new Set(),
    onlineUsers: new Set(['user-2']),
    sendMessage: vi.fn().mockResolvedValue({}),
    markAsRead: vi.fn(),
    sendTypingIndicator: vi.fn(),
    addReaction: vi.fn()
  }))
}))

const mockMessages: Message[] = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'user-1',
    recipient_id: 'user-2',
    content_ar: 'مرحبا',
    content_en: 'Hello',
    message_type: 'text',
    priority_level: 'normal',
    read_status: true,
    delivered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    media_attachments: [],
    requires_response: false,
    alert_processed: false,
    escalation_triggered: false
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    sender_id: 'user-2',
    recipient_id: 'user-1',
    content_ar: 'كيف حالك؟',
    content_en: 'How are you?',
    message_type: 'text',
    priority_level: 'high',
    read_status: false,
    delivered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    media_attachments: [],
    requires_response: true,
    alert_processed: false,
    escalation_triggered: false
  }
]

const mockConversation: Conversation = {
  id: 'conv-1',
  parent_id: 'user-1',
  therapist_id: 'user-2',
  student_id: 'student-1',
  title_ar: 'محادثة تجريبية',
  title_en: 'Test Conversation',
  status: 'active',
  last_message_at: new Date().toISOString(),
  message_count: 2,
  unread_count_parent: 1,
  unread_count_therapist: 0,
  parent_notifications_enabled: true,
  therapist_notifications_enabled: true,
  voice_calls_enabled: true,
  media_sharing_enabled: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 'user-1',
  participant: {
    id: 'user-2',
    name: 'Dr. Smith',
    email: 'smith@example.com',
    avatar_url: undefined
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

const renderComponent = (props = {}) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <MessageThreadRealtime
          conversationId="conv-1"
          currentUserId="user-1"
          conversation={mockConversation}
          {...props}
        />
      </LanguageProvider>
    </QueryClientProvider>
  )
}

describe('MessageThreadRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders message thread with header and input', () => {
      renderComponent()
      
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Type a message/i)).toBeInTheDocument()
    })

    it('displays messages in correct order', () => {
      renderComponent()
      
      const messages = screen.getAllByText(/Hello|How are you/i)
      expect(messages).toHaveLength(2)
    })

    it('shows online status indicator', () => {
      renderComponent()
      
      expect(screen.getByText(/Online/i)).toBeInTheDocument()
    })

    it('displays priority badges for urgent messages', () => {
      renderComponent()
      
      expect(screen.getByText(/IMPORTANT/i)).toBeInTheDocument()
    })

    it('shows message read status with checkmarks', () => {
      renderComponent()
      
      const checkmarks = document.querySelectorAll('[data-testid="check-icon"]')
      expect(checkmarks.length).toBeGreaterThan(0)
    })
  })

  describe('Arabic RTL Support', () => {
    it('renders Arabic content with RTL layout', async () => {
      renderComponent()
      
      // Switch to Arabic
      const langToggle = screen.getByRole('button', { name: /language/i })
      fireEvent.click(langToggle)
      
      await waitFor(() => {
        expect(screen.getByText('مرحبا')).toBeInTheDocument()
        expect(screen.getByText('كيف حالك؟')).toBeInTheDocument()
      })
    })

    it('displays Arabic placeholders and labels', async () => {
      renderComponent()
      
      // Switch to Arabic
      const langToggle = screen.getByRole('button', { name: /language/i })
      fireEvent.click(langToggle)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/اكتب رسالة/i)).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Features', () => {
    it('sends typing indicator when typing', async () => {
      const { sendTypingIndicator } = await import('@/hooks/useRealTimeMessaging')
      
      renderComponent()
      
      const input = screen.getByPlaceholderText(/Type a message/i)
      await userEvent.type(input, 'Hello')
      
      await waitFor(() => {
        expect(sendTypingIndicator).toHaveBeenCalled()
      })
    })

    it('displays typing indicator for other users', async () => {
      const { useRealTimeMessaging } = await import('@/hooks/useRealTimeMessaging')
      
      vi.mocked(useRealTimeMessaging).mockReturnValue({
        ...vi.mocked(useRealTimeMessaging).mock.results[0].value,
        typingUsers: new Set(['user-2'])
      })
      
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText(/typing/i)).toBeInTheDocument()
      })
    })

    it('updates connection status indicator', async () => {
      const { useRealTimeMessaging } = await import('@/hooks/useRealTimeMessaging')
      
      vi.mocked(useRealTimeMessaging).mockReturnValue({
        ...vi.mocked(useRealTimeMessaging).mock.results[0].value,
        isConnected: false
      })
      
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText(/Reconnecting/i)).toBeInTheDocument()
      })
    })
  })

  describe('Message Interactions', () => {
    it('sends message on form submit', async () => {
      const { sendMessage } = await import('@/hooks/useRealTimeMessaging')
      
      renderComponent()
      
      const input = screen.getByPlaceholderText(/Type a message/i)
      const sendButton = screen.getByRole('button', { name: /send/i })
      
      await userEvent.type(input, 'Test message')
      fireEvent.click(sendButton)
      
      await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            content_en: 'Test message'
          })
        )
      })
    })

    it('adds reaction to message on emoji click', async () => {
      const { addReaction } = await import('@/hooks/useRealTimeMessaging')
      
      renderComponent()
      
      // Hover over message to show reactions
      const message = screen.getByText(/Hello/i).closest('div')
      fireEvent.mouseEnter(message!)
      
      // Click emoji reaction
      const thumbsUp = await screen.findByText('👍')
      fireEvent.click(thumbsUp)
      
      await waitFor(() => {
        expect(addReaction).toHaveBeenCalledWith('msg-1', '👍')
      })
    })

    it('sets reply context when reply button clicked', async () => {
      renderComponent()
      
      // Hover over message to show reply button
      const message = screen.getByText(/Hello/i).closest('div')
      fireEvent.mouseEnter(message!)
      
      // Click reply button
      const replyButton = await screen.findByRole('button', { name: /reply/i })
      fireEvent.click(replyButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Replying to:/i)).toBeInTheDocument()
      })
    })

    it('marks messages as read when window gains focus', async () => {
      const { markAsRead } = await import('@/hooks/useRealTimeMessaging')
      
      renderComponent()
      
      // Simulate window focus event
      window.dispatchEvent(new Event('focus'))
      
      await waitFor(() => {
        expect(markAsRead).toHaveBeenCalled()
      })
    })
  })

  describe('Media Attachments', () => {
    it('displays image attachments with preview', () => {
      const messageWithImage = {
        ...mockMessages[0],
        media_attachments: [{
          id: 'att-1',
          filename: 'image.jpg',
          file_path: '/path/to/image.jpg',
          file_size: 1024000,
          mime_type: 'image/jpeg',
          compressed: true
        }]
      }
      
      vi.mocked(useRealTimeMessaging).mockReturnValue({
        ...vi.mocked(useRealTimeMessaging).mock.results[0].value,
        messages: [messageWithImage]
      })
      
      renderComponent()
      
      expect(screen.getByAltText('image.jpg')).toBeInTheDocument()
      expect(screen.getByText(/Compressed/i)).toBeInTheDocument()
    })

    it('displays document attachments with file info', () => {
      const messageWithDoc = {
        ...mockMessages[0],
        media_attachments: [{
          id: 'att-2',
          filename: 'report.pdf',
          file_path: '/path/to/report.pdf',
          file_size: 2048000,
          mime_type: 'application/pdf',
          compressed: false
        }]
      }
      
      vi.mocked(useRealTimeMessaging).mockReturnValue({
        ...vi.mocked(useRealTimeMessaging).mock.results[0].value,
        messages: [messageWithDoc]
      })
      
      renderComponent()
      
      expect(screen.getByText('report.pdf')).toBeInTheDocument()
      expect(screen.getByText(/2000.0KB/i)).toBeInTheDocument()
    })
  })

  describe('Voice/Video Calls', () => {
    it('triggers voice call callback when phone icon clicked', async () => {
      const onVoiceCall = vi.fn()
      renderComponent({ onVoiceCall })
      
      const voiceButton = screen.getByRole('button', { name: /voice call/i })
      fireEvent.click(voiceButton)
      
      expect(onVoiceCall).toHaveBeenCalled()
    })

    it('triggers video call callback when video icon clicked', async () => {
      const onVideoCall = vi.fn()
      renderComponent({ onVideoCall })
      
      const videoButton = screen.getByRole('button', { name: /video call/i })
      fireEvent.click(videoButton)
      
      expect(onVideoCall).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when messages fail to load', async () => {
      vi.mocked(useRealTimeMessaging).mockReturnValue({
        ...vi.mocked(useRealTimeMessaging).mock.results[0].value,
        isLoading: false,
        error: 'Failed to load messages'
      })
      
      renderComponent()
      
      expect(screen.getByText(/Error loading messages/i)).toBeInTheDocument()
    })

    it('shows loading spinner while messages load', () => {
      vi.mocked(useRealTimeMessaging).mockReturnValue({
        ...vi.mocked(useRealTimeMessaging).mock.results[0].value,
        isLoading: true
      })
      
      renderComponent()
      
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('displays empty state when no messages', () => {
      vi.mocked(useRealTimeMessaging).mockReturnValue({
        ...vi.mocked(useRealTimeMessaging).mock.results[0].value,
        messages: []
      })
      
      renderComponent()
      
      expect(screen.getByText(/No messages yet/i)).toBeInTheDocument()
    })
  })
})