import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useStudents } from '@/hooks/useStudents'
import React from 'react'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  },
}))

describe('useStudents', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )

  it('should fetch students when authenticated', async () => {
    const mockUser = { id: 'test-user-id' }
    const mockStudents = [
      {
        id: 'student-1',
        first_name_ar: 'احمد',
        last_name_ar: 'محمد',
        first_name_en: 'Ahmed',
        last_name_en: 'Mohammed',
      },
    ]

    const { supabase } = await import('@/lib/supabase')
    
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: mockStudents,
          error: null,
        })),
      })),
    } as any)

    const { result } = renderHook(() => useStudents(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockStudents)
  })

  it('should throw error when not authenticated', async () => {
    const { supabase } = await import('@/lib/supabase')
    
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const { result } = renderHook(() => useStudents(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('User not authenticated')
  })

  it('should handle database errors', async () => {
    const mockUser = { id: 'test-user-id' }
    const mockError = { message: 'Database connection failed' }

    const { supabase } = await import('@/lib/supabase')
    
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: null,
          error: mockError,
        })),
      })),
    } as any)

    const { result } = renderHook(() => useStudents(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(mockError)
  })
})