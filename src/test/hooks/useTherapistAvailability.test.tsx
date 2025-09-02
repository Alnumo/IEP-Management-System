import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { toast } from 'sonner'
import { useTherapistAvailability } from '../../hooks/useTherapistAvailability'
import { availabilityService } from '../../services/availability-service'
import type { 
  TherapistAvailability, 
  CreateAvailabilityRequest,
  UpdateAvailabilityRequest,
  AvailabilityTemplate
} from '../../types/scheduling'

// Mock dependencies
vi.mock('../../services/availability-service')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  }
}))

// Mock i18n context
const mockI18n = {
  language: 'ar' as const,
  isRTL: true,
  t: vi.fn((key: string) => {
    const translations: Record<string, string> = {
      'availability.loading': 'جاري التحميل...',
      'availability.success.created': 'تم إنشاء الوقت المتاح بنجاح',
      'availability.success.updated': 'تم تحديث الوقت المتاح بنجاح',
      'availability.success.deleted': 'تم حذف الوقت المتاح بنجاح',
      'availability.error.fetch': 'فشل في تحميل الأوقات المتاحة',
      'availability.error.create': 'فشل في إنشاء الوقت المتاح',
      'availability.error.update': 'فشل في تحديث الوقت المتاح',
      'availability.error.delete': 'فشل في حذف الوقت المتاح'
    }
    return translations[key] || key
  })
}

vi.mock('../../contexts/I18nContext', () => ({
  useI18n: () => mockI18n
}))

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Mock data
const mockAvailability: TherapistAvailability[] = [
  {
    id: 'avail-1',
    therapist_id: 'therapist-1',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    status: 'available',
    recurrence_pattern: 'weekly',
    effective_date: '2025-01-01',
    expiry_date: '2025-12-31',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'avail-2',
    therapist_id: 'therapist-1',
    day_of_week: 2,
    start_time: '09:00',
    end_time: '17:00',
    status: 'available',
    recurrence_pattern: 'weekly',
    effective_date: '2025-01-01',
    expiry_date: '2025-12-31',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
]

const mockTemplate: AvailabilityTemplate = {
  id: 'template-1',
  name_ar: 'قالب الصباح',
  name_en: 'Morning Template',
  description_ar: 'ساعات العمل الصباحية',
  description_en: 'Morning working hours',
  schedule_pattern: [
    { day_of_week: 1, start_time: '08:00', end_time: '12:00' },
    { day_of_week: 2, start_time: '08:00', end_time: '12:00' }
  ],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  created_by: 'user-123'
}

describe('useTherapistAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('useTherapistAvailabilityQuery', () => {
    it('should fetch therapist availability successfully', async () => {
      vi.mocked(availabilityService.getTherapistAvailability).mockResolvedValue({
        success: true,
        data: mockAvailability
      })

      const { result } = renderHook(
        () => useTherapistAvailability.useTherapistAvailabilityQuery('therapist-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockAvailability)
      expect(availabilityService.getTherapistAvailability).toHaveBeenCalledWith('therapist-1', undefined)
    })

    it('should handle fetch errors', async () => {
      vi.mocked(availabilityService.getTherapistAvailability).mockResolvedValue({
        success: false,
        error: 'Database error'
      })

      const { result } = renderHook(
        () => useTherapistAvailability.useTherapistAvailabilityQuery('therapist-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeTruthy()
    })

    it('should pass query filters correctly', async () => {
      const query = {
        therapist_id: 'therapist-1',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        status: 'available' as const
      }

      vi.mocked(availabilityService.getTherapistAvailability).mockResolvedValue({
        success: true,
        data: mockAvailability
      })

      renderHook(
        () => useTherapistAvailability.useTherapistAvailabilityQuery('therapist-1', query),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(availabilityService.getTherapistAvailability).toHaveBeenCalledWith('therapist-1', query)
      })
    })

    it('should be disabled when therapist_id is not provided', () => {
      const { result } = renderHook(
        () => useTherapistAvailability.useTherapistAvailabilityQuery(''),
        { wrapper: createWrapper() }
      )

      expect(result.current.fetchStatus).toBe('idle')
      expect(availabilityService.getTherapistAvailability).not.toHaveBeenCalled()
    })
  })

  describe('useCreateAvailability', () => {
    it('should create availability successfully', async () => {
      const newAvailability = mockAvailability[0]
      vi.mocked(availabilityService.createAvailability).mockResolvedValue({
        success: true,
        data: newAvailability
      })

      const { result } = renderHook(
        () => useTherapistAvailability.useCreateAvailability(),
        { wrapper: createWrapper() }
      )

      const createRequest: CreateAvailabilityRequest = {
        therapist_id: 'therapist-1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        status: 'available',
        recurrence_pattern: 'weekly',
        effective_date: '2025-01-01'
      }

      await act(async () => {
        result.current.mutate(createRequest)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(newAvailability)
      expect(toast.success).toHaveBeenCalledWith('تم إنشاء الوقت المتاح بنجاح')
      expect(availabilityService.createAvailability).toHaveBeenCalledWith(createRequest)
    })

    it('should handle creation errors with toast notification', async () => {
      vi.mocked(availabilityService.createAvailability).mockResolvedValue({
        success: false,
        error: 'Validation failed'
      })

      const { result } = renderHook(
        () => useTherapistAvailability.useCreateAvailability(),
        { wrapper: createWrapper() }
      )

      const createRequest: CreateAvailabilityRequest = {
        therapist_id: 'therapist-1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        status: 'available',
        recurrence_pattern: 'weekly',
        effective_date: '2025-01-01'
      }

      await act(async () => {
        result.current.mutate(createRequest)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.error).toHaveBeenCalledWith('فشل في إنشاء الوقت المتاح: Validation failed')
    })

    it('should show loading toast during creation', async () => {
      vi.mocked(availabilityService.createAvailability).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockAvailability[0] }), 100))
      )

      const { result } = renderHook(
        () => useTherapistAvailability.useCreateAvailability(),
        { wrapper: createWrapper() }
      )

      const createRequest: CreateAvailabilityRequest = {
        therapist_id: 'therapist-1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        status: 'available',
        recurrence_pattern: 'weekly',
        effective_date: '2025-01-01'
      }

      act(() => {
        result.current.mutate(createRequest)
      })

      expect(toast.loading).toHaveBeenCalledWith('جاري التحميل...')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.dismiss).toHaveBeenCalled()
    })
  })

  describe('useUpdateAvailability', () => {
    it('should update availability successfully', async () => {
      const updatedAvailability = { ...mockAvailability[0], start_time: '10:00' }
      vi.mocked(availabilityService.updateAvailability).mockResolvedValue({
        success: true,
        data: updatedAvailability
      })

      const { result } = renderHook(
        () => useTherapistAvailability.useUpdateAvailability(),
        { wrapper: createWrapper() }
      )

      const updateRequest: UpdateAvailabilityRequest = {
        start_time: '10:00'
      }

      await act(async () => {
        result.current.mutate({
          id: 'avail-1',
          data: updateRequest
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(updatedAvailability)
      expect(toast.success).toHaveBeenCalledWith('تم تحديث الوقت المتاح بنجاح')
      expect(availabilityService.updateAvailability).toHaveBeenCalledWith('avail-1', updateRequest)
    })

    it('should handle update errors', async () => {
      vi.mocked(availabilityService.updateAvailability).mockResolvedValue({
        success: false,
        error: 'Update failed'
      })

      const { result } = renderHook(
        () => useTherapistAvailability.useUpdateAvailability(),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        result.current.mutate({
          id: 'avail-1',
          data: { start_time: '10:00' }
        })
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.error).toHaveBeenCalledWith('فشل في تحديث الوقت المتاح: Update failed')
    })
  })

  describe('useDeleteAvailability', () => {
    it('should delete availability successfully', async () => {
      vi.mocked(availabilityService.deleteAvailability).mockResolvedValue({
        success: true,
        data: { id: 'avail-1', deleted: true }
      })

      const { result } = renderHook(
        () => useTherapistAvailability.useDeleteAvailability(),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        result.current.mutate('avail-1')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('تم حذف الوقت المتاح بنجاح')
      expect(availabilityService.deleteAvailability).toHaveBeenCalledWith('avail-1')
    })

    it('should handle delete errors', async () => {
      vi.mocked(availabilityService.deleteAvailability).mockResolvedValue({
        success: false,
        error: 'Cannot delete: active sessions exist'
      })

      const { result } = renderHook(
        () => useTherapistAvailability.useDeleteAvailability(),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        result.current.mutate('avail-1')
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.error).toHaveBeenCalledWith('فشل في حذف الوقت المتاح: Cannot delete: active sessions exist')
    })
  })

  describe('useBulkUpdateAvailability', () => {
    it('should perform bulk updates successfully', async () => {
      const bulkUpdates = [
        { id: 'avail-1', data: { start_time: '08:00' } },
        { id: 'avail-2', data: { end_time: '18:00' } }
      ]

      vi.mocked(availabilityService.updateAvailability)
        .mockResolvedValueOnce({ success: true, data: { ...mockAvailability[0], start_time: '08:00' } })
        .mockResolvedValueOnce({ success: true, data: { ...mockAvailability[1], end_time: '18:00' } })

      const { result } = renderHook(
        () => useTherapistAvailability.useBulkUpdateAvailability(),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        result.current.mutate(bulkUpdates)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(availabilityService.updateAvailability).toHaveBeenCalledTimes(2)
      expect(toast.success).toHaveBeenCalledWith('تم تحديث الأوقات المتاحة بنجاح (2 عنصر)')
    })

    it('should handle partial failures in bulk updates', async () => {
      const bulkUpdates = [
        { id: 'avail-1', data: { start_time: '08:00' } },
        { id: 'avail-2', data: { end_time: '18:00' } }
      ]

      vi.mocked(availabilityService.updateAvailability)
        .mockResolvedValueOnce({ success: true, data: { ...mockAvailability[0], start_time: '08:00' } })
        .mockResolvedValueOnce({ success: false, error: 'Update failed' })

      const { result } = renderHook(
        () => useTherapistAvailability.useBulkUpdateAvailability(),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        result.current.mutate(bulkUpdates)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.error).toHaveBeenCalledWith('فشل في تحديث بعض الأوقات المتاحة: 1 فشل من أصل 2')
    })
  })

  describe('useAvailabilityTemplatesQuery', () => {
    it('should fetch availability templates successfully', async () => {
      vi.mocked(availabilityService.getAvailabilityTemplates).mockResolvedValue({
        success: true,
        data: [mockTemplate]
      })

      const { result } = renderHook(
        () => useTherapistAvailability.useAvailabilityTemplatesQuery(),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([mockTemplate])
      expect(availabilityService.getAvailabilityTemplates).toHaveBeenCalled()
    })
  })

  describe('useApplyTemplate', () => {
    it('should apply template to therapist successfully', async () => {
      vi.mocked(availabilityService.applyTemplateToTherapist).mockResolvedValue({
        success: true,
        data: mockAvailability
      })

      const { result } = renderHook(
        () => useTherapistAvailability.useApplyTemplate(),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        result.current.mutate({
          templateId: 'template-1',
          therapistId: 'therapist-1',
          effectiveDate: '2025-02-01'
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockAvailability)
      expect(toast.success).toHaveBeenCalledWith('تم تطبيق القالب بنجاح')
      expect(availabilityService.applyTemplateToTherapist).toHaveBeenCalledWith(
        'template-1',
        'therapist-1',
        '2025-02-01'
      )
    })
  })

  describe('useConflictDetection', () => {
    it('should detect scheduling conflicts', async () => {
      const timeSlots = [{
        therapist_id: 'therapist-1',
        start_time: '2025-01-15 14:00:00',
        end_time: '2025-01-15 15:00:00',
        session_type: 'individual' as const
      }]

      const conflicts = [{
        time_slot: timeSlots[0],
        conflict_type: 'therapist_unavailable' as const,
        conflicting_availability_id: 'avail-1',
        suggestions: []
      }]

      vi.mocked(availabilityService.checkAvailabilityConflicts).mockResolvedValue({
        success: true,
        data: conflicts
      })

      const { result } = renderHook(
        () => useTherapistAvailability.useConflictDetection(),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        result.current.mutate(timeSlots)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(conflicts)
      expect(availabilityService.checkAvailabilityConflicts).toHaveBeenCalledWith(timeSlots)
    })
  })

  describe('useWorkloadMetrics', () => {
    it('should calculate workload metrics successfully', async () => {
      const workloadMetrics = {
        therapist_id: 'therapist-1',
        total_scheduled_minutes: 480,
        total_available_minutes: 2400,
        utilization_percentage: 20,
        sessions_count: 8,
        avg_session_duration: 60,
        peak_hours: ['10:00-11:00', '14:00-15:00'],
        date_range: {
          start_date: '2025-01-01',
          end_date: '2025-01-31'
        }
      }

      vi.mocked(availabilityService.calculateWorkloadMetrics).mockResolvedValue({
        success: true,
        data: workloadMetrics
      })

      const { result } = renderHook(
        () => useTherapistAvailability.useWorkloadMetrics('therapist-1', {
          start_date: '2025-01-01',
          end_date: '2025-01-31'
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(workloadMetrics)
      expect(availabilityService.calculateWorkloadMetrics).toHaveBeenCalledWith(
        'therapist-1',
        { start_date: '2025-01-01', end_date: '2025-01-31' }
      )
    })

    it('should be disabled when therapist_id is not provided', () => {
      const { result } = renderHook(
        () => useTherapistAvailability.useWorkloadMetrics('', {
          start_date: '2025-01-01',
          end_date: '2025-01-31'
        }),
        { wrapper: createWrapper() }
      )

      expect(result.current.fetchStatus).toBe('idle')
      expect(availabilityService.calculateWorkloadMetrics).not.toHaveBeenCalled()
    })
  })
})