import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SchedulingIntegrationService } from '@/services/scheduling-integration-service'
import type { ScheduledSession, Student, Therapist, TherapyRoom } from '@/types/scheduling'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  update: vi.fn(() => Promise.resolve({ data: null, error: null })),
  delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

describe('SchedulingIntegrationService', () => {
  let integrationService: SchedulingIntegrationService
  
  const mockSessionData: Partial<ScheduledSession> = {
    student_id: 'student-1',
    therapist_id: 'therapist-1',
    room_id: 'room-1',
    session_date: '2025-09-01',
    start_time: '09:00',
    end_time: '10:00',
    session_type: 'speech_therapy',
    session_category: 'individual',
    duration_minutes: 60
  }

  const mockStudent: Student = {
    id: 'student-1',
    name_ar: 'أحمد محمد',
    name_en: 'Ahmed Mohamed',
    age: 8,
    condition: 'autism_spectrum_disorder',
    enrollment_date: '2025-01-01',
    parent_phone: '+966501234567',
    parent_email: 'parent@example.com'
  }

  const mockTherapist: Therapist = {
    id: 'therapist-1',
    name_ar: 'د. سارة أحمد',
    name_en: 'Dr. Sarah Ahmed',
    specializations: ['speech_therapy', 'language_development'],
    certifications: ['SLP', 'ASHA'],
    license_number: 'SLP-2025-001',
    hire_date: '2024-01-01'
  }

  const mockRoom: TherapyRoom = {
    id: 'room-1',
    name_ar: 'غرفة النطق 1',
    name_en: 'Speech Room 1',
    room_code: 'SPR001',
    capacity: 4,
    floor_number: 2,
    is_active: true,
    supported_session_types: ['speech_therapy', 'language_development'],
    available_equipment: ['microphone', 'computer', 'speech_software']
  }

  beforeEach(() => {
    integrationService = SchedulingIntegrationService.getInstance()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('returns the same instance when called multiple times', () => {
      const instance1 = SchedulingIntegrationService.getInstance()
      const instance2 = SchedulingIntegrationService.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(integrationService)
    })
  })

  describe('Student Enrollment System Integration', () => {
    beforeEach(() => {
      // Mock successful enrollment validation
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          id: 'enrollment-1',
          student_id: 'student-1',
          enrollment_status: 'active',
          students: mockStudent,
          therapy_plans: {
            id: 'plan-1',
            name_ar: 'خطة النطق',
            name_en: 'Speech Therapy Plan',
            category: 'individual',
            included_session_types: ['speech_therapy']
          }
        },
        error: null
      })
    })

    it('validates student enrollment successfully', async () => {
      const result = await integrationService.syncWithEnrollmentSystem(mockSessionData)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('enrollment')
      expect(result.data).toHaveProperty('therapyPlan')
      expect(result.warnings).toHaveLength(0)
    })

    it('handles invalid student enrollment', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Student not found' }
      })

      const result = await integrationService.syncWithEnrollmentSystem(mockSessionData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Student not found or enrollment not active')
    })

    it('checks therapy plan compatibility', async () => {
      // Mock plan with incompatible session type
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          id: 'enrollment-1',
          student_id: 'student-1',
          enrollment_status: 'active',
          students: mockStudent,
          therapy_plans: {
            id: 'plan-1',
            category: 'group',
            included_session_types: ['occupational_therapy'] // Different from session type
          }
        },
        error: null
      })

      const result = await integrationService.syncWithEnrollmentSystem(mockSessionData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not compatible with student\'s therapy plan')
    })

    it('updates enrollment session counts', async () => {
      const result = await integrationService.syncWithEnrollmentSystem(mockSessionData)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('sessionCounts')
      expect(result.data).toHaveProperty('billingImpact')
    })
  })

  describe('Therapist Availability System Integration', () => {
    beforeEach(() => {
      // Mock therapist availability
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          id: 'availability-1',
          therapist_id: 'therapist-1',
          available_date: '2025-09-01',
          start_time: '08:00',
          end_time: '18:00',
          is_available: true,
          therapists: mockTherapist
        },
        error: null
      })
    })

    it('validates therapist availability successfully', async () => {
      const result = await integrationService.syncWithTherapistSystem(mockSessionData)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('therapist')
      expect(result.data).toHaveProperty('availability')
      expect(result.data?.therapist).toEqual(mockTherapist)
    })

    it('handles therapist unavailability', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No availability found' }
      })

      const result = await integrationService.syncWithTherapistSystem(mockSessionData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Therapist not available at requested time')
    })

    it('validates therapist specialization', async () => {
      // Mock therapist without speech therapy specialization
      const incompatibleTherapist = {
        ...mockTherapist,
        specializations: ['occupational_therapy', 'physical_therapy']
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            id: 'availability-1',
            therapist_id: 'therapist-1',
            available_date: '2025-09-01',
            start_time: '08:00',
            end_time: '18:00',
            is_available: true,
            therapists: incompatibleTherapist
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: incompatibleTherapist,
          error: null
        })

      const result = await integrationService.syncWithTherapistSystem(mockSessionData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not qualified for this session type')
    })

    it('updates therapist workload metrics', async () => {
      const result = await integrationService.syncWithTherapistSystem(mockSessionData)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('workload')
      expect(result.data).toHaveProperty('utilizationRate')
    })
  })

  describe('Room Management System Integration', () => {
    beforeEach(() => {
      // Mock room availability
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [mockRoom],
        error: null
      })
    })

    it('finds optimal room for session', async () => {
      const result = await integrationService.syncWithRoomSystem(mockSessionData)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('room')
      expect(result.data?.room).toEqual(mockRoom)
    })

    it('handles no suitable rooms available', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await integrationService.syncWithRoomSystem(mockSessionData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No suitable rooms available')
    })

    it('validates room availability for time slot', async () => {
      // Mock conflicting sessions
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [mockRoom],
        error: null
      })

      const result = await integrationService.syncWithRoomSystem(mockSessionData)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('booking')
    })

    it('books room and equipment successfully', async () => {
      const sessionWithEquipment = {
        ...mockSessionData,
        required_equipment: ['microphone', 'computer']
      }

      const result = await integrationService.syncWithRoomSystem(sessionWithEquipment)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('equipment')
      expect(result.data?.equipment).toHaveLength(2)
    })
  })

  describe('Billing System Integration', () => {
    beforeEach(() => {
      // Mock billing calculation success
      vi.spyOn(integrationService as any, 'calculateSessionBilling')
        .mockResolvedValue({
          success: true,
          amount: 150,
          details: { baseRate: 150, duration: 60 },
          warnings: []
        })

      // Mock payment validation success
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          credit_balance: 500,
          payment_status: 'current'
        },
        error: null
      })
    })

    it('calculates session billing correctly', async () => {
      const result = await integrationService.syncWithBillingSystem(mockSessionData)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('amount')
      expect(result.data?.amount).toBe(150)
    })

    it('validates payment status and credit balance', async () => {
      const result = await integrationService.syncWithBillingSystem(mockSessionData)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('creditBalance')
      expect(result.data?.creditBalance).toBe(500)
    })

    it('handles insufficient credit balance', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          credit_balance: 50, // Less than session cost
          payment_status: 'overdue'
        },
        error: null
      })

      const result = await integrationService.syncWithBillingSystem(mockSessionData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient credit balance')
    })

    it('creates billing record for session', async () => {
      const result = await integrationService.syncWithBillingSystem(mockSessionData)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('billingRecord')
      expect(result.data?.billingRecord).toHaveProperty('id')
    })
  })

  describe('Comprehensive Integration Validation', () => {
    beforeEach(() => {
      // Mock all systems success
      vi.spyOn(integrationService, 'syncWithEnrollmentSystem')
        .mockResolvedValue({ success: true, data: {}, warnings: [] })
      vi.spyOn(integrationService, 'syncWithTherapistSystem')
        .mockResolvedValue({ success: true, data: {}, warnings: [] })
      vi.spyOn(integrationService, 'syncWithRoomSystem')
        .mockResolvedValue({ success: true, data: {}, warnings: [] })
      vi.spyOn(integrationService, 'syncWithBillingSystem')
        .mockResolvedValue({ success: true, data: {}, warnings: [] })
    })

    it('validates session against all systems successfully', async () => {
      const result = await integrationService.validateSessionIntegration(mockSessionData)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('enrollment')
      expect(result.data).toHaveProperty('therapist')
      expect(result.data).toHaveProperty('room')
      expect(result.data).toHaveProperty('billing')
    })

    it('fails validation if any system fails', async () => {
      // Make enrollment system fail
      vi.mocked(integrationService.syncWithEnrollmentSystem)
        .mockResolvedValue({ 
          success: false, 
          error: 'Student not enrolled', 
          warnings: [], 
          data: null 
        })

      const result = await integrationService.validateSessionIntegration(mockSessionData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Student not enrolled')
    })

    it('handles multiple system failures', async () => {
      // Make multiple systems fail
      vi.mocked(integrationService.syncWithEnrollmentSystem)
        .mockResolvedValue({ 
          success: false, 
          error: 'Enrollment error', 
          warnings: [], 
          data: null 
        })
      vi.mocked(integrationService.syncWithBillingSystem)
        .mockResolvedValue({ 
          success: false, 
          error: 'Billing error', 
          warnings: [], 
          data: null 
        })

      const result = await integrationService.validateSessionIntegration(mockSessionData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Enrollment error')
      expect(result.error).toContain('Billing error')
    })

    it('combines warnings from all systems', async () => {
      // Add warnings to each system
      vi.mocked(integrationService.syncWithEnrollmentSystem)
        .mockResolvedValue({ 
          success: true, 
          data: {}, 
          warnings: ['Enrollment warning'] 
        })
      vi.mocked(integrationService.syncWithTherapistSystem)
        .mockResolvedValue({ 
          success: true, 
          data: {}, 
          warnings: ['Therapist warning'] 
        })

      const result = await integrationService.validateSessionIntegration(mockSessionData)

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Enrollment warning')
      expect(result.warnings).toContain('Therapist warning')
    })
  })

  describe('Conflict Resolution', () => {
    const originalSession: ScheduledSession = {
      id: 'session-1',
      student_id: 'student-1',
      therapist_id: 'therapist-1',
      room_id: 'room-1',
      session_date: '2025-09-01',
      start_time: '09:00',
      end_time: '10:00',
      session_type: 'speech_therapy',
      session_category: 'individual',
      session_status: 'scheduled',
      duration_minutes: 60,
      created_at: '2025-09-01T08:00:00Z',
      updated_at: '2025-09-01T08:00:00Z'
    }

    const proposedChanges = {
      start_time: '11:00',
      end_time: '12:00',
      therapist_id: 'therapist-2'
    }

    beforeEach(() => {
      // Mock conflict analysis
      vi.spyOn(integrationService as any, 'analyzeScheduleChangeImpact')
        .mockResolvedValue({
          hasBlockingConflicts: false,
          blockingConflicts: [],
          conflicts: [],
          alternatives: [],
          warnings: []
        })
    })

    it('resolves scheduling conflicts successfully', async () => {
      const result = await integrationService.resolveSchedulingConflicts(
        originalSession,
        proposedChanges
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('resolvedConflicts')
    })

    it('identifies blocking conflicts', async () => {
      vi.mocked(integrationService as any)['analyzeScheduleChangeImpact']
        .mockResolvedValue({
          hasBlockingConflicts: true,
          blockingConflicts: ['Therapist not available', 'Room booked'],
          conflicts: [],
          alternatives: [],
          warnings: []
        })

      const result = await integrationService.resolveSchedulingConflicts(
        originalSession,
        proposedChanges
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Therapist not available')
      expect(result.error).toContain('Room booked')
    })

    it('provides alternative suggestions', async () => {
      vi.mocked(integrationService as any)['analyzeScheduleChangeImpact']
        .mockResolvedValue({
          hasBlockingConflicts: true,
          blockingConflicts: ['Schedule conflict'],
          conflicts: [],
          alternatives: [
            { description: 'Try 2:00 PM slot' },
            { description: 'Use Room 2' }
          ],
          warnings: []
        })

      const result = await integrationService.resolveSchedulingConflicts(
        originalSession,
        proposedChanges
      )

      expect(result.success).toBe(false)
      expect(result.data).toHaveProperty('suggestedAlternatives')
      expect(result.data?.suggestedAlternatives).toHaveLength(2)
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      mockSupabaseClient.single.mockRejectedValue(new Error('Network error'))

      const result = await integrationService.syncWithEnrollmentSystem(mockSessionData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('handles missing required data', async () => {
      const incompleteSessionData = { student_id: 'student-1' }

      const result = await integrationService.syncWithEnrollmentSystem(incompleteSessionData)

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('handles database errors', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: '500' }
      })

      const result = await integrationService.syncWithEnrollmentSystem(mockSessionData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Student not found or enrollment not active')
    })
  })

  describe('Performance Considerations', () => {
    it('handles concurrent integration requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        integrationService.validateSessionIntegration(mockSessionData)
      )

      const results = await Promise.all(promises)
      
      // All should succeed (mocked)
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
    })

    it('times out long-running operations', async () => {
      // Mock a slow operation
      vi.spyOn(integrationService, 'syncWithEnrollmentSystem')
        .mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            success: true,
            data: {},
            warnings: []
          }), 10000))
        )

      // This would timeout in a real implementation
      const startTime = Date.now()
      await integrationService.validateSessionIntegration(mockSessionData)
      const endTime = Date.now()

      // Should not take more than reasonable time (this is mocked so it will be fast)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})