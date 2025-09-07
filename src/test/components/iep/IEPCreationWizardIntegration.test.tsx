/**
 * IEP Creation Wizard Student Profile Integration Test
 * Task 1 implementation validation - focused test for new features
 * Story 1.3 - Task 1: Student profile integration and assessment auto-population
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/contexts/LanguageContext'
import IEPCreationWizard from '@/components/iep/IEPCreationWizard'
import { vi } from 'vitest'

// Mock hooks with realistic data
vi.mock('@/hooks/useIEPs', () => ({
  useCreateIEP: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      id: 'test-iep-123',
      student_id: 'student-1',
      status: 'draft'
    }),
    isLoading: false
  })
}))

vi.mock('@/hooks/useStudents', () => ({
  useStudents: () => ({
    data: [
      {
        id: 'student-1',
        first_name_ar: 'أحمد',
        last_name_ar: 'محمد',
        first_name_en: 'Ahmed',
        last_name_en: 'Mohammed', 
        registration_number: 'STU001',
        date_of_birth: '2010-01-01',
        gender: 'male',
        enrollment_date: '2024-01-01',
        medical_records: [
          {
            special_needs_ar: 'احتياجات خاصة في التعلم',
            special_needs_en: 'Special learning needs'
          }
        ]
      }
    ],
    isLoading: false
  })
}))

vi.mock('@/hooks/useAssessments', () => ({
  useAssessmentResults: vi.fn(() => ({
    data: [
      {
        id: 'assessment-1',
        test_name: 'Cognitive Assessment',
        test_name_ar: 'تقييم الإدراك',
        assessment_type: 'cognitive',
        total_score: 85,
        max_score: 100,
        interpretation_ar: 'أداء جيد في المهارات الإدراكية',
        interpretation_en: 'Good performance in cognitive skills'
      },
      {
        id: 'assessment-2',
        test_name: 'Academic Skills Assessment',
        test_name_ar: 'تقييم المهارات الأكاديمية',
        assessment_type: 'academic',
        total_score: 72,
        max_score: 100,
        interpretation_ar: 'يحتاج دعم في المهارات الأكاديمية',
        interpretation_en: 'Needs support in academic skills'
      }
    ],
    isLoading: false
  }))
}))

const TestWrapper = ({ children, language = 'en' }: { children: React.ReactNode, language?: 'ar' | 'en' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={language}>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
}

describe('IEPCreationWizard - Student Profile Integration (Task 1)', () => {
  const mockOnComplete = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Student Selection and Profile Display', () => {
    it('should display student options with registration numbers', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper language="en">
          <IEPCreationWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
        </TestWrapper>
      )

      // Find student select dropdown (first combobox)
      const comboboxes = screen.getAllByRole('combobox')
      const studentSelect = comboboxes[0] // Student select is first
      await user.click(studentSelect)

      // Should show student with registration number
      await waitFor(() => {
        expect(screen.getByText('Ahmed Mohammed (STU001)')).toBeInTheDocument()
      })
    })

    it('should show student profile summary when student is selected', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper language="en">
          <IEPCreationWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
        </TestWrapper>
      )

      // Select student (first combobox)
      const comboboxes = screen.getAllByRole('combobox')
      const studentSelect = comboboxes[0]
      await user.click(studentSelect)
      
      const studentOption = screen.getByText('Ahmed Mohammed (STU001)')
      await user.click(studentOption)

      // Should show profile summary
      await waitFor(() => {
        expect(screen.getByText(/Student Profile Summary/)).toBeInTheDocument()
        expect(screen.getByText(/Age:/)).toBeInTheDocument()
        expect(screen.getByText(/Gender:/)).toBeInTheDocument()
        expect(screen.getByText(/Assessments:/)).toBeInTheDocument()
      })
    })

    it('should calculate student age correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper language="en">
          <IEPCreationWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
        </TestWrapper>
      )

      const studentSelect = screen.getByRole('combobox')
      await user.click(studentSelect)
      await user.click(screen.getByText('Ahmed Mohammed (STU001)'))

      await waitFor(() => {
        // Should calculate age from birth date 2010-01-01
        expect(screen.getByText(/14 years/)).toBeInTheDocument()
      })
    })

    it('should display assessment badges with scores', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper language="en">
          <IEPCreationWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
        </TestWrapper>
      )

      const studentSelect = screen.getByRole('combobox')
      await user.click(studentSelect)
      await user.click(screen.getByText('Ahmed Mohammed (STU001)'))

      await waitFor(() => {
        expect(screen.getByText('Cognitive Assessment')).toBeInTheDocument()
        expect(screen.getByText('(85/100)')).toBeInTheDocument()
        expect(screen.getByText('Academic Skills Assessment')).toBeInTheDocument() 
        expect(screen.getByText('(72/100)')).toBeInTheDocument()
        expect(screen.getByText('2 available')).toBeInTheDocument()
      })
    })

    it('should show auto-population notification', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper language="en">
          <IEPCreationWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
        </TestWrapper>
      )

      const studentSelect = screen.getByRole('combobox')
      await user.click(studentSelect)
      await user.click(screen.getByText('Ahmed Mohammed (STU001)'))

      await waitFor(() => {
        expect(screen.getByText(/Present levels will be auto-populated/)).toBeInTheDocument()
      })
    })
  })

  describe('Assessment Auto-Population', () => {
    it('should auto-populate present levels when navigating to step 2', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper language="en">
          <IEPCreationWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
        </TestWrapper>
      )

      // Select student (first combobox)
      const comboboxes = screen.getAllByRole('combobox')
      const studentSelect = comboboxes[0]
      await user.click(studentSelect)
      await user.click(screen.getByText('Ahmed Mohammed (STU001)'))

      // Navigate to present levels step
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      // Should auto-populate present levels
      await waitFor(() => {
        // Check for auto-populated content
        const textareas = screen.getAllByRole('textbox')
        
        // Find textarea with assessment content
        const hasAssessmentContent = textareas.some(textarea => 
          textarea.value.includes('Based on assessments conducted for student Ahmed Mohammed') ||
          textarea.value.includes('Cognitive Assessment') ||
          textarea.value.includes('85/100')
        )
        
        expect(hasAssessmentContent).toBe(true)
      })
    })

    it('should include assessment scores and interpretations in present levels', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper language="en">
          <IEPCreationWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
        </TestWrapper>
      )

      const studentSelect = screen.getByRole('combobox')
      await user.click(studentSelect)
      await user.click(screen.getByText('Ahmed Mohammed (STU001)'))

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        const textareas = screen.getAllByRole('textbox')
        
        // Should include interpretation text
        const hasInterpretation = textareas.some(textarea =>
          textarea.value.includes('Good performance in cognitive skills') ||
          textarea.value.includes('Needs support in academic skills')
        )
        
        expect(hasInterpretation).toBe(true)
      })
    })

    it('should include medical records in functional levels', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper language="en">
          <IEPCreationWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
        </TestWrapper>
      )

      const studentSelect = screen.getByRole('combobox')
      await user.click(studentSelect)
      await user.click(screen.getByText('Ahmed Mohammed (STU001)'))

      await user.click(screen.getByText('Next'))

      await waitFor(() => {
        const textareas = screen.getAllByRole('textbox')
        
        // Should include medical record information
        const hasMedicalInfo = textareas.some(textarea =>
          textarea.value.includes('Special learning needs') ||
          textarea.value.includes('Medical and functional needs')
        )
        
        expect(hasMedicalInfo).toBe(true)
      })
    })

    it('should handle students with no assessments gracefully', async () => {
      // Mock empty assessments for this test
      const { useAssessmentResults } = await import('@/hooks/useAssessments')
      vi.mocked(useAssessmentResults).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      } as any)

      const user = userEvent.setup()
      
      render(
        <TestWrapper language="en">
          <IEPCreationWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
        </TestWrapper>
      )

      const studentSelect = screen.getByRole('combobox')
      await user.click(studentSelect)
      await user.click(screen.getByText('Ahmed Mohammed (STU001)'))

      // Should show 0 assessments
      await waitFor(() => {
        expect(screen.getByText('0 available')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Next'))

      // Should show default text for no assessments
      await waitFor(() => {
        const textareas = screen.getAllByRole('textbox')
        
        const hasDefaultContent = textareas.some(textarea =>
          textarea.value.includes('Comprehensive assessment needed') ||
          textarea.value.includes('needs comprehensive academic assessment')
        )
        
        expect(hasDefaultContent).toBe(true)
      })
    })
  })

  describe('Arabic Interface Integration', () => {
    it('should display Arabic interface with student profile', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper language="ar">
          <IEPCreationWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
        </TestWrapper>
      )

      const studentSelect = screen.getByRole('combobox')
      await user.click(studentSelect)
      
      await waitFor(() => {
        expect(screen.getByText('أحمد محمد (STU001)')).toBeInTheDocument()
      })

      await user.click(screen.getByText('أحمد محمد (STU001)'))

      await waitFor(() => {
        expect(screen.getByText('ملخص ملف الطالب')).toBeInTheDocument()
        expect(screen.getByText('العمر:')).toBeInTheDocument()
        expect(screen.getByText('14 سنة')).toBeInTheDocument()
        expect(screen.getByText('التقييمات:')).toBeInTheDocument()
        expect(screen.getByText('تقييم الإدراك')).toBeInTheDocument()
      })
    })

    it('should auto-populate Arabic present levels', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper language="ar">
          <IEPCreationWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
        </TestWrapper>
      )

      const studentSelect = screen.getByRole('combobox')
      await user.click(studentSelect)
      await user.click(screen.getByText('أحمد محمد (STU001)'))

      await user.click(screen.getByText('التالي'))

      await waitFor(() => {
        const textareas = screen.getAllByRole('textbox')
        
        const hasArabicContent = textareas.some(textarea =>
          textarea.value.includes('بناءً على التقييمات المُجراة للطالب أحمد محمد') ||
          textarea.value.includes('المهارات الوظيفية للطالب أحمد محمد')
        )
        
        expect(hasArabicContent).toBe(true)
      })
    })
  })

  describe('Integration with Existing IEP Hooks', () => {
    it('should call useAssessmentResults with correct student ID', async () => {
      const user = userEvent.setup()
      const { useAssessmentResults } = await import('@/hooks/useAssessments')
      
      render(
        <TestWrapper language="en">
          <IEPCreationWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
        </TestWrapper>
      )

      const studentSelect = screen.getByRole('combobox')
      await user.click(studentSelect)
      await user.click(screen.getByText('Ahmed Mohammed (STU001)'))

      // Should call useAssessmentResults with selected student ID
      await waitFor(() => {
        expect(useAssessmentResults).toHaveBeenCalledWith({
          student_id: 'student-1',
          include_latest_only: true
        })
      })
    })
  })
})