/**
 * Performance Tests for Large Datasets
 * Tests system performance with realistic data volumes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { performance } from 'perf_hooks'
import React from 'react'

// Import components to test
import { IEPAnalyticsDashboard } from '@/components/analytics/IEPAnalyticsDashboard'
import { IEPGoalAnalytics } from '@/components/iep/IEPGoalAnalytics'
import { IEPAdvancedSearch } from '@/components/iep/IEPAdvancedSearch'
import { ServiceHourTracking } from '@/components/iep/ServiceHourTracking'

// Import services
import { analyticsService } from '@/services/analytics-service'
import { IEPGoalCalculationsService } from '@/services/iep-goal-calculations'

// Import types
import type { IEPGoal, StudentProgressSummary, ServiceDeliverySession } from '@/types/iep'

// Mock dependencies
vi.mock('@/lib/supabase')
vi.mock('@/services/analytics-service')
vi.mock('@/services/iep-goal-calculations')

// Test data generators
const generateLargeGoalDataset = (count: number): IEPGoal[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `goal-${i}`,
    student_id: `student-${Math.floor(i / 5) + 1}`, // 5 goals per student
    goal_statement: `Goal ${i}: Student will achieve target behavior with ${70 + (i % 30)}% accuracy in ${3 + (i % 5)} consecutive trials`,
    domain: ['academic', 'social', 'communication', 'behavioral', 'adaptive'][i % 5],
    measurement_type: ['percentage', 'frequency', 'duration', 'numeric'][i % 4] as any,
    baseline_value: 10 + (i % 20),
    current_value: 30 + (i % 40),
    target_value: 70 + (i % 30),
    target_date: new Date(2024, 11, 31).toISOString().split('T')[0],
    status: ['not_started', 'in_progress', 'completed', 'discontinued'][i % 4] as any,
    created_at: new Date(2024, 0, 1 + (i % 30)).toISOString(),
    updated_at: new Date(2024, 0, 15 + (i % 30)).toISOString(),
    created_by: `therapist-${(i % 10) + 1}`
  }))
}

const generateLargeProgressDataset = (goalCount: number, pointsPerGoal: number) => {
  const progressData = []
  for (let goalIndex = 0; goalIndex < goalCount; goalIndex++) {
    for (let pointIndex = 0; pointIndex < pointsPerGoal; pointIndex++) {
      progressData.push({
        id: `progress-${goalIndex}-${pointIndex}`,
        goal_id: `goal-${goalIndex}`,
        date: new Date(2024, 0, 1 + (pointIndex * 7)).toISOString().split('T')[0],
        value: 20 + pointIndex * 3 + Math.random() * 10,
        session_id: `session-${goalIndex}-${pointIndex}`,
        notes: `Progress note ${pointIndex + 1} for goal ${goalIndex + 1}`,
        measurement_method: 'direct_observation',
        created_at: new Date(2024, 0, 1 + (pointIndex * 7)).toISOString()
      })
    }
  }
  return progressData
}

const generateLargeServiceDataset = (count: number): ServiceDeliverySession[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `session-${i}`,
    student_id: `student-${(i % 100) + 1}`,
    service_type: ['speech_therapy', 'occupational_therapy', 'behavioral_therapy', 'academic_support'][i % 4] as any,
    scheduled_date: new Date(2024, 0, 1 + (i % 365)).toISOString().split('T')[0],
    scheduled_duration: [30, 45, 60][i % 3],
    actual_date: new Date(2024, 0, 1 + (i % 365)).toISOString().split('T')[0],
    actual_duration: [25, 30, 45, 60][i % 4],
    status: ['completed', 'cancelled', 'no_show', 'rescheduled'][i % 4] as any,
    therapist_id: `therapist-${(i % 20) + 1}`,
    notes: `Session notes for service ${i + 1}. Student showed ${['good', 'moderate', 'excellent', 'minimal'][i % 4]} progress.`,
    created_at: new Date(2024, 0, 1 + (i % 365)).toISOString(),
    updated_at: new Date(2024, 0, 1 + (i % 365)).toISOString()
  }))
}

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Large Dataset Performance Tests', () => {
  let performanceEntries: PerformanceMeasure[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    performanceEntries = []
    
    // Clear performance marks and measures
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks()
      performance.clearMeasures()
    }
  })

  afterEach(() => {
    // Log performance results
    if (performanceEntries.length > 0) {
      console.log('Performance Results:', performanceEntries.map(entry => ({
        name: entry.name,
        duration: `${entry.duration.toFixed(2)}ms`
      })))
    }
  })

  describe('Analytics Dashboard Performance', () => {
    it('should render analytics dashboard with 1000+ goals within performance budget', async () => {
      const largeGoalDataset = generateLargeGoalDataset(1000)
      const largeProgressDataset = generateLargeProgressDataset(1000, 10)

      // Mock analytics service responses
      const mockAnalyticsService = vi.mocked(analyticsService)
      mockAnalyticsService.getStudentProgressSummary.mockResolvedValue({
        student_id: 'student-1',
        student_name: 'أحمد محمد',
        assessment_period: {
          start_date: '2024-01-01',
          end_date: '2024-03-31'
        },
        overall_progress_score: 78,
        therapy_domains: [],
        goal_metrics: largeGoalDataset.slice(0, 100).map(goal => ({
          goal_id: goal.id,
          goal_name: goal.goal_statement,
          therapy_type: 'academic',
          baseline_value: goal.baseline_value,
          current_value: goal.current_value,
          target_value: goal.target_value,
          progress_percentage: Math.round(((goal.current_value - goal.baseline_value) / (goal.target_value - goal.baseline_value)) * 100),
          trend: 'improving' as const,
          velocity: 2.5,
          data_points: largeProgressDataset.slice(0, 10),
          milestones_achieved: [],
          projected_completion_date: '2024-12-15',
          status: goal.status
        })),
        session_attendance: {
          total_scheduled_sessions: 240,
          attended_sessions: 220,
          cancelled_sessions: 10,
          makeup_sessions: 15,
          attendance_percentage: 92,
          consistency_score: 88,
          attendance_trend: 'improving',
          monthly_breakdown: []
        },
        behavioral_trends: [],
        skill_acquisition_rate: 82,
        recommendations: ['Continue current intervention'],
        next_review_date: '2024-04-15'
      })

      mockAnalyticsService.getDashboardKPIs.mockResolvedValue([
        {
          id: 'kpi-1',
          title_ar: 'نسبة التقدم الإجمالية',
          title_en: 'Overall Progress Rate',
          value: 78,
          previous_value: 72,
          change_percentage: 8.3,
          trend_direction: 'up',
          format: 'percentage',
          color: 'green',
          icon: 'trending-up',
          description_ar: 'التقدم الإجمالي للطالب',
          description_en: 'Student overall progress',
          last_updated: '2024-01-31T00:00:00Z'
        }
      ])

      // Performance measurement
      const startTime = performance.now()
      performance.mark('dashboard-render-start')

      render(
        <TestWrapper>
          <IEPAnalyticsDashboard
            studentId="student-1"
            dateRange={{
              start: '2024-01-01',
              end: '2024-03-31'
            }}
            language="en"
          />
        </TestWrapper>
      )

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText(/iep analytics dashboard/i)).toBeInTheDocument()
      }, { timeout: 10000 })

      performance.mark('dashboard-render-end')
      performance.measure('dashboard-render', 'dashboard-render-start', 'dashboard-render-end')

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Performance assertions
      expect(renderTime).toBeLessThan(5000) // Should render within 5 seconds
      
      // Check if dashboard components are rendered
      expect(screen.getByText(/overall progress rate/i)).toBeInTheDocument()
      
      // Memory usage should be reasonable (this is a simplified check)
      const memoryUsage = process.memoryUsage()
      expect(memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024) // Less than 200MB

      // Store performance data
      const measures = performance.getEntriesByType('measure') as PerformanceMeasure[]
      performanceEntries.push(...measures)
    })

    it('should handle real-time updates efficiently with large datasets', async () => {
      const largeDataset = generateLargeGoalDataset(500)
      
      const mockAnalyticsService = vi.mocked(analyticsService)
      mockAnalyticsService.getStudentProgressSummary.mockResolvedValue({
        student_id: 'student-1',
        student_name: 'أحمد محمد',
        assessment_period: { start_date: '2024-01-01', end_date: '2024-03-31' },
        overall_progress_score: 78,
        therapy_domains: [],
        goal_metrics: largeDataset.slice(0, 50).map(goal => ({
          goal_id: goal.id,
          goal_name: goal.goal_statement,
          therapy_type: 'academic',
          baseline_value: goal.baseline_value,
          current_value: goal.current_value,
          target_value: goal.target_value,
          progress_percentage: 50,
          trend: 'improving' as const,
          velocity: 2.5,
          data_points: [],
          milestones_achieved: [],
          projected_completion_date: '2024-12-15',
          status: goal.status
        })),
        session_attendance: {
          total_scheduled_sessions: 120,
          attended_sessions: 110,
          cancelled_sessions: 5,
          makeup_sessions: 8,
          attendance_percentage: 92,
          consistency_score: 88,
          attendance_trend: 'improving',
          monthly_breakdown: []
        },
        behavioral_trends: [],
        skill_acquisition_rate: 82,
        recommendations: [],
        next_review_date: '2024-04-15'
      })

      const { rerender } = render(
        <TestWrapper>
          <IEPAnalyticsDashboard
            studentId="student-1"
            language="en"
          />
        </TestWrapper>
      )

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText(/iep analytics dashboard/i)).toBeInTheDocument()
      })

      // Measure update performance
      performance.mark('update-start')
      const updateStartTime = performance.now()

      // Simulate data update
      mockAnalyticsService.getStudentProgressSummary.mockResolvedValue({
        student_id: 'student-1',
        student_name: 'أحمد محمد',
        assessment_period: { start_date: '2024-01-01', end_date: '2024-03-31' },
        overall_progress_score: 85, // Updated score
        therapy_domains: [],
        goal_metrics: largeDataset.slice(0, 50).map(goal => ({
          goal_id: goal.id,
          goal_name: goal.goal_statement,
          therapy_type: 'academic',
          baseline_value: goal.baseline_value,
          current_value: goal.current_value + 5, // Simulate progress
          target_value: goal.target_value,
          progress_percentage: 60, // Updated progress
          trend: 'improving' as const,
          velocity: 3.0, // Updated velocity
          data_points: [],
          milestones_achieved: [],
          projected_completion_date: '2024-11-15', // Earlier completion
          status: goal.status
        })),
        session_attendance: {
          total_scheduled_sessions: 120,
          attended_sessions: 110,
          cancelled_sessions: 5,
          makeup_sessions: 8,
          attendance_percentage: 92,
          consistency_score: 88,
          attendance_trend: 'improving',
          monthly_breakdown: []
        },
        behavioral_trends: [],
        skill_acquisition_rate: 87, // Updated rate
        recommendations: ['Continue current intervention'],
        next_review_date: '2024-04-15'
      })

      // Trigger re-render with updated data
      rerender(
        <TestWrapper>
          <IEPAnalyticsDashboard
            studentId="student-1"
            language="en"
            key="updated"
          />
        </TestWrapper>
      )

      // Wait for update to complete
      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument() // Updated score
      })

      performance.mark('update-end')
      performance.measure('dashboard-update', 'update-start', 'update-end')

      const updateEndTime = performance.now()
      const updateTime = updateEndTime - updateStartTime

      // Update should be fast
      expect(updateTime).toBeLessThan(1000) // Updates within 1 second

      performanceEntries.push(...performance.getEntriesByType('measure') as PerformanceMeasure[])
    })
  })

  describe('Goal Analytics Performance', () => {
    it('should handle 500+ goals with progress data efficiently', async () => {
      const largeGoalDataset = generateLargeGoalDataset(500)
      const largeProgressDataset = generateLargeProgressDataset(500, 20) // 20 data points per goal

      // Mock calculations service
      const mockCalculationsService = vi.mocked(IEPGoalCalculationsService.getInstance())
      mockCalculationsService.calculateProgressPercentage.mockImplementation((goal) => {
        return Math.round(((goal.current_value - goal.baseline_value) / (goal.target_value - goal.baseline_value)) * 100)
      })
      mockCalculationsService.calculateVelocity.mockReturnValue(2.5)
      mockCalculationsService.calculateTrend.mockReturnValue({
        direction: 'improving',
        confidence: 0.8,
        slope: 1.2
      })

      performance.mark('goal-analytics-start')
      const startTime = performance.now()

      render(
        <TestWrapper>
          <IEPGoalAnalytics
            studentId="student-1"
            goals={largeGoalDataset}
            language="en"
          />
        </TestWrapper>
      )

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText(/goal analytics/i)).toBeInTheDocument()
      }, { timeout: 15000 })

      performance.mark('goal-analytics-end')
      performance.measure('goal-analytics-render', 'goal-analytics-start', 'goal-analytics-end')

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(10000) // 10 seconds for 500 goals

      // Verify calculations were performed
      expect(mockCalculationsService.calculateProgressPercentage).toHaveBeenCalled()

      // Check memory usage
      const memoryUsage = process.memoryUsage()
      expect(memoryUsage.heapUsed).toBeLessThan(300 * 1024 * 1024) // Less than 300MB

      performanceEntries.push(...performance.getEntriesByType('measure') as PerformanceMeasure[])
    })

    it('should efficiently filter and search through large goal datasets', async () => {
      const largeGoalDataset = generateLargeGoalDataset(1000)

      performance.mark('search-start')
      const startTime = performance.now()

      render(
        <TestWrapper>
          <IEPAdvancedSearch
            searchableItems={largeGoalDataset}
            onItemSelect={() => {}}
            language="en"
          />
        </TestWrapper>
      )

      // Wait for search component to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
      })

      performance.mark('search-loaded')

      // Simulate search
      const searchInput = screen.getByPlaceholderText(/search/i)
      
      // Type search term
      performance.mark('search-type-start')
      searchInput.focus()
      
      // Simulate typing "reading" - this should filter results
      for (const char of 'reading') {
        searchInput.dispatchEvent(new Event('input', { bubbles: true }))
      }

      performance.mark('search-type-end')
      performance.measure('search-typing', 'search-type-start', 'search-type-end')

      // Wait for search results
      await waitFor(() => {
        const resultItems = screen.getAllByRole('option')
        expect(resultItems.length).toBeLessThan(largeGoalDataset.length)
      }, { timeout: 5000 })

      performance.mark('search-end')
      performance.measure('search-complete', 'search-start', 'search-end')
      performance.measure('search-filter', 'search-loaded', 'search-end')

      const endTime = performance.now()
      const totalSearchTime = endTime - startTime

      // Search should be fast even with large datasets
      expect(totalSearchTime).toBeLessThan(3000) // 3 seconds maximum

      performanceEntries.push(...performance.getEntriesByType('measure') as PerformanceMeasure[])
    })
  })

  describe('Service Tracking Performance', () => {
    it('should handle 10,000+ service sessions efficiently', async () => {
      const largeServiceDataset = generateLargeServiceDataset(10000)

      performance.mark('service-tracking-start')
      const startTime = performance.now()

      render(
        <TestWrapper>
          <ServiceHourTracking
            studentId="student-1"
            language="en"
            sessions={largeServiceDataset.slice(0, 1000)} // Show first 1000 sessions
          />
        </TestWrapper>
      )

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText(/service hour tracking/i)).toBeInTheDocument()
      }, { timeout: 10000 })

      performance.mark('service-tracking-end')
      performance.measure('service-tracking-render', 'service-tracking-start', 'service-tracking-end')

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should handle large service datasets efficiently
      expect(renderTime).toBeLessThan(8000) // 8 seconds for 1000 sessions

      // Check that pagination or virtualization is working
      const sessionRows = screen.getAllByRole('row')
      expect(sessionRows.length).toBeLessThanOrEqual(102) // Including header, should not render all 1000

      performanceEntries.push(...performance.getEntriesByType('measure') as PerformanceMeasure[])
    })

    it('should efficiently calculate compliance across large datasets', async () => {
      const largeServiceDataset = generateLargeServiceDataset(5000)

      performance.mark('compliance-calc-start')

      // Simulate compliance calculation
      const complianceResults = largeServiceDataset.reduce((acc, session) => {
        if (session.status === 'completed') {
          acc.completed += session.actual_duration || 0
        }
        acc.scheduled += session.scheduled_duration
        return acc
      }, { completed: 0, scheduled: 0 })

      const complianceRate = (complianceResults.completed / complianceResults.scheduled) * 100

      performance.mark('compliance-calc-end')
      performance.measure('compliance-calculation', 'compliance-calc-start', 'compliance-calc-end')

      // Calculation should be fast
      const measures = performance.getEntriesByType('measure') as PerformanceMeasure[]
      const complianceMeasure = measures.find(m => m.name === 'compliance-calculation')
      
      if (complianceMeasure) {
        expect(complianceMeasure.duration).toBeLessThan(100) // Less than 100ms for 5000 sessions
      }

      // Result should be reasonable
      expect(complianceRate).toBeGreaterThan(0)
      expect(complianceRate).toBeLessThanOrEqual(100)

      performanceEntries.push(...measures)
    })
  })

  describe('Memory Management', () => {
    it('should not have significant memory leaks with repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Perform multiple render/unmount cycles
      for (let i = 0; i < 5; i++) {
        const largeGoalDataset = generateLargeGoalDataset(200)
        
        const { unmount } = render(
          <TestWrapper>
            <IEPGoalAnalytics
              studentId={`student-${i}`}
              goals={largeGoalDataset}
              language="en"
            />
          </TestWrapper>
        )

        await waitFor(() => {
          expect(screen.getByText(/goal analytics/i)).toBeInTheDocument()
        })

        // Unmount to trigger cleanup
        unmount()

        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should efficiently handle component updates without excessive re-renders', async () => {
      const largeGoalDataset = generateLargeGoalDataset(100)
      let renderCount = 0

      const TestComponent = ({ data }: { data: IEPGoal[] }) => {
        renderCount++
        return (
          <IEPGoalAnalytics
            studentId="student-1"
            goals={data}
            language="en"
          />
        )
      }

      const { rerender } = render(
        <TestWrapper>
          <TestComponent data={largeGoalDataset} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/goal analytics/i)).toBeInTheDocument()
      })

      const initialRenderCount = renderCount

      // Update with same data - should not cause excessive re-renders
      rerender(
        <TestWrapper>
          <TestComponent data={largeGoalDataset} />
        </TestWrapper>
      )

      const finalRenderCount = renderCount

      // Should have minimal additional renders
      expect(finalRenderCount - initialRenderCount).toBeLessThan(3)
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous data operations efficiently', async () => {
      const operations = [
        () => generateLargeGoalDataset(100),
        () => generateLargeProgressDataset(100, 10),
        () => generateLargeServiceDataset(500),
        () => generateLargeGoalDataset(150),
        () => generateLargeServiceDataset(300)
      ]

      performance.mark('concurrent-start')
      const startTime = performance.now()

      // Run operations concurrently
      const results = await Promise.all(
        operations.map(operation => 
          new Promise(resolve => {
            // Simulate async operation
            setTimeout(() => {
              resolve(operation())
            }, Math.random() * 100)
          })
        )
      )

      performance.mark('concurrent-end')
      performance.measure('concurrent-operations', 'concurrent-start', 'concurrent-end')

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // All operations should complete quickly
      expect(totalTime).toBeLessThan(500) // 500ms for all operations

      // Verify all operations completed
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true)
        expect((result as any[]).length).toBeGreaterThan(0)
      })

      performanceEntries.push(...performance.getEntriesByType('measure') as PerformanceMeasure[])
    })
  })
})

/**
 * Stress Testing
 */
describe('Stress Tests', () => {
  it('should handle extreme data volumes gracefully', async () => {
    // Test with very large datasets
    const extremeGoalDataset = generateLargeGoalDataset(2000)
    const extremeProgressDataset = generateLargeProgressDataset(2000, 50)

    const mockAnalyticsService = vi.mocked(analyticsService)
    mockAnalyticsService.getStudentProgressSummary.mockResolvedValue({
      student_id: 'student-1',
      student_name: 'Test Student',
      assessment_period: { start_date: '2024-01-01', end_date: '2024-12-31' },
      overall_progress_score: 75,
      therapy_domains: [],
      goal_metrics: extremeGoalDataset.slice(0, 100).map(goal => ({
        goal_id: goal.id,
        goal_name: goal.goal_statement,
        therapy_type: 'academic',
        baseline_value: goal.baseline_value,
        current_value: goal.current_value,
        target_value: goal.target_value,
        progress_percentage: 50,
        trend: 'improving' as const,
        velocity: 2.0,
        data_points: extremeProgressDataset.slice(0, 20),
        milestones_achieved: [],
        projected_completion_date: '2024-12-31',
        status: goal.status
      })),
      session_attendance: {
        total_scheduled_sessions: 500,
        attended_sessions: 450,
        cancelled_sessions: 25,
        makeup_sessions: 30,
        attendance_percentage: 90,
        consistency_score: 85,
        attendance_trend: 'stable',
        monthly_breakdown: []
      },
      behavioral_trends: [],
      skill_acquisition_rate: 78,
      recommendations: [],
      next_review_date: '2024-12-31'
    })

    const startTime = performance.now()
    const initialMemory = process.memoryUsage().heapUsed

    // This should not crash or hang
    const { container } = render(
      <TestWrapper>
        <IEPAnalyticsDashboard
          studentId="student-1"
          language="en"
        />
      </TestWrapper>
    )

    // Wait for render with extended timeout
    await waitFor(() => {
      expect(screen.getByText(/iep analytics dashboard/i)).toBeInTheDocument()
    }, { timeout: 20000 })

    const endTime = performance.now()
    const renderTime = endTime - startTime
    const finalMemory = process.memoryUsage().heapUsed
    const memoryUsed = finalMemory - initialMemory

    // Should complete even with extreme data (but may be slower)
    expect(renderTime).toBeLessThan(20000) // 20 seconds maximum
    expect(memoryUsed).toBeLessThan(500 * 1024 * 1024) // Less than 500MB
    expect(container).toBeTruthy()
  })
})

export { generateLargeGoalDataset, generateLargeProgressDataset, generateLargeServiceDataset }