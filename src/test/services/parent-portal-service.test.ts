// Parent Portal Service Tests
// Comprehensive unit tests for parent portal functionality

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ParentPortalService } from '@/services/parent-portal-service';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
  };

  return {
    supabase: {
      from: vi.fn(() => mockQuery),
      auth: {
        getUser: vi.fn(),
      },
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      })),
      sql: vi.fn()
    }
  }
});

const mockSupabase = supabase as any;

describe('ParentPortalService', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getParentProfile', () => {
    it('should fetch parent profile successfully', async () => {
      // Arrange
      const mockProfile = {
        id: 'profile-1',
        user_id: 'user-1',
        student_id: 'student-1',
        parent_name_ar: 'أحمد محمد',
        parent_name_en: 'Ahmed Mohammed',
        preferred_language: 'ar',
        is_active: true
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } }
      });

      const mockQuery = mockSupabase.from();
      mockQuery.single.mockResolvedValue({
        data: mockProfile,
        error: null
      });

      // Act
      const result = await ParentPortalService.getParentProfile();

      // Assert
      expect(result).toEqual(mockProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('parent_profiles');
    });

    it('should return null when profile not found', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } }
      });

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      // Act
      const result = await ParentPortalService.getParentProfile();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createParentProfile', () => {
    it('should create parent profile successfully', async () => {
      // Arrange
      const profileData = {
        student_id: 'student-1',
        parent_name_ar: 'فاطمة علي',
        parent_name_en: 'Fatima Ali',
        relationship_ar: 'والدة',
        relationship_en: 'mother',
        phone_number: '+966123456789',
        preferred_language: 'ar' as const
      };

      const mockCreatedProfile = {
        id: 'profile-1',
        user_id: 'user-1',
        ...profileData,
        created_at: '2025-09-01T10:00:00Z'
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'fatima@example.com' } }
      });

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockCreatedProfile,
        error: null
      });

      // Act
      const result = await ParentPortalService.createParentProfile(profileData);

      // Assert
      expect(result).toEqual(mockCreatedProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('parent_profiles');
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      });

      const profileData = {
        student_id: 'student-1',
        parent_name_ar: 'فاطمة علي',
        parent_name_en: 'Fatima Ali',
        relationship_ar: 'والدة',
        relationship_en: 'mother'
      };

      // Act & Assert
      await expect(ParentPortalService.createParentProfile(profileData))
        .rejects.toThrow('User not authenticated');
    });
  });

  describe('getMessageThreads', () => {
    it('should fetch and group message threads correctly', async () => {
      // Arrange
      const mockMessages = [
        {
          id: 'msg-1',
          thread_id: 'thread-1',
          parent_id: 'parent-1',
          therapist_id: 'therapist-1',
          student_id: 'student-1',
          message_text_ar: 'مرحبا',
          message_text_en: 'Hello',
          is_read: false,
          created_at: '2025-09-01T10:00:00Z'
        },
        {
          id: 'msg-2',
          thread_id: 'thread-1',
          parent_id: 'parent-1',
          therapist_id: 'therapist-1',
          student_id: 'student-1',
          message_text_ar: 'كيف حال الطفل؟',
          message_text_en: 'How is the child doing?',
          is_read: true,
          created_at: '2025-09-01T11:00:00Z'
        }
      ];

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockMessages,
        error: null
      });

      // Act
      const result = await ParentPortalService.getMessageThreads('parent-1');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].thread_id).toBe('thread-1');
      expect(result[0].messages).toHaveLength(2);
      expect(result[0].unread_count).toBe(1);
      expect(result[0].last_message?.id).toBe('msg-2');
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      // Arrange
      const mockParentProfile = {
        id: 'parent-1',
        user_id: 'user-1',
        student_id: 'student-1'
      };

      const messageData = {
        thread_id: 'thread-1',
        therapist_id: 'therapist-1',
        student_id: 'student-1',
        message_text_ar: 'شكرا لك',
        message_text_en: 'Thank you'
      };

      const mockSentMessage = {
        id: 'msg-3',
        ...messageData,
        parent_id: 'parent-1',
        sender_type: 'parent',
        sender_id: 'parent-1',
        created_at: '2025-09-01T12:00:00Z'
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } }
      });

      // Mock getParentProfile call
      mockSupabase.from().select().eq().eq().single
        .mockResolvedValueOnce({ data: mockParentProfile, error: null })
        .mockResolvedValueOnce({ data: mockSentMessage, error: null });

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockSentMessage,
        error: null
      });

      // Act
      const result = await ParentPortalService.sendMessage(messageData);

      // Assert
      expect(result).toEqual(mockSentMessage);
      expect(mockSupabase.from).toHaveBeenCalledWith('parent_messages');
    });
  });

  describe('getHomePrograms', () => {
    it('should fetch home programs with completion data', async () => {
      // Arrange
      const mockPrograms = [
        {
          id: 'program-1',
          student_id: 'student-1',
          program_name_ar: 'برنامج التواصل',
          program_name_en: 'Communication Program',
          is_active: true,
          assigned_date: '2025-08-01',
          home_program_completions: [
            {
              id: 'completion-1',
              success_rating: 4,
              completion_date: '2025-09-01'
            },
            {
              id: 'completion-2',
              success_rating: 3,
              completion_date: '2025-08-31'
            }
          ]
        }
      ];

      mockSupabase.from().select().eq().eq().order.mockResolvedValue({
        data: mockPrograms,
        error: null
      });

      // Act
      const result = await ParentPortalService.getHomePrograms('parent-1', 'student-1');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('program-1');
      expect(result[0].completion_rate).toBe(100); // 2 completions with rating >= 3
      expect(result[0].last_completion?.id).toBe('completion-1');
    });
  });

  describe('getDashboardData', () => {
    it('should compile comprehensive dashboard data', async () => {
      // Arrange
      const mockParentProfile = {
        id: 'parent-1',
        user_id: 'user-1',
        student_id: 'student-1'
      };

      const mockStudentData = {
        id: 'student-1',
        student_name_ar: 'محمد أحمد',
        student_name_en: 'Mohammed Ahmed',
        date_of_birth: '2015-01-01',
        enrollment_date: '2025-01-01'
      };

      // Mock getParentProfile
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } }
      });

      mockSupabase.from().select().eq().eq().single
        .mockResolvedValueOnce({ data: mockParentProfile, error: null })
        .mockResolvedValueOnce({ data: mockStudentData, error: null });

      // Mock other dashboard data calls
      mockSupabase.from().select
        .mockReturnValueOnce({ count: vi.fn().mockResolvedValue({ count: 3 }) })
        .mockReturnValueOnce({ count: vi.fn().mockResolvedValue({ count: 2 }) })
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] })
        });

      // Act
      const result = await ParentPortalService.getDashboardData('parent-1');

      // Assert
      expect(result).toBeTruthy();
      expect(result?.parent_profile).toEqual(mockParentProfile);
      expect(result?.student_info.name_ar).toBe('محمد أحمد');
      expect(result?.student_info.age).toBe(10);
      expect(result?.unread_messages_count).toBe(3);
      expect(result?.pending_home_programs).toBe(2);
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should create message subscription correctly', () => {
      // Arrange
      const mockCallback = vi.fn();
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      };
      mockSupabase.channel.mockReturnValue(mockChannel);

      // Act
      ParentPortalService.subscribeToMessages('parent-1', mockCallback);

      // Assert
      expect(mockSupabase.channel).toHaveBeenCalledWith('parent_messages');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          table: 'parent_messages',
          filter: 'parent_id=eq.parent-1'
        }),
        mockCallback
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should create notification subscription correctly', () => {
      // Arrange
      const mockCallback = vi.fn();
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      };
      mockSupabase.channel.mockReturnValue(mockChannel);

      // Act
      ParentPortalService.subscribeToNotifications('parent-1', mockCallback);

      // Assert
      expect(mockSupabase.channel).toHaveBeenCalledWith('parent_notifications');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          table: 'parent_notifications',
          filter: 'parent_id=eq.parent-1'
        }),
        mockCallback
      );
    });
  });

  describe('Bilingual Content Handling', () => {
    it('should handle Arabic and English content correctly', async () => {
      // Arrange
      const bilingualMessage = {
        thread_id: 'thread-1',
        therapist_id: 'therapist-1',
        student_id: 'student-1',
        message_text_ar: 'مرحبا، كيف يمكنني مساعدتك؟',
        message_text_en: 'Hello, how can I help you?'
      };

      const mockParentProfile = { id: 'parent-1', user_id: 'user-1' };
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } }
      });

      mockSupabase.from().select().eq().eq().single
        .mockResolvedValueOnce({ data: mockParentProfile, error: null });

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { ...bilingualMessage, id: 'msg-1' },
        error: null
      });

      // Act
      const result = await ParentPortalService.sendMessage(bilingualMessage);

      // Assert
      expect(result.message_text_ar).toBe('مرحبا، كيف يمكنني مساعدتك؟');
      expect(result.message_text_en).toBe('Hello, how can I help you?');
    });
  });
});