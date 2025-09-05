// Story 6.1: Unit tests for EnrollmentProgressTracker component

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EnrollmentProgressTracker } from '@/components/students/EnrollmentProgressTracker'
import type { IndividualizedEnrollment } from '@/types/individualized-enrollment'
import type { ProgramTemplate } from '@/types/program-templates'

// Mock the language context
const mockLanguageContext = {
  language: 'en' as const,
  isRTL: false,
  setLanguage: vi.fn(),
  toggleLanguage: vi.fn()
}

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockLanguageContext
}))

describe('EnrollmentProgressTracker', () => {
  const mockEnrollment: IndividualizedEnrollment = {
    id: 'enrollment-1',
    student_id: 'student-1',
    program_template_id: 'template-1',
    assigned_therapist_id: 'therapist-1',
    individual_start_date: '2025-01-01',
    individual_end_date: '2025-06-01',
    custom_schedule: {
      sessions_per_week: 2,
      session_duration_minutes: 60,
      preferred_days: ['monday', 'wednesday'],
      preferred_times: ['09:00', '10:00']
    },
    program_modifications: {},
    enrollment_status: 'active',
    notes: 'Test enrollment',
    created_at: '2025-01-01',
    updated_at: '2025-01-01'
  }

  const mockProgramTemplate: ProgramTemplate = {
    id: 'template-1',
    program_type: 'growth_program',
    program_name_ar: 'برنامج النمو',
    program_name_en: 'Growth Program',
    description_ar: 'برنامج شامل لتطوير المهارات',
    description_en: 'Comprehensive skills development program',
    base_duration_weeks: 24,
    base_sessions_per_week: 2,
    default_goals: [
      { goal_ar: 'تطوير التواصل', goal_en: 'Develop communication', priority: 'high' }
    ],
    customization_options: {
      schedule_flexibility: true,
      therapist_rotation: false,
      intensity_levels: ['low', 'medium', 'high'],
      assessment_frequency: 'monthly',
      goal_customization: true,
      duration_flexibility: true,
      session_count_flexibility: false
    },
    is_active: true,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    created_by: 'admin',
    updated_by: 'admin',
    metadata: {}
  }

  const mockSessionHistory = [
    {
      id: 'session-1',
      session_date: '2025-01-05',
      session_type: 'Individual Therapy',
      duration_minutes: 60,
      goals_addressed: ['Develop communication'],
      progress_rating: 4 as const,
      therapist_notes: 'Good progress today',
      attendance_status: 'present' as const,
      behavioral_observations: {
        cooperation: 4 as const,
        engagement: 5 as const,
        communication: 3 as const,
        focus: 4 as const
      }
    },
    {
      id: 'session-2',
      session_date: '2025-01-08',
      session_type: 'Individual Therapy',
      duration_minutes: 60,
      goals_addressed: ['Develop communication'],
      progress_rating: 5 as const,
      therapist_notes: 'Excellent session',
      attendance_status: 'present' as const,
      behavioral_observations: {
        cooperation: 5 as const,
        engagement: 5 as const,
        communication: 4 as const,
        focus: 5 as const
      }
    }
  ]

  const mockGoalProgress = [
    {
      goal_id: 'goal-1',
      goal_text_ar: 'تطوير التواصل',
      goal_text_en: 'Develop communication',
      target_date: '2025-03-01',
      current_progress: 75,
      milestone_count: 4,
      completed_milestones: 3,
      priority: 'high' as const,
      status: 'on_track' as const,
      last_assessed: '2025-01-08'
    },
    {
      goal_id: 'goal-2',
      goal_text_ar: 'تحسين التركيز',
      goal_text_en: 'Improve focus',
      target_date: '2025-04-01',
      current_progress: 45,
      milestone_count: 3,
      completed_milestones: 1,
      priority: 'medium' as const,
      status: 'at_risk' as const,
      last_assessed: '2025-01-08'
    }
  ]

  const defaultProps = {
    enrollment: mockEnrollment,
    programTemplate: mockProgramTemplate,
    sessionHistory: mockSessionHistory,
    goalProgress: mockGoalProgress,
    onUpdateProgress: vi.fn(),
    onAddMilestone: vi.fn(),
    onGenerateReport: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders component title correctly', () => {
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      expect(screen.getByText('Enrollment Progress Tracker')).toBeInTheDocument()
    })

    it('renders statistics cards', () => {
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      expect(screen.getByText('Completion Rate')).toBeInTheDocument()
      expect(screen.getByText('Attendance Rate')).toBeInTheDocument()
      expect(screen.getByText('Average Rating')).toBeInTheDocument()
      expect(screen.getByText('Completed Sessions')).toBeInTheDocument()
    })

    it('renders tab navigation', () => {
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /goals/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /sessions/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument()
    })

    it('renders generate report button when handler provided', () => {
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument()
    })

    it('does not render generate report button when handler not provided', () => {
      const { onGenerateReport, ...propsWithoutReport } = defaultProps
      render(<EnrollmentProgressTracker {...propsWithoutReport} />)
      
      expect(screen.queryByRole('button', { name: /generate report/i })).not.toBeInTheDocument()
    })
  })

  describe('Statistics Calculation', () => {
    it('calculates completion rate correctly', () => {
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      // Should show some completion percentage
      const completionElements = screen.getAllByText(/\d+\.\d+%/)
      expect(completionElements.length).toBeGreaterThan(0)
    })

    it('calculates attendance rate correctly', () => {
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      // With 2 present sessions out of 2 total, should be 100%
      expect(screen.getByText('100.0%')).toBeInTheDocument()
    })

    it('calculates average rating correctly', () => {
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      // Average of ratings 4 and 5 should be 4.5
      expect(screen.getByText('4.5/5')).toBeInTheDocument()
    })
  })

  describe('Arabic Language Support', () => {
    beforeEach(() => {
      mockLanguageContext.language = 'ar'
      mockLanguageContext.isRTL = true
    })

    afterEach(() => {
      mockLanguageContext.language = 'en'
      mockLanguageContext.isRTL = false
    })

    it('renders Arabic title when language is Arabic', () => {
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      expect(screen.getByText('تتبع تقدم التسجيل')).toBeInTheDocument()
    })

    it('renders Arabic field labels', () => {
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      expect(screen.getByText('نظرة عامة')).toBeInTheDocument()
      expect(screen.getByText('الأهداف')).toBeInTheDocument()
      expect(screen.getByText('الجلسات')).toBeInTheDocument()
    })

    it('displays Arabic goal text', async () => {
      const user = userEvent.setup()
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      const goalsTab = screen.getByRole('tab', { name: /الأهداف/i })
      await user.click(goalsTab)
      
      await waitFor(() => {
        expect(screen.getByText('تطوير التواصل')).toBeInTheDocument()
        expect(screen.getByText('تحسين التركيز')).toBeInTheDocument()
      })
    })
  })

  describe('Tab Navigation', () => {
    it('switches to goals tab and displays goals', async () => {
      const user = userEvent.setup()
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      const goalsTab = screen.getByRole('tab', { name: /goals/i })
      await user.click(goalsTab)
      
      await waitFor(() => {
        expect(screen.getByText('Develop communication')).toBeInTheDocument()
        expect(screen.getByText('Improve focus')).toBeInTheDocument()
      })
    })

    it('switches to sessions tab and displays session history', async () => {
      const user = userEvent.setup()
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      const sessionsTab = screen.getByRole('tab', { name: /sessions/i })
      await user.click(sessionsTab)
      
      await waitFor(() => {
        expect(screen.getByText('Individual Therapy')).toBeInTheDocument()
        expect(screen.getByText('Good progress today')).toBeInTheDocument()
        expect(screen.getByText('Excellent session')).toBeInTheDocument()
      })
    })

    it('switches to analytics tab and displays behavioral data', async () => {
      const user = userEvent.setup()
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      const analyticsTab = screen.getByRole('tab', { name: /analytics/i })
      await user.click(analyticsTab)
      
      await waitFor(() => {
        expect(screen.getByText('Behavioral Observations')).toBeInTheDocument()
        expect(screen.getByText('Goals Progress Summary')).toBeInTheDocument()
      })
    })
  })

  describe('Goal Status Display', () => {
    it('displays goal status badges correctly', async () => {
      const user = userEvent.setup()
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      const goalsTab = screen.getByRole('tab', { name: /goals/i })
      await user.click(goalsTab)
      
      await waitFor(() => {
        expect(screen.getByText('On Track')).toBeInTheDocument()
        expect(screen.getByText('At Risk')).toBeInTheDocument()
        expect(screen.getByText('High Priority')).toBeInTheDocument()
        expect(screen.getByText('Medium Priority')).toBeInTheDocument()
      })
    })

    it('displays progress bars for goals', async () => {
      const user = userEvent.setup()
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      const goalsTab = screen.getByRole('tab', { name: /goals/i })
      await user.click(goalsTab)
      
      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument()
        expect(screen.getByText('45%')).toBeInTheDocument()
      })
    })
  })

  describe('Session Display', () => {
    it('displays session attendance status', async () => {
      const user = userEvent.setup()
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      const sessionsTab = screen.getByRole('tab', { name: /sessions/i })
      await user.click(sessionsTab)
      
      await waitFor(() => {
        const presentBadges = screen.getAllByText('Present')
        expect(presentBadges).toHaveLength(2)
      })
    })

    it('displays session ratings visually', async () => {
      const user = userEvent.setup()
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      const sessionsTab = screen.getByRole('tab', { name: /sessions/i })
      await user.click(sessionsTab)
      
      await waitFor(() => {
        // Should display star ratings for both sessions
        const ratingElements = screen.getAllByText('Individual Therapy')
        expect(ratingElements).toHaveLength(2)
      })
    })

    it('displays therapist notes', async () => {
      const user = userEvent.setup()
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      const sessionsTab = screen.getByRole('tab', { name: /sessions/i })
      await user.click(sessionsTab)
      
      await waitFor(() => {
        expect(screen.getByText('Good progress today')).toBeInTheDocument()
        expect(screen.getByText('Excellent session')).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('displays no sessions message when session history is empty', () => {
      render(
        <EnrollmentProgressTracker 
          {...defaultProps} 
          sessionHistory={[]} 
        />
      )
      
      expect(screen.getByText('No sessions recorded')).toBeInTheDocument()
    })

    it('displays no goals message when goal progress is empty', async () => {
      const user = userEvent.setup()
      render(
        <EnrollmentProgressTracker 
          {...defaultProps} 
          goalProgress={[]} 
        />
      )
      
      const goalsTab = screen.getByRole('tab', { name: /goals/i })
      await user.click(goalsTab)
      
      await waitFor(() => {
        expect(screen.getByText('No goals defined')).toBeInTheDocument()
      })
    })
  })

  describe('Interactions', () => {
    it('calls onGenerateReport when generate report button is clicked', async () => {
      const user = userEvent.setup()
      render(<EnrollmentProgressTracker {...defaultProps} />)
      
      const generateButton = screen.getByRole('button', { name: /generate report/i })
      await user.click(generateButton)
      
      expect(defaultProps.onGenerateReport).toHaveBeenCalled()
    })
  })

  describe('Responsive Design', () => {
    it('applies RTL direction when isRTL is true', () => {
      mockLanguageContext.isRTL = true
      const { container } = render(<EnrollmentProgressTracker {...defaultProps} />)
      
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveAttribute('dir', 'rtl')
    })

    it('applies LTR direction when isRTL is false', () => {
      mockLanguageContext.isRTL = false
      const { container } = render(<EnrollmentProgressTracker {...defaultProps} />)
      
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveAttribute('dir', 'ltr')
    })
  })
})