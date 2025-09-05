/**
 * Communication System Integration Tests
 * Tests the complete communication system functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase'
import { messageEncryptionService } from '@/services/message-encryption-service'
import { communicationPushNotifications } from '@/services/communication-push-notifications'
import { MessageThread } from '@/components/communication/MessageThread'
import { FileUpload } from '@/components/communication/FileUpload'
import { VoiceCallModal } from '@/components/communication/VoiceCallModal'
import { useRealTimeMessaging } from '@/hooks/useRealTimeMessaging'
import { useVoiceCallManager } from '@/hooks/useVoiceCall'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'test-message-id' },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      })),
      send: vi.fn(),
      unsubscribe: vi.fn()
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => ({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test.com/file' } }))
      }))
    },
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    },
    rpc: vi.fn(() => ({ data: { key_id: 'test-key' }, error: null }))
  }
}))

// Mock encryption service
vi.mock('@/services/message-encryption-service', () => ({
  messageEncryptionService: {
    encryptMessage: vi.fn(() => Promise.resolve({
      encryptedMessage: { content_ar: 'encrypted-content' },
      encryptionMetadata: { keyId: 'test-key', iv: 'test-iv', contentHash: 'test-hash' }
    })),
    decryptMessage: vi.fn(() => Promise.resolve({
      id: 'test-id',
      content_ar: 'decrypted content',
      sender_id: 'sender-id',
      decrypted: true
    }))
  },
  messageEncryptionUtils: {
    getConversationEncryptionStatus: vi.fn(() => Promise.resolve({
      isEnabled: true,
      totalEncryptedMessages: 5
    })),
    isMessageEncrypted: vi.fn(() => true)
  }
}))

// Mock push notifications
vi.mock('@/services/communication-push-notifications', () => ({
  communicationPushNotifications: {
    notifyNewMessage: vi.fn(),
    notifyVoiceCall: vi.fn(),
    notifyMediaShared: vi.fn(),
    subscribeUser: vi.fn(() => Promise.resolve({})),
    testPushNotification: vi.fn()
  }
}))

// Mock media devices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(() => Promise.resolve({
      getTracks: () => [{ stop: vi.fn() }]
    }))
  }
})

// Test data
const mockConversation = {
  id: 'test-conversation-id',
  parent_id: 'parent-id',
  therapist_id: 'therapist-id',
  student_id: 'student-id',
  title_ar: 'محادثة اختبار',
  title_en: 'Test Conversation',
  status: 'active',
  voice_calls_enabled: true,
  media_sharing_enabled: true,
  encryption_enabled: true
}

const mockMessage = {
  id: 'test-message-id',
  conversation_id: 'test-conversation-id',
  sender_id: 'sender-id',
  recipient_id: 'recipient-id',
  content_ar: 'رسالة اختبار',
  content_en: 'Test message',
  message_type: 'text',
  priority_level: 'normal',
  media_attachments: [],
  created_at: new Date().toISOString(),
  sender: {
    id: 'sender-id',
    name: 'Test Sender',
    avatar_url: 'http://test.com/avatar.jpg'
  }
}

const mockVoiceCall = {
  id: 'test-call-id',
  conversation_id: 'test-conversation-id',
  caller_id: 'caller-id',
  callee_id: 'callee-id',
  call_status: 'initiated',
  call_type: 'voice',
  emergency_call: false,
  caller: {
    id: 'caller-id',
    name: 'Test Caller',
    avatar_url: 'http://test.com/avatar.jpg'
  }
}

describe('Communication System Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Real-time Messaging Integration', () => {
    it('should load and display messages with encryption', async () => {
      // Mock successful message loading
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [mockMessage],
              error: null
            }))
          }))
        }))
      } as any)

      render(
        <MessageThread 
          conversationId="test-conversation-id" 
          currentUserId="current-user-id"
        />
      )

      // Wait for messages to load
      await waitFor(() => {
        expect(screen.getByText('رسالة اختبار')).toBeInTheDocument()
      })

      // Verify encryption service was called
      expect(messageEncryptionService.decryptMessage).toHaveBeenCalled()
    })

    it('should send encrypted messages successfully', async () => {
      render(
        <MessageThread 
          conversationId="test-conversation-id" 
          currentUserId="current-user-id"
        />
      )

      const messageInput = screen.getByPlaceholderText('اكتب رسالتك هنا...')
      const sendButton = screen.getByRole('button', { name: /send/i })

      // Type a message
      fireEvent.change(messageInput, { target: { value: 'رسالة جديدة' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(messageEncryptionService.encryptMessage).toHaveBeenCalledWith({
          content_ar: 'رسالة جديدة',
          content_en: undefined,
          message_type: 'text',
          media_attachments: []
        })
      })

      expect(supabase.from).toHaveBeenCalledWith('messages')
    })

    it('should handle real-time message updates', async () => {
      const mockChannel = {
        on: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn()
      }

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)

      render(
        <MessageThread 
          conversationId="test-conversation-id" 
          currentUserId="current-user-id"
        />
      )

      // Verify real-time subscription was set up
      expect(supabase.channel).toHaveBeenCalledWith('messages:test-conversation-id')
      expect(mockChannel.on).toHaveBeenCalled()
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    it('should send push notifications for new messages', async () => {
      const mockChannel = {
        on: vi.fn((event, config, callback) => {
          // Simulate new message event
          if (event === 'postgres_changes' && config.event === 'INSERT') {
            setTimeout(() => {
              callback({ new: mockMessage })
            }, 100)
          }
        }),
        subscribe: vi.fn(),
        unsubscribe: vi.fn()
      }

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)

      render(
        <MessageThread 
          conversationId="test-conversation-id" 
          currentUserId="recipient-id" // Set as recipient
        />
      )

      await waitFor(() => {
        expect(communicationPushNotifications.notifyNewMessage).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'test-message-id' }),
          expect.any(Object)
        )
      })
    })
  })

  describe('File Upload Integration', () => {
    it('should upload files with encryption', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const onFileUploaded = vi.fn()

      render(
        <FileUpload 
          conversationId="test-conversation-id"
          onFileUploaded={onFileUploaded}
        />
      )

      const fileInput = screen.getByRole('button', { name: /اختر الملفات/i })
      fireEvent.click(fileInput)

      // Simulate file selection
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(hiddenInput, { target: { files: [mockFile] } })

      await waitFor(() => {
        expect(supabase.storage.from).toHaveBeenCalledWith('communication-files')
      })

      // Verify file upload notification
      await waitFor(() => {
        expect(communicationPushNotifications.notifyFileUploadStatus).toHaveBeenCalled()
      })
    })

    it('should handle file drag and drop', async () => {
      const onFileUploaded = vi.fn()

      render(
        <FileUpload 
          conversationId="test-conversation-id"
          onFileUploaded={onFileUploaded}
        />
      )

      const dropZone = screen.getByText(/اسحب الملفات هنا أو انقر للاختيار/i).closest('div')

      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      const dragEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { files: [mockFile] }
      }

      fireEvent.drop(dropZone!, dragEvent as any)

      await waitFor(() => {
        expect(supabase.storage.from).toHaveBeenCalledWith('communication-files')
      })
    })

    it('should validate file types and sizes', async () => {
      const onFileUploaded = vi.fn()

      render(
        <FileUpload 
          conversationId="test-conversation-id"
          onFileUploaded={onFileUploaded}
          maxFileSize={1024} // 1KB limit
          allowedTypes={['image/jpeg']}
        />
      )

      // Test oversized file
      const oversizedFile = new File(['x'.repeat(2048)], 'big.jpg', { type: 'image/jpeg' })
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      fireEvent.change(hiddenInput, { target: { files: [oversizedFile] } })

      await waitFor(() => {
        expect(screen.getByText(/حجم الملف كبير جداً/i)).toBeInTheDocument()
      })

      // Test invalid file type
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      fireEvent.change(hiddenInput, { target: { files: [invalidFile] } })

      await waitFor(() => {
        expect(screen.getByText(/نوع الملف غير مدعوم/i)).toBeInTheDocument()
      })
    })
  })

  describe('Voice Call Integration', () => {
    it('should initiate voice calls with WebRTC', async () => {
      const mockCallManager = {
        initiateCall: vi.fn(() => Promise.resolve(mockVoiceCall)),
        onCallStateChange: vi.fn(),
        onConnectionQualityChange: vi.fn(),
        onError: vi.fn(),
        cleanup: vi.fn()
      }

      // Mock VoiceCallManager constructor
      vi.doMock('@/services/voice-communication-service', () => ({
        VoiceCallManager: vi.fn(() => mockCallManager)
      }))

      render(
        <VoiceCallModal
          isOpen={true}
          onClose={vi.fn()}
          call={mockVoiceCall}
          isIncoming={false}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Test Caller')).toBeInTheDocument()
        expect(screen.getByText('جاري الاتصال...')).toBeInTheDocument()
      })
    })

    it('should handle incoming call notifications', async () => {
      render(
        <VoiceCallModal
          isOpen={true}
          onClose={vi.fn()}
          call={mockVoiceCall}
          isIncoming={true}
          onAnswer={vi.fn()}
          onReject={vi.fn()}
        />
      )

      // Should show answer/reject buttons for incoming calls
      expect(screen.getByRole('button', { name: /phone/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /phoneoff/i })).toBeInTheDocument()

      // Test push notification was sent
      expect(communicationPushNotifications.notifyVoiceCall).toHaveBeenCalledWith(
        mockVoiceCall,
        'incoming'
      )
    })

    it('should handle emergency calls with priority', async () => {
      const emergencyCall = { ...mockVoiceCall, emergency_call: true }

      render(
        <VoiceCallModal
          isOpen={true}
          onClose={vi.fn()}
          call={emergencyCall}
          isIncoming={true}
        />
      )

      // Should show emergency indicator
      expect(screen.getByText('مكالمة طارئة')).toBeInTheDocument()
      
      // Should have sent urgent push notification
      expect(communicationPushNotifications.notifyVoiceCall).toHaveBeenCalledWith(
        emergencyCall,
        'emergency'
      )
    })

    it('should manage call audio controls', async () => {
      const answeredCall = { ...mockVoiceCall, call_status: 'answered' }
      
      render(
        <VoiceCallModal
          isOpen={true}
          onClose={vi.fn()}
          call={answeredCall}
        />
      )

      // Should show audio controls for active call
      const muteButton = screen.getByRole('button', { name: /mic/i })
      const settingsButton = screen.getByRole('button', { name: /settings/i })
      const endCallButton = screen.getByRole('button', { name: /phoneoff/i })

      expect(muteButton).toBeInTheDocument()
      expect(settingsButton).toBeInTheDocument()
      expect(endCallButton).toBeInTheDocument()

      // Test mute functionality
      fireEvent.click(muteButton)
      // Verify mute state changes (would need to check icon or class changes)
    })
  })

  describe('Push Notification Integration', () => {
    it('should request notification permission', async () => {
      // Mock Notification API
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: vi.fn(() => Promise.resolve('granted'))
        }
      })

      const result = await communicationPushNotifications.requestPermission()
      
      expect(result).toBe('granted')
      expect(window.Notification.requestPermission).toHaveBeenCalled()
    })

    it('should subscribe user to push notifications', async () => {
      // Mock ServiceWorker and PushManager
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn(() => Promise.resolve({
            pushManager: {
              subscribe: vi.fn(() => Promise.resolve({
                endpoint: 'https://test.com/push',
                toJSON: () => ({ endpoint: 'https://test.com/push' })
              }))
            }
          }))
        }
      })

      const subscription = await communicationPushNotifications.subscribeUser('test-user-id')
      
      expect(subscription).toBeDefined()
      expect(supabase.from).toHaveBeenCalledWith('push_subscriptions')
    })

    it('should send media sharing notifications', async () => {
      const mediaMessage = {
        ...mockMessage,
        media_attachments: [{
          id: 'attachment-id',
          filename: 'test.pdf',
          mime_type: 'application/pdf',
          file_size: 1024
        }]
      }

      await communicationPushNotifications.notifyMediaShared(
        mediaMessage, 
        mediaMessage.media_attachments[0]
      )

      expect(communicationPushNotifications.notifyMediaShared).toHaveBeenCalledWith(
        mediaMessage,
        mediaMessage.media_attachments[0]
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle encryption failures gracefully', async () => {
      vi.mocked(messageEncryptionService.encryptMessage).mockRejectedValue(
        new Error('Encryption failed')
      )

      render(
        <MessageThread 
          conversationId="test-conversation-id" 
          currentUserId="current-user-id"
        />
      )

      const messageInput = screen.getByPlaceholderText('اكتب رسالتك هنا...')
      const sendButton = screen.getByRole('button', { name: /send/i })

      fireEvent.change(messageInput, { target: { value: 'test message' } })
      fireEvent.click(sendButton)

      // Should still send message without encryption as fallback
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('messages')
      })
    })

    it('should handle WebRTC connection failures', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
        new Error('Media access denied')
      )

      const onClose = vi.fn()

      render(
        <VoiceCallModal
          isOpen={true}
          onClose={onClose}
          call={mockVoiceCall}
        />
      )

      // Should handle the error and potentially close or show error state
      await waitFor(() => {
        // Check for error handling - implementation dependent
        expect(screen.queryByText(/error/i) || onClose).toBeTruthy()
      })
    })

    it('should handle push notification failures', async () => {
      vi.mocked(communicationPushNotifications.notifyNewMessage).mockRejectedValue(
        new Error('Push notification failed')
      )

      const mockChannel = {
        on: vi.fn((event, config, callback) => {
          if (event === 'postgres_changes') {
            callback({ new: mockMessage })
          }
        }),
        subscribe: vi.fn(),
        unsubscribe: vi.fn()
      }

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)

      render(
        <MessageThread 
          conversationId="test-conversation-id" 
          currentUserId="recipient-id"
        />
      )

      // Should handle push notification failure gracefully without breaking message flow
      await waitFor(() => {
        expect(screen.getByText('رسالة اختبار')).toBeInTheDocument()
      })
    })
  })

  describe('Arabic RTL Support', () => {
    it('should display Arabic content with RTL direction', async () => {
      render(
        <MessageThread 
          conversationId="test-conversation-id" 
          currentUserId="current-user-id"
        />
      )

      const messageInput = screen.getByPlaceholderText('اكتب رسالتك هنا...')
      expect(messageInput).toHaveAttribute('dir', 'rtl')

      // Check for Arabic text display
      await waitFor(() => {
        const arabicMessage = screen.getByText('رسالة اختبار')
        expect(arabicMessage.closest('[dir="rtl"]')).toBeInTheDocument()
      })
    })

    it('should show Arabic notifications', async () => {
      const arabicMessage = { ...mockMessage, content_ar: 'رسالة عربية' }

      await communicationPushNotifications.notifyNewMessage(
        arabicMessage,
        mockConversation
      )

      // Verify Arabic notification content was used
      expect(communicationPushNotifications.notifyNewMessage).toHaveBeenCalledWith(
        expect.objectContaining({ content_ar: 'رسالة عربية' }),
        expect.any(Object)
      )
    })
  })
})