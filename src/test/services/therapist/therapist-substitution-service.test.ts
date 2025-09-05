import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest'
import { TherapistSubstitutionService, SubstitutionRequest } from '@/services/therapist/therapist-substitution-service'
import { TherapistWorkloadService } from '@/services/therapist/therapist-workload-service'
import { CapacityManagementService } from '@/services/therapist/capacity-management-service'
import { SchedulingService } from '@/services/scheduling/scheduling-service'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              eq: vi.fn()
            }))
          })),
          neq: vi.fn(() => ({
            single: vi.fn()
          }))
        })),
        neq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          }))
        })),
        in: vi.fn(() => ({
          eq: vi.fn()
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            eq: vi.fn()
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}))

vi.mock('@/services/therapist/therapist-workload-service')
vi.mock('@/services/therapist/capacity-management-service')
vi.mock('@/services/scheduling/scheduling-service')

describe('TherapistSubstitutionService', () => {
  let service: TherapistSubstitutionService
  let mockWorkloadService: MockedFunction<any>
  let mockCapacityService: MockedFunction<any>
  let mockSchedulingService: MockedFunction<any>

  // Mock data
  const mockSubstitutionRequest: SubstitutionRequest = {
    original_therapist_id: 'therapist-123',
    start_date: '2025-09-10',
    end_date: '2025-09-17',
    reason: 'vacation',
    reason_details: 'Annual leave',
    require_same_specialty: true,
    allow_split_assignments: true,
    notification_required: true
  }

  const mockTherapists = [
    {
      id: 'therapist-sub1',
      name_ar: 'د. سارة أحمد',
      name_en: 'Dr. Sarah Ahmed',
      specialties: ['speech_therapy', 'occupational_therapy'],
      status: 'active'
    },
    {
      id: 'therapist-sub2',
      name_ar: 'د. محمد علي',
      name_en: 'Dr. Mohammed Ali',
      specialties: ['speech_therapy'],
      status: 'active'
    }
  ]

  const mockSessions = [
    {
      id: 'session-1',
      therapist_id: 'therapist-123',
      student_id: 'student-1',
      scheduled_date: '2025-09-11',
      scheduled_time: '10:00',
      status: 'scheduled'
    },
    {
      id: 'session-2',
      therapist_id: 'therapist-123',
      student_id: 'student-2',
      scheduled_date: '2025-09-12',
      scheduled_time: '14:00',
      status: 'scheduled'
    },
    {
      id: 'session-3',
      therapist_id: 'therapist-123',
      student_id: 'student-3',
      scheduled_date: '2025-09-15',
      scheduled_time: '11:00',
      status: 'scheduled'
    }
  ]

  const mockOriginalTherapist = {
    id: 'therapist-123',
    name_ar: 'د. أحمد محمد',
    name_en: 'Dr. Ahmed Mohammed',
    specialties: ['speech_therapy'],
    status: 'active'
  }

  const mockWorkload = {
    therapist_id: 'therapist-sub1',
    weekly_hours: 30,
    utilization_percentage: 75,
    capacity_remaining: 10,
    active_students: 18
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mocks
    mockWorkloadService = vi.mocked(TherapistWorkloadService)
    mockCapacityService = vi.mocked(CapacityManagementService)
    mockSchedulingService = vi.mocked(SchedulingService)
    
    service = new TherapistSubstitutionService()
    
    // Setup default mock implementations
    mockWorkloadService.prototype.calculateWorkload = vi.fn().mockResolvedValue({
      success: true,
      workload: mockWorkload,
      message: 'Workload calculated successfully'
    })
  })

  describe('findSubstitutes', () => {
    it('should find substitute therapists successfully', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      // Mock sessions query
      const mockSessionsQuery = {
        data: mockSessions,
        error: null
      }
      
      // Mock therapist queries
      const mockTherapistQuery = {
        data: mockOriginalTherapist,
        error: null
      }
      
      const mockAvailableTherapistsQuery = {
        data: mockTherapists,
        error: null
      }
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve(mockSessionsQuery))
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockTherapistQuery))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve(mockAvailableTherapistsQuery))
            }))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.findSubstitutes(mockSubstitutionRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.candidates).toBeDefined()
      expect(result.candidates?.length).toBeGreaterThan(0)
      
      const firstCandidate = result.candidates?.[0]
      expect(firstCandidate?.therapist_id).toBeDefined()
      expect(firstCandidate?.availability_score).toBeGreaterThanOrEqual(0)
      expect(firstCandidate?.compatibility_score).toBeGreaterThanOrEqual(0)
    })

    it('should prioritize therapists with matching specialties', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: mockSessions, error: null }))
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockOriginalTherapist, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve({ data: mockTherapists, error: null }))
            }))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.findSubstitutes({
        ...mockSubstitutionRequest,
        require_same_specialty: true
      })

      // Assert
      expect(result.success).toBe(true)
      
      const candidatesWithSpecialty = result.candidates?.filter(c => c.specialties_match)
      expect(candidatesWithSpecialty?.length).toBeGreaterThan(0)
      
      // Candidates with matching specialties should have higher compatibility scores
      if (result.candidates && result.candidates.length > 1) {
        const matchingCandidate = result.candidates.find(c => c.specialties_match)
        const nonMatchingCandidate = result.candidates.find(c => !c.specialties_match)
        
        if (matchingCandidate && nonMatchingCandidate) {
          expect(matchingCandidate.compatibility_score).toBeGreaterThan(
            nonMatchingCandidate.compatibility_score
          )
        }
      }
    })

    it('should handle no affected sessions', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        }))
      }))
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.findSubstitutes(mockSubstitutionRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.candidates).toEqual([])
      expect(result.message).toContain('No sessions affected')
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: new Error('Database error') 
                }))
              }))
            }))
          }))
        }))
      }))
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.findSubstitutes(mockSubstitutionRequest)

      // Assert
      expect(result.success).toBe(true) // Returns empty candidates on error
      expect(result.candidates).toEqual([])
    })

    it('should calculate workload impact correctly', async () => {
      // Arrange
      const highWorkload = {
        ...mockWorkload,
        utilization_percentage: 90,
        capacity_remaining: 4
      }
      
      mockWorkloadService.prototype.calculateWorkload = vi.fn().mockResolvedValue({
        success: true,
        workload: highWorkload,
        message: 'Workload calculated successfully'
      })

      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: mockSessions, error: null }))
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockOriginalTherapist, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve({ data: mockTherapists, error: null }))
            }))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.findSubstitutes(mockSubstitutionRequest)

      // Assert
      expect(result.success).toBe(true)
      
      const firstCandidate = result.candidates?.[0]
      expect(firstCandidate?.availability_score).toBe(10) // 100 - 90 (utilization)
      expect(firstCandidate?.workload_impact).toBeGreaterThan(50) // High impact due to low capacity
    })
  })

  describe('createSubstitutionPlan', () => {
    it('should create substitution plan successfully', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      // Mock queries for sessions and therapists
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: mockSessions, error: null }))
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockOriginalTherapist, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve({ data: mockTherapists, error: null }))
            }))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { name_ar: 'طالب', name_en: 'Student' }, 
                error: null 
              }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.createSubstitutionPlan(mockSubstitutionRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.plan).toBeDefined()
      expect(result.plan?.plan_id).toBeDefined()
      expect(result.plan?.status).toBe('draft')
      expect(result.plan?.total_sessions_affected).toBe(mockSessions.length)
      expect(result.plan?.assignments).toBeDefined()
      expect(result.plan?.notifications).toBeDefined()
      expect(result.plan?.rollback_plan).toBeDefined()
    })

    it('should handle pre-selected substitutes', async () => {
      // Arrange
      const selectedSubstitutes = ['therapist-sub1', 'therapist-sub2']
      
      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: mockSessions, error: null }))
                }))
              }))
            }))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: mockTherapists[0], 
                error: null 
              }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.createSubstitutionPlan(
        mockSubstitutionRequest,
        selectedSubstitutes
      )

      // Assert
      expect(result.success).toBe(true)
      expect(result.plan).toBeDefined()
      
      // Should use the selected substitutes
      const assignedTherapists = result.plan?.assignments.map(a => a.substitute_therapist_id)
      expect(assignedTherapists).toContain('therapist-sub1')
    })

    it('should calculate disruption score', async () => {
      // Arrange - Create scenario with some unassigned sessions
      const supabase = await import('@/lib/supabase')
      
      const limitedTherapists = [mockTherapists[0]] // Only one substitute available
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: mockSessions, error: null }))
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockOriginalTherapist, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve({ data: limitedTherapists, error: null }))
            }))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { name_ar: 'طالب', name_en: 'Student' }, 
                error: null 
              }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.createSubstitutionPlan(mockSubstitutionRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.plan?.disruption_score).toBeDefined()
      expect(result.plan?.disruption_score).toBeGreaterThanOrEqual(0)
      expect(result.plan?.disruption_score).toBeLessThanOrEqual(100)
    })

    it('should create notification plan', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: mockSessions, error: null }))
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockOriginalTherapist, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve({ data: mockTherapists, error: null }))
            }))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { name_ar: 'طالب', name_en: 'Student' }, 
                error: null 
              }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.createSubstitutionPlan({
        ...mockSubstitutionRequest,
        notification_required: true
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.plan?.notifications).toBeDefined()
      expect(result.plan?.notifications.length).toBeGreaterThan(0)
      
      // Should have notifications for therapists
      const therapistNotifications = result.plan?.notifications.filter(
        n => n.recipient_type === 'therapist'
      )
      expect(therapistNotifications?.length).toBeGreaterThan(0)
      
      // Should have bilingual messages
      const firstNotification = result.plan?.notifications[0]
      expect(firstNotification?.message_template_ar).toBeDefined()
      expect(firstNotification?.message_template_en).toBeDefined()
    })

    it('should create rollback plan', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: mockSessions, error: null }))
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockOriginalTherapist, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve({ data: mockTherapists, error: null }))
            }))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { name_ar: 'طالب', name_en: 'Student' }, 
                error: null 
              }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.createSubstitutionPlan(mockSubstitutionRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.plan?.rollback_plan).toBeDefined()
      expect(result.plan?.rollback_plan.can_rollback).toBe(true)
      expect(result.plan?.rollback_plan.rollback_deadline).toBeDefined()
      expect(result.plan?.rollback_plan.rollback_steps.length).toBeGreaterThan(0)
      
      // Should have bilingual rollback steps
      const firstStep = result.plan?.rollback_plan.rollback_steps[0]
      expect(firstStep?.action_ar).toBeDefined()
      expect(firstStep?.action_en).toBeDefined()
    })
  })

  describe('executeSubstitutionPlan', () => {
    it('should execute approved plan successfully', async () => {
      // Arrange
      const planId = 'sub_plan_12345'
      const mockPlan = {
        plan_id: planId,
        status: 'approved',
        assignments: [
          {
            substitute_therapist_id: 'therapist-sub1',
            substitute_name_ar: 'د. سارة',
            substitute_name_en: 'Dr. Sarah',
            assigned_sessions: ['session-1', 'session-2'],
            schedule_adjustments: [],
            capacity_impact: 20,
            requires_training: false
          }
        ],
        notifications: [
          {
            recipient_type: 'therapist' as const,
            recipient_id: 'therapist-sub1',
            notification_type: 'email' as const,
            message_template_ar: 'تم التعيين',
            message_template_en: 'Assignment confirmed',
            send_time: new Date().toISOString(),
            priority: 'high' as const,
            requires_confirmation: true
          }
        ],
        unassigned_sessions: [],
        rollback_plan: {
          can_rollback: true,
          rollback_deadline: '2025-09-09',
          rollback_steps: [],
          impact_assessment: 'Minimal',
          approval_required: false
        }
      }

      // Mock retrievePlan to return the mock plan
      service['retrievePlan'] = vi.fn().mockResolvedValue(mockPlan)
      service['executeAssignment'] = vi.fn().mockResolvedValue({ 
        success: true, 
        message: 'Assignment executed' 
      })
      service['sendNotification'] = vi.fn().mockResolvedValue({ 
        success: true, 
        message: 'Notification sent' 
      })
      service['updatePlanStatus'] = vi.fn().mockResolvedValue(undefined)

      // Act
      const result = await service.executeSubstitutionPlan(planId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.executionResult).toBeDefined()
      expect(result.executionResult?.assignments_completed).toContain('therapist-sub1')
      expect(result.executionResult?.notifications_sent).toContain('therapist-sub1')
    })

    it('should skip notifications when requested', async () => {
      // Arrange
      const planId = 'sub_plan_12345'
      const mockPlan = {
        plan_id: planId,
        status: 'approved',
        assignments: [],
        notifications: [
          {
            recipient_type: 'therapist' as const,
            recipient_id: 'therapist-sub1',
            notification_type: 'email' as const,
            message_template_ar: 'تم التعيين',
            message_template_en: 'Assignment confirmed',
            send_time: new Date().toISOString(),
            priority: 'high' as const,
            requires_confirmation: true
          }
        ],
        unassigned_sessions: [],
        rollback_plan: {
          can_rollback: true,
          rollback_deadline: '2025-09-09',
          rollback_steps: [],
          impact_assessment: 'Minimal',
          approval_required: false
        }
      }

      service['retrievePlan'] = vi.fn().mockResolvedValue(mockPlan)
      service['sendNotification'] = vi.fn()
      service['updatePlanStatus'] = vi.fn().mockResolvedValue(undefined)

      // Act
      const result = await service.executeSubstitutionPlan(planId, true)

      // Assert
      expect(result.success).toBe(true)
      expect(service['sendNotification']).not.toHaveBeenCalled()
    })

    it('should handle plan not found', async () => {
      // Arrange
      const planId = 'non_existent_plan'
      service['retrievePlan'] = vi.fn().mockResolvedValue(null)

      // Act
      const result = await service.executeSubstitutionPlan(planId)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('not found')
    })

    it('should reject unapproved plan execution', async () => {
      // Arrange
      const planId = 'sub_plan_12345'
      const mockPlan = {
        plan_id: planId,
        status: 'draft',
        assignments: [],
        notifications: [],
        unassigned_sessions: [],
        rollback_plan: {
          can_rollback: false,
          rollback_deadline: '',
          rollback_steps: [],
          impact_assessment: '',
          approval_required: false
        }
      }

      service['retrievePlan'] = vi.fn().mockResolvedValue(mockPlan)

      // Act
      const result = await service.executeSubstitutionPlan(planId)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('must be approved')
    })

    it('should handle assignment failures', async () => {
      // Arrange
      const planId = 'sub_plan_12345'
      const mockPlan = {
        plan_id: planId,
        status: 'approved',
        assignments: [
          {
            substitute_therapist_id: 'therapist-sub1',
            substitute_name_ar: 'د. سارة',
            substitute_name_en: 'Dr. Sarah',
            assigned_sessions: ['session-1'],
            schedule_adjustments: [],
            capacity_impact: 20,
            requires_training: false
          }
        ],
        notifications: [],
        unassigned_sessions: [],
        rollback_plan: {
          can_rollback: true,
          rollback_deadline: '2025-09-09',
          rollback_steps: [],
          impact_assessment: 'Minimal',
          approval_required: false
        }
      }

      service['retrievePlan'] = vi.fn().mockResolvedValue(mockPlan)
      service['executeAssignment'] = vi.fn().mockResolvedValue({ 
        success: false, 
        message: 'Database error' 
      })
      service['updatePlanStatus'] = vi.fn().mockResolvedValue(undefined)

      // Act
      const result = await service.executeSubstitutionPlan(planId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.executionResult?.assignments_failed.length).toBe(1)
      expect(result.executionResult?.assignments_failed[0].reason).toContain('Database error')
    })
  })

  describe('monitorActiveSubstitutions', () => {
    it('should monitor active substitutions successfully', async () => {
      // Arrange
      const mockActivePlans = [
        {
          plan_id: 'plan_1',
          status: 'in_progress',
          created_at: '2025-09-01'
        },
        {
          plan_id: 'plan_2',
          status: 'approved',
          created_at: '2025-09-02'
        }
      ]

      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: mockActivePlans, 
              error: null 
            }))
          }))
        }))
      }))
      
      supabase.supabase.from = mockFrom

      service['monitorSubstitutionPlan'] = vi.fn().mockResolvedValue({
        plan_id: 'plan_1',
        status: 'in_progress',
        progress: 50,
        issues: [],
        next_milestone: 'Session completion'
      })

      service['calculateSubstitutionMetrics'] = vi.fn().mockResolvedValue({
        total_substitutions: 42,
        average_disruption_score: 25.5,
        coverage_success_rate: 92.3,
        average_notice_period_hours: 48,
        most_common_reasons: [],
        peak_substitution_periods: [],
        therapist_availability_trends: []
      })

      // Act
      const result = await service.monitorActiveSubstitutions()

      // Assert
      expect(result.success).toBe(true)
      expect(result.activeSubstitutions).toBeDefined()
      expect(result.activeSubstitutions?.length).toBe(2)
      expect(result.metrics).toBeDefined()
      expect(result.metrics?.total_substitutions).toBe(42)
    })

    it('should handle database errors in monitoring', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: new Error('Database error') 
            }))
          }))
        }))
      }))
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.monitorActiveSubstitutions()

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to fetch active substitution plans')
    })
  })

  describe('rollbackSubstitution', () => {
    it('should rollback substitution successfully', async () => {
      // Arrange
      const planId = 'sub_plan_12345'
      const reason = 'Therapist returned earlier than expected'
      
      const mockPlan = {
        plan_id: planId,
        status: 'in_progress',
        assignments: [],
        notifications: [],
        unassigned_sessions: [],
        rollback_plan: {
          can_rollback: true,
          rollback_deadline: '2025-12-31',
          rollback_steps: [
            {
              step_number: 1,
              action_ar: 'إلغاء التعيينات',
              action_en: 'Cancel assignments',
              estimated_time_minutes: 5,
              reversible: true
            }
          ],
          impact_assessment: 'Minimal impact',
          approval_required: false
        }
      }

      service['retrievePlan'] = vi.fn().mockResolvedValue(mockPlan)
      service['executeRollbackStep'] = vi.fn().mockResolvedValue({ 
        success: true, 
        message: 'Step completed' 
      })
      service['createRollbackNotifications'] = vi.fn().mockResolvedValue([])
      service['updatePlanStatus'] = vi.fn().mockResolvedValue(undefined)

      // Act
      const result = await service.rollbackSubstitution(planId, reason)

      // Assert
      expect(result.success).toBe(true)
      expect(result.rollbackResult).toBeDefined()
      expect(result.rollbackResult?.steps_completed).toContain(1)
      expect(result.rollbackResult?.final_status).toBe('complete')
    })

    it('should reject rollback if not allowed', async () => {
      // Arrange
      const planId = 'sub_plan_12345'
      const reason = 'Cancellation requested'
      
      const mockPlan = {
        plan_id: planId,
        status: 'completed',
        assignments: [],
        notifications: [],
        unassigned_sessions: [],
        rollback_plan: {
          can_rollback: false,
          rollback_deadline: '',
          rollback_steps: [],
          impact_assessment: 'Cannot rollback',
          approval_required: false
        }
      }

      service['retrievePlan'] = vi.fn().mockResolvedValue(mockPlan)

      // Act
      const result = await service.rollbackSubstitution(planId, reason)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('cannot be rolled back')
    })

    it('should reject rollback after deadline', async () => {
      // Arrange
      const planId = 'sub_plan_12345'
      const reason = 'Late cancellation'
      
      const mockPlan = {
        plan_id: planId,
        status: 'in_progress',
        assignments: [],
        notifications: [],
        unassigned_sessions: [],
        rollback_plan: {
          can_rollback: true,
          rollback_deadline: '2020-01-01', // Past date
          rollback_steps: [],
          impact_assessment: 'Deadline passed',
          approval_required: false
        }
      }

      service['retrievePlan'] = vi.fn().mockResolvedValue(mockPlan)

      // Act
      const result = await service.rollbackSubstitution(planId, reason)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('deadline has passed')
    })

    it('should handle partial rollback on irreversible step failure', async () => {
      // Arrange
      const planId = 'sub_plan_12345'
      const reason = 'Emergency rollback'
      
      const mockPlan = {
        plan_id: planId,
        status: 'in_progress',
        assignments: [],
        notifications: [],
        unassigned_sessions: [],
        rollback_plan: {
          can_rollback: true,
          rollback_deadline: '2025-12-31',
          rollback_steps: [
            {
              step_number: 1,
              action_ar: 'خطوة قابلة للعكس',
              action_en: 'Reversible step',
              estimated_time_minutes: 5,
              reversible: true
            },
            {
              step_number: 2,
              action_ar: 'خطوة غير قابلة للعكس',
              action_en: 'Irreversible step',
              estimated_time_minutes: 5,
              reversible: false
            }
          ],
          impact_assessment: 'Partial rollback possible',
          approval_required: false
        }
      }

      service['retrievePlan'] = vi.fn().mockResolvedValue(mockPlan)
      service['executeRollbackStep'] = vi.fn()
        .mockResolvedValueOnce({ success: true, message: 'Step 1 completed' })
        .mockResolvedValueOnce({ success: false, message: 'Step 2 failed' })
      service['createRollbackNotifications'] = vi.fn().mockResolvedValue([])
      service['updatePlanStatus'] = vi.fn().mockResolvedValue(undefined)

      // Act
      const result = await service.rollbackSubstitution(planId, reason)

      // Assert
      expect(result.success).toBe(true)
      expect(result.rollbackResult?.final_status).toBe('partial')
      expect(result.rollbackResult?.steps_failed.length).toBe(1)
      expect(result.message).toContain('partially')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty substitute list gracefully', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: mockSessions, error: null }))
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockOriginalTherapist, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve({ data: [], error: null })) // No available therapists
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.findSubstitutes(mockSubstitutionRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.candidates).toEqual([])
      expect(result.message).toContain('0 potential substitutes')
    })

    it('should handle malformed request data', async () => {
      // Arrange
      const malformedRequest: SubstitutionRequest = {
        original_therapist_id: '',
        start_date: 'invalid-date',
        end_date: '2025-09-17',
        reason: 'vacation'
      }

      // Act
      const result = await service.findSubstitutes(malformedRequest)

      // Assert
      expect(result.success).toBe(true) // Should handle gracefully
      expect(result.candidates).toEqual([])
    })
  })

  describe('Performance', () => {
    it('should handle large session sets efficiently', async () => {
      // Arrange
      const largeSessions = Array.from({ length: 100 }, (_, i) => ({
        id: `session-${i}`,
        therapist_id: 'therapist-123',
        student_id: `student-${i}`,
        scheduled_date: '2025-09-11',
        scheduled_time: '10:00',
        status: 'scheduled'
      }))

      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: largeSessions, error: null }))
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockOriginalTherapist, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve({ data: mockTherapists, error: null }))
            }))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      const startTime = performance.now()

      // Act
      const result = await service.findSubstitutes(mockSubstitutionRequest)

      const endTime = performance.now()

      // Assert
      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })

  describe('Bilingual Support', () => {
    it('should provide bilingual messages in notifications', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: mockSessions, error: null }))
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockOriginalTherapist, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve({ data: mockTherapists, error: null }))
            }))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { name_ar: 'طالب', name_en: 'Student' }, 
                error: null 
              }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.createSubstitutionPlan(mockSubstitutionRequest)

      // Assert
      expect(result.success).toBe(true)
      
      const notifications = result.plan?.notifications
      expect(notifications?.length).toBeGreaterThan(0)
      
      notifications?.forEach(notification => {
        expect(notification.message_template_ar).toBeDefined()
        expect(notification.message_template_en).toBeDefined()
        expect(notification.message_template_ar).toMatch(/[\u0600-\u06FF]/) // Contains Arabic characters
        expect(notification.message_template_en).toMatch(/[a-zA-Z]/) // Contains English characters
      })
    })
  })
})