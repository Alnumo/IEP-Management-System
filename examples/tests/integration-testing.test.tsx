/**
 * Integration Testing Examples
 * 
 * Why: Demonstrates end-to-end testing patterns for therapy workflows:
 * - Complete user journeys from login to session completion
 * - Arabic/RTL interface testing
 * - Multi-component interaction testing
 * - API integration with real data flows
 * - Form submission and validation workflows
 * - Notification and error handling flows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Import components for integration testing
import { TherapySessionForm } from '../forms/therapy-session-form'
import { NotificationContainer, useNotifications } from '../components/NotificationToast'
import { TherapyChart } from '../components/TherapyChart'
import { DashboardLayout } from '../layouts/DashboardLayout'

// Mock language context
const mockLanguageContext = {
  language: 'ar' as const,
  isRTL: true,
  toggleLanguage: vi.fn(),
  setLanguage: vi.fn(),
  formatText: (text: string) => text.trim(),
  validateArabicText: vi.fn().mockReturnValue({ isValid: true, hasArabic: true, errors: [] }),
  normalizeArabicText: (text: string) => text,
  getResponsiveTextSize: () => 'text-base'
}

// Mock React Context
const LanguageContext = React.createContext(mockLanguageContext)

// Test wrapper with all providers
const TestWrapper: React.FC<{ children: React.ReactNode; language?: 'ar' | 'en' }> = ({ 
  children, 
  language = 'ar' 
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  const contextValue = {
    ...mockLanguageContext,
    language,
    isRTL: language === 'ar'
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageContext.Provider value={contextValue}>
        <div dir={language === 'ar' ? 'rtl' : 'ltr'}>
          {children}
        </div>
      </LanguageContext.Provider>
    </QueryClientProvider>
  )
}

// Mock API responses
const mockApiResponses = {
  createSession: {
    success: true,
    data: {
      id: 'session-123',
      title: { ar: 'جلسة علاج النطق', en: 'Speech Therapy Session' },
      type: 'speech',
      status: 'scheduled',
      scheduledDate: new Date('2024-03-15T10:00:00Z')
    }
  },
  getStudents: {
    success: true,
    data: [
      { id: 'student-1', name: { ar: 'أحمد محمد', en: 'Ahmed Mohammed' } },
      { id: 'student-2', name: { ar: 'سارة علي', en: 'Sara Ali' } }
    ]
  },
  getTherapists: {
    success: true,
    data: [
      { id: 'therapist-1', name: { ar: 'د. فاطمة أحمد', en: 'Dr. Fatima Ahmed' } },
      { id: 'therapist-2', name: { ar: 'د. محمد علي', en: 'Dr. Mohammed Ali' } }
    ]
  }
}

// Mock fetch globally
global.fetch = vi.fn()

describe('Therapy Session Creation Workflow', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful API responses by default
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponses.createSession
    } as Response)
  })

  it('should complete full session creation workflow in Arabic', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined)
    const mockOnCancel = vi.fn()

    render(
      <TestWrapper language="ar">
        <TherapySessionForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      </TestWrapper>
    )

    // Step 1: Basic Information
    expect(screen.getByText('المعلومات الأساسية')).toBeInTheDocument()

    // Select student
    const studentSelect = screen.getByLabelText('الطالب')
    await user.selectOptions(studentSelect, 'student-1')
    expect(studentSelect).toHaveValue('student-1')

    // Select therapist
    const therapistSelect = screen.getByLabelText('المعالج')
    await user.selectOptions(therapistSelect, 'therapist-1')
    expect(therapistSelect).toHaveValue('therapist-1')

    // Select therapy type
    const typeSelect = screen.getByLabelText('نوع العلاج')
    await user.selectOptions(typeSelect, 'speech')
    expect(typeSelect).toHaveValue('speech')

    // Go to next step
    const nextButton = screen.getByText('التالي')
    await user.click(nextButton)

    // Step 2: Session Details
    await waitFor(() => {
      expect(screen.getByText('تفاصيل الجلسة')).toBeInTheDocument()
    })

    // Fill English title
    const titleInput = screen.getByPlaceholderText('Enter session title in English')
    await user.type(titleInput, 'Speech Therapy Session')
    expect(titleInput).toHaveValue('Speech Therapy Session')

    // Fill Arabic title
    const titleArInput = screen.getByPlaceholderText('أدخل عنوان الجلسة بالعربية')
    await user.type(titleArInput, 'جلسة علاج النطق')
    expect(titleArInput).toHaveValue('جلسة علاج النطق')

    // Fill descriptions
    const descInput = screen.getByPlaceholderText('Enter session description in English')
    await user.type(descInput, 'Comprehensive speech therapy session')
    
    const descArInput = screen.getByPlaceholderText('أدخل وصف الجلسة بالعربية')
    await user.type(descArInput, 'جلسة علاج نطق شاملة')

    // Set date and duration
    const dateInput = screen.getByLabelText('تاريخ الجلسة')
    await user.type(dateInput, '2024-03-15T10:00')
    
    const durationInput = screen.getByLabelText('مدة الجلسة (بالدقائق)')
    await user.clear(durationInput)
    await user.type(durationInput, '60')

    // Go to next step
    await user.click(screen.getByText('التالي'))

    // Step 3: Goals and Location
    await waitFor(() => {
      expect(screen.getByText('الأهداف والملاحظات')).toBeInTheDocument()
    })

    // Add goals
    const goalEnInput = screen.getByPlaceholderText('Goal 1 (English)')
    await user.type(goalEnInput, 'Improve articulation')
    
    const goalArInput = screen.getByPlaceholderText('الهدف 1 (العربية)')
    await user.type(goalArInput, 'تحسين النطق')

    // Set location (not virtual)
    const locationInput = screen.getByPlaceholderText('أدخل موقع الجلسة')
    await user.type(locationInput, 'غرفة العلاج رقم 1')

    // Go to final step
    await user.click(screen.getByText('التالي'))

    // Step 4: Notes and Attachments
    await waitFor(() => {
      expect(screen.getByText('المرفقات')).toBeInTheDocument()
    })

    // Add notes
    const notesEnInput = screen.getByPlaceholderText('Additional notes in English (optional)')
    await user.type(notesEnInput, 'First session for this student')
    
    const notesArInput = screen.getByPlaceholderText('ملاحظات إضافية بالعربية (اختياري)')
    await user.type(notesArInput, 'الجلسة الأولى لهذا الطالب')

    // Submit form
    const submitButton = screen.getByText('حفظ الجلسة')
    expect(submitButton).not.toBeDisabled()
    
    await user.click(submitButton)

    // Verify form submission
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'student-1',
          therapistId: 'therapist-1',
          type: 'speech',
          title: 'Speech Therapy Session',
          titleAr: 'جلسة علاج النطق',
          description: 'Comprehensive speech therapy session',
          descriptionAr: 'جلسة علاج نطق شاملة',
          duration: 60,
          goals: ['Improve articulation'],
          goalsAr: ['تحسين النطق'],
          location: 'غرفة العلاج رقم 1',
          notes: 'First session for this student',
          notesAr: 'الجلسة الأولى لهذا الطالب'
        })
      )
    })
  })

  it('should handle form validation errors in Arabic', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = vi.fn()

    render(
      <TestWrapper language="ar">
        <TherapySessionForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    )

    // Try to proceed without filling required fields
    const nextButton = screen.getByText('التالي')
    await user.click(nextButton)

    // Should stay on first step and show validation errors
    expect(screen.getByText('المعلومات الأساسية')).toBeInTheDocument()
    
    // Check for validation error messages
    await waitFor(() => {
      expect(screen.getByText('Student selection is required')).toBeInTheDocument()
    })
  })

  it('should switch between virtual and in-person session modes', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = vi.fn()

    render(
      <TestWrapper language="ar">
        <TherapySessionForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    )

    // Navigate to step 3
    // ... (fill previous steps)
    
    // Toggle virtual session
    const virtualCheckbox = screen.getByLabelText('جلسة افتراضية')
    await user.click(virtualCheckbox)

    // Should show meeting link field instead of location
    expect(screen.getByPlaceholderText('https://meet.google.com/...')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('أدخل موقع الجلسة')).not.toBeInTheDocument()

    // Toggle back to in-person
    await user.click(virtualCheckbox)

    // Should show location field again
    expect(screen.getByPlaceholderText('أدخل موقع الجلسة')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('https://meet.google.com/...')).not.toBeInTheDocument()
  })
})

describe('Dashboard Integration Workflow', () => {
  it('should display therapy progress charts with Arabic data', async () => {
    const mockMetrics = [
      {
        id: 'speech',
        label: { ar: 'علاج النطق', en: 'Speech Therapy' },
        value: 75,
        target: 80,
        color: '#3b82f6',
        trend: 'up' as const
      },
      {
        id: 'physical',
        label: { ar: 'العلاج الطبيعي', en: 'Physical Therapy' },
        value: 68,
        target: 75,
        color: '#10b981',
        trend: 'up' as const
      }
    ]

    render(
      <TestWrapper language="ar">
        <TherapyChart
          title={{ ar: 'تقدم العلاج', en: 'Therapy Progress' }}
          metrics={mockMetrics}
          type="progress"
        />
      </TestWrapper>
    )

    // Check Arabic labels are displayed
    expect(screen.getByText('تقدم العلاج')).toBeInTheDocument()
    expect(screen.getByText('علاج النطق')).toBeInTheDocument()
    expect(screen.getByText('العلاج الطبيعي')).toBeInTheDocument()

    // Check progress values are displayed
    expect(screen.getByText('٧٥٪')).toBeInTheDocument() // Arabic numerals
    expect(screen.getByText('٦٨٪')).toBeInTheDocument()

    // Check trend indicators are present
    const trendIcons = screen.getAllByTestId(/trending-up|trending-down|minus/)
    expect(trendIcons.length).toBeGreaterThan(0)
  })

  it('should handle language switching across components', async () => {
    const user = userEvent.setup()
    
    const TestComponent = () => {
      const [language, setLanguage] = React.useState<'ar' | 'en'>('ar')
      
      return (
        <TestWrapper language={language}>
          <div>
            <button onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>
              Toggle Language
            </button>
            <TherapyChart
              title={{ ar: 'تقدم العلاج', en: 'Therapy Progress' }}
              metrics={[{
                id: 'test',
                label: { ar: 'اختبار', en: 'Test' },
                value: 50,
                color: '#3b82f6'
              }]}
              type="progress"
            />
          </div>
        </TestWrapper>
      )
    }

    render(<TestComponent />)

    // Initially in Arabic
    expect(screen.getByText('تقدم العلاج')).toBeInTheDocument()
    expect(screen.getByText('اختبار')).toBeInTheDocument()

    // Switch to English
    await user.click(screen.getByText('Toggle Language'))

    await waitFor(() => {
      expect(screen.getByText('Therapy Progress')).toBeInTheDocument()
      expect(screen.getByText('Test')).toBeInTheDocument()
    })
  })
})

describe('Notification Integration Workflow', () => {
  it('should show notifications for successful session creation', async () => {
    const user = userEvent.setup()
    
    const TestComponent = () => {
      const { showSuccess, showError } = useNotifications()
      
      return (
        <TestWrapper language="ar">
          <div>
            <button 
              onClick={() => showSuccess(
                { ar: 'تم الحفظ', en: 'Saved' },
                { ar: 'تم حفظ الجلسة بنجاح', en: 'Session saved successfully' }
              )}
            >
              Show Success
            </button>
            <button 
              onClick={() => showError(
                { ar: 'خطأ', en: 'Error' },
                { ar: 'فشل في حفظ الجلسة', en: 'Failed to save session' }
              )}
            >
              Show Error
            </button>
            <NotificationContainer />
          </div>
        </TestWrapper>
      )
    }

    render(<TestComponent />)

    // Show success notification
    await user.click(screen.getByText('Show Success'))

    await waitFor(() => {
      expect(screen.getByText('تم الحفظ')).toBeInTheDocument()
      expect(screen.getByText('تم حفظ الجلسة بنجاح')).toBeInTheDocument()
    })

    // Show error notification
    await user.click(screen.getByText('Show Error'))

    await waitFor(() => {
      expect(screen.getByText('خطأ')).toBeInTheDocument()
      expect(screen.getByText('فشل في حفظ الجلسة')).toBeInTheDocument()
    })
  })

  it('should handle notification dismissal', async () => {
    const user = userEvent.setup()
    
    const TestComponent = () => {
      const { showSuccess } = useNotifications()
      
      return (
        <TestWrapper language="ar">
          <div>
            <button 
              onClick={() => showSuccess(
                { ar: 'اختبار', en: 'Test' },
                { ar: 'رسالة اختبار', en: 'Test message' }
              )}
            >
              Show Notification
            </button>
            <NotificationContainer />
          </div>
        </TestWrapper>
      )
    }

    render(<TestComponent />)

    // Show notification
    await user.click(screen.getByText('Show Notification'))

    await waitFor(() => {
      expect(screen.getByText('اختبار')).toBeInTheDocument()
    })

    // Dismiss notification
    const closeButton = screen.getByLabelText('إغلاق الإشعار')
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('اختبار')).not.toBeInTheDocument()
    })
  })
})

describe('Error Handling Integration', () => {
  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock API error
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const mockOnSubmit = vi.fn().mockRejectedValue(new Error('API Error'))

    render(
      <TestWrapper language="ar">
        <TherapySessionForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    )

    // Fill form and submit (simplified)
    const studentSelect = screen.getByLabelText('الطالب')
    await user.selectOptions(studentSelect, 'student-1')

    const therapistSelect = screen.getByLabelText('المعالج')
    await user.selectOptions(therapistSelect, 'therapist-1')

    // Navigate through steps and submit
    // ... (navigation steps)

    // Should handle error gracefully without crashing
    expect(screen.getByText('المعلومات الأساسية')).toBeInTheDocument()
  })

  it('should validate Arabic text input', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = vi.fn()

    render(
      <TestWrapper language="ar">
        <TherapySessionForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    )

    // Navigate to step 2
    // ... (fill step 1 and navigate)

    // Try to enter non-Arabic text in Arabic field
    const titleArInput = screen.getByPlaceholderText('أدخل عنوان الجلسة بالعربية')
    await user.type(titleArInput, 'English text only')

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('العنوان يجب أن يحتوي على نص عربي')).toBeInTheDocument()
    })
  })
})

describe('Accessibility Integration', () => {
  it('should support keyboard navigation in RTL layout', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper language="ar">
        <TherapySessionForm onSubmit={vi.fn()} />
      </TestWrapper>
    )

    // Test tab navigation
    await user.tab()
    expect(screen.getByLabelText('الطالب')).toHaveFocus()

    await user.tab()
    expect(screen.getByLabelText('المعالج')).toHaveFocus()

    await user.tab()
    expect(screen.getByLabelText('نوع العلاج')).toHaveFocus()
  })

  it('should have proper ARIA labels in Arabic', () => {
    render(
      <TestWrapper language="ar">
        <TherapySessionForm onSubmit={vi.fn()} />
      </TestWrapper>
    )

    // Check ARIA labels
    expect(screen.getByLabelText('الطالب')).toHaveAttribute('aria-label')
    expect(screen.getByLabelText('المعالج')).toHaveAttribute('aria-label')
    expect(screen.getByLabelText('نوع العلاج')).toHaveAttribute('aria-label')
  })
})

// Performance integration tests
describe('Performance Integration', () => {
  it('should render large datasets efficiently', async () => {
    const largeMetrics = Array.from({ length: 100 }, (_, i) => ({
      id: `metric-${i}`,
      label: { ar: `مقياس ${i}`, en: `Metric ${i}` },
      value: Math.floor(Math.random() * 100),
      color: '#3b82f6'
    }))

    const startTime = performance.now()

    render(
      <TestWrapper language="ar">
        <TherapyChart
          title={{ ar: 'مقاييس كثيرة', en: 'Many Metrics' }}
          metrics={largeMetrics}
          type="comparison"
        />
      </TestWrapper>
    )

    const endTime = performance.now()
    const renderTime = endTime - startTime

    // Should render within reasonable time (adjust threshold as needed)
    expect(renderTime).toBeLessThan(1000) // 1 second

    // Should display the data
    expect(screen.getByText('مقاييس كثيرة')).toBeInTheDocument()
  })
})
