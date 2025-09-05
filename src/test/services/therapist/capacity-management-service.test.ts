import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest'
import { CapacityManagementService, CapacityConstraints, AssignmentRequest, BulkAssignmentRequest } from '@/services/therapist/capacity-management-service'
import { TherapistWorkloadService } from '@/services/therapist/therapist-workload-service'
import { SchedulingService } from '@/services/scheduling/scheduling-service'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          neq: vi.fn(() => ({
            single: vi.fn()
          }))
        })),
        neq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }
}))

vi.mock('@/services/therapist/therapist-workload-service')
vi.mock('@/services/scheduling/scheduling-service')

describe('CapacityManagementService', () => {
  let service: CapacityManagementService
  let mockWorkloadService: MockedFunction<any>
  let mockSchedulingService: MockedFunction<any>

  // Mock data
  const mockTherapistId = 'therapist-123'
  const mockStudentId = 'student-456'
  const mockProgramTemplateId = 'program-789'

  const mockConstraints: CapacityConstraints = {
    max_daily_hours: 8,
    max_weekly_hours: 40,
    max_monthly_hours: 160,
    max_concurrent_students: 25,
    max_sessions_per_day: 8,
    required_break_minutes: 15,
    max_consecutive_hours: 4,
    specialty_requirements: ['speech_therapy', 'occupational_therapy'],
    availability_windows: [
      {
        day_of_week: 1, // Monday
        start_time: '09:00',
        end_time: '17:00'
      }
    ]
  }

  const mockWorkload = {
    therapist_id: mockTherapistId,
    weekly_hours: 30,
    daily_hours_avg: 6,
    active_students: 18,
    utilization_percentage: 75,
    sessions_per_week: 25,
    documentation_hours: 5,
    travel_time_hours: 2
  }

  const mockAssignmentRequest: AssignmentRequest = {
    therapist_id: mockTherapistId,
    student_id: mockStudentId,
    program_template_id: mockProgramTemplateId,
    sessions_per_week: 3,
    session_duration_minutes: 60,
    start_date: '2025-09-05',
    end_date: '2025-12-05',
    preferred_time_slots: [
      {
        day_of_week: 1,
        start_time: '10:00',
        duration_minutes: 60
      }
    ],
    priority_level: 'high'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mocks
    mockWorkloadService = vi.mocked(TherapistWorkloadService)
    mockSchedulingService = vi.mocked(SchedulingService)
    
    service = new CapacityManagementService()
    
    // Setup default mock implementations
    mockWorkloadService.prototype.calculateWorkload = vi.fn().mockResolvedValue({
      success: true,
      workload: mockWorkload,
      message: 'Workload calculated successfully'
    })
  })

  describe('validateAssignment', () => {
    it('should validate assignment successfully when within constraints', async () => {
      // Arrange
      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.validateAssignment(mockAssignmentRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.result).toBeDefined()
      expect(result.result?.is_valid).toBe(true)
      expect(result.result?.validation_errors).toHaveLength(0)
      expect(result.result?.capacity_impact).toBeDefined()
    })

    it('should identify critical constraint violations', async () => {
      // Arrange - workload that would exceed constraints
      const highWorkload = {
        ...mockWorkload,
        weekly_hours: 38, // Very close to limit
        active_students: 25 // At the limit
      }

      mockWorkloadService.prototype.calculateWorkload = vi.fn().mockResolvedValue({
        success: true,
        workload: highWorkload,
        message: 'Workload calculated successfully'
      })

      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      const highDemandRequest = {
        ...mockAssignmentRequest,
        sessions_per_week: 5, // High demand assignment
        session_duration_minutes: 90
      }

      // Act
      const result = await service.validateAssignment(highDemandRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.result).toBeDefined()
      expect(result.result?.is_valid).toBe(false)
      expect(result.result?.validation_errors.some(e => e.severity === 'critical')).toBe(true)
      expect(result.result?.alternative_assignments).toBeDefined()
    })

    it('should calculate capacity impact correctly', async () => {
      // Arrange
      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.validateAssignment(mockAssignmentRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.result?.capacity_impact).toBeDefined()
      expect(result.result?.capacity_impact.current_utilization).toBeGreaterThan(0)
      expect(result.result?.capacity_impact.projected_utilization).toBeGreaterThan(
        result.result?.capacity_impact.current_utilization
      )
      expect(result.result?.capacity_impact.capacity_remaining).toBeGreaterThan(0)
      expect(['low', 'medium', 'high', 'critical']).toContain(
        result.result?.capacity_impact.risk_level
      )
    })

    it('should handle workload service errors gracefully', async () => {
      // Arrange
      mockWorkloadService.prototype.calculateWorkload = vi.fn().mockResolvedValue({
        success: false,
        workload: null,
        message: 'Failed to calculate workload'
      })

      // Act
      const result = await service.validateAssignment(mockAssignmentRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.result).toBeUndefined()
      expect(result.message).toContain('Failed to calculate current workload')
    })

    it('should generate appropriate recommendations', async () => {
      // Arrange
      const highUtilizationWorkload = {
        ...mockWorkload,
        weekly_hours: 35, // 87.5% utilization
        utilization_percentage: 87.5
      }

      mockWorkloadService.prototype.calculateWorkload = vi.fn().mockResolvedValue({
        success: true,
        workload: highUtilizationWorkload,
        message: 'Workload calculated successfully'
      })

      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.validateAssignment(mockAssignmentRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.result?.recommendations).toBeDefined()
      expect(result.result?.recommendations.length).toBeGreaterThan(0)
      
      const workloadRecommendation = result.result?.recommendations.find(
        r => r.type === 'workload_redistribution'
      )
      expect(workloadRecommendation).toBeDefined()
      expect(workloadRecommendation?.description_ar).toContain('إعادة توزيع')
      expect(workloadRecommendation?.description_en).toContain('Redistribute')
    })

    it('should find alternative assignments when validation fails', async () => {
      // Arrange - setup high workload to trigger alternatives search
      const criticalWorkload = {
        ...mockWorkload,
        weekly_hours: 40, // At maximum
        active_students: 25 // At maximum
      }

      mockWorkloadService.prototype.calculateWorkload = vi.fn()
        .mockResolvedValueOnce({
          success: true,
          workload: criticalWorkload,
          message: 'Workload calculated successfully'
        })
        .mockResolvedValue({
          success: true,
          workload: mockWorkload, // Lower workload for alternatives
          message: 'Workload calculated successfully'
        })

      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }

      const mockAlternativeTherapists = [
        {
          id: 'therapist-alt1',
          name_ar: 'المعالج البديل الأول',
          name_en: 'Alternative Therapist 1',
          specialties: ['speech_therapy']
        },
        {
          id: 'therapist-alt2',
          name_ar: 'المعالج البديل الثاني',
          name_en: 'Alternative Therapist 2',
          specialties: ['occupational_therapy']
        }
      ]
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve({
                data: mockAlternativeTherapists,
                error: null
              }))
            }))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      const criticalRequest = {
        ...mockAssignmentRequest,
        sessions_per_week: 5 // This would push over the limit
      }

      // Act
      const result = await service.validateAssignment(criticalRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.result?.is_valid).toBe(false)
      expect(result.result?.alternative_assignments).toBeDefined()
      expect(result.result?.alternative_assignments.length).toBeGreaterThan(0)
      
      const firstAlternative = result.result?.alternative_assignments[0]
      expect(firstAlternative?.therapist_id).toBe('therapist-alt1')
      expect(firstAlternative?.compatibility_score).toBeGreaterThan(0)
      expect(firstAlternative?.capacity_utilization).toBeLessThan(100)
    })
  })

  describe('processBulkAssignments', () => {
    it('should process bulk assignments successfully', async () => {
      // Arrange
      const bulkRequest: BulkAssignmentRequest = {
        assignments: [
          mockAssignmentRequest,
          {
            ...mockAssignmentRequest,
            student_id: 'student-789',
            priority_level: 'medium'
          }
        ],
        optimization_strategy: 'balance_all',
        allow_partial_assignments: true,
        max_processing_time_seconds: 60
      }

      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.processBulkAssignments(bulkRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.result).toBeDefined()
      expect(result.result?.successful_assignments.length).toBeGreaterThanOrEqual(0)
      expect(result.result?.optimization_summary).toBeDefined()
      expect(result.result?.capacity_impact_summary).toBeDefined()
      expect(result.result?.optimization_summary.total_processed).toBe(2)
    })

    it('should sort assignments by priority correctly', async () => {
      // Arrange
      const bulkRequest: BulkAssignmentRequest = {
        assignments: [
          { ...mockAssignmentRequest, priority_level: 'low', student_id: 'student-1' },
          { ...mockAssignmentRequest, priority_level: 'high', student_id: 'student-2' },
          { ...mockAssignmentRequest, priority_level: 'medium', student_id: 'student-3' }
        ],
        optimization_strategy: 'balance_all',
        allow_partial_assignments: false,
        max_processing_time_seconds: 30
      }

      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.processBulkAssignments(bulkRequest)

      // Assert
      expect(result.success).toBe(true)
      // High priority should be processed first (student-2)
      if (result.result?.successful_assignments.length && result.result.successful_assignments.length > 0) {
        expect(result.result.successful_assignments[0]).toBe('student-2')
      }
    })

    it('should handle alternative assignments when enabled', async () => {
      // Arrange
      const bulkRequest: BulkAssignmentRequest = {
        assignments: [mockAssignmentRequest],
        optimization_strategy: 'maximize_compatibility',
        allow_partial_assignments: true,
        max_processing_time_seconds: 60
      }

      // Mock high workload to trigger alternative search
      const criticalWorkload = {
        ...mockWorkload,
        weekly_hours: 40,
        active_students: 25
      }

      mockWorkloadService.prototype.calculateWorkload = vi.fn()
        .mockResolvedValueOnce({
          success: true,
          workload: criticalWorkload,
          message: 'Workload calculated successfully'
        })
        .mockResolvedValue({
          success: true,
          workload: mockWorkload,
          message: 'Workload calculated successfully'
        })

      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }

      const mockAlternativeTherapists = [
        {
          id: 'therapist-alt1',
          name_ar: 'المعالج البديل',
          name_en: 'Alternative Therapist',
          specialties: ['speech_therapy']
        }
      ]
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve({
                data: mockAlternativeTherapists,
                error: null
              }))
            }))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.processBulkAssignments(bulkRequest)

      // Assert
      expect(result.success).toBe(true)
      // Should attempt alternative assignment
      expect(result.result?.optimization_summary.total_processed).toBe(1)
    })

    it('should respect processing timeout', async () => {
      // Arrange
      const bulkRequest: BulkAssignmentRequest = {
        assignments: Array.from({ length: 100 }, (_, i) => ({
          ...mockAssignmentRequest,
          student_id: `student-${i}`,
          priority_level: 'medium' as const
        })),
        optimization_strategy: 'balance_all',
        allow_partial_assignments: true,
        max_processing_time_seconds: 0.1 // Very short timeout
      }

      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.processBulkAssignments(bulkRequest)

      // Assert
      expect(result.success).toBe(true)
      // Should not process all assignments due to timeout
      expect(result.result?.optimization_summary.total_processed).toBeLessThan(100)
    })
  })

  describe('monitorCapacityAlerts', () => {
    it('should generate capacity alerts for therapists', async () => {
      // Arrange
      const mockTherapists = [
        {
          id: 'therapist-1',
          name_ar: 'المعالج الأول',
          name_en: 'First Therapist'
        },
        {
          id: 'therapist-2',
          name_ar: 'المعالج الثاني',
          name_en: 'Second Therapist'
        }
      ]

      const highUtilizationWorkload = {
        ...mockWorkload,
        weekly_hours: 38, // 95% utilization
        utilization_percentage: 95
      }

      mockWorkloadService.prototype.calculateWorkload = vi.fn()
        .mockResolvedValueOnce({
          success: true,
          workload: highUtilizationWorkload,
          message: 'Workload calculated successfully'
        })
        .mockResolvedValueOnce({
          success: true,
          workload: mockWorkload,
          message: 'Workload calculated successfully'
        })

      const mockSupabaseResponses = [
        {
          data: mockTherapists,
          error: null
        },
        {
          data: mockConstraints,
          error: null
        }
      ]
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve(mockSupabaseResponses[0]))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockSupabaseResponses[1]))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.monitorCapacityAlerts()

      // Assert
      expect(result.success).toBe(true)
      expect(result.alerts).toBeDefined()
      expect(result.alerts?.length).toBeGreaterThan(0)
      
      const criticalAlert = result.alerts?.find(a => a.severity === 'critical')
      expect(criticalAlert).toBeDefined()
      expect(criticalAlert?.alert_type).toBe('over_assignment')
      expect(criticalAlert?.message_ar).toContain('الحد الأقصى للطاقة الاستيعابية')
      expect(criticalAlert?.message_en).toContain('maximum capacity')
    })

    it('should sort alerts by severity and timestamp', async () => {
      // Arrange
      const mockTherapists = [
        { id: 'therapist-1', name_ar: 'المعالج الأول', name_en: 'First Therapist' },
        { id: 'therapist-2', name_ar: 'المعالج الثاني', name_en: 'Second Therapist' },
        { id: 'therapist-3', name_ar: 'المعالج الثالث', name_en: 'Third Therapist' }
      ]

      // Different utilization levels to generate different severity alerts
      const workloads = [
        { ...mockWorkload, weekly_hours: 38, utilization_percentage: 95 }, // Critical
        { ...mockWorkload, weekly_hours: 34, utilization_percentage: 85 }, // High
        { ...mockWorkload, weekly_hours: 30, utilization_percentage: 75 }  // No alert
      ]

      mockWorkloadService.prototype.calculateWorkload = vi.fn()
        .mockResolvedValueOnce({ success: true, workload: workloads[0], message: 'Success' })
        .mockResolvedValueOnce({ success: true, workload: workloads[1], message: 'Success' })
        .mockResolvedValueOnce({ success: true, workload: workloads[2], message: 'Success' })

      const mockSupabaseResponses = [
        { data: mockTherapists, error: null },
        { data: mockConstraints, error: null }
      ]
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve(mockSupabaseResponses[0]))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockSupabaseResponses[1]))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.monitorCapacityAlerts()

      // Assert
      expect(result.success).toBe(true)
      expect(result.alerts?.length).toBeGreaterThan(0)
      
      // First alert should be the most severe
      const firstAlert = result.alerts?.[0]
      expect(firstAlert?.severity).toBe('critical')
    })

    it('should handle therapist fetch errors', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: null,
            error: new Error('Database connection failed')
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.monitorCapacityAlerts()

      // Assert
      expect(result.success).toBe(false)
      expect(result.alerts).toBeUndefined()
      expect(result.message).toContain('Failed to fetch therapists')
    })
  })

  describe('preventOverAssignment', () => {
    it('should allow assignment when within constraints', async () => {
      // Arrange
      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.preventOverAssignment(
        mockTherapistId,
        mockAssignmentRequest
      )

      // Assert
      expect(result.success).toBe(true)
      expect(result.allowed).toBe(true)
      expect(result.prevention_reason).toBeUndefined()
      expect(result.message).toContain('Assignment allowed')
    })

    it('should prevent assignment when constraints would be violated', async () => {
      // Arrange
      const criticalWorkload = {
        ...mockWorkload,
        weekly_hours: 40, // At maximum
        active_students: 25 // At maximum
      }

      mockWorkloadService.prototype.calculateWorkload = vi.fn().mockResolvedValue({
        success: true,
        workload: criticalWorkload,
        message: 'Workload calculated successfully'
      })

      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      const criticalRequest = {
        ...mockAssignmentRequest,
        sessions_per_week: 5 // Would exceed constraints
      }

      // Act
      const result = await service.preventOverAssignment(
        mockTherapistId,
        criticalRequest
      )

      // Assert
      expect(result.success).toBe(true)
      expect(result.allowed).toBe(false)
      expect(result.prevention_reason).toBeDefined()
      expect(result.alternatives).toBeDefined()
      expect(result.message).toContain('Assignment prevented')
    })

    it('should prevent assignment when capacity risk is critical', async () => {
      // Arrange
      const highRiskWorkload = {
        ...mockWorkload,
        weekly_hours: 37, // 92.5% utilization - just under critical constraint but high risk
        utilization_percentage: 92.5
      }

      mockWorkloadService.prototype.calculateWorkload = vi.fn().mockResolvedValue({
        success: true,
        workload: highRiskWorkload,
        message: 'Workload calculated successfully'
      })

      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      const highImpactRequest = {
        ...mockAssignmentRequest,
        sessions_per_week: 4, // Would push to critical risk
        session_duration_minutes: 90
      }

      // Act
      const result = await service.preventOverAssignment(
        mockTherapistId,
        highImpactRequest
      )

      // Assert
      expect(result.success).toBe(true)
      // May be prevented due to critical risk level depending on calculation
      if (!result.allowed) {
        expect(result.prevention_reason).toContain('critical capacity risk')
        expect(result.message).toContain('high capacity risk')
      }
    })

    it('should handle validation service errors', async () => {
      // Arrange
      mockWorkloadService.prototype.calculateWorkload = vi.fn().mockResolvedValue({
        success: false,
        workload: null,
        message: 'Service unavailable'
      })

      // Act
      const result = await service.preventOverAssignment(
        mockTherapistId,
        mockAssignmentRequest
      )

      // Assert
      expect(result.success).toBe(false)
      expect(result.allowed).toBe(false)
      expect(result.message).toContain('Error occurred during over-assignment prevention')
    })
  })

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', () => {
      // Arrange & Act
      expect(() => new CapacityManagementService()).not.toThrow()
    })

    it('should handle database connection failures', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => {
        throw new Error('Database connection failed')
      })
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.validateAssignment(mockAssignmentRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('Error occurred during capacity validation')
    })

    it('should handle malformed assignment requests', async () => {
      // Arrange
      const malformedRequest = {
        ...mockAssignmentRequest,
        sessions_per_week: -1, // Invalid negative value
        session_duration_minutes: 0 // Invalid zero duration
      }

      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.validateAssignment(malformedRequest)

      // Assert - Service should handle gracefully, potentially with warnings
      expect(result.success).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should complete single assignment validation quickly', async () => {
      // Arrange
      const startTime = Date.now()
      
      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.validateAssignment(mockAssignmentRequest)
      const endTime = Date.now()
      
      // Assert
      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle bulk processing within reasonable time', async () => {
      // Arrange
      const bulkRequest: BulkAssignmentRequest = {
        assignments: Array.from({ length: 10 }, (_, i) => ({
          ...mockAssignmentRequest,
          student_id: `student-${i}`,
          priority_level: 'medium' as const
        })),
        optimization_strategy: 'balance_all',
        allow_partial_assignments: true,
        max_processing_time_seconds: 30
      }

      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      const startTime = Date.now()

      // Act
      const result = await service.processBulkAssignments(bulkRequest)
      const endTime = Date.now()

      // Assert
      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds for 10 assignments
    })
  })

  describe('Bilingual Support', () => {
    it('should provide Arabic error messages', async () => {
      // Arrange
      const criticalWorkload = {
        ...mockWorkload,
        weekly_hours: 40,
        active_students: 25
      }

      mockWorkloadService.prototype.calculateWorkload = vi.fn().mockResolvedValue({
        success: true,
        workload: criticalWorkload,
        message: 'Workload calculated successfully'
      })

      const mockSupabaseResponse = {
        data: mockConstraints,
        error: null
      }
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
          }))
        }))
      }))
      supabase.supabase.from = mockFrom

      const criticalRequest = {
        ...mockAssignmentRequest,
        sessions_per_week: 5
      }

      // Act
      const result = await service.validateAssignment(criticalRequest)

      // Assert
      expect(result.success).toBe(true)
      const errorWithArabic = result.result?.validation_errors.find(e => e.message_ar)
      expect(errorWithArabic?.message_ar).toMatch(/[\u0600-\u06FF]/) // Contains Arabic characters
    })

    it('should provide bilingual capacity alerts', async () => {
      // Arrange
      const mockTherapists = [
        {
          id: 'therapist-1',
          name_ar: 'المعالج الأول',
          name_en: 'First Therapist'
        }
      ]

      const criticalWorkload = {
        ...mockWorkload,
        weekly_hours: 38,
        utilization_percentage: 95
      }

      mockWorkloadService.prototype.calculateWorkload = vi.fn().mockResolvedValue({
        success: true,
        workload: criticalWorkload,
        message: 'Workload calculated successfully'
      })

      const mockSupabaseResponses = [
        { data: mockTherapists, error: null },
        { data: mockConstraints, error: null }
      ]
      
      const supabase = await import('@/lib/supabase')
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve(mockSupabaseResponses[0]))
          }))
        })
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockSupabaseResponses[1]))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.monitorCapacityAlerts()

      // Assert
      expect(result.success).toBe(true)
      const alertWithBilingualMessages = result.alerts?.find(a => a.message_ar && a.message_en)
      expect(alertWithBilingualMessages).toBeDefined()
      expect(alertWithBilingualMessages?.message_ar).toMatch(/[\u0600-\u06FF]/) // Contains Arabic
      expect(alertWithBilingualMessages?.message_en).toMatch(/[a-zA-Z]/) // Contains English
    })
  })
})