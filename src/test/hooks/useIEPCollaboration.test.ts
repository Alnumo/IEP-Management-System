/**
 * IEP Collaboration Hook Test Suite
 * Tests for real-time collaboration functionality
 * Story 1.3 - Task 2: Collaborative IEP development workflow
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { useIEPCollaboration } from '@/hooks/useIEPCollaboration'
import { iepCollaborationService } from '@/services/iep-collaboration-service'
import type { CollaborationPresence, CollaborationEvent } from '@/services/iep-collaboration-service'

// Mock the collaboration service
vi.mock('@/services/iep-collaboration-service', () => ({
  iepCollaborationService: {
    joinCollaboration: vi.fn(),
    leaveCollaboration: vi.fn(),
    startEditing: vi.fn(),
    stopEditing: vi.fn(),
    broadcastContentChange: vi.fn(),
    addComment: vi.fn(),
    onEvent: vi.fn(),
    onPresenceUpdate: vi.fn(),
    onSectionLock: vi.fn(),
    onContentChange: vi.fn(),
    getCurrentUser: vi.fn(),
    getActiveLocks: vi.fn(),
    getConnectionStatus: vi.fn()
  }
}))

vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 'test-user-1',
    email: 'test@example.com',
    user_metadata: {
      name_ar: 'مستخدم اختبار',
      name_en: 'Test User',
      role: 'therapist'
    }
  })
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useIEPCollaboration', () => {
  const mockIepId = 'test-iep-123'
  const mockUserProfile = {
    user_id: 'test-user-1',
    name_ar: 'مستخدم اختبار',
    name_en: 'Test User',
    email: 'test@example.com',
    role: 'therapist'
  }

  const mockPresence: CollaborationPresence = {
    user_id: 'test-user-1',
    name_ar: 'مستخدم اختبار',
    name_en: 'Test User',
    email: 'test@example.com',
    role: 'therapist',
    status: 'online',
    last_activity: '2024-01-01T12:00:00Z',
    color: '#3B82F6'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    vi.mocked(iepCollaborationService.joinCollaboration).mockResolvedValue({} as any)
    vi.mocked(iepCollaborationService.getCurrentUser).mockReturnValue(mockPresence)
    vi.mocked(iepCollaborationService.getActiveLocks).mockReturnValue([])
    vi.mocked(iepCollaborationService.getConnectionStatus).mockReturnValue('connected')
    vi.mocked(iepCollaborationService.startEditing).mockResolvedValue(true)
    vi.mocked(iepCollaborationService.onEvent).mockReturnValue(() => {})
    vi.mocked(iepCollaborationService.onPresenceUpdate).mockReturnValue(() => {})
    vi.mocked(iepCollaborationService.onSectionLock).mockReturnValue(() => {})
    vi.mocked(iepCollaborationService.onContentChange).mockReturnValue(() => {})
  })

  describe('Connection Management', () => {
    it('should initialize with disconnected state', () => {
      vi.mocked(iepCollaborationService.getConnectionStatus).mockReturnValue('disconnected')
      
      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: false 
        }),
        { wrapper: createWrapper() }
      )

      expect(result.current.isConnected).toBe(false)
      expect(result.current.isConnecting).toBe(false)
      expect(result.current.connectionError).toBeNull()
    })

    it('should auto-join collaboration when autoJoin is true', async () => {
      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(iepCollaborationService.joinCollaboration).toHaveBeenCalledWith(
          mockIepId,
          mockUserProfile
        )
      })

      expect(result.current.isConnected).toBe(true)
      expect(result.current.currentUser).toEqual(mockPresence)
    })

    it('should handle join collaboration manually', async () => {
      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: false 
        }),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        const success = await result.current.joinCollaboration()
        expect(success).toBe(true)
      })

      expect(iepCollaborationService.joinCollaboration).toHaveBeenCalledWith(
        mockIepId,
        mockUserProfile
      )
    })

    it('should handle join collaboration error', async () => {
      const error = new Error('Connection failed')
      vi.mocked(iepCollaborationService.joinCollaboration).mockRejectedValue(error)

      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: false 
        }),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        const success = await result.current.joinCollaboration()
        expect(success).toBe(false)
      })

      await waitFor(() => {
        expect(result.current.connectionError).toBe('Connection failed')
      })
    })

    it('should leave collaboration on unmount', async () => {
      const { unmount } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(iepCollaborationService.joinCollaboration).toHaveBeenCalled()
      })

      unmount()

      await waitFor(() => {
        expect(iepCollaborationService.leaveCollaboration).toHaveBeenCalledWith(mockIepId)
      })
    })
  })

  describe('Section Management', () => {
    it('should start editing a section successfully', async () => {
      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      await act(async () => {
        const success = await result.current.startEditing('basic_info')
        expect(success).toBe(true)
      })

      expect(iepCollaborationService.startEditing).toHaveBeenCalledWith(mockIepId, 'basic_info')
    })

    it('should fail to start editing when section is locked', async () => {
      vi.mocked(iepCollaborationService.startEditing).mockResolvedValue(false)

      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      await act(async () => {
        const success = await result.current.startEditing('basic_info')
        expect(success).toBe(false)
      })
    })

    it('should stop editing a section', async () => {
      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      await act(async () => {
        await result.current.stopEditing('basic_info')
      })

      expect(iepCollaborationService.stopEditing).toHaveBeenCalledWith(mockIepId, 'basic_info')
    })

    it('should check if section is locked', async () => {
      const mockLocks = [
        {
          iep_id: mockIepId,
          section: 'basic_info' as const,
          locked_by: 'other-user',
          locked_by_name_ar: 'مستخدم آخر',
          locked_by_name_en: 'Other User',
          locked_at: '2024-01-01T12:00:00Z'
        }
      ]
      
      vi.mocked(iepCollaborationService.getActiveLocks).mockReturnValue(mockLocks)

      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      expect(result.current.isSectionLocked('basic_info')).toBe(true)
      expect(result.current.isSectionLocked('present_levels')).toBe(false)
      expect(result.current.isSectionLockedByMe('basic_info')).toBe(false)
    })

    it('should check if section is locked by current user', async () => {
      const mockLocks = [
        {
          iep_id: mockIepId,
          section: 'basic_info' as const,
          locked_by: 'test-user-1',
          locked_by_name_ar: 'مستخدم اختبار',
          locked_by_name_en: 'Test User',
          locked_at: '2024-01-01T12:00:00Z'
        }
      ]
      
      vi.mocked(iepCollaborationService.getActiveLocks).mockReturnValue(mockLocks)

      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      expect(result.current.isSectionLockedByMe('basic_info')).toBe(true)
    })
  })

  describe('Content Management', () => {
    it('should broadcast content changes', async () => {
      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      await act(async () => {
        await result.current.broadcastContentChange(
          'basic_info',
          'student_name',
          'Old Name',
          'New Name'
        )
      })

      expect(iepCollaborationService.broadcastContentChange).toHaveBeenCalledWith(
        mockIepId,
        'basic_info',
        'student_name',
        'Old Name',
        'New Name'
      )
    })

    it('should add comments', async () => {
      const mockComment = {
        id: 'comment-1',
        iep_id: mockIepId,
        section: 'basic_info' as const,
        content_ar: 'تعليق اختبار',
        content_en: 'Test comment',
        author_id: 'test-user-1',
        author_name_ar: 'مستخدم اختبار',
        author_name_en: 'Test User',
        created_at: '2024-01-01T12:00:00Z',
        resolved: false
      }

      vi.mocked(iepCollaborationService.addComment).mockResolvedValue(mockComment)

      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      let comment: any
      await act(async () => {
        comment = await result.current.addComment(
          'basic_info',
          'تعليق اختبار',
          'Test comment',
          'student_name'
        )
      })

      expect(comment).toEqual(mockComment)
      expect(iepCollaborationService.addComment).toHaveBeenCalledWith(
        mockIepId,
        'basic_info',
        'تعليق اختبار',
        'Test comment',
        'student_name'
      )
    })
  })

  describe('Presence Management', () => {
    it('should track participant count', async () => {
      const mockParticipants = [
        { ...mockPresence, user_id: 'user-1' },
        { ...mockPresence, user_id: 'user-2' },
        { ...mockPresence, user_id: 'user-3' }
      ]

      // Mock presence updates
      let presenceHandler: ((presence: Record<string, CollaborationPresence[]>) => void) | null = null
      vi.mocked(iepCollaborationService.onPresenceUpdate).mockImplementation((_, handler) => {
        presenceHandler = handler
        return () => {}
      })

      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // Simulate presence update
      act(() => {
        presenceHandler?.({ room: mockParticipants })
      })

      expect(result.current.getParticipantCount()).toBe(3)
      expect(result.current.participants).toEqual(mockParticipants)
    })

    it('should identify editing participants', async () => {
      const mockParticipants = [
        { ...mockPresence, user_id: 'user-1', status: 'online' as const },
        { ...mockPresence, user_id: 'user-2', status: 'editing' as const },
        { ...mockPresence, user_id: 'user-3', status: 'editing' as const }
      ]

      let presenceHandler: ((presence: Record<string, CollaborationPresence[]>) => void) | null = null
      vi.mocked(iepCollaborationService.onPresenceUpdate).mockImplementation((_, handler) => {
        presenceHandler = handler
        return () => {}
      })

      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        presenceHandler?.({ room: mockParticipants })
      })

      const editingParticipants = result.current.getEditingParticipants()
      expect(editingParticipants).toHaveLength(2)
      expect(editingParticipants.every(p => p.status === 'editing')).toBe(true)
      
      expect(result.current.isUserEditing('user-2')).toBe(true)
      expect(result.current.isUserEditing('user-1')).toBe(false)
    })
  })

  describe('Event Handling', () => {
    it('should track recent events', async () => {
      const mockEvents: CollaborationEvent[] = [
        {
          id: 'event-1',
          event_type: 'user_joined',
          iep_id: mockIepId,
          user_id: 'user-1',
          user_name_ar: 'مستخدم أول',
          user_name_en: 'First User',
          timestamp: '2024-01-01T12:00:00Z'
        },
        {
          id: 'event-2',
          event_type: 'editing_started',
          iep_id: mockIepId,
          section: 'basic_info',
          user_id: 'user-2',
          user_name_ar: 'مستخدم ثاني',
          user_name_en: 'Second User',
          timestamp: '2024-01-01T12:01:00Z'
        }
      ]

      let eventHandler: ((event: CollaborationEvent) => void) | null = null
      vi.mocked(iepCollaborationService.onEvent).mockImplementation((_, handler) => {
        eventHandler = handler
        return () => {}
      })

      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId, 
          userProfile: mockUserProfile,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // Simulate events
      act(() => {
        mockEvents.forEach(event => eventHandler?.(event))
      })

      expect(result.current.recentEvents).toEqual(mockEvents.reverse()) // Latest first
    })
  })

  describe('User Profile Fallback', () => {
    it('should fetch user profile when not provided', async () => {
      const { result } = renderHook(
        () => useIEPCollaboration({ 
          iepId: mockIepId,
          autoJoin: true 
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(iepCollaborationService.joinCollaboration).toHaveBeenCalledWith(
          mockIepId,
          expect.objectContaining({
            user_id: 'test-user-1',
            email: 'test@example.com'
          })
        )
      })
    })
  })
})