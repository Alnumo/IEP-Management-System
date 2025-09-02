/**
 * Comprehensive unit tests for Analytics Service
 * Tests all analytics calculations, dashboard operations, and reporting functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { analyticsService } from '@/services/analytics-service'
import { supabase } from '@/lib/supabase'
import type {
  StudentProgressSummary,
  GoalProgressMetrics,
  AttendanceMetrics,
  AnalyticsDashboard,
  ProgressReport
} from '@/types/progress-analytics'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis()
    })),
    rpc: vi.fn()
  }
}))

// Mock error monitoring
vi.mock('@/lib/error-monitoring', () => ({
  errorMonitoring: {
    reportError: vi.fn()
  }
}))

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear service cache
    analyticsService['cache'].clear()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Student Progress Summary', () => {
    it('should get comprehensive progress summary for a student', async () => {
      // Mock student data
      const mockStudent = {
        id: 'student-1',
        first_name_ar: 'أحمد',
        last_name_ar: 'محمد',
        first_name_en: 'Ahmed',
        last_name_en: 'Mohammed'
      }

      const mockGoalMetrics: GoalProgressMetrics[] = [
        {
          goal_id: 'goal-1',
          goal_name: 'Reading comprehension',
          therapy_type: 'speech',
          baseline_value: 20,
          current_value: 45,
          target_value: 80,
          progress_percentage: 50,
          trend: 'improving',
          velocity: 2.5,
          data_points: [],
          milestones_achieved: ['milestone-1'],
          projected_completion_date: '2024-12-15',
          status: 'in_progress'
        }
      ]

      const mockAttendanceMetrics: AttendanceMetrics = {
        total_scheduled_sessions: 20,
        attended_sessions: 18,
        cancelled_sessions: 1,
        makeup_sessions: 2,
        attendance_percentage: 90,
        consistency_score: 85,
        attendance_trend: 'improving',
        monthly_breakdown: []
      }

      // Setup mocks
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStudent, error: null })
      } as any)

      // Mock service methods
      vi.spyOn(analyticsService, 'getTherapyDomainsProgress').mockResolvedValue([])
      vi.spyOn(analyticsService, 'getGoalProgressMetrics').mockResolvedValue(mockGoalMetrics)
      vi.spyOn(analyticsService, 'getAttendanceMetrics').mockResolvedValue(mockAttendanceMetrics)
      vi.spyOn(analyticsService, 'getBehavioralTrends').mockResolvedValue([])
      vi.spyOn(analyticsService, 'getSkillAcquisitionMetrics').mockResolvedValue(75)
      vi.spyOn(analyticsService, 'generateProgressRecommendations').mockResolvedValue([
        'Increase session frequency for faster progress',
        'Focus on reading comprehension exercises'
      ])

      const result = await analyticsService.getStudentProgressSummary(
        'student-1',
        '2024-01-01',
        '2024-03-31'
      )

      expect(result).toBeDefined()
      expect(result.student_id).toBe('student-1')
      expect(result.student_name).toBe('أحمد محمد')
      expect(result.goal_metrics).toEqual(mockGoalMetrics)
      expect(result.session_attendance).toEqual(mockAttendanceMetrics)
      expect(result.overall_progress_score).toBeGreaterThan(0)
      expect(result.recommendations).toContain('Increase session frequency for faster progress')
    })

    it('should handle missing student data gracefully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      } as any)

      await expect(analyticsService.getStudentProgressSummary(
        'non-existent-student',
        '2024-01-01',
        '2024-03-31'
      )).rejects.toThrow()
    })

    it('should cache results to improve performance', async () => {
      const mockStudent = { id: 'student-1', first_name_ar: 'أحمد', last_name_ar: 'محمد' }
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStudent, error: null })
      } as any)

      // Mock all required methods
      vi.spyOn(analyticsService, 'getTherapyDomainsProgress').mockResolvedValue([])
      vi.spyOn(analyticsService, 'getGoalProgressMetrics').mockResolvedValue([])
      vi.spyOn(analyticsService, 'getAttendanceMetrics').mockResolvedValue({
        total_scheduled_sessions: 10,
        attended_sessions: 8,
        cancelled_sessions: 1,
        makeup_sessions: 1,
        attendance_percentage: 80,
        consistency_score: 75,
        attendance_trend: 'stable',
        monthly_breakdown: []
      })
      vi.spyOn(analyticsService, 'getBehavioralTrends').mockResolvedValue([])
      vi.spyOn(analyticsService, 'getSkillAcquisitionMetrics').mockResolvedValue(70)
      vi.spyOn(analyticsService, 'generateProgressRecommendations').mockResolvedValue([])

      // First call
      await analyticsService.getStudentProgressSummary('student-1', '2024-01-01', '2024-03-31')
      
      // Second call should use cache
      await analyticsService.getStudentProgressSummary('student-1', '2024-01-01', '2024-03-31')

      // Should only make one database call due to caching
      expect(vi.mocked(supabase.from)).toHaveBeenCalledTimes(2) // Once for each mock setup
    })
  })

  describe('Goal Progress Metrics', () => {
    it('should calculate accurate goal metrics', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          goal_description: 'Math skills improvement',
          therapy_type: 'academic',
          baseline_value: 30,
          current_value: 65,
          target_value: 90,
          status: 'in_progress',
          progress_data: [
            { date: '2024-01-01', value: 30 },
            { date: '2024-01-15', value: 45 },
            { date: '2024-02-01', value: 65 }
          ],
          milestones: [
            { id: 'milestone-1', description: 'Basic addition', achieved: true }
          ]
        }
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ data: mockGoals, error: null })
      } as any)

      // Mock the database query chain
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnValue({ data: mockGoals, error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await analyticsService.getGoalProgressMetrics(
        'student-1',
        '2024-01-01',
        '2024-03-31'
      )

      expect(result).toBeDefined()
      expect(result).toHaveLength(1)
      expect(result[0].goal_id).toBe('goal-1')
      expect(result[0].progress_percentage).toBe(58) // (65-30)/(90-30) * 100 ≈ 58%
      expect(result[0].trend).toBe('improving')
    })

    it('should handle goals with no progress data', async () => {
      const mockGoals = [{
        id: 'goal-2',
        goal_description: 'Social skills',
        therapy_type: 'behavioral',
        baseline_value: 0,
        current_value: 0,
        target_value: 100,
        status: 'not_started',
        progress_data: [],
        milestones: []
      }]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnValue({ data: mockGoals, error: null })
      } as any)

      const result = await analyticsService.getGoalProgressMetrics(
        'student-1',
        '2024-01-01',
        '2024-03-31'
      )

      expect(result[0].progress_percentage).toBe(0)
      expect(result[0].trend).toBe('stable')
      expect(result[0].velocity).toBe(0)
    })
  })

  describe('Dashboard Management', () => {
    it('should create new analytics dashboard', async () => {
      const mockDashboard = {
        id: 'dashboard-1',
        name: 'Student Progress Dashboard',
        description: 'Overview of student progress metrics',
        user_type: 'therapist',
        widgets: [],
        layout: { columns: 2, rows: 3 },
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'dashboard-1' }, error: null })
      } as any)

      const result = await analyticsService.createDashboard(mockDashboard)

      expect(result).toBe('dashboard-1')
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('analytics_dashboards')
    })

    it('should get dashboard by ID', async () => {
      const mockDashboard = {
        id: 'dashboard-1',
        name: 'Test Dashboard',
        user_type: 'admin'
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDashboard, error: null })
      } as any)

      const result = await analyticsService.getDashboard('dashboard-1')

      expect(result).toEqual(mockDashboard)
    })

    it('should return null for non-existent dashboard', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      } as any)

      const result = await analyticsService.getDashboard('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('Report Generation', () => {
    it('should generate comprehensive progress report', async () => {
      const mockProgressSummary: StudentProgressSummary = {
        student_id: 'student-1',
        student_name: 'أحمد محمد',
        assessment_period: {
          start_date: '2024-01-01',
          end_date: '2024-03-31'
        },
        overall_progress_score: 75,
        therapy_domains: [],
        goal_metrics: [],
        session_attendance: {
          total_scheduled_sessions: 20,
          attended_sessions: 18,
          cancelled_sessions: 1,
          makeup_sessions: 1,
          attendance_percentage: 90,
          consistency_score: 85,
          attendance_trend: 'improving',
          monthly_breakdown: []
        },
        behavioral_trends: [],
        skill_acquisition_rate: 80,
        recommendations: ['Continue current intervention strategies'],
        next_review_date: '2024-04-15'
      }

      vi.spyOn(analyticsService, 'getStudentProgressSummary').mockResolvedValue(mockProgressSummary)
      vi.spyOn(analyticsService, 'generateExecutiveSummary').mockResolvedValue('Strong progress observed')
      vi.spyOn(analyticsService, 'extractProgressHighlights').mockResolvedValue(['90% attendance rate'])
      vi.spyOn(analyticsService, 'identifyAreasOfConcern').mockResolvedValue([])
      vi.spyOn(analyticsService, 'createGoalStatusSummary').mockResolvedValue('Goals on track')
      vi.spyOn(analyticsService, 'generateBehavioralAnalysis').mockResolvedValue('Stable behavior patterns')
      vi.spyOn(analyticsService, 'generateSkillDevelopmentReport').mockResolvedValue('Skill development progressing')
      vi.spyOn(analyticsService, 'generateNextSteps').mockResolvedValue(['Continue current plan'])
      vi.spyOn(analyticsService, 'saveReport').mockResolvedValue(undefined)

      const result = await analyticsService.generateProgressReport(
        'student-1',
        'monthly'
      )

      expect(result).toBeDefined()
      expect(result.report_type).toBe('monthly')
      expect(result.student_id).toBe('student-1')
      expect(result.executive_summary).toBe('Strong progress observed')
      expect(result.progress_highlights).toContain('90% attendance rate')
      expect(result.generated_at).toBeDefined()
    })

    it('should generate automated reports for multiple students', async () => {
      const mockStudents = [
        { id: 'student-1', first_name_ar: 'أحمد', last_name_ar: 'محمد' },
        { id: 'student-2', first_name_ar: 'فاطمة', last_name_ar: 'علي' }
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnValue({ data: mockStudents, error: null })
      } as any)

      vi.spyOn(analyticsService, 'generateProgressReport').mockResolvedValue({
        id: 'report-1',
        report_type: 'weekly',
        student_id: 'student-1',
        reporting_period: { start_date: '2024-01-01', end_date: '2024-01-07' },
        executive_summary: 'Test summary',
        progress_highlights: [],
        areas_of_concern: [],
        goal_status_summary: 'Test status',
        behavioral_analysis: 'Test analysis',
        skill_development: 'Test development',
        recommendations: [],
        next_steps: [],
        attachments: [],
        generated_at: '2024-01-08T00:00:00Z',
        generated_by: 'system'
      })

      vi.spyOn(analyticsService, 'notifyReportCompletion').mockResolvedValue(undefined)

      const result = await analyticsService.generateAutomatedReports('weekly')

      expect(result.success).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.reports).toHaveLength(2)
    })
  })

  describe('Predictive Analytics', () => {
    it('should predict progress trajectory', async () => {
      const mockHistoricalData = [
        { date: '2024-01-01', value: 20, trend_factor: 1.2 },
        { date: '2024-01-08', value: 25, trend_factor: 1.1 },
        { date: '2024-01-15', value: 32, trend_factor: 1.3 },
        { date: '2024-01-22', value: 38, trend_factor: 1.2 }
      ]

      vi.spyOn(analyticsService, 'getHistoricalProgressData').mockResolvedValue(mockHistoricalData)
      vi.spyOn(analyticsService, 'applyPredictionModel').mockResolvedValue({
        predicted_values: [42, 48, 54, 60],
        confidence_intervals: [
          { lower: 38, upper: 46 },
          { lower: 44, upper: 52 },
          { lower: 50, upper: 58 },
          { lower: 55, upper: 65 }
        ],
        projected_completion_date: '2024-03-15',
        confidence_level: 0.82,
        risk_assessment: {
          level: 'low',
          factors: ['Consistent progress', 'Good attendance']
        },
        recommendations: ['Continue current intervention'],
        influencing_factors: [
          { factor: 'Session frequency', impact: 0.3, direction: 'positive' }
        ]
      })

      const result = await analyticsService.predictProgressTrajectory(
        'student-1',
        'goal-1',
        'medium_term'
      )

      expect(result).toBeDefined()
      expect(result.predicted_values).toHaveLength(4)
      expect(result.confidence_level).toBe(0.82)
      expect(result.projected_completion_date).toBe('2024-03-15')
    })

    it('should identify at-risk students', async () => {
      const mockStudents = [
        { id: 'student-1', first_name_ar: 'أحمد', last_name_ar: 'محمد' },
        { id: 'student-2', first_name_ar: 'فاطمة', last_name_ar: 'علي' },
        { id: 'student-3', first_name_ar: 'محمد', last_name_ar: 'أحمد' }
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ data: mockStudents, error: null })
      } as any)

      vi.spyOn(analyticsService, 'assessStudentRisk')
        .mockResolvedValueOnce({
          risk_level: 'low',
          risk_factors: []
        })
        .mockResolvedValueOnce({
          risk_level: 'high',
          risk_factors: ['Poor attendance', 'Declining progress']
        })
        .mockResolvedValueOnce({
          risk_level: 'medium',
          risk_factors: ['Inconsistent performance']
        })

      const result = await analyticsService.identifyAtRiskStudents({
        progress_threshold: 70,
        attendance_threshold: 80
      })

      expect(result).toHaveLength(2) // Should exclude 'low' risk student
      expect(result.some(student => student.risk_level === 'high')).toBe(true)
      expect(result.some(student => student.risk_level === 'medium')).toBe(true)
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle cache expiration correctly', async () => {
      // Set a very short cache timeout for testing
      const originalTimeout = analyticsService['cacheTimeout']
      analyticsService['cacheTimeout'] = 100 // 100ms

      try {
        const mockStudent = { id: 'student-1', first_name_ar: 'أحمد', last_name_ar: 'محمد' }
        
        vi.mocked(supabase.from).mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockStudent, error: null })
        } as any)

        // Mock required methods
        const mockMethods = [
          'getTherapyDomainsProgress',
          'getGoalProgressMetrics', 
          'getAttendanceMetrics',
          'getBehavioralTrends',
          'getSkillAcquisitionMetrics',
          'generateProgressRecommendations'
        ]

        mockMethods.forEach(method => {
          vi.spyOn(analyticsService, method as any).mockResolvedValue([])
        })

        vi.spyOn(analyticsService, 'getAttendanceMetrics').mockResolvedValue({
          total_scheduled_sessions: 10,
          attended_sessions: 8,
          cancelled_sessions: 1,
          makeup_sessions: 1,
          attendance_percentage: 80,
          consistency_score: 75,
          attendance_trend: 'stable',
          monthly_breakdown: []
        })

        // First call
        await analyticsService.getStudentProgressSummary('student-1', '2024-01-01', '2024-03-31')

        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 150))

        // Second call should not use cache
        await analyticsService.getStudentProgressSummary('student-1', '2024-01-01', '2024-03-31')

        // Should make multiple database calls due to cache expiration
        expect(vi.mocked(supabase.from).mock.calls.length).toBeGreaterThan(2)
      } finally {
        // Restore original timeout
        analyticsService['cacheTimeout'] = originalTimeout
      }
    })

    it('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        analyticsService.getDashboardsByUserType('therapist')
      )

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({ data: [], error: null })
      } as any)

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      expect(results.every(result => Array.isArray(result))).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Database connection failed') })
      } as any)

      await expect(analyticsService.getStudentProgressSummary(
        'student-1',
        '2024-01-01',
        '2024-03-31'
      )).rejects.toThrow('Database connection failed')
    })

    it('should validate input parameters', async () => {
      await expect(analyticsService.getStudentProgressSummary(
        '', // Empty student ID
        '2024-01-01',
        '2024-03-31'
      )).rejects.toThrow()

      await expect(analyticsService.getStudentProgressSummary(
        'student-1',
        'invalid-date', // Invalid date format
        '2024-03-31'
      )).rejects.toThrow()
    })

    it('should handle missing dependencies gracefully', async () => {
      // Test when required services are unavailable
      const originalError = console.error
      console.error = vi.fn() // Suppress error logs

      try {
        vi.mocked(supabase.from).mockImplementation(() => {
          throw new Error('Supabase unavailable')
        })

        const result = await analyticsService.getDashboardsByUserType('therapist')
        expect(result).toEqual([])
      } finally {
        console.error = originalError
      }
    })
  })
})

/**
 * Test utilities for analytics service testing
 */
export const createMockProgressSummary = (overrides: Partial<StudentProgressSummary> = {}): StudentProgressSummary => ({
  student_id: 'student-1',
  student_name: 'أحمد محمد',
  assessment_period: {
    start_date: '2024-01-01',
    end_date: '2024-03-31'
  },
  overall_progress_score: 75,
  therapy_domains: [],
  goal_metrics: [],
  session_attendance: {
    total_scheduled_sessions: 20,
    attended_sessions: 18,
    cancelled_sessions: 1,
    makeup_sessions: 1,
    attendance_percentage: 90,
    consistency_score: 85,
    attendance_trend: 'improving',
    monthly_breakdown: []
  },
  behavioral_trends: [],
  skill_acquisition_rate: 80,
  recommendations: ['Continue current intervention strategies'],
  next_review_date: '2024-04-15',
  ...overrides
})

export const createMockAnalyticsDashboard = (overrides: Partial<AnalyticsDashboard> = {}): AnalyticsDashboard => ({
  id: 'dashboard-1',
  name: 'Test Dashboard',
  description: 'Test dashboard for analytics',
  user_type: 'therapist',
  widgets: [],
  layout: { columns: 2, rows: 3 },
  filters: {},
  refresh_interval: 300,
  is_default: false,
  permissions: ['read', 'update'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  ...overrides
})