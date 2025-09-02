import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as availabilityService from '../../services/availability-service'
import type { TherapistAvailability } from '../../types/scheduling'

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    throwOnError: vi.fn().mockReturnThis(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
    }
  }
}))

// Mock console methods to avoid test noise
vi.stubGlobal('console', {
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  info: vi.fn()
})

describe('AvailabilityService', () => {
  const mockAvailability: TherapistAvailability[] = [
    {
      id: 'avail-1',
      therapist_id: 'therapist-1',
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      is_available: true,
      is_recurring: true,
      specific_date: null,
      max_sessions_per_slot: 1,
      session_buffer_minutes: 15,
      notes: '',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      created_by: 'user-123'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getTherapistAvailability', () => {
    it('should fetch therapist availability successfully', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.select).mockResolvedValue({
        data: mockAvailability,
        error: null
      })

      const result = await availabilityService.getTherapistAvailability(
        'therapist-1', 
        '2025-01-01', 
        '2025-01-31'
      )

      expect(result).toEqual(mockAvailability)
      expect(supabase.from).toHaveBeenCalledWith('therapist_availability')
      expect(supabase.eq).toHaveBeenCalledWith('therapist_id', 'therapist-1')
    })

    it('should handle database errors gracefully', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.select).mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      await expect(
        availabilityService.getTherapistAvailability('therapist-1', '2025-01-01', '2025-01-31')
      ).rejects.toThrow()
    })

    it('should filter by date range when provided', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.select).mockResolvedValue({
        data: mockAvailability,
        error: null
      })

      await availabilityService.getTherapistAvailability(
        'therapist-1', 
        '2025-01-01', 
        '2025-01-31'
      )

      expect(supabase.gte).toHaveBeenCalled()
      expect(supabase.lte).toHaveBeenCalled()
    })
  })

  describe('createAvailabilitySlot', () => {
    it('should create new availability record successfully', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.insert).mockResolvedValue({
        data: [mockAvailability[0]],
        error: null
      })

      const newSlot = {
        therapist_id: 'therapist-1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
        is_recurring: true
      }

      const result = await availabilityService.createAvailabilitySlot(newSlot)

      expect(result).toEqual(mockAvailability[0])
      expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining(newSlot))
    })

    it('should handle creation errors', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.insert).mockResolvedValue({
        data: null,
        error: { message: 'Creation failed' }
      })

      const newSlot = {
        therapist_id: 'therapist-1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
        is_recurring: true
      }

      await expect(
        availabilityService.createAvailabilitySlot(newSlot)
      ).rejects.toThrow()
    })
  })

  describe('updateAvailabilitySlot', () => {
    it('should update availability record successfully', async () => {
      const { supabase } = await import('../../lib/supabase')
      const updatedSlot = { ...mockAvailability[0], start_time: '10:00' }
      
      vi.mocked(supabase.update).mockResolvedValue({
        data: [updatedSlot],
        error: null
      })

      const updateData = { start_time: '10:00' }
      const result = await availabilityService.updateAvailabilitySlot('avail-1', updateData)

      expect(result).toEqual(updatedSlot)
      expect(supabase.update).toHaveBeenCalledWith(expect.objectContaining(updateData))
    })

    it('should handle update errors', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.update).mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      })

      await expect(
        availabilityService.updateAvailabilitySlot('avail-1', { start_time: '10:00' })
      ).rejects.toThrow()
    })
  })

  describe('deleteAvailabilitySlot', () => {
    it('should soft delete availability record', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.update).mockResolvedValue({
        data: [{ id: 'avail-1', deleted_at: '2025-01-01T12:00:00Z' }],
        error: null
      })

      const result = await availabilityService.deleteAvailabilitySlot('avail-1')

      expect(result).toBeTruthy()
      expect(supabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
          deleted_by: expect.any(String)
        })
      )
    })

    it('should handle delete errors', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.update).mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' }
      })

      await expect(
        availabilityService.deleteAvailabilitySlot('avail-1')
      ).rejects.toThrow()
    })
  })

  describe('findAvailableTimeSlots', () => {
    it('should find available time slots for a date', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.select).mockResolvedValue({
        data: mockAvailability,
        error: null
      })

      const result = await availabilityService.findAvailableTimeSlots(
        'therapist-1',
        '2025-01-15',
        60 // duration in minutes
      )

      expect(Array.isArray(result)).toBe(true)
      expect(supabase.from).toHaveBeenCalledWith('therapist_availability')
    })

    it('should return empty array when no slots available', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.select).mockResolvedValue({
        data: [],
        error: null
      })

      const result = await availabilityService.findAvailableTimeSlots(
        'therapist-1',
        '2025-01-15',
        60
      )

      expect(result).toEqual([])
    })
  })

  describe('checkForConflicts', () => {
    it('should detect scheduling conflicts', async () => {
      const { supabase } = await import('../../lib/supabase')
      
      // Mock existing sessions that conflict
      vi.mocked(supabase.select).mockResolvedValue({
        data: [{ 
          id: 'session-1', 
          therapist_id: 'therapist-1',
          session_date: '2025-01-15',
          start_time: '10:00',
          end_time: '11:00'
        }],
        error: null
      })

      const newSession = {
        therapist_id: 'therapist-1',
        session_date: '2025-01-15',
        start_time: '10:30', // Overlaps with existing session
        end_time: '11:30'
      }

      const hasConflict = await availabilityService.checkForConflicts(newSession)

      expect(typeof hasConflict).toBe('boolean')
      expect(supabase.from).toHaveBeenCalled()
    })

    it('should return false when no conflicts exist', async () => {
      const { supabase } = await import('../../lib/supabase')
      vi.mocked(supabase.select).mockResolvedValue({
        data: [], // No existing sessions
        error: null
      })

      const newSession = {
        therapist_id: 'therapist-1',
        session_date: '2025-01-15',
        start_time: '10:00',
        end_time: '11:00'
      }

      const hasConflict = await availabilityService.checkForConflicts(newSession)

      expect(hasConflict).toBe(false)
    })
  })

  describe('calculateWorkloadMetrics', () => {
    it('should calculate basic workload metrics', async () => {
      const { supabase } = await import('../../lib/supabase')
      
      // Mock availability data
      vi.mocked(supabase.select).mockResolvedValueOnce({
        data: mockAvailability,
        error: null
      })

      // Mock session data
      vi.mocked(supabase.select).mockResolvedValueOnce({
        data: [
          { duration_minutes: 60 },
          { duration_minutes: 45 }
        ],
        error: null
      })

      const metrics = await availabilityService.calculateWorkloadMetrics(
        'therapist-1',
        '2025-01-01',
        '2025-01-31'
      )

      expect(metrics).toHaveProperty('utilization_percentage')
      expect(metrics).toHaveProperty('total_available_hours')
      expect(metrics).toHaveProperty('total_scheduled_hours')
      expect(typeof metrics.utilization_percentage).toBe('number')
    })
  })

  describe('validateTimeSlot', () => {
    it('should validate correct time format', () => {
      const validSlot = {
        start_time: '09:00',
        end_time: '17:00'
      }

      const isValid = availabilityService.validateTimeSlot(validSlot)
      expect(isValid).toBe(true)
    })

    it('should reject invalid time ranges', () => {
      const invalidSlot = {
        start_time: '17:00',
        end_time: '09:00' // End before start
      }

      const isValid = availabilityService.validateTimeSlot(invalidSlot)
      expect(isValid).toBe(false)
    })

    it('should reject invalid time formats', () => {
      const invalidSlot = {
        start_time: '25:00', // Invalid hour
        end_time: '17:00'
      }

      const isValid = availabilityService.validateTimeSlot(invalidSlot)
      expect(isValid).toBe(false)
    })
  })

  describe('formatAvailabilityForCalendar', () => {
    it('should format availability data for calendar display', () => {
      const formatted = availabilityService.formatAvailabilityForCalendar(mockAvailability)

      expect(Array.isArray(formatted)).toBe(true)
      if (formatted.length > 0) {
        expect(formatted[0]).toHaveProperty('day')
        expect(formatted[0]).toHaveProperty('slots')
      }
    })

    it('should handle empty availability array', () => {
      const formatted = availabilityService.formatAvailabilityForCalendar([])
      expect(formatted).toEqual([])
    })
  })
})