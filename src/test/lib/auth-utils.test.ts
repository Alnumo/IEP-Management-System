import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAuth, checkAuth } from '@/lib/auth-utils'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}))

describe('Auth Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      const { supabase } = await import('@/lib/supabase')
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await requireAuth()
      expect(result).toEqual(mockUser)
    })

    it('should throw error when auth fails', async () => {
      const { supabase } = await import('@/lib/supabase')
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth failed' },
      })

      await expect(requireAuth()).rejects.toThrow('Authentication failed')
    })

    it('should throw error when user is null', async () => {
      const { supabase } = await import('@/lib/supabase')
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await expect(requireAuth()).rejects.toThrow('User not authenticated')
    })
  })

  describe('checkAuth', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      const { supabase } = await import('@/lib/supabase')
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await checkAuth()
      expect(result).toEqual(mockUser)
    })

    it('should return null when auth fails', async () => {
      const { supabase } = await import('@/lib/supabase')
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth failed' },
      })

      const result = await checkAuth()
      expect(result).toBeNull()
    })

    it('should return null when user is null', async () => {
      const { supabase } = await import('@/lib/supabase')
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await checkAuth()
      expect(result).toBeNull()
    })
  })
})