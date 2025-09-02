import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  analyzeModificationImpact,
  validateModificationRequest
} from '@/services/program-modification-impact-service'
import type { ModificationType } from '@/types/scheduling'

// Mock Supabase with proper mocking structure
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn()
          }))
        })),
        neq: vi.fn(() => ({
          eq: vi.fn()
        }))
      })),
      gte: vi.fn(() => ({
        lte: vi.fn(() => ({
          order: vi.fn()
        }))
      }))
    }))
  }))
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

describe('Program Modification Impact Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validateModificationRequest', () => {
    it('should validate a valid modification request', async () => {
      const validRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 3,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await validateModificationRequest(validRequest)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject request without enrollment_id', async () => {
      const invalidRequest = {
        enrollment_id: '',
        modification_type: ['frequency_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 3,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await validateModificationRequest(invalidRequest)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('رقم التسجيل مطلوب / Enrollment ID is required')
    })

    it('should reject request without modification types', async () => {
      const invalidRequest = {
        enrollment_id: 'enroll-123',
        modification_type: [] as ModificationType[],
        proposed_changes: {
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await validateModificationRequest(invalidRequest)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('نوع التعديل مطلوب / Modification type is required')
    })

    it('should reject request with past effective date', async () => {
      const invalidRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 3,
          effective_date: '2020-01-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await validateModificationRequest(invalidRequest)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('تاريخ التنفيذ يجب أن يكون في المستقبل / Effective date must be in the future')
    })

    it('should validate frequency change requirements', async () => {
      const invalidRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 0,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await validateModificationRequest(invalidRequest)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('التكرار الجديد مطلوب ويجب أن يكون أكبر من صفر / New frequency is required and must be greater than zero')
    })

    it('should validate duration change requirements', async () => {
      const invalidRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['duration_change'] as ModificationType[],
        proposed_changes: {
          new_duration: -30,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await validateModificationRequest(invalidRequest)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('المدة الجديدة مطلوبة ويجب أن تكون أكبر من صفر / New duration is required and must be greater than zero')
    })

    it('should validate therapist change requirements', async () => {
      const invalidRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['therapist_change'] as ModificationType[],
        proposed_changes: {
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await validateModificationRequest(invalidRequest)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('معرف المعالج الجديد مطلوب / New therapist ID is required')
    })

    it('should handle multiple validation errors', async () => {
      const invalidRequest = {
        enrollment_id: '',
        modification_type: [] as ModificationType[],
        proposed_changes: {
          effective_date: '2020-01-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await validateModificationRequest(invalidRequest)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.errors).toContain('رقم التسجيل مطلوب / Enrollment ID is required')
      expect(result.errors).toContain('نوع التعديل مطلوب / Modification type is required')
      expect(result.errors).toContain('تاريخ التنفيذ يجب أن يكون في المستقبل / Effective date must be in the future')
    })
  })

  describe('analyzeModificationImpact', () => {
    const mockEnrollment = {
      id: 'enroll-123',
      student_id: 'student-123',
      therapy_plan_id: 'plan-123',
      frequency_per_week: 2,
      session_duration: 60,
      primary_therapist_id: 'therapist-123',
      session_rate: 150,
      students: { id: 'student-123', name_ar: 'أحمد علي', name_en: 'Ahmed Ali' },
      therapy_plans: { id: 'plan-123', name_ar: 'خطة العلاج', name_en: 'Therapy Plan' },
      scheduled_sessions: []
    }

    const mockSessions = [
      {
        id: 'session-1',
        enrollment_id: 'enroll-123',
        therapist_id: 'therapist-123',
        room_id: 'room-1',
        session_date: '2025-10-01',
        start_time: '09:00',
        end_time: '10:00'
      },
      {
        id: 'session-2',
        enrollment_id: 'enroll-123',
        therapist_id: 'therapist-123',
        room_id: 'room-1',
        session_date: '2025-10-03',
        start_time: '09:00',
        end_time: '10:00'
      }
    ]

    beforeEach(() => {
      // Mock successful enrollment fetch
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: mockEnrollment, 
              error: null 
            }),
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ 
                  data: mockSessions, 
                  error: null 
                })
              })
            })
          })
        })
      })
    })

    it('should analyze frequency change impact successfully', async () => {
      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 3,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.impact_analysis).toBeDefined()
      expect(result.data?.impact_analysis.modification_types).toContain('frequency_change')
      expect(result.data?.affected_sessions).toBeDefined()
      expect(result.data?.cost_implications).toBeDefined()
    })

    it('should analyze duration change impact successfully', async () => {
      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['duration_change'] as ModificationType[],
        proposed_changes: {
          new_duration: 90,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'short_term' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true)
      expect(result.data?.impact_analysis.modification_types).toContain('duration_change')
      expect(result.data?.cost_implications.additional_costs).toBeGreaterThan(0)
    })

    it('should analyze therapist change impact successfully', async () => {
      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['therapist_change'] as ModificationType[],
        proposed_changes: {
          new_therapist_id: 'therapist-456',
          effective_date: '2025-10-01'
        },
        analysis_scope: 'long_term' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true)
      expect(result.data?.impact_analysis.modification_types).toContain('therapist_change')
      expect(result.data?.therapist_impacts).toBeDefined()
      expect(result.data?.therapist_impacts.length).toBeGreaterThan(0)
      expect(result.data?.schedule_adjustments.some(adj => adj.adjustment_type === 'therapist_change')).toBe(true)
    })

    it('should analyze multiple modification types', async () => {
      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change', 'duration_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 3,
          new_duration: 90,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'all' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true)
      expect(result.data?.impact_analysis.modification_types).toContain('frequency_change')
      expect(result.data?.impact_analysis.modification_types).toContain('duration_change')
      expect(result.data?.timeline_impact.immediate).toBeDefined()
      expect(result.data?.timeline_impact.short_term).toBeDefined()
      expect(result.data?.timeline_impact.long_term).toBeDefined()
    })

    it('should handle enrollment not found error', async () => {
      // Mock enrollment not found
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Enrollment not found' } 
            })
          })
        })
      })

      const modificationRequest = {
        enrollment_id: 'non-existent',
        modification_type: ['frequency_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 3,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Enrollment not found')
    })

    it('should calculate impact severity correctly', async () => {
      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 5, // Large increase
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true)
      expect(result.data?.impact_analysis.overall_severity).toBeDefined()
      expect(['low', 'medium', 'high']).toContain(result.data?.impact_analysis.overall_severity)
    })

    it('should generate appropriate recommendations', async () => {
      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['therapist_change', 'location_change'] as ModificationType[],
        proposed_changes: {
          new_therapist_id: 'therapist-456',
          new_location_id: 'room-2',
          effective_date: '2025-10-01'
        },
        analysis_scope: 'all' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true)
      expect(result.data?.recommendations).toBeDefined()
      expect(result.data?.recommendations.priority).toBeDefined()
      expect(result.data?.recommendations.actions).toBeDefined()
      expect(result.data?.recommendations.alternatives).toBeDefined()
      expect(result.data?.recommendations.risks).toBeDefined()
      expect(['low', 'medium', 'high']).toContain(result.data?.recommendations.priority)
    })

    it('should calculate cost implications accurately', async () => {
      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change', 'duration_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 3, // Increase from 2
          new_duration: 90, // Increase from 60
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true)
      expect(result.data?.cost_implications).toBeDefined()
      expect(result.data?.cost_implications.additional_costs).toBeGreaterThan(0)
      expect(result.data?.cost_implications.net_impact).toBeDefined()
      expect(typeof result.data?.cost_implications.net_impact === 'number').toBe(true)
    })

    it('should handle service type changes', async () => {
      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['service_type_change'] as ModificationType[],
        proposed_changes: {
          new_service_types: ['occupational_therapy', 'speech_therapy'],
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true)
      expect(result.data?.impact_analysis.modification_types).toContain('service_type_change')
      expect(result.data?.schedule_adjustments.some(adj => adj.adjustment_type === 'service_type_change')).toBe(true)
    })

    it('should analyze location changes properly', async () => {
      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['location_change'] as ModificationType[],
        proposed_changes: {
          new_location_id: 'room-2',
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true)
      expect(result.data?.impact_analysis.modification_types).toContain('location_change')
      expect(result.data?.resource_reallocations).toBeDefined()
    })

    it('should provide stakeholder notification requirements', async () => {
      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['therapist_change'] as ModificationType[],
        proposed_changes: {
          new_therapist_id: 'therapist-456',
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true)
      expect(result.data?.impact_analysis.stakeholder_notifications_required).toBeDefined()
      expect(Array.isArray(result.data?.impact_analysis.stakeholder_notifications_required)).toBe(true)
      expect(result.data?.impact_analysis.stakeholder_notifications_required.length).toBeGreaterThan(0)
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Database connection error'))
          })
        })
      })

      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 3,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection error')
    })
  })

  describe('Impact Analysis Configuration', () => {
    it('should have proper severity thresholds', () => {
      // This test verifies that our configuration constants are properly defined
      const { IMPACT_ANALYSIS_CONFIG } = require('@/services/program-modification-impact-service')
      
      expect(IMPACT_ANALYSIS_CONFIG.severity_thresholds).toBeDefined()
      expect(IMPACT_ANALYSIS_CONFIG.severity_thresholds.low).toBeDefined()
      expect(IMPACT_ANALYSIS_CONFIG.severity_thresholds.medium).toBeDefined()
      expect(IMPACT_ANALYSIS_CONFIG.severity_thresholds.high).toBeDefined()
      
      expect(IMPACT_ANALYSIS_CONFIG.analysis_periods).toBeDefined()
      expect(IMPACT_ANALYSIS_CONFIG.analysis_periods.immediate).toBe(7)
      expect(IMPACT_ANALYSIS_CONFIG.analysis_periods.short_term).toBe(30)
      expect(IMPACT_ANALYSIS_CONFIG.analysis_periods.long_term).toBe(90)
    })

    it('should have modification impact weights', () => {
      const { IMPACT_ANALYSIS_CONFIG } = require('@/services/program-modification-impact-service')
      
      expect(IMPACT_ANALYSIS_CONFIG.modification_impact_weights).toBeDefined()
      expect(IMPACT_ANALYSIS_CONFIG.modification_impact_weights.frequency_change).toBe(0.8)
      expect(IMPACT_ANALYSIS_CONFIG.modification_impact_weights.therapist_change).toBe(0.9)
      expect(IMPACT_ANALYSIS_CONFIG.modification_impact_weights.service_type_change).toBe(1.0)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty sessions gracefully', async () => {
      // Mock empty sessions response
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: mockEnrollment, 
              error: null 
            }),
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ 
                  data: [], 
                  error: null 
                })
              })
            })
          })
        })
      })

      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 3,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true)
      expect(result.data?.affected_sessions).toHaveLength(0)
      expect(result.data?.impact_analysis.affected_session_count).toBe(0)
    })

    it('should handle invalid analysis scope', async () => {
      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 3,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'invalid_scope' as any,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true) // Should default to reasonable behavior
      expect(result.data?.timeline_impact.immediate).toBeDefined()
    })

    it('should handle null or undefined values in enrollment', async () => {
      const incompleteEnrollment = {
        id: 'enroll-123',
        student_id: null,
        therapy_plan_id: null,
        frequency_per_week: null,
        session_duration: null,
        primary_therapist_id: null,
        session_rate: null
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: incompleteEnrollment, 
              error: null 
            }),
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ 
                  data: [], 
                  error: null 
                })
              })
            })
          })
        })
      })

      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'] as ModificationType[],
        proposed_changes: {
          new_frequency: 3,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      const result = await analyzeModificationImpact(modificationRequest)

      expect(result.success).toBe(true)
      // Should handle null values gracefully
      expect(result.data?.cost_implications.additional_costs).toBeDefined()
      expect(result.data?.cost_implications.cost_savings).toBeDefined()
      expect(result.data?.cost_implications.net_impact).toBeDefined()
    })
  })
})