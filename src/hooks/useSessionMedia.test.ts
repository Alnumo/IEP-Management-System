// Tests for Session Media Hooks
// Story 1.3: Media-Rich Progress Documentation Workflow

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { 
  useSessionMedia, 
  useSessionMediaDetail, 
  useCreateSessionMedia,
  useUpdateSessionMedia,
  useDeleteSessionMedia,
  useCreatePracticeReview,
  useMediaCollections
} from './useSessionMedia'
import type { 
  MediaSearchParams, 
  CreateSessionMediaDto, 
  UpdateSessionMediaDto,
  CreatePracticeReviewDto 
} from '@/types/media'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis()
    }))
  }
}))

// Mock data
const mockMediaList = [
  {
    id: '1',
    student_id: 'student1',
    session_id: 'session1',
    media_type: 'photo',
    file_url: 'https://example.com/image1.jpg',
    file_name: 'image1.jpg',
    file_size: 1024000,
    caption_ar: 'صورة تقدم الطالب',
    caption_en: 'Student progress photo',
    upload_type: 'session_documentation',
    uploaded_by: 'therapist1',
    is_featured: false,
    is_private: false,
    processing_status: 'completed',
    compression_applied: true,
    thumbnail_generated: true,
    created_at: '2025-08-30T10:00:00Z',
    updated_at: '2025-08-30T10:00:00Z',
    tags: ['progress', 'milestone'],
    therapist_name_ar: 'د. أحمد محمد',
    therapist_name_en: 'Dr. Ahmed Mohammed',
    review_status: 'excellent',
    feedback_ar: 'تقدم ممتاز',
    feedback_en: 'Excellent progress'
  },
  {
    id: '2',
    student_id: 'student1',
    session_id: 'session2',
    media_type: 'video',
    file_url: 'https://example.com/video1.mp4',
    file_name: 'video1.mp4',
    file_size: 5024000,
    caption_ar: 'فيديو التدريب المنزلي',
    caption_en: 'Home practice video',
    upload_type: 'home_practice',
    uploaded_by: 'parent1',
    is_featured: true,
    is_private: false,
    processing_status: 'completed',
    compression_applied: true,
    thumbnail_generated: true,
    created_at: '2025-08-30T11:00:00Z',
    updated_at: '2025-08-30T11:00:00Z',
    tags: ['home_practice', 'speech'],
    therapist_name_ar: 'د. فاطمة علي',
    therapist_name_en: 'Dr. Fatima Ali',
    review_status: 'good',
    feedback_ar: 'تقدم جيد يحتاج تحسين',
    feedback_en: 'Good progress, needs improvement'
  }
]

const mockMediaResponse = {
  media: mockMediaList,
  total_count: 2,
  page: 1,
  limit: 20,
  total_pages: 1
}

const mockCollections = [
  {
    id: 'collection1',
    title_ar: 'إنجازات الشهر',
    title_en: 'Monthly Achievements',
    student_id: 'student1',
    created_by: 'therapist1',
    is_public: true,
    is_milestone_collection: true,
    collection_type: 'milestone',
    created_at: '2025-08-30T09:00:00Z',
    updated_at: '2025-08-30T09:00:00Z',
    student_name_ar: 'محمد أحمد',
    student_name_en: 'Mohammed Ahmed',
    media_count: 5,
    latest_media_date: '2025-08-30T10:00:00Z'
  }
]

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useSessionMedia', () => {
  let mockSelect: any
  let mockFrom: any

  beforeEach(() => {
    mockSelect = vi.fn().mockResolvedValue({
      data: mockMediaList,
      error: null,
      count: mockMediaList.length
    })
    
    mockFrom = vi.fn(() => ({
      select: mockSelect,
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis()
    }))

    vi.mocked(supabase.from).mockImplementation(mockFrom)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch session media successfully', async () => {
    const { result } = renderHook(
      () => useSessionMedia({ student_id: 'student1' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeDefined()
    expect(result.current.data?.media).toHaveLength(2)
    expect(result.current.data?.total_count).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('should apply search filters correctly', async () => {
    const searchParams: MediaSearchParams = {
      student_id: 'student1',
      media_type: 'photo',
      upload_type: 'session_documentation',
      date_from: '2025-08-30',
      tags: ['progress']
    }

    renderHook(
      () => useSessionMedia(searchParams),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('session_media_with_reviews')
    })

    // Check that filters were applied through chaining
    expect(mockFrom().eq).toHaveBeenCalled()
    expect(mockFrom().gte).toHaveBeenCalled()
    expect(mockFrom().contains).toHaveBeenCalled()
  })

  it('should handle search query with OR conditions', async () => {
    const searchParams: MediaSearchParams = {
      search_query: 'progress'
    }

    renderHook(
      () => useSessionMedia(searchParams),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(mockFrom().or).toHaveBeenCalled()
    })
  })

  it('should handle pagination correctly', async () => {
    const searchParams: MediaSearchParams = {
      page: 2,
      limit: 10
    }

    renderHook(
      () => useSessionMedia(searchParams),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(mockFrom().range).toHaveBeenCalledWith(10, 19) // page 2, offset 10
    })
  })

  it('should handle empty results', async () => {
    mockSelect.mockResolvedValue({
      data: [],
      error: null,
      count: 0
    })

    const { result } = renderHook(
      () => useSessionMedia({ student_id: 'nonexistent' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data?.media).toHaveLength(0)
    expect(result.current.data?.total_count).toBe(0)
  })

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Database connection failed'
    mockSelect.mockResolvedValue({
      data: null,
      error: { message: errorMessage },
      count: null
    })

    const { result } = renderHook(
      () => useSessionMedia({ student_id: 'student1' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toContain(errorMessage)
  })
})

describe('useSessionMediaDetail', () => {
  let mockSingle: any

  beforeEach(() => {
    mockSingle = vi.fn().mockResolvedValue({
      data: mockMediaList[0],
      error: null
    })

    const mockFrom = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle
    }))

    vi.mocked(supabase.from).mockImplementation(mockFrom)
  })

  it('should fetch single media item successfully', async () => {
    const { result } = renderHook(
      () => useSessionMediaDetail('1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockMediaList[0])
    expect(result.current.error).toBeNull()
  })

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(
      () => useSessionMediaDetail(''),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('should handle not found error', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Row not found', code: 'PGRST116' }
    })

    const { result } = renderHook(
      () => useSessionMediaDetail('nonexistent'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
  })
})

describe('useCreateSessionMedia', () => {
  let mockInsert: any

  beforeEach(() => {
    const createdMedia = { ...mockMediaList[0], id: 'new-id' }
    mockInsert = vi.fn().mockResolvedValue({
      data: createdMedia,
      error: null
    })

    const mockFrom = vi.fn(() => ({
      insert: mockInsert,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue(Promise.resolve({ data: createdMedia, error: null }))
    }))

    vi.mocked(supabase.from).mockImplementation(mockFrom)
  })

  it('should create session media successfully', async () => {
    const { result } = renderHook(
      () => useCreateSessionMedia(),
      { wrapper: createWrapper() }
    )

    const createData: CreateSessionMediaDto = {
      student_id: 'student1',
      media_type: 'photo',
      file_url: 'https://example.com/new-image.jpg',
      file_name: 'new-image.jpg',
      file_size: 1024000,
      upload_type: 'session_documentation'
    }

    await waitFor(async () => {
      const media = await result.current.mutateAsync(createData)
      expect(media.id).toBe('new-id')
    })

    expect(mockInsert).toHaveBeenCalledWith(createData)
    expect(result.current.isError).toBe(false)
  })

  it('should handle creation errors', async () => {
    mockInsert.mockResolvedValue({
      data: null,
      error: { message: 'Validation error' }
    })

    const { result } = renderHook(
      () => useCreateSessionMedia(),
      { wrapper: createWrapper() }
    )

    const createData: CreateSessionMediaDto = {
      student_id: 'student1',
      media_type: 'photo',
      file_url: 'invalid-url',
      file_name: 'test.jpg',
      file_size: 1024000,
      upload_type: 'session_documentation'
    }

    await waitFor(async () => {
      try {
        await result.current.mutateAsync(createData)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
})

describe('useUpdateSessionMedia', () => {
  let mockUpdate: any

  beforeEach(() => {
    const updatedMedia = { ...mockMediaList[0], caption_ar: 'تحديث النص' }
    mockUpdate = vi.fn().mockResolvedValue({
      data: updatedMedia,
      error: null
    })

    const mockFrom = vi.fn(() => ({
      update: mockUpdate,
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue(Promise.resolve({ data: updatedMedia, error: null }))
    }))

    vi.mocked(supabase.from).mockImplementation(mockFrom)
  })

  it('should update session media successfully', async () => {
    const { result } = renderHook(
      () => useUpdateSessionMedia(),
      { wrapper: createWrapper() }
    )

    const updateData: UpdateSessionMediaDto = {
      caption_ar: 'تحديث النص',
      is_featured: true
    }

    await waitFor(async () => {
      const media = await result.current.mutateAsync({
        id: '1',
        data: updateData
      })
      expect(media.caption_ar).toBe('تحديث النص')
    })

    expect(mockUpdate).toHaveBeenCalledWith(updateData)
  })
})

describe('useDeleteSessionMedia', () => {
  let mockDelete: any

  beforeEach(() => {
    mockDelete = vi.fn().mockResolvedValue({
      data: null,
      error: null
    })

    const mockFrom = vi.fn(() => ({
      delete: mockDelete,
      eq: vi.fn().mockReturnThis()
    }))

    vi.mocked(supabase.from).mockImplementation(mockFrom)
  })

  it('should delete session media successfully', async () => {
    const { result } = renderHook(
      () => useDeleteSessionMedia(),
      { wrapper: createWrapper() }
    )

    await waitFor(async () => {
      await result.current.mutateAsync('1')
    })

    expect(mockDelete).toHaveBeenCalled()
    expect(result.current.isError).toBe(false)
  })
})

describe('useCreatePracticeReview', () => {
  let mockInsert: any

  beforeEach(() => {
    const createdReview = {
      id: 'review1',
      media_id: '1',
      reviewed_by: 'therapist1',
      review_status: 'excellent',
      feedback_ar: 'ممتاز',
      created_at: '2025-08-30T12:00:00Z',
      updated_at: '2025-08-30T12:00:00Z'
    }

    mockInsert = vi.fn().mockResolvedValue({
      data: createdReview,
      error: null
    })

    const mockFrom = vi.fn(() => ({
      insert: mockInsert,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue(Promise.resolve({ data: createdReview, error: null }))
    }))

    vi.mocked(supabase.from).mockImplementation(mockFrom)
  })

  it('should create practice review successfully', async () => {
    const { result } = renderHook(
      () => useCreatePracticeReview(),
      { wrapper: createWrapper() }
    )

    const reviewData: CreatePracticeReviewDto = {
      media_id: '1',
      review_status: 'excellent',
      feedback_ar: 'ممتاز',
      technique_rating: 5,
      consistency_rating: 4,
      engagement_rating: 5
    }

    await waitFor(async () => {
      const review = await result.current.mutateAsync(reviewData)
      expect(review.review_status).toBe('excellent')
    })

    expect(mockInsert).toHaveBeenCalledWith(reviewData)
  })
})

describe('useMediaCollections', () => {
  beforeEach(() => {
    const mockSelect = vi.fn().mockResolvedValue({
      data: mockCollections,
      error: null
    })

    const mockFrom = vi.fn(() => ({
      select: mockSelect,
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    }))

    vi.mocked(supabase.from).mockImplementation(mockFrom)
  })

  it('should fetch media collections successfully', async () => {
    const { result } = renderHook(
      () => useMediaCollections('student1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].title_ar).toBe('إنجازات الشهر')
  })

  it('should fetch all collections when no studentId provided', async () => {
    const { result } = renderHook(
      () => useMediaCollections(),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeDefined()
  })
})

describe('Error handling and edge cases', () => {
  it('should handle network errors gracefully', async () => {
    const mockFrom = vi.fn(() => {
      throw new Error('Network error')
    })
    vi.mocked(supabase.from).mockImplementation(mockFrom)

    const { result } = renderHook(
      () => useSessionMedia({ student_id: 'student1' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
  })

  it('should handle malformed response data', async () => {
    const mockSelect = vi.fn().mockResolvedValue({
      data: 'invalid-data',
      error: null
    })

    const mockFrom = vi.fn(() => ({
      select: mockSelect,
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis()
    }))

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    const { result } = renderHook(
      () => useSessionMedia({ student_id: 'student1' }),
      { wrapper: createWrapper() }
    )

    // Should handle gracefully without crashing
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })
})