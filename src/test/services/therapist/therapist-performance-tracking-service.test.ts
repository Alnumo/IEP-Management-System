import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest'
import { TherapistPerformanceTrackingService, PerformanceMetric } from '@/services/therapist/therapist-performance-tracking-service'
import { TherapistWorkloadService } from '@/services/therapist/therapist-workload-service'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          gte: vi.fn(() => ({
            lte: vi.fn()
          })),
          in: vi.fn(),
          not: vi.fn()
        })),
        contains: vi.fn(),
        gte: vi.fn(() => ({
          lte: vi.fn()
        })),
        in: vi.fn(),
        not: vi.fn()
      }))
    }))
  }
}))

vi.mock('@/services/therapist/therapist-workload-service')

describe('TherapistPerformanceTrackingService', () => {
  let service: TherapistPerformanceTrackingService
  let mockWorkloadService: MockedFunction<any>

  // Mock data
  const mockTherapistId = 'therapist-123'
  const mockProgramTemplateId = 'program-456'
  const mockStudentId = 'student-789'

  const mockPerformanceMetric: Omit<PerformanceMetric, 'metric_id' | 'measured_at'> = {
    therapist_id: mockTherapistId,
    program_template_id: mockProgramTemplateId,
    student_id: mockStudentId,
    metric_type: 'goal_achievement',
    measurement_period: 'weekly',
    metric_value: 85,
    target_value: 80,
    unit: 'percentage',
    context_data: { session_count: 4, goals_achieved: 3 },
    measured_by: 'system',
    notes_ar: 'أداء جيد',
    notes_en: 'Good performance'
  }

  const mockTherapist = {
    id: mockTherapistId,
    name_ar: 'د. أحمد محمد',
    name_en: 'Dr. Ahmed Mohammed',
    specialties: ['speech_therapy', 'occupational_therapy'],
    status: 'active'
  }

  const mockMetrics: PerformanceMetric[] = [
    {
      metric_id: 'metric-1',
      therapist_id: mockTherapistId,
      program_template_id: mockProgramTemplateId,
      student_id: mockStudentId,
      metric_type: 'goal_achievement',
      measurement_period: 'weekly',
      metric_value: 85,
      target_value: 80,
      unit: 'percentage',
      context_data: { session_count: 4 },
      measured_at: '2025-09-01T10:00:00Z',
      measured_by: 'system'
    },
    {
      metric_id: 'metric-2',
      therapist_id: mockTherapistId,
      program_template_id: mockProgramTemplateId,
      metric_type: 'session_quality',
      measurement_period: 'session',
      metric_value: 90,
      target_value: 85,
      unit: 'score',
      context_data: { quality_factors: ['engagement', 'technique'] },
      measured_at: '2025-09-02T14:00:00Z',
      measured_by: 'supervisor'
    },
    {
      metric_id: 'metric-3',
      therapist_id: mockTherapistId,
      program_template_id: mockProgramTemplateId,
      metric_type: 'attendance',
      measurement_period: 'monthly',
      metric_value: 92,
      target_value: 90,
      unit: 'percentage',
      context_data: { total_sessions: 12, attended_sessions: 11 },
      measured_at: '2025-09-03T09:00:00Z',
      measured_by: 'system'
    }
  ]

  const mockProgramTemplate = {
    id: mockProgramTemplateId,
    name_ar: 'برنامج تطوير النطق',
    name_en: 'Speech Development Program',
    duration_weeks: 12,
    sessions_per_week: 2
  }

  const mockStudentEnrollments = [
    {
      id: 'enrollment-1',
      student_id: 'student-1',
      program_template_id: mockProgramTemplateId,
      assigned_therapist_id: mockTherapistId,
      individual_start_date: '2025-08-01',
      student: {
        name_ar: 'أحمد علي',
        name_en: 'Ahmed Ali'
      }
    },
    {
      id: 'enrollment-2',
      student_id: 'student-2',
      program_template_id: mockProgramTemplateId,
      assigned_therapist_id: mockTherapistId,
      individual_start_date: '2025-08-15',
      student: {
        name_ar: 'فاطمة سعد',
        name_en: 'Fatima Saad'
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mocks
    mockWorkloadService = vi.mocked(TherapistWorkloadService)
    
    service = new TherapistPerformanceTrackingService()
  })

  describe('recordPerformanceMetric', () => {
    it('should record performance metric successfully', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockFrom = vi.fn(() => ({ insert: mockInsert }))
      supabase.supabase.from = mockFrom
      
      // Mock updatePerformanceAggregations
      service['updatePerformanceAggregations'] = vi.fn()

      // Act
      const result = await service.recordPerformanceMetric(mockPerformanceMetric)

      // Assert
      expect(result.success).toBe(true)
      expect(result.metricId).toBeDefined()
      expect(result.metricId).toContain('perf_metric_')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockPerformanceMetric,
          metric_id: expect.any(String),
          measured_at: expect.any(String)
        })
      )
      expect(service['updatePerformanceAggregations']).toHaveBeenCalledWith(
        mockTherapistId,
        mockProgramTemplateId
      )
    })

    it('should handle database insertion errors', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockInsert = vi.fn(() => Promise.resolve({ error: new Error('Database error') }))
      const mockFrom = vi.fn(() => ({ insert: mockInsert }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.recordPerformanceMetric(mockPerformanceMetric)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to record performance metric')
      expect(result.metricId).toBeUndefined()
    })

    it('should generate unique metric IDs', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockFrom = vi.fn(() => ({ insert: mockInsert }))
      supabase.supabase.from = mockFrom
      
      service['updatePerformanceAggregations'] = vi.fn()

      // Act
      const result1 = await service.recordPerformanceMetric(mockPerformanceMetric)
      const result2 = await service.recordPerformanceMetric(mockPerformanceMetric)

      // Assert
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.metricId).toBeDefined()
      expect(result2.metricId).toBeDefined()
      expect(result1.metricId).not.toBe(result2.metricId)
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockFrom = vi.fn(() => {
        throw new Error('Service error')
      })
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.recordPerformanceMetric(mockPerformanceMetric)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('Error occurred while recording')
    })
  })

  describe('getTherapistPerformanceProfile', () => {
    it('should get complete performance profile', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      // Mock therapist query
      const mockTherapistSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockTherapist, error: null }))
        }))
      }))
      
      // Mock metrics query
      const mockMetricsSelect = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: mockMetrics, error: null }))
      }))
      
      // Mock program template query
      const mockProgramSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockProgramTemplate, error: null }))
        }))
      }))
      
      // Mock enrollments query
      const mockEnrollmentsSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockStudentEnrollments, error: null }))
        }))
      }))
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({ select: mockTherapistSelect })
        .mockReturnValueOnce({ select: mockMetricsSelect })
        .mockReturnValue({ select: mockProgramSelect })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.getTherapistPerformanceProfile(mockTherapistId, {
        includePeerComparison: true,
        includeRecommendations: true
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.profile).toBeDefined()
      expect(result.profile?.therapist_id).toBe(mockTherapistId)
      expect(result.profile?.therapist_name_ar).toBe(mockTherapist.name_ar)
      expect(result.profile?.therapist_name_en).toBe(mockTherapist.name_en)
      expect(result.profile?.performance_summary).toBeDefined()
      expect(result.profile?.program_performances).toBeDefined()
      expect(result.profile?.trend_analysis).toBeDefined()
      expect(result.profile?.peer_comparison).toBeDefined()
      expect(result.profile?.strengths).toBeDefined()
      expect(result.profile?.improvement_areas).toBeDefined()
      expect(result.profile?.recommendations).toBeDefined()
    })

    it('should handle therapist not found', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockTherapistSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: new Error('Not found') }))
        }))
      }))
      
      const mockFrom = vi.fn(() => ({ select: mockTherapistSelect }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.getTherapistPerformanceProfile('non-existent-id')

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('Therapist not found')
      expect(result.profile).toBeUndefined()
    })

    it('should apply date range filters', async () => {
      // Arrange
      const dateRange = { start: '2025-09-01', end: '2025-09-30' }
      
      const supabase = await import('@/lib/supabase')
      
      const mockTherapistSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockTherapist, error: null }))
        }))
      }))
      
      const mockMetricsGte = vi.fn(() => ({
        lte: vi.fn(() => Promise.resolve({ data: mockMetrics, error: null }))
      }))
      
      const mockMetricsSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: mockMetricsGte
        }))
      }))
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({ select: mockTherapistSelect })
        .mockReturnValueOnce({ select: mockMetricsSelect })
        .mockReturnValue({ 
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockProgramTemplate, error: null }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.getTherapistPerformanceProfile(mockTherapistId, {
        dateRange
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockMetricsGte).toHaveBeenCalledWith('measured_at', dateRange.start)
    })

    it('should filter by included programs', async () => {
      // Arrange
      const includePrograms = ['program-1', 'program-2']
      
      const supabase = await import('@/lib/supabase')
      
      const mockTherapistSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockTherapist, error: null }))
        }))
      }))
      
      const mockMetricsIn = vi.fn(() => Promise.resolve({ data: mockMetrics, error: null }))
      
      const mockMetricsSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          in: mockMetricsIn
        }))
      }))
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({ select: mockTherapistSelect })
        .mockReturnValueOnce({ select: mockMetricsSelect })
        .mockReturnValue({ 
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockProgramTemplate, error: null }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.getTherapistPerformanceProfile(mockTherapistId, {
        includePrograms
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockMetricsIn).toHaveBeenCalledWith('program_template_id', includePrograms)
    })

    it('should calculate performance summary correctly', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockTherapistSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockTherapist, error: null }))
        }))
      }))
      
      const mockMetricsSelect = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: mockMetrics, error: null }))
      }))
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({ select: mockTherapistSelect })
        .mockReturnValueOnce({ select: mockMetricsSelect })
        .mockReturnValue({ 
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockProgramTemplate, error: null }))
            }))
          }))
        })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.getTherapistPerformanceProfile(mockTherapistId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.profile?.performance_summary).toBeDefined()
      expect(result.profile?.performance_summary.goal_achievement_rate).toBe(85) // From mock metrics
      expect(result.profile?.performance_summary.session_quality_score).toBe(90)
      expect(result.profile?.performance_summary.attendance_rate).toBe(92)
      expect(result.profile?.performance_summary.overall_score).toBeGreaterThan(0)
    })

    it('should handle empty metrics gracefully', async () => {
      // Arrange
      const supabase = await import('@/lib/supabase')
      
      const mockTherapistSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockTherapist, error: null }))
        }))
      }))
      
      const mockMetricsSelect = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
      
      const mockFrom = vi.fn()
        .mockReturnValueOnce({ select: mockTherapistSelect })
        .mockReturnValueOnce({ select: mockMetricsSelect })
      
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.getTherapistPerformanceProfile(mockTherapistId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.profile?.performance_summary.overall_score).toBe(0)
      expect(result.profile?.program_performances).toEqual([])
    })
  })

  describe('generatePerformanceReport', () => {
    it('should generate comprehensive performance report', async () => {
      // Arrange
      const reportConfig = {
        reportType: 'comprehensive' as const,
        periodStart: '2025-09-01',
        periodEnd: '2025-09-30',
        includeVisualizations: true,
        includeActionPlan: true
      }
      
      const supabase = await import('@/lib/supabase')
      
      // Mock profile retrieval
      service.getTherapistPerformanceProfile = vi.fn().mockResolvedValue({
        success: true,
        profile: {
          therapist_id: mockTherapistId,
          therapist_name_ar: mockTherapist.name_ar,
          therapist_name_en: mockTherapist.name_en,
          specialties: mockTherapist.specialties,
          total_programs: 2,
          total_students: 5,
          total_sessions: 24,
          performance_summary: {
            overall_score: 85,
            goal_achievement_rate: 88,
            session_quality_score: 90,
            student_engagement_score: 82,
            progress_velocity: 75,
            attendance_rate: 92,
            satisfaction_rating: 4.5,
            consistency_index: 87
          },
          program_performances: [],
          trend_analysis: {
            performance_trajectory: 'upward' as const,
            improvement_rate: 5.2,
            consistency_score: 87,
            seasonal_patterns: [],
            milestone_achievements: [],
            performance_predictions: []
          },
          peer_comparison: {
            peer_group: 'same_specialty' as const,
            percentile_rank: 75,
            performance_gap: 5,
            top_quartile_threshold: 80,
            areas_above_peers: ['goal_achievement'],
            areas_below_peers: [],
            benchmark_comparisons: []
          },
          strengths: [
            {
              strength_category: 'goal_achievement',
              description_ar: 'تحقيق ممتاز للأهداف',
              description_en: 'Excellent goal achievement',
              evidence_metrics: ['goal_achievement_rate'],
              consistency_score: 90,
              impact_on_outcomes: 85,
              leveraging_suggestions: ['Mentor other therapists']
            }
          ],
          improvement_areas: [
            {
              area_category: 'progress_velocity',
              description_ar: 'تحسين سرعة التقدم',
              description_en: 'Improve progress velocity',
              current_performance: 75,
              target_performance: 85,
              priority_level: 'medium' as const,
              suggested_interventions: [],
              expected_timeline: '3-6 months'
            }
          ],
          recommendations: [
            {
              recommendation_type: 'improvement_focus' as const,
              priority: 1,
              title_ar: 'التركيز على سرعة التقدم',
              title_en: 'Focus on progress velocity',
              description_ar: 'تحسين معدل تقدم الطلاب',
              description_en: 'Improve student progress rates',
              actionable_steps: [],
              expected_outcomes: ['Better student outcomes'],
              timeline: '3 months',
              success_metrics: ['Progress velocity > 80%']
            }
          ]
        },
        message: 'Profile retrieved successfully'
      })
      
      // Mock report storage
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockFrom = vi.fn(() => ({ insert: mockInsert }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.generatePerformanceReport(mockTherapistId, reportConfig)

      // Assert
      expect(result.success).toBe(true)
      expect(result.report).toBeDefined()
      expect(result.report?.report_id).toContain('perf_report_')
      expect(result.report?.therapist_id).toBe(mockTherapistId)
      expect(result.report?.report_type).toBe('comprehensive')
      expect(result.report?.executive_summary).toBeDefined()
      expect(result.report?.detailed_metrics).toBeDefined()
      expect(result.report?.visual_analytics).toBeDefined()
      expect(result.report?.action_plan).toBeDefined()
      expect(result.report?.approval_status).toBe('draft')
      
      // Verify report was stored
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          report_id: result.report?.report_id,
          therapist_id: mockTherapistId,
          report_data: result.report,
          status: 'draft'
        })
      )
    })

    it('should handle profile retrieval failure', async () => {
      // Arrange
      const reportConfig = {
        reportType: 'individual' as const,
        periodStart: '2025-09-01',
        periodEnd: '2025-09-30'
      }
      
      service.getTherapistPerformanceProfile = vi.fn().mockResolvedValue({
        success: false,
        message: 'Therapist not found'
      })

      // Act
      const result = await service.generatePerformanceReport(mockTherapistId, reportConfig)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to generate performance profile')
      expect(result.report).toBeUndefined()
    })

    it('should generate program-specific report', async () => {
      // Arrange
      const reportConfig = {
        reportType: 'program_specific' as const,
        periodStart: '2025-09-01',
        periodEnd: '2025-09-30',
        programTemplateId: 'program-123'
      }
      
      service.getTherapistPerformanceProfile = vi.fn().mockResolvedValue({
        success: true,
        profile: {
          therapist_id: mockTherapistId,
          performance_summary: { overall_score: 80 },
          strengths: [],
          improvement_areas: [],
          recommendations: []
        }
      })
      
      const supabase = await import('@/lib/supabase')
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockFrom = vi.fn(() => ({ insert: mockInsert }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.generatePerformanceReport(mockTherapistId, reportConfig)

      // Assert
      expect(result.success).toBe(true)
      expect(result.report?.report_type).toBe('program_specific')
      
      // Verify profile was called with program filter
      expect(service.getTherapistPerformanceProfile).toHaveBeenCalledWith(
        mockTherapistId,
        expect.objectContaining({
          includePrograms: ['program-123']
        })
      )
    })

    it('should handle report storage errors', async () => {
      // Arrange
      const reportConfig = {
        reportType: 'individual' as const,
        periodStart: '2025-09-01',
        periodEnd: '2025-09-30'
      }
      
      service.getTherapistPerformanceProfile = vi.fn().mockResolvedValue({
        success: true,
        profile: {
          therapist_id: mockTherapistId,
          performance_summary: { overall_score: 80 },
          strengths: [],
          improvement_areas: [],
          recommendations: []
        }
      })
      
      const supabase = await import('@/lib/supabase')
      const mockInsert = vi.fn(() => Promise.resolve({ error: new Error('Storage error') }))
      const mockFrom = vi.fn(() => ({ insert: mockInsert }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.generatePerformanceReport(mockTherapistId, reportConfig)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to store performance report')
    })
  })

  describe('trackCrossProgramPerformance', () => {
    it('should analyze performance across multiple programs', async () => {
      // Arrange
      const programIds = ['program-1', 'program-2', 'program-3']
      const mockCrossProgramMetrics = [
        ...mockMetrics,
        {
          metric_id: 'metric-4',
          therapist_id: mockTherapistId,
          program_template_id: 'program-2',
          metric_type: 'goal_achievement',
          measurement_period: 'weekly',
          metric_value: 78,
          target_value: 80,
          unit: 'percentage',
          context_data: {},
          measured_at: '2025-09-04T10:00:00Z',
          measured_by: 'system'
        }
      ]
      
      const supabase = await import('@/lib/supabase')
      
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: mockCrossProgramMetrics, error: null }))
        }))
      }))
      
      const mockFrom = vi.fn(() => ({ select: mockSelect }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.trackCrossProgramPerformance(
        mockTherapistId,
        programIds,
        'detailed'
      )

      // Assert
      expect(result.success).toBe(true)
      expect(result.analysis).toBeDefined()
      expect(result.analysis?.therapist_id).toBe(mockTherapistId)
      expect(result.analysis?.programs_analyzed).toEqual(programIds)
      expect(result.analysis?.consistency_metrics).toBeDefined()
      expect(result.analysis?.program_comparisons).toBeDefined()
      expect(result.analysis?.skill_transferability).toBeDefined()
      expect(result.analysis?.optimization_opportunities).toBeDefined()
    })

    it('should handle comprehensive analysis depth', async () => {
      // Arrange
      const programIds = ['program-1', 'program-2']
      
      const supabase = await import('@/lib/supabase')
      
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: mockMetrics, error: null }))
        }))
      }))
      
      const mockFrom = vi.fn(() => ({ select: mockSelect }))
      supabase.supabase.from = mockFrom
      
      // Mock resource allocation insights
      service['generateResourceAllocationInsights'] = vi.fn().mockResolvedValue({
        insights: ['Optimize time allocation', 'Balance program difficulty']
      })

      // Act
      const result = await service.trackCrossProgramPerformance(
        mockTherapistId,
        programIds,
        'comprehensive'
      )

      // Assert
      expect(result.success).toBe(true)
      expect(result.analysis?.resource_allocation_insights).toBeDefined()
      expect(service['generateResourceAllocationInsights']).toHaveBeenCalledWith(
        mockTherapistId,
        expect.any(Object)
      )
    })

    it('should handle database errors in cross-program analysis', async () => {
      // Arrange
      const programIds = ['program-1', 'program-2']
      
      const supabase = await import('@/lib/supabase')
      
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
        }))
      }))
      
      const mockFrom = vi.fn(() => ({ select: mockSelect }))
      supabase.supabase.from = mockFrom

      // Act
      const result = await service.trackCrossProgramPerformance(
        mockTherapistId,
        programIds
      )

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to fetch cross-program metrics')
    })

    it('should handle empty program list', async () => {
      // Arrange
      const programIds: string[] = []

      // Act
      const result = await service.trackCrossProgramPerformance(
        mockTherapistId,
        programIds
      )

      // Assert
      expect(result.success).toBe(true)
      expect(result.analysis?.programs_analyzed).toEqual([])
    })
  })

  describe('Performance Calculations', () => {
    it('should calculate overall performance score correctly', () => {
      // Arrange
      const mockMetricsByType = {
        'goal_achievement': [{ metric_value: 85 }, { metric_value: 90 }],
        'session_quality': [{ metric_value: 88 }, { metric_value: 92 }],
        'engagement': [{ metric_value: 80 }, { metric_value: 85 }],
        'progress_rate': [{ metric_value: 75 }],
        'attendance': [{ metric_value: 95 }]
      }

      // Act
      const overallScore = service['calculateOverallScore'](mockMetricsByType as any)

      // Assert
      expect(overallScore).toBeGreaterThan(0)
      expect(overallScore).toBeLessThanOrEqual(100)
      expect(typeof overallScore).toBe('number')
    })

    it('should calculate consistency index', () => {
      // Arrange
      const consistentMetrics = [
        { metric_value: 85 },
        { metric_value: 86 },
        { metric_value: 84 },
        { metric_value: 85 }
      ]
      
      const inconsistentMetrics = [
        { metric_value: 60 },
        { metric_value: 95 },
        { metric_value: 70 },
        { metric_value: 40 }
      ]

      // Act
      const consistentIndex = service['calculateConsistencyIndex'](consistentMetrics as any)
      const inconsistentIndex = service['calculateConsistencyIndex'](inconsistentMetrics as any)

      // Assert
      expect(consistentIndex).toBeGreaterThan(inconsistentIndex)
      expect(consistentIndex).toBeGreaterThan(80) // Should be high for consistent data
      expect(inconsistentIndex).toBeLessThan(80) // Should be lower for inconsistent data
    })

    it('should calculate metric trends correctly', () => {
      // Arrange
      const improvingMetrics = [
        { metric_value: 70, measured_at: '2025-09-01' },
        { metric_value: 75, measured_at: '2025-09-02' },
        { metric_value: 80, measured_at: '2025-09-03' },
        { metric_value: 85, measured_at: '2025-09-04' }
      ]
      
      const decliningMetrics = [
        { metric_value: 90, measured_at: '2025-09-01' },
        { metric_value: 85, measured_at: '2025-09-02' },
        { metric_value: 75, measured_at: '2025-09-03' },
        { metric_value: 70, measured_at: '2025-09-04' }
      ]

      // Act
      const improvingTrend = service['calculateTrend'](improvingMetrics as any)
      const decliningTrend = service['calculateTrend'](decliningMetrics as any)

      // Assert
      expect(improvingTrend).toBe('improving')
      expect(decliningTrend).toBe('declining')
    })

    it('should handle empty metrics gracefully', () => {
      // Arrange
      const emptyMetrics: any[] = []

      // Act
      const overallScore = service['calculateOverallScore']({} as any)
      const consistencyIndex = service['calculateConsistencyIndex'](emptyMetrics)
      const averageValue = service['calculateAverageMetricValue'](emptyMetrics)

      // Assert
      expect(overallScore).toBe(0)
      expect(consistencyIndex).toBe(100) // Perfect consistency with no data
      expect(averageValue).toBe(0)
    })
  })

  describe('Peer Comparison', () => {
    it('should calculate peer comparison correctly', async () => {
      // Arrange
      const mockPeerMetrics = { averageScore: 75 }
      const mockPerformanceSummary = { overall_score: 85 }
      
      service['getPeerMetrics'] = vi.fn().mockResolvedValue(mockPeerMetrics)

      // Act
      const peerComparison = await service['calculatePeerComparison'](
        mockTherapistId,
        ['speech_therapy'],
        mockPerformanceSummary as any
      )

      // Assert
      expect(peerComparison.peer_group).toBe('same_specialty')
      expect(peerComparison.performance_gap).toBe(10) // 85 - 75
      expect(peerComparison.percentile_rank).toBeGreaterThan(0)
    })
  })

  describe('Strengths and Improvements Identification', () => {
    it('should identify high-performing areas as strengths', () => {
      // Arrange
      const highPerformanceSummary = {
        goal_achievement_rate: 90,
        student_engagement_score: 85,
        session_quality_score: 88,
        attendance_rate: 95
      }

      // Act
      const strengths = service['identifyStrengths'](
        highPerformanceSummary as any,
        [],
        undefined
      )

      // Assert
      expect(strengths.length).toBeGreaterThan(0)
      const goalStrength = strengths.find(s => s.strength_category === 'goal_achievement')
      expect(goalStrength).toBeDefined()
      expect(goalStrength?.description_ar).toContain('تحقيق أهداف')
      expect(goalStrength?.description_en).toContain('goal achievement')
    })

    it('should identify low-performing areas for improvement', () => {
      // Arrange
      const lowPerformanceSummary = {
        goal_achievement_rate: 90,
        student_engagement_score: 85,
        session_quality_score: 88,
        attendance_rate: 60 // Low attendance rate
      }

      // Act
      const improvements = service['identifyImprovementAreas'](
        lowPerformanceSummary as any,
        [],
        undefined
      )

      // Assert
      expect(improvements.length).toBeGreaterThan(0)
      const attendanceImprovement = improvements.find(i => i.area_category === 'attendance')
      expect(attendanceImprovement).toBeDefined()
      expect(attendanceImprovement?.priority_level).toBe('high')
      expect(attendanceImprovement?.target_performance).toBeGreaterThan(
        attendanceImprovement?.current_performance
      )
    })
  })

  describe('Report Generation', () => {
    it('should generate executive summary', () => {
      // Arrange
      const mockProfile = {
        performance_summary: { overall_score: 85 },
        total_programs: 3,
        total_students: 15,
        strengths: [
          { description_en: 'Excellent goal achievement' },
          { description_en: 'Strong engagement skills' }
        ],
        improvement_areas: [],
        recommendations: []
      }

      // Act
      const highlights = service['generateKeyHighlights'](mockProfile as any)
      const rating = service['calculateOverallRating'](mockProfile.performance_summary as any)

      // Assert
      expect(highlights.length).toBeGreaterThan(0)
      expect(highlights[0]).toContain('Overall performance score: 85')
      expect(rating).toBe('strong') // 85 falls in 'strong' category
    })

    it('should generate visualization configs', () => {
      // Arrange
      const mockProfile = {
        performance_summary: { overall_score: 85 }
      }
      
      const mockConfig = {
        periodStart: '2025-09-01',
        periodEnd: '2025-09-30'
      }

      // Act
      const visualizations = service['generateVisualizationConfigs'](
        mockProfile as any,
        mockConfig
      )

      // Assert
      expect(visualizations.length).toBeGreaterThan(0)
      const firstViz = visualizations[0]
      expect(firstViz.chart_type).toBeDefined()
      expect(firstViz.title_ar).toBeDefined()
      expect(firstViz.title_en).toBeDefined()
      expect(firstViz.metrics_included).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', () => {
      // Arrange & Act
      expect(() => new TherapistPerformanceTrackingService()).not.toThrow()
    })

    it('should handle malformed metric data', async () => {
      // Arrange
      const malformedMetric = {
        ...mockPerformanceMetric,
        metric_value: 'invalid-number' as any,
        metric_type: 'invalid-type' as any
      }
      
      const supabase = await import('@/lib/supabase')
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockFrom = vi.fn(() => ({ insert: mockInsert }))
      supabase.supabase.from = mockFrom
      
      service['updatePerformanceAggregations'] = vi.fn()

      // Act
      const result = await service.recordPerformanceMetric(malformedMetric)

      // Assert
      expect(result.success).toBe(true) // Should handle gracefully
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should handle large metric datasets efficiently', async () => {
      // Arrange
      const largeMetricSet = Array.from({ length: 1000 }, (_, i) => ({
        metric_id: `metric-${i}`,
        therapist_id: mockTherapistId,
        program_template_id: mockProgramTemplateId,
        metric_type: 'goal_achievement',
        measurement_period: 'session',
        metric_value: 80 + (i % 20),
        target_value: 80,
        unit: 'percentage',
        context_data: {},
        measured_at: new Date(2025, 8, 1 + (i % 30)).toISOString(),
        measured_by: 'system'
      }))

      const startTime = performance.now()

      // Act
      const summary = service['calculatePerformanceSummary'](largeMetricSet as any)

      const endTime = performance.now()

      // Assert
      expect(summary).toBeDefined()
      expect(summary.overall_score).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })

  describe('Bilingual Support', () => {
    it('should provide bilingual descriptions in strengths', () => {
      // Arrange
      const highPerformanceSummary = {
        goal_achievement_rate: 90,
        student_engagement_score: 85
      }

      // Act
      const strengths = service['identifyStrengths'](
        highPerformanceSummary as any,
        [],
        undefined
      )

      // Assert
      expect(strengths.length).toBeGreaterThan(0)
      strengths.forEach(strength => {
        expect(strength.description_ar).toBeDefined()
        expect(strength.description_en).toBeDefined()
        expect(strength.description_ar).toMatch(/[\u0600-\u06FF]/) // Contains Arabic characters
        expect(strength.description_en).toMatch(/[a-zA-Z]/) // Contains English characters
      })
    })

    it('should provide bilingual descriptions in improvement areas', () => {
      // Arrange
      const lowPerformanceSummary = {
        attendance_rate: 60
      }

      // Act
      const improvements = service['identifyImprovementAreas'](
        lowPerformanceSummary as any,
        [],
        undefined
      )

      // Assert
      expect(improvements.length).toBeGreaterThan(0)
      improvements.forEach(improvement => {
        expect(improvement.description_ar).toBeDefined()
        expect(improvement.description_en).toBeDefined()
        
        improvement.suggested_interventions.forEach(intervention => {
          expect(intervention.description_ar).toBeDefined()
          expect(intervention.description_en).toBeDefined()
        })
      })
    })
  })
})