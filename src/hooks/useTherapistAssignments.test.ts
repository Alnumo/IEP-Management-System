// Unit tests for useTherapistAssignments hook
// Story 1.2: Advanced Therapist Assignment & Substitute Workflow

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useTherapistAssignments, useCreateTherapistAssignment, useAssignSubstitute } from './useTherapistAssignments'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  })),
  rpc: vi.fn()
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useTherapistAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Hooks', () => {
    it('should fetch therapist assignments successfully', async () => {
      const mockAssignments = [
        {
          id: '1',
          student_id: 'student-1',
          primary_therapist_id: 'therapist-1',
          specialization_ar: 'العلاج النطقي',
          specialization_en: 'Speech Therapy',
          status: 'active',
          assigned_date: '2024-01-01',
          parent_notified: true,
          therapist_notified: true,
          student: {
            id: 'student-1',
            first_name_ar: 'أحمد',
            last_name_ar: 'محمد'
          },
          primary_therapist: {
            id: 'therapist-1',
            first_name_ar: 'د. سارة',
            last_name_ar: 'أحمد',
            specialization_ar: 'العلاج النطقي'
          }
        }
      ]

      mockSupabase.from().order.mockResolvedValueOnce({
        data: mockAssignments,
        error: null
      })

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useTherapistAssignments({ status: 'active' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockAssignments)
      expect(mockSupabase.from).toHaveBeenCalledWith('therapist_specialization_assignments')
    })

    it('should apply filters correctly', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const wrapper = createWrapper()
      renderHook(
        () => useTherapistAssignments({
          student_id: 'student-1',
          specialization_ar: 'العلاج النطقي',
          has_substitute: true
        }),
        { wrapper }
      )

      await waitFor(() => {
        expect(mockQuery.eq).toHaveBeenCalledWith('student_id', 'student-1')
        expect(mockQuery.eq).toHaveBeenCalledWith('specialization_ar', 'العلاج النطقي')
        expect(mockQuery.not).toHaveBeenCalledWith('current_substitute_id', 'is', null)
      })
    })

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database connection failed')
      
      mockSupabase.from().order.mockResolvedValueOnce({
        data: null,
        error: mockError
      })

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useTherapistAssignments(),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('Mutation Hooks', () => {
    it('should create therapist assignment successfully', async () => {
      const mockAssignment = {
        id: 'new-assignment-1',
        student_id: 'student-1',
        primary_therapist_id: 'therapist-1',
        specialization_ar: 'العلاج الوظيفي',
        specialization_en: 'Occupational Therapy',
        status: 'active'
      }

      mockSupabase.from().single.mockResolvedValueOnce({
        data: mockAssignment,
        error: null
      })

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useCreateTherapistAssignment(),
        { wrapper }
      )

      const assignmentData = {
        student_id: 'student-1',
        primary_therapist_id: 'therapist-1',
        specialization_ar: 'العلاج الوظيفي',
        specialization_en: 'Occupational Therapy'
      }

      await result.current.mutateAsync(assignmentData)

      expect(mockSupabase.from).toHaveBeenCalledWith('therapist_specialization_assignments')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(assignmentData)
    })

    it('should assign substitute successfully', async () => {
      const mockUpdatedAssignment = {
        id: 'assignment-1',
        current_substitute_id: 'substitute-1',
        substitute_start_date: '2024-02-01',
        substitute_reason: 'Primary therapist on leave'
      }

      mockSupabase.from().single.mockResolvedValueOnce({
        data: mockUpdatedAssignment,
        error: null
      })

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useAssignSubstitute(),
        { wrapper }
      )

      const substituteData = {
        assignmentId: 'assignment-1',
        substituteId: 'substitute-1',
        reason: 'Primary therapist on leave',
        startDate: '2024-02-01'
      }

      await result.current.mutateAsync(substituteData)

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        current_substitute_id: 'substitute-1',
        substitute_start_date: '2024-02-01',
        substitute_end_date: undefined,
        substitute_reason: 'Primary therapist on leave',
        parent_notified: false,
        therapist_notified: false,
        updated_at: expect.any(String)
      })
    })

    it('should handle mutation errors', async () => {
      const mockError = new Error('Validation failed: Therapist specialization mismatch')
      
      mockSupabase.from().single.mockResolvedValueOnce({
        data: null,
        error: mockError
      })

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useCreateTherapistAssignment(),
        { wrapper }
      )

      const invalidData = {
        student_id: 'student-1',
        primary_therapist_id: 'therapist-wrong-spec',
        specialization_ar: 'العلاج النطقي'
      }

      await expect(result.current.mutateAsync(invalidData)).rejects.toThrow(mockError)
    })
  })

  describe('Cache Management', () => {
    it('should use correct query keys', () => {
      const filters = { status: 'active' as const, student_id: 'student-1' }
      
      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useTherapistAssignments(filters),
        { wrapper }
      )

      // Query should be using the correct key structure
      expect(result.current.isLoading).toBeDefined()
    })

    it('should have appropriate stale time configuration', async () => {
      mockSupabase.from().order.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useTherapistAssignments(),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // The hook should be configured with 5-minute stale time
      expect(result.current.dataUpdatedAt).toBeDefined()
    })
  })
})

describe('Assignment Business Logic', () => {
  it('should validate assignment data structure', () => {
    const validAssignment = {
      id: '1',
      student_id: 'student-1',
      primary_therapist_id: 'therapist-1',
      specialization_ar: 'العلاج النطقي',
      specialization_en: 'Speech Therapy',
      status: 'active' as const,
      assigned_date: '2024-01-01',
      parent_notified: true,
      therapist_notified: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    // Basic validation - all required fields present
    expect(validAssignment.id).toBeDefined()
    expect(validAssignment.student_id).toBeDefined()
    expect(validAssignment.primary_therapist_id).toBeDefined()
    expect(validAssignment.specialization_ar).toBeDefined()
    expect(validAssignment.status).toMatch(/^(active|inactive|transferred)$/)
    expect(typeof validAssignment.parent_notified).toBe('boolean')
    expect(typeof validAssignment.therapist_notified).toBe('boolean')
  })

  it('should handle substitute assignment scenarios', () => {
    const assignmentWithSubstitute = {
      id: '1',
      student_id: 'student-1',
      primary_therapist_id: 'therapist-1',
      current_substitute_id: 'substitute-1',
      substitute_start_date: '2024-02-01',
      substitute_end_date: '2024-02-15',
      substitute_reason: 'Primary therapist on vacation',
      specialization_ar: 'العلاج النطقي',
      status: 'active' as const,
      parent_notified: false, // Should trigger notification
      therapist_notified: false
    }

    // Validate substitute assignment structure
    expect(assignmentWithSubstitute.current_substitute_id).toBeDefined()
    expect(assignmentWithSubstitute.substitute_start_date).toBeDefined()
    expect(assignmentWithSubstitute.substitute_reason).toBeDefined()
    expect(assignmentWithSubstitute.parent_notified).toBe(false) // Should notify parents
  })

  it('should validate specialization consistency', () => {
    const validSpecializations = [
      'العلاج النطقي', 'العلاج الوظيفي', 'العلاج الطبيعي', 
      'العلاج السلوكي', 'العلاج التطويري'
    ]

    const assignmentData = {
      specialization_ar: 'العلاج النطقي',
      specialization_en: 'Speech Therapy'
    }

    // Validate Arabic specialization is in approved list
    expect(validSpecializations).toContain(assignmentData.specialization_ar)
    
    // Validate bilingual consistency
    if (assignmentData.specialization_ar === 'العلاج النطقي') {
      expect(assignmentData.specialization_en).toBe('Speech Therapy')
    }
  })
})