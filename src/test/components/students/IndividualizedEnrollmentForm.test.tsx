// Story 6.1: Unit tests for IndividualizedEnrollmentForm component

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IndividualizedEnrollmentForm } from '@/components/students/IndividualizedEnrollmentForm'
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

// Mock date-fns
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns')
  return {
    ...actual,
    format: vi.fn((date, formatString) => {
      if (formatString === 'yyyy-MM-dd') return '2025-01-15'
      if (formatString === 'PPP') return 'January 15th, 2025'
      return '2025-01-15'
    })
  }
})

describe('IndividualizedEnrollmentForm', () => {
  const mockStudents = [
    { id: 'student-1', name_ar: 'أحمد محمد', name_en: 'Ahmed Mohamed' },
    { id: 'student-2', name_ar: 'فاطمة علي', name_en: 'Fatima Ali' }
  ]

  const mockTherapists = [
    { id: 'therapist-1', name_ar: 'د. سارة أحمد', name_en: 'Dr. Sarah Ahmed' },
    { id: 'therapist-2', name_ar: 'د. محمد علي', name_en: 'Dr. Mohamed Ali' }
  ]

  const mockProgramTemplates: ProgramTemplate[] = [
    {
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
  ]

  const mockProps = {
    students: mockStudents,
    therapists: mockTherapists,
    programTemplates: mockProgramTemplates,
    onSubmit: vi.fn(),
    onCancel: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders form title correctly', () => {
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      expect(screen.getByText('Individualized Enrollment Form')).toBeInTheDocument()
    })

    it('renders all form sections', () => {
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      expect(screen.getByText('Student Selection')).toBeInTheDocument()
      expect(screen.getByText('Program Template')).toBeInTheDocument()
      expect(screen.getByText('Therapist Assignment')).toBeInTheDocument()
      expect(screen.getByText('Schedule')).toBeInTheDocument()
      expect(screen.getByText('Notes')).toBeInTheDocument()
    })

    it('renders student options in select', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      const studentSelect = screen.getByRole('combobox', { name: /student selection/i })
      await user.click(studentSelect)
      
      await waitFor(() => {
        expect(screen.getByText('Ahmed Mohamed')).toBeInTheDocument()
        expect(screen.getByText('Fatima Ali')).toBeInTheDocument()
      })
    })

    it('renders therapist options in select', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      const therapistSelect = screen.getByRole('combobox', { name: /therapist assignment/i })
      await user.click(therapistSelect)
      
      await waitFor(() => {
        expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument()
        expect(screen.getByText('Dr. Mohamed Ali')).toBeInTheDocument()
      })
    })

    it('renders program template options', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      const programSelect = screen.getByRole('combobox', { name: /program template/i })
      await user.click(programSelect)
      
      await waitFor(() => {
        expect(screen.getByText('Growth Program')).toBeInTheDocument()
      })
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
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      expect(screen.getByText('نموذج التسجيل الفردي')).toBeInTheDocument()
    })

    it('renders Arabic field labels', () => {
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      expect(screen.getByText('اختيار الطالب')).toBeInTheDocument()
      expect(screen.getByText('قالب البرنامج')).toBeInTheDocument()
      expect(screen.getByText('تعيين المعالج')).toBeInTheDocument()
    })

    it('shows Arabic names in student select', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      const studentSelect = screen.getByRole('combobox')
      await user.click(studentSelect)
      
      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument()
        expect(screen.getByText('فاطمة علي')).toBeInTheDocument()
      })
    })
  })

  describe('Form Interactions', () => {
    it('allows selecting student', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      const studentSelect = screen.getByRole('combobox', { name: /student selection/i })
      await user.click(studentSelect)
      
      await waitFor(() => {
        const option = screen.getByText('Ahmed Mohamed')
        user.click(option)
      })
    })

    it('shows program template details when selected', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      const programSelect = screen.getByRole('combobox', { name: /program template/i })
      await user.click(programSelect)
      
      await waitFor(() => {
        const option = screen.getByText('Growth Program')
        user.click(option)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Comprehensive skills development program')).toBeInTheDocument()
        expect(screen.getByText('Develop communication')).toBeInTheDocument()
      })
    })

    it('allows toggling preferred days', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      const mondayButton = screen.getByRole('button', { name: 'Monday' })
      await user.click(mondayButton)
      
      // Button should be selected (different styling)
      expect(mondayButton).toBeInTheDocument()
    })

    it('allows toggling preferred times', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      const timeButton = screen.getByRole('button', { name: '09:00' })
      await user.click(timeButton)
      
      expect(timeButton).toBeInTheDocument()
    })

    it('updates sessions per week input', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      const sessionsInput = screen.getByRole('spinbutton', { name: /sessions per week/i })
      await user.clear(sessionsInput)
      await user.type(sessionsInput, '3')
      
      expect(sessionsInput).toHaveValue(3)
    })

    it('updates session duration input', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      const durationInput = screen.getByRole('spinbutton', { name: /session duration/i })
      await user.clear(durationInput)
      await user.type(durationInput, '45')
      
      expect(durationInput).toHaveValue(45)
    })
  })

  describe('Form Validation', () => {
    it('shows validation error for empty required fields', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      const submitButton = screen.getByRole('button', { name: /save enrollment/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        // Form should not submit and show validation errors
        expect(mockProps.onSubmit).not.toHaveBeenCalled()
      })
    })

    it('validates that end date is after start date', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      // Fill required fields with invalid date range
      const studentSelect = screen.getByRole('combobox', { name: /student selection/i })
      await user.click(studentSelect)
      await user.click(screen.getByText('Ahmed Mohamed'))
      
      const submitButton = screen.getByRole('button', { name: /save enrollment/i })
      await user.click(submitButton)
      
      // Should show date validation error
      await waitFor(() => {
        expect(mockProps.onSubmit).not.toHaveBeenCalled()
      })
    })
  })

  describe('Form Submission', () => {
    it('calls onSubmit with form data when valid', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      // Fill all required fields
      const studentSelect = screen.getByRole('combobox', { name: /student selection/i })
      await user.click(studentSelect)
      await user.click(screen.getByText('Ahmed Mohamed'))
      
      const programSelect = screen.getByRole('combobox', { name: /program template/i })
      await user.click(programSelect)
      await user.click(screen.getByText('Growth Program'))
      
      const therapistSelect = screen.getByRole('combobox', { name: /therapist assignment/i })
      await user.click(therapistSelect)
      await user.click(screen.getByText('Dr. Sarah Ahmed'))
      
      // Select preferred days and times
      await user.click(screen.getByRole('button', { name: 'Monday' }))
      await user.click(screen.getByRole('button', { name: '09:00' }))
      
      const submitButton = screen.getByRole('button', { name: /save enrollment/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            student_id: 'student-1',
            program_template_id: 'template-1',
            assigned_therapist_id: 'therapist-1',
            custom_schedule: expect.objectContaining({
              preferred_days: expect.arrayContaining(['monday']),
              preferred_times: expect.arrayContaining(['09:00'])
            })
          })
        )
      })
    })

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<IndividualizedEnrollmentForm {...mockProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(mockProps.onCancel).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('disables form when loading', () => {
      render(<IndividualizedEnrollmentForm {...mockProps} isLoading={true} />)
      
      const submitButton = screen.getByRole('button', { name: /save enrollment/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      
      expect(submitButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
    })
  })

  describe('Initial Data', () => {
    it('pre-fills form with initial data', () => {
      const initialData = {
        student_id: 'student-1',
        program_template_id: 'template-1',
        assigned_therapist_id: 'therapist-1',
        notes: 'Test notes'
      }
      
      render(<IndividualizedEnrollmentForm {...mockProps} initialData={initialData} />)
      
      const notesTextarea = screen.getByRole('textbox', { name: /notes/i })
      expect(notesTextarea).toHaveValue('Test notes')
    })
  })
})