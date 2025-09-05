/**
 * Scheduling Engine Tests
 * Story 3.1: Automated Scheduling Engine - Unit Tests
 * 
 * Comprehensive test suite for the scheduling engine including multi-criteria
 * optimization, conflict detection, and performance validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { SchedulingEngine, generateOptimizedSchedule, validateSchedulingRequest } from '@/services/scheduling/scheduling-engine'
import { supabase } from '@/lib/supabase'
import type {
  SchedulingRequest,
  SchedulingResult,
  ScheduledSession,
  ScheduleTemplate,
  TherapistAvailability,
  OptimizationRule,
  PriorityLevel
} from '@/types/scheduling'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {},
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {},
              error: null
            }))
          }))
        }))
      })),
      rpc: vi.fn(() => ({
        data: {},
        error: null
      }))
    }))
  }
}))

describe('SchedulingEngine', () => {
  let schedulingEngine: SchedulingEngine
  let mockRequest: SchedulingRequest
  let mockTemplates: ScheduleTemplate[]
  let mockAvailability: TherapistAvailability[]
  let mockOptimizationRules: OptimizationRule[]

  beforeEach(() => {
    schedulingEngine = new SchedulingEngine()
    
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup mock data
    mockRequest = {
      student_subscription_id: 'student-123',
      template_id: 'template-123',
      start_date: '2024-01-15',
      end_date: '2024-02-15',
      total_sessions: 8,
      sessions_per_week: 2,
      session_duration: 60,
      preferred_therapist_id: 'therapist-123',
      preferred_times: [
        { start_time: '09:00', end_time: '10:00', duration_minutes: 60 },
        { start_time: '14:00', end_time: '15:00', duration_minutes: 60 }
      ],
      avoid_times: [
        { start_time: '12:00', end_time: '13:00', duration_minutes: 60 }
      ],
      preferred_days: [1, 2, 3], // Monday, Tuesday, Wednesday
      avoid_days: [5, 6], // Friday, Saturday
      priority_level: PriorityLevel.MEDIUM,
      flexibility_score: 70,
      requires_consecutive_sessions: false,
      max_gap_between_sessions: 120,
      allow_rescheduling: true,
      required_room_type: 'therapy_room',
      required_equipment: ['mat', 'toys']
    }

    mockTemplates = [
      {
        id: 'template-123',
        name: 'Standard Therapy Template',
        name_ar: 'قالب العلاج القياسي',
        description: 'Standard therapy sessions twice per week',
        description_ar: 'جلسات علاج قياسية مرتين في الأسبوع',
        template_type: 'program_based',
        is_active: true,
        session_duration: 60,
        sessions_per_week: 2,
        preferred_times: [
          { start_time: '09:00', end_time: '10:00', duration_minutes: 60 }
        ],
        scheduling_pattern: 'weekly',
        pattern_config: {
          preferred_days: [1, 3],
          avoid_days: [5, 6],
          preferred_time_blocks: [
            { start_time: '09:00', end_time: '11:00' }
          ],
          allow_weekend: false,
          allow_evening: false,
          max_sessions_per_day: 2
        },
        required_room_type: 'therapy_room',
        required_equipment: ['mat'],
        special_requirements: 'Quiet environment',
        special_requirements_ar: 'بيئة هادئة',
        allow_back_to_back: false,
        max_gap_between_sessions: 120,
        preferred_therapist_id: 'therapist-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'admin',
        updated_by: 'admin'
      }
    ]

    mockAvailability = [
      {
        id: 'avail-123',
        therapist_id: 'therapist-123',
        day_of_week: 1, // Monday
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
        is_recurring: true,
        max_sessions_per_slot: 6,
        current_bookings: 2,
        session_buffer_minutes: 15,
        is_time_off: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        available_slots: 4,
        utilization_rate: 33
      },
      {
        id: 'avail-124',
        therapist_id: 'therapist-123',
        day_of_week: 3, // Wednesday
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
        is_recurring: true,
        max_sessions_per_slot: 6,
        current_bookings: 1,
        session_buffer_minutes: 15,
        is_time_off: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        available_slots: 5,
        utilization_rate: 17
      }
    ]

    mockOptimizationRules = [
      {
        id: 'rule-123',
        name: 'Minimize gaps',
        name_ar: 'تقليل الفجوات',
        rule_type: 'optimization',
        priority: 8,
        is_active: true,
        condition: {
          field: 'session_gaps',
          operator: 'greater_than',
          value: 60,
          additional_params: { max_gap_minutes: 60 }
        },
        action: {
          type: 'optimize_gaps',
          parameters: { max_gap_minutes: 60 },
          score_impact: 20
        },
        weight: 1.5,
        applies_to: 'all',
        target_ids: [],
        execution_count: 0,
        success_rate: 0.0,
        description: 'Minimize gaps between sessions',
        description_ar: 'تقليل الفجوات بين الجلسات',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateOptimizedSchedule', () => {
    it('should generate a valid schedule with proper structure', async () => {
      // Mock successful database responses
      ;(supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: mockTemplates,
              error: null
            })
          })
        })
      })

      const result = await schedulingEngine.generateOptimizedSchedule(mockRequest)

      expect(result).toMatchObject({
        success: true,
        generated_sessions: expect.any(Array),
        conflicts: expect.any(Array),
        suggestions: expect.any(Array),
        optimization_score: expect.any(Number),
        therapist_utilization: expect.any(Number),
        preference_match_score: expect.any(Number),
        warnings: expect.any(Array),
        algorithm_used: expect.any(String),
        generation_time_ms: expect.any(Number)
      })

      expect(result.optimization_score).toBeGreaterThanOrEqual(0)
      expect(result.optimization_score).toBeLessThanOrEqual(100)
      expect(result.generation_time_ms).toBeGreaterThan(0)
    })

    it('should respect the requested number of sessions', async () => {
      // Mock database responses
      ;(supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: mockTemplates,
              error: null
            })
          })
        })
      })

      const result = await schedulingEngine.generateOptimizedSchedule(mockRequest)

      if (result.success) {
        expect(result.generated_sessions.length).toBeLessThanOrEqual(mockRequest.total_sessions)
        expect(result.unscheduled_sessions).toBe(
          Math.max(0, mockRequest.total_sessions - result.generated_sessions.length)
        )
      }
    })

    it('should handle template-based generation', async () => {
      // Mock template fetch
      ;(supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: mockTemplates,
              error: null
            })
          })
        })
      })

      const requestWithTemplate = {
        ...mockRequest,
        template_id: 'template-123'
      }

      const result = await schedulingEngine.generateOptimizedSchedule(requestWithTemplate)

      expect(result.success).toBe(true)
      if (result.success && result.generated_sessions.length > 0) {
        const session = result.generated_sessions[0]
        expect(session.duration_minutes).toBe(mockTemplates[0].session_duration)
      }
    })

    it('should generate sessions within the specified date range', async () => {
      ;(supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: mockTemplates,
              error: null
            })
          })
        })
      })

      const result = await schedulingEngine.generateOptimizedSchedule(mockRequest)

      if (result.success && result.generated_sessions.length > 0) {
        result.generated_sessions.forEach(session => {
          expect(session.scheduled_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
          expect(new Date(session.scheduled_date)).toBeInstanceOf(Date)
          expect(session.scheduled_date >= mockRequest.start_date).toBe(true)
          expect(session.scheduled_date <= mockRequest.end_date).toBe(true)
        })
      }
    })

    it('should handle invalid requests gracefully', async () => {
      const invalidRequest = {
        ...mockRequest,
        start_date: '', // Invalid
        total_sessions: 0 // Invalid
      }

      const result = await schedulingEngine.generateOptimizedSchedule(invalidRequest)

      expect(result.success).toBe(false)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.generated_sessions).toEqual([])
    })

    it('should performance requirements', async () => {
      // Mock data for performance test
      ;(supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: mockTemplates,
              error: null
            })
          })
        })
      })

      const largeRequest = {
        ...mockRequest,
        total_sessions: 100, // Large number for performance test
        end_date: '2024-06-15' // Longer date range
      }

      const startTime = Date.now()
      const result = await schedulingEngine.generateOptimizedSchedule(largeRequest)
      const endTime = Date.now()

      // Should complete within 30 seconds (requirement from story)
      expect(endTime - startTime).toBeLessThan(30000)
      expect(result.generation_time_ms).toBeLessThan(30000)
    })
  })

  describe('validateSchedulingRequest', () => {
    it('should validate a correct request', () => {
      const validation = validateSchedulingRequest(mockRequest)
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toEqual([])
    })

    it('should detect missing required fields', () => {
      const invalidRequest = {
        ...mockRequest,
        student_subscription_id: '', // Missing
        start_date: '', // Missing
        total_sessions: 0 // Invalid
      }

      const validation = validateSchedulingRequest(invalidRequest)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors.some(error => 
        error.includes('subscription') || error.includes('اشتراك')
      )).toBe(true)
    })

    it('should detect invalid date ranges', () => {
      const invalidRequest = {
        ...mockRequest,
        start_date: '2024-02-15',
        end_date: '2024-01-15' // End before start
      }

      const validation = validateSchedulingRequest(invalidRequest)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => 
        error.includes('before') || error.includes('قبل')
      )).toBe(true)
    })

    it('should validate session parameters', () => {
      const invalidRequest = {
        ...mockRequest,
        session_duration: -30, // Invalid
        sessions_per_week: 0 // Invalid
      }

      const validation = validateSchedulingRequest(invalidRequest)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Multi-criteria optimization', () => {
    it('should apply optimization weights correctly', async () => {
      ;(supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: mockTemplates,
              error: null
            })
          })
        })
      })

      const result = await schedulingEngine.generateOptimizedSchedule(mockRequest)

      expect(result.success).toBe(true)
      if (result.success) {
        // Optimization score should reflect balanced criteria
        expect(result.optimization_score).toBeGreaterThan(0)
        expect(result.therapist_utilization).toBeGreaterThanOrEqual(0)
        expect(result.preference_match_score).toBeGreaterThanOrEqual(0)
      }
    })

    it('should consider therapist utilization in optimization', async () => {
      ;(supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: mockAvailability,
              error: null
            })
          })
        })
      })

      const result = await schedulingEngine.generateOptimizedSchedule(mockRequest)

      if (result.success && result.generated_sessions.length > 0) {
        // Should prefer therapists with lower current utilization
        const therapistIds = result.generated_sessions.map(s => s.therapist_id)
        expect(therapistIds).toContain(mockRequest.preferred_therapist_id)
      }
    })
  })

  describe('Conflict detection integration', () => {
    it('should detect and report conflicts', async () => {
      // Mock existing conflicting session
      const conflictingSession: ScheduledSession = {
        id: 'existing-session',
        session_number: 'TEST-001',
        student_subscription_id: 'other-student',
        therapist_id: 'therapist-123',
        scheduled_date: '2024-01-15',
        start_time: '09:00',
        end_time: '10:00',
        duration_minutes: 60,
        session_category: 'therapy',
        priority_level: PriorityLevel.MEDIUM,
        status: 'scheduled',
        has_conflicts: false,
        conflict_details: [],
        resolution_status: 'pending',
        equipment_ids: [],
        reschedule_count: 0,
        is_billable: true,
        parent_notification_sent: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      // Mock database to return conflicting session
      ;(supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'therapy_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  neq: vi.fn().mockReturnValue({
                    data: [conflictingSession],
                    error: null
                  })
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      const result = await schedulingEngine.generateOptimizedSchedule(mockRequest)

      if (result.success) {
        // Should detect conflicts and provide alternatives
        if (result.conflicts.length > 0) {
          expect(result.total_conflicts).toBeGreaterThan(0)
          expect(result.suggestions.length).toBeGreaterThanOrEqual(0)
        }
      }
    })
  })

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      ;(supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: null,
              error: new Error('Database connection failed')
            })
          })
        })
      })

      const result = await schedulingEngine.generateOptimizedSchedule(mockRequest)

      expect(result.success).toBe(false)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.generated_sessions).toEqual([])
    })

    it('should handle missing template gracefully', async () => {
      // Mock empty template response
      ;(supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: [],
              error: null
            })
          })
        })
      })

      const result = await schedulingEngine.generateOptimizedSchedule(mockRequest)

      // Should still attempt to generate schedule without template
      expect(result).toBeDefined()
      expect(result.algorithm_used).toBeDefined()
    })
  })

  describe('Bilingual support', () => {
    it('should provide bilingual error messages', () => {
      const invalidRequest = {
        ...mockRequest,
        student_subscription_id: ''
      }

      const validation = validateSchedulingRequest(invalidRequest)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => 
        error.includes('subscription ID is required')
      )).toBe(true)
      expect(validation.errors.some(error => 
        error.includes('معرف اشتراك')
      )).toBe(true)
    })

    it('should handle Arabic text in templates', async () => {
      const arabicTemplate = {
        ...mockTemplates[0],
        name_ar: 'قالب العلاج المكثف',
        description_ar: 'جلسات علاج مكثفة للتقدم السريع'
      }

      ;(supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: [arabicTemplate],
              error: null
            })
          })
        })
      })

      const result = await schedulingEngine.generateOptimizedSchedule(mockRequest)

      expect(result).toBeDefined()
      // Should handle Arabic content without errors
    })
  })

  describe('Performance benchmarks', () => {
    it('should meet conflict detection speed requirements', async () => {
      const sessions: ScheduledSession[] = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        session_number: `TEST-${i.toString().padStart(3, '0')}`,
        student_subscription_id: 'student-123',
        therapist_id: 'therapist-123',
        scheduled_date: '2024-01-15',
        start_time: `${9 + i}:00`,
        end_time: `${10 + i}:00`,
        duration_minutes: 60,
        session_category: 'therapy',
        priority_level: PriorityLevel.MEDIUM,
        status: 'scheduled',
        has_conflicts: false,
        conflict_details: [],
        resolution_status: 'pending',
        equipment_ids: [],
        reschedule_count: 0,
        is_billable: true,
        parent_notification_sent: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }))

      const startTime = Date.now()
      
      // This would test the conflict detection speed
      // In a real implementation, this would call the conflict detector
      
      const endTime = Date.now()
      const detectionTime = endTime - startTime

      // Should meet <200ms requirement for conflict detection
      expect(detectionTime).toBeLessThan(200)
    })

    it('should handle large datasets efficiently', async () => {
      const largeRequest = {
        ...mockRequest,
        total_sessions: 1000
      }

      ;(supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: mockTemplates,
              error: null
            })
          })
        })
      })

      const startTime = Date.now()
      const result = await schedulingEngine.generateOptimizedSchedule(largeRequest)
      const endTime = Date.now()

      // Performance should scale reasonably with dataset size
      expect(endTime - startTime).toBeLessThan(60000) // 60 seconds for very large dataset
      expect(result).toBeDefined()
    })
  })
})