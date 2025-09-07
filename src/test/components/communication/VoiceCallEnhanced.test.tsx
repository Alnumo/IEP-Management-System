/**
 * Enhanced Voice Call Tests
 * Comprehensive testing for voice call functionality with healthcare compliance
 * Arkan Al-Numo Center - Voice Communication Testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoiceCallInterface } from '@/components/communication/VoiceCall/VoiceCallInterface'
import { CallControls } from '@/components/communication/VoiceCall/CallControls'
import { useVoiceCallEnhanced } from '@/hooks/useVoiceCallEnhanced'
import { LanguageProvider } from '@/contexts/LanguageContext'
import type { CallStatus, ConnectionQuality } from '@/types/communication'

// Mock dependencies
vi.mock('@/hooks/useVoiceCallEnhanced')
vi.mock('@/services/voice-communication-service')
vi.mock('@/services/communication-push-notifications')

// Mock WebRTC APIs
const mockGetUserMedia = vi.fn()
const mockGetDisplayMedia = vi.fn()

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    getDisplayMedia: mockGetDisplayMedia,
    enumerateDevices: vi.fn(() => Promise.resolve([
      { deviceId: '1', kind: 'audioinput', label: 'Microphone' },
      { deviceId: '2', kind: 'audiooutput', label: 'Speakers' }
    ]))
  },
  configurable: true
})

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode; language?: 'ar' | 'en' }> = ({ 
  children, 
  language = 'ar' 
}) => (
  <LanguageProvider defaultLanguage={language}>
    {children}
  </LanguageProvider>
)

// Mock hook return values
const mockUseVoiceCallEnhanced = {
  isActive: false,
  callStatus: 'idle' as CallStatus,
  duration: 0,
  isMuted: false,
  isScreenSharing: false,
  isRecording: false,
  connectionQuality: 'good' as ConnectionQuality,
  error: null,
  sessionId: null,
  isTherapyCall: false,
  isEmergencyCall: false,
  callNotes: '',
  recordingPath: null,
  participants: [],
  initiateCall: vi.fn(),
  answerCall: vi.fn(),
  endCall: vi.fn(),
  toggleMute: vi.fn(),
  toggleScreenShare: vi.fn(),
  toggleRecording: vi.fn(),
  escalateEmergency: vi.fn(),
  addCallNotes: vi.fn(),
  adjustVolume: vi.fn(),
  canInitiate: true,
  canEnd: false,
  canMute: false,
  canRecord: false,
  canScreenShare: false,
  formatDuration: vi.fn((seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })
}

describe('VoiceCallInterface', () => {
  beforeEach(() => {
    vi.mocked(useVoiceCallEnhanced).mockReturnValue(mockUseVoiceCallEnhanced)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Arabic Language Support', () => {
    it('should render Arabic interface correctly', () => {
      render(
        <TestWrapper language="ar">
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
          />
        </TestWrapper>
      )

      expect(screen.getByText('مكالمة صوتية')).toBeInTheDocument()
      expect(screen.getByText('بدء المكالمة')).toBeInTheDocument()
    })

    it('should handle RTL layout properly', () => {
      render(
        <TestWrapper language="ar">
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
          />
        </TestWrapper>
      )

      const container = screen.getByRole('region')
      expect(container).toHaveAttribute('dir', 'rtl')
    })
  })

  describe('English Language Support', () => {
    it('should render English interface correctly', () => {
      render(
        <TestWrapper language="en">
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
          />
        </TestWrapper>
      )

      expect(screen.getByText('Voice Call')).toBeInTheDocument()
      expect(screen.getByText('Start Call')).toBeInTheDocument()
    })

    it('should handle LTR layout properly', () => {
      render(
        <TestWrapper language="en">
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
          />
        </TestWrapper>
      )

      const container = screen.getByRole('region')
      expect(container).toHaveAttribute('dir', 'ltr')
    })
  })

  describe('Call Initiation', () => {
    it('should start a call when start button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
          />
        </TestWrapper>
      )

      const startButton = screen.getByRole('button', { name: /بدء المكالمة|Start Call/ })
      await user.click(startButton)

      expect(mockUseVoiceCallEnhanced.initiateCall).toHaveBeenCalledWith('conv-1', 'user-1')
    })

    it('should disable start button when cannot initiate', () => {
      vi.mocked(useVoiceCallEnhanced).mockReturnValue({
        ...mockUseVoiceCallEnhanced,
        canInitiate: false
      })

      render(
        <TestWrapper>
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
          />
        </TestWrapper>
      )

      const startButton = screen.getByRole('button', { name: /بدء المكالمة|Start Call/ })
      expect(startButton).toBeDisabled()
    })
  })

  describe('Active Call Controls', () => {
    beforeEach(() => {
      vi.mocked(useVoiceCallEnhanced).mockReturnValue({
        ...mockUseVoiceCallEnhanced,
        isActive: true,
        callStatus: 'answered',
        duration: 125, // 2:05
        canMute: true,
        canEnd: true,
        canScreenShare: true,
        canRecord: true
      })
    })

    it('should show call controls when call is active', () => {
      render(
        <TestWrapper>
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
          />
        </TestWrapper>
      )

      expect(screen.getByText('02:05')).toBeInTheDocument()
      expect(screen.getByTitle(/كتم الصوت|Mute/)).toBeInTheDocument()
      expect(screen.getByTitle(/مشاركة الشاشة|Screen Share/)).toBeInTheDocument()
      expect(screen.getByTitle(/إنهاء المكالمة|End Call/)).toBeInTheDocument()
    })

    it('should toggle mute when mute button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
          />
        </TestWrapper>
      )

      const muteButton = screen.getByTitle(/كتم الصوت|Mute/)
      await user.click(muteButton)

      expect(mockUseVoiceCallEnhanced.toggleMute).toHaveBeenCalled()
    })

    it('should toggle screen sharing when screen share button is clicked', async () => {
      const user = userEvent.setup()
      mockGetDisplayMedia.mockResolvedValue({
        getVideoTracks: () => [{
          addEventListener: vi.fn(),
          stop: vi.fn()
        }],
        getTracks: () => []
      })
      
      render(
        <TestWrapper>
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
            enableScreenShare={true}
          />
        </TestWrapper>
      )

      const screenShareButton = screen.getByTitle(/مشاركة الشاشة|Screen Share/)
      await user.click(screenShareButton)

      expect(mockUseVoiceCallEnhanced.toggleScreenShare).toHaveBeenCalled()
    })

    it('should show quality indicator with correct status', () => {
      vi.mocked(useVoiceCallEnhanced).mockReturnValue({
        ...mockUseVoiceCallEnhanced,
        isActive: true,
        connectionQuality: 'excellent'
      })

      render(
        <TestWrapper>
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
          />
        </TestWrapper>
      )

      expect(screen.getByText(/ممتازة|Excellent/)).toBeInTheDocument()
    })
  })

  describe('Remote Consultation Features', () => {
    it('should show remote consultation label when enabled', () => {
      render(
        <TestWrapper>
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
            isRemoteConsultation={true}
          />
        </TestWrapper>
      )

      expect(screen.getByText(/استشارة عن بُعد|Remote Consultation/)).toBeInTheDocument()
    })

    it('should show screen sharing display when active', () => {
      vi.mocked(useVoiceCallEnhanced).mockReturnValue({
        ...mockUseVoiceCallEnhanced,
        isActive: true,
        isScreenSharing: true
      })

      render(
        <TestWrapper>
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
            enableScreenShare={true}
          />
        </TestWrapper>
      )

      expect(screen.getByText(/مشاركة الشاشة نشطة|Screen Sharing Active/)).toBeInTheDocument()
    })
  })

  describe('Recording Features', () => {
    it('should show recording controls when enabled', () => {
      vi.mocked(useVoiceCallEnhanced).mockReturnValue({
        ...mockUseVoiceCallEnhanced,
        isActive: true,
        canRecord: true
      })

      render(
        <TestWrapper>
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
            enableRecording={true}
          />
        </TestWrapper>
      )

      expect(screen.getByTitle(/تسجيل المكالمة|Record Call/)).toBeInTheDocument()
    })

    it('should show recording indicator when recording is active', () => {
      vi.mocked(useVoiceCallEnhanced).mockReturnValue({
        ...mockUseVoiceCallEnhanced,
        isActive: true,
        isRecording: true
      })

      render(
        <TestWrapper>
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
            enableRecording={true}
          />
        </TestWrapper>
      )

      expect(screen.getByText(/جاري التسجيل|Recording in progress/)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when error occurs', () => {
      vi.mocked(useVoiceCallEnhanced).mockReturnValue({
        ...mockUseVoiceCallEnhanced,
        error: 'Connection failed'
      })

      render(
        <TestWrapper>
          <VoiceCallInterface
            conversationId="conv-1"
            remoteUserId="user-1"
          />
        </TestWrapper>
      )

      expect(screen.getByText('Connection failed')).toBeInTheDocument()
    })
  })
})

describe('CallControls', () => {
  const defaultProps = {
    callId: 'call-1',
    callStatus: 'answered' as CallStatus,
    connectionQuality: 'good' as ConnectionQuality,
    duration: 125,
    isMuted: false,
    isRecording: false,
    isScreenSharing: false,
    volume: 80,
    onMute: vi.fn(),
    onVolumeChange: vi.fn(),
    onScreenShare: vi.fn(),
    onRecord: vi.fn(),
    onEndCall: vi.fn()
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Controls', () => {
    it('should render all basic call controls', () => {
      render(
        <TestWrapper>
          <CallControls {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTitle(/كتم الصوت|Mute/)).toBeInTheDocument()
      expect(screen.getByTitle(/مشاركة الشاشة|Screen Share/)).toBeInTheDocument()
      expect(screen.getByTitle(/تسجيل المكالمة|Record Call/)).toBeInTheDocument()
      expect(screen.getByTitle(/إنهاء المكالمة|End Call/)).toBeInTheDocument()
    })

    it('should call onMute when mute button is clicked', async () => {
      const user = userEvent.setup()
      const onMute = vi.fn()
      
      render(
        <TestWrapper>
          <CallControls {...defaultProps} onMute={onMute} />
        </TestWrapper>
      )

      const muteButton = screen.getByTitle(/كتم الصوت|Mute/)
      await user.click(muteButton)

      expect(onMute).toHaveBeenCalledWith(true)
    })

    it('should show muted state when isMuted is true', () => {
      render(
        <TestWrapper>
          <CallControls {...defaultProps} isMuted={true} />
        </TestWrapper>
      )

      expect(screen.getByText(/الميكروفون مكتوم|Microphone Muted/)).toBeInTheDocument()
    })
  })

  describe('Advanced Controls Panel', () => {
    it('should show advanced controls when settings button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <CallControls {...defaultProps} />
        </TestWrapper>
      )

      const settingsButton = screen.getByTitle(/الإعدادات المتقدمة|Advanced Settings/)
      await user.click(settingsButton)

      await waitFor(() => {
        expect(screen.getByText(/إعدادات متقدمة|Advanced Settings/)).toBeInTheDocument()
      })
    })

    it('should control volume slider in advanced panel', async () => {
      const user = userEvent.setup()
      const onVolumeChange = vi.fn()
      
      render(
        <TestWrapper>
          <CallControls {...defaultProps} onVolumeChange={onVolumeChange} />
        </TestWrapper>
      )

      // Open advanced controls
      const settingsButton = screen.getByTitle(/الإعدادات المتقدمة|Advanced Settings/)
      await user.click(settingsButton)

      await waitFor(() => {
        const volumeSlider = screen.getByRole('slider')
        expect(volumeSlider).toBeInTheDocument()
      })
    })
  })

  describe('Emergency Features', () => {
    it('should show emergency badge for emergency calls', () => {
      render(
        <TestWrapper>
          <CallControls {...defaultProps} isEmergencyCall={true} />
        </TestWrapper>
      )

      expect(screen.getByText(/مكالمة طارئة|Emergency Call/)).toBeInTheDocument()
    })

    it('should show therapy session badge for therapy calls', () => {
      render(
        <TestWrapper>
          <CallControls {...defaultProps} isTherapySession={true} />
        </TestWrapper>
      )

      expect(screen.getByText(/جلسة علاجية|Therapy Session/)).toBeInTheDocument()
    })

    it('should show emergency escalation button for therapy sessions', () => {
      render(
        <TestWrapper>
          <CallControls {...defaultProps} isTherapySession={true} />
        </TestWrapper>
      )

      expect(screen.getByTitle(/تصعيد طارئ|Emergency Escalation/)).toBeInTheDocument()
    })
  })

  describe('Connection Quality Display', () => {
    it('should show excellent quality status', () => {
      render(
        <TestWrapper>
          <CallControls {...defaultProps} connectionQuality="excellent" />
        </TestWrapper>
      )

      expect(screen.getByText(/ممتازة|Excellent/)).toBeInTheDocument()
    })

    it('should show poor quality warning', () => {
      render(
        <TestWrapper>
          <CallControls {...defaultProps} connectionQuality="poor" />
        </TestWrapper>
      )

      expect(screen.getByText(/ضعيفة|Poor/)).toBeInTheDocument()
    })
  })

  describe('Call Notes', () => {
    it('should allow adding call notes in advanced panel', async () => {
      const user = userEvent.setup()
      const onAddNotes = vi.fn()
      
      render(
        <TestWrapper>
          <CallControls {...defaultProps} onAddNotes={onAddNotes} />
        </TestWrapper>
      )

      // Open advanced controls
      const settingsButton = screen.getByTitle(/الإعدادات المتقدمة|Advanced Settings/)
      await user.click(settingsButton)

      await waitFor(async () => {
        const notesTextarea = screen.getByPlaceholderText(/أضف ملاحظات|Add notes/)
        await user.type(notesTextarea, 'Test notes')

        const saveButton = screen.getByText(/حفظ الملاحظات|Save Notes/)
        await user.click(saveButton)

        expect(onAddNotes).toHaveBeenCalledWith('Test notes')
      })
    })
  })

  describe('Recording Controls', () => {
    it('should show recording status when recording', () => {
      render(
        <TestWrapper>
          <CallControls {...defaultProps} isRecording={true} />
        </TestWrapper>
      )

      expect(screen.getByText(/جاري التسجيل|Recording/)).toBeInTheDocument()
    })

    it('should show pause/resume controls for recording', () => {
      render(
        <TestWrapper>
          <CallControls {...defaultProps} isRecording={true} />
        </TestWrapper>
      )

      expect(screen.getByTitle(/إيقاف التسجيل مؤقتاً|Pause Recording/)).toBeInTheDocument()
    })
  })

  describe('Compliance Features', () => {
    it('should show compliance notice for therapy sessions', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <CallControls {...defaultProps} isTherapySession={true} />
        </TestWrapper>
      )

      // Open advanced controls to see compliance notice
      const settingsButton = screen.getByTitle(/الإعدادات المتقدمة|Advanced Settings/)
      await user.click(settingsButton)

      await waitFor(() => {
        expect(screen.getByText(/التوثيق الطبي|medical documentation/)).toBeInTheDocument()
      })
    })

    it('should show compliance notice for emergency calls', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <CallControls {...defaultProps} isEmergencyCall={true} />
        </TestWrapper>
      )

      // Open advanced controls to see compliance notice
      const settingsButton = screen.getByTitle(/الإعدادات المتقدمة|Advanced Settings/)
      await user.click(settingsButton)

      await waitFor(() => {
        expect(screen.getByText(/الامتثال للوائح|compliance purposes/)).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Responsive Design', () => {
    it('should maintain functionality on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      render(
        <TestWrapper>
          <CallControls {...defaultProps} />
        </TestWrapper>
      )

      // All main controls should still be visible and accessible
      expect(screen.getByTitle(/كتم الصوت|Mute/)).toBeInTheDocument()
      expect(screen.getByTitle(/إنهاء المكالمة|End Call/)).toBeInTheDocument()
    })
  })
})