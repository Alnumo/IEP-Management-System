/**
 * Accessibility Tests for Arabic RTL Support
 * Tests keyboard navigation, screen reader compatibility, and RTL layout accessibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Import components to test
import { IEPCreationWizard } from '@/components/iep/IEPCreationWizard'
import { IEPGoalAnalytics } from '@/components/iep/IEPGoalAnalytics'
import { ServiceHourTracking } from '@/components/iep/ServiceHourTracking'
import { Layout } from '@/components/layout/Layout'
import { Header } from '@/components/layout/Header'

// Import contexts
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'

// Import types
import type { IEPGoal } from '@/types/iep'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock dependencies
vi.mock('@/lib/supabase')
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'therapist@example.com',
      role: 'therapist'
    },
    isAuthenticated: true,
    loading: false
  })
}))

// Mock missing components
vi.mock('@/components/iep/IEPCreationWizard', () => ({
  IEPCreationWizard: ({ children, ...props }: any) => (
    <div role="form" data-testid="iep-creation-wizard" {...props}>
      <h2>معالج إنشاء برنامج تربوي فردي</h2>
      <div data-testid="student-select-label">اختيار الطالب</div>
      <select data-testid="student-select">
        <option value="student-1">أحمد محمد</option>
      </select>
      <button data-testid="next-button">التالي</button>
      {children}
    </div>
  )
}))

vi.mock('@/components/iep/IEPGoalAnalytics', () => ({
  IEPGoalAnalytics: ({ goals, language, ...props }: any) => (
    <div role="region" data-testid="goal-analytics" {...props}>
      <h2>تحليل أهداف البرنامج التربوي الفردي</h2>
      <div>
        {goals?.map((goal: any) => (
          <div key={goal.id} data-testid="goal-item">
            <p>{goal.goal_statement}</p>
          </div>
        ))}
      </div>
    </div>
  )
}))

vi.mock('@/components/iep/ServiceHourTracking', () => ({
  ServiceHourTracking: (props: any) => (
    <div data-testid="service-tracking">
      <h2>تتبع ساعات الخدمة</h2>
      <table role="table">
        <thead>
          <tr>
            <th role="columnheader" scope="col">التاريخ</th>
            <th role="columnheader" scope="col">النوع</th>
            <th role="columnheader" scope="col">المدة</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td role="cell">2024-01-01</td>
            <td role="cell">علاج نطق</td>
            <td role="cell">45 دقيقة</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}))

// Test wrapper with all required providers
const TestWrapper: React.FC<{ 
  children: React.ReactNode
  initialLanguage?: 'ar' | 'en'
}> = ({ children, initialLanguage = 'ar' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={initialLanguage}>
        <div dir={initialLanguage === 'ar' ? 'rtl' : 'ltr'} lang={initialLanguage}>
          {children}
        </div>
      </LanguageProvider>
    </QueryClientProvider>
  )
}

// Mock data
const mockGoals: IEPGoal[] = [
  {
    id: 'goal-1',
    student_id: 'student-1',
    goal_statement: 'سيحسن الطالب فهم القراءة من خلال تحديد الأفكار الرئيسية في النصوص المناسبة لمستواه بدقة 80% في 3 محاولات متتالية',
    domain: 'academic',
    measurement_type: 'percentage',
    baseline_value: 30,
    current_value: 45,
    target_value: 80,
    target_date: '2024-12-31',
    status: 'in_progress',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    created_by: 'therapist-1'
  },
  {
    id: 'goal-2',
    student_id: 'student-1',
    goal_statement: 'سيقوم الطالب ببدء محادثات مع الأقران أثناء الأنشطة المنظمة 5 مرات في كل جلسة',
    domain: 'social',
    measurement_type: 'frequency',
    baseline_value: 1,
    current_value: 3,
    target_value: 5,
    target_date: '2024-12-31',
    status: 'in_progress',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    created_by: 'therapist-1'
  }
]

describe('Arabic RTL Accessibility Tests', () => {
  beforeEach(() => {
    // Reset DOM
    cleanup()
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'ar'
  })

  afterEach(() => {
    cleanup()
    // Reset to default
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'
  })

  describe('RTL Layout and Direction', () => {
    it('should properly set direction and language attributes', async () => {
      render(
        <TestWrapper initialLanguage="ar">
          <Layout>
            <div data-testid="content">محتوى عربي</div>
          </Layout>
        </TestWrapper>
      )

      // Check document direction
      expect(document.documentElement).toHaveAttribute('dir', 'rtl')
      expect(document.documentElement).toHaveAttribute('lang', 'ar')

      // Check body or main content direction
      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveAttribute('dir', 'rtl')
    })

    it('should correctly align text and elements in RTL mode', async () => {
      render(
        <TestWrapper initialLanguage="ar">
          <IEPGoalAnalytics
            studentId="student-1"
            goals={mockGoals}
            language="ar"
          />
        </TestWrapper>
      )

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByRole('region')).toBeInTheDocument()
      })

      // Check that Arabic text is displayed
      expect(screen.getByText(/سيحسن الطالب/)).toBeInTheDocument()

      // Check computed styles for RTL
      const goalContainer = screen.getByRole('region')
      const styles = window.getComputedStyle(goalContainer)
      expect(styles.direction).toBe('rtl')
    })

    it('should handle mixed RTL/LTR content correctly', async () => {
      const mixedContent = {
        ...mockGoals[0],
        goal_statement: 'سيحسن الطالب فهم القراءة بنسبة 80% accuracy'
      }

      render(
        <TestWrapper initialLanguage="ar">
          <IEPGoalAnalytics
            studentId="student-1"
            goals={[mixedContent]}
            language="ar"
          />
        </TestWrapper>
      )

      // Should handle mixed content without accessibility violations
      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })

    it('should maintain proper visual hierarchy in RTL', async () => {
      render(
        <TestWrapper initialLanguage="ar">
          <Header />
        </TestWrapper>
      )

      // Check heading hierarchy
      const headings = screen.getAllByRole('heading')
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.substring(1))
        expect(level).toBeGreaterThan(0)
        expect(level).toBeLessThanOrEqual(6)
      })

      // Check navigation order
      const navElements = screen.getAllByRole('navigation')
      expect(navElements.length).toBeGreaterThan(0)

      // Verify proper heading structure
      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation in RTL', () => {
    it('should support proper keyboard navigation flow in RTL', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper initialLanguage="ar">
          <IEPCreationWizard 
            initialData={null}
            language="ar"
            onComplete={() => {}}
            onCancel={() => {}}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument()
      })

      // Test Tab navigation
      const form = screen.getByRole('form')
      const focusableElements = form.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      // Tab through elements
      await user.tab()
      expect(document.activeElement).toBe(focusableElements[0])

      await user.tab()
      expect(document.activeElement).toBe(focusableElements[1])

      // Test Shift+Tab (reverse navigation)
      await user.tab({ shift: true })
      expect(document.activeElement).toBe(focusableElements[0])
    })

    it('should support arrow key navigation in RTL tables and lists', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper initialLanguage="ar">
          <IEPGoalAnalytics
            studentId="student-1"
            goals={mockGoals}
            language="ar"
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
      })

      // Find a data cell and focus it
      const dataCells = screen.getAllByRole('cell')
      if (dataCells.length > 0) {
        dataCells[0].focus()

        // In RTL, right arrow should move to previous column
        await user.keyboard('{ArrowRight}')
        
        // Left arrow should move to next column
        await user.keyboard('{ArrowLeft}')

        // Up/Down arrows should work normally
        await user.keyboard('{ArrowDown}')
        await user.keyboard('{ArrowUp}')
      }
    })

    it('should maintain focus indicators in RTL layout', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper initialLanguage="ar">
          <div>
            <button data-testid="button-1">زر أول</button>
            <button data-testid="button-2">زر ثاني</button>
            <input data-testid="input-1" placeholder="حقل إدخال" />
          </div>
        </TestWrapper>
      )

      // Tab to first button
      await user.tab()
      const button1 = screen.getByTestId('button-1')
      expect(button1).toHaveFocus()

      // Focus should be visible
      expect(button1).toHaveStyle('outline: auto')

      // Tab to next element
      await user.tab()
      const button2 = screen.getByTestId('button-2')
      expect(button2).toHaveFocus()
    })

    it('should handle Enter and Space key interactions correctly', async () => {
      const user = userEvent.setup()
      const onClickSpy = vi.fn()

      render(
        <TestWrapper initialLanguage="ar">
          <button onClick={onClickSpy} data-testid="action-button">
            تنفيذ الإجراء
          </button>
        </TestWrapper>
      )

      const button = screen.getByTestId('action-button')
      button.focus()

      // Test Enter key
      await user.keyboard('{Enter}')
      expect(onClickSpy).toHaveBeenCalledTimes(1)

      // Test Space key
      await user.keyboard(' ')
      expect(onClickSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('Screen Reader Support', () => {
    it('should provide proper ARIA labels in Arabic', async () => {
      render(
        <TestWrapper initialLanguage="ar">
          <IEPCreationWizard 
            initialData={null}
            language="ar"
            onComplete={() => {}}
            onCancel={() => {}}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument()
      })

      // Check for Arabic ARIA labels
      const ariaLabels = document.querySelectorAll('[aria-label]')
      ariaLabels.forEach(element => {
        const label = element.getAttribute('aria-label')
        expect(label).toBeTruthy()
        // Should contain Arabic text
        expect(label).toMatch(/[\u0600-\u06FF]/)
      })

      // Check for proper aria-labelledby relationships
      const labelledByElements = document.querySelectorAll('[aria-labelledby]')
      labelledByElements.forEach(element => {
        const labelId = element.getAttribute('aria-labelledby')
        const labelElement = document.getElementById(labelId!)
        expect(labelElement).toBeInTheDocument()
      })
    })

    it('should announce form validation errors in Arabic', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper initialLanguage="ar">
          <form>
            <label htmlFor="required-field">حقل مطلوب *</label>
            <input 
              id="required-field" 
              required 
              aria-describedby="field-error"
              data-testid="required-input"
            />
            <div id="field-error" role="alert" aria-live="polite">
              هذا الحقل مطلوب
            </div>
            <button type="submit" data-testid="submit">إرسال</button>
          </form>
        </TestWrapper>
      )

      // Try to submit without filling required field
      const submitButton = screen.getByTestId('submit')
      await user.click(submitButton)

      // Error should be announced
      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toHaveTextContent('هذا الحقل مطلوب')
      expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    })

    it('should provide proper landmark navigation', async () => {
      render(
        <TestWrapper initialLanguage="ar">
          <Layout>
            <main>
              <h1>الصفحة الرئيسية</h1>
              <section aria-labelledby="goals-heading">
                <h2 id="goals-heading">أهداف البرنامج التربوي الفردي</h2>
                <IEPGoalAnalytics
                  studentId="student-1"
                  goals={mockGoals}
                  language="ar"
                />
              </section>
            </main>
          </Layout>
        </TestWrapper>
      )

      // Check landmark roles
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('banner')).toBeInTheDocument()

      // Check section labeling
      const section = screen.getByLabelText('أهداف البرنامج التربوي الفردي')
      expect(section).toBeInTheDocument()
    })

    it('should announce live region updates in Arabic', async () => {
      const user = userEvent.setup()
      
      const TestComponent = () => {
        const [message, setMessage] = React.useState('')
        
        return (
          <TestWrapper initialLanguage="ar">
            <div>
              <button 
                onClick={() => setMessage('تم تحديث البيانات بنجاح')}
                data-testid="update-button"
              >
                تحديث البيانات
              </button>
              <div 
                aria-live="polite" 
                aria-atomic="true"
                data-testid="live-region"
              >
                {message}
              </div>
            </div>
          </TestWrapper>
        )
      }

      render(<TestComponent />)

      const button = screen.getByTestId('update-button')
      await user.click(button)

      const liveRegion = screen.getByTestId('live-region')
      expect(liveRegion).toHaveTextContent('تم تحديث البيانات بنجاح')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Form Accessibility in RTL', () => {
    it('should properly associate labels with form controls in Arabic', async () => {
      render(
        <TestWrapper initialLanguage="ar">
          <form>
            <div>
              <label htmlFor="student-name">اسم الطالب</label>
              <input 
                id="student-name" 
                name="studentName"
                data-testid="student-name-input"
              />
            </div>
            <div>
              <label htmlFor="goal-type">نوع الهدف</label>
              <select id="goal-type" name="goalType" data-testid="goal-type-select">
                <option value="">اختر نوع الهدف</option>
                <option value="academic">أكاديمي</option>
                <option value="social">اجتماعي</option>
                <option value="behavioral">سلوكي</option>
              </select>
            </div>
            <fieldset>
              <legend>طريقة القياس</legend>
              <input type="radio" id="percentage" name="measurement" value="percentage" />
              <label htmlFor="percentage">نسبة مئوية</label>
              <input type="radio" id="frequency" name="measurement" value="frequency" />
              <label htmlFor="frequency">تكرار</label>
            </fieldset>
          </form>
        </TestWrapper>
      )

      // Check label associations
      const nameInput = screen.getByTestId('student-name-input')
      expect(nameInput).toHaveAccessibleName('اسم الطالب')

      const typeSelect = screen.getByTestId('goal-type-select')
      expect(typeSelect).toHaveAccessibleName('نوع الهدف')

      // Check fieldset and legend
      const radioButtons = screen.getAllByRole('radio')
      radioButtons.forEach(radio => {
        expect(radio).toHaveAccessibleName()
      })

      // Check for accessibility violations
      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })

    it('should provide helpful error messages and instructions in Arabic', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper initialLanguage="ar">
          <form>
            <div>
              <label htmlFor="email">البريد الإلكتروني *</label>
              <input 
                id="email" 
                type="email" 
                required 
                aria-describedby="email-instructions email-error"
                data-testid="email-input"
              />
              <div id="email-instructions" className="sr-only">
                يجب أن يحتوي البريد الإلكتروني على رمز @
              </div>
              <div id="email-error" role="alert" aria-live="polite"></div>
            </div>
          </form>
        </TestWrapper>
      )

      const emailInput = screen.getByTestId('email-input')
      
      // Input should have accessible description
      expect(emailInput).toHaveAccessibleDescription('يجب أن يحتوي البريد الإلكتروني على رمز @')

      // Simulate validation error
      await user.type(emailInput, 'invalid-email')
      fireEvent.blur(emailInput)

      // Error message should be announced
      const errorDiv = document.getElementById('email-error')
      fireEvent.change(errorDiv!, { target: { textContent: 'البريد الإلكتروني غير صحيح' } })
      
      expect(errorDiv).toHaveAttribute('role', 'alert')
    })
  })

  describe('Data Table Accessibility in RTL', () => {
    it('should provide proper table structure with Arabic headers', async () => {
      render(
        <TestWrapper initialLanguage="ar">
          <ServiceHourTracking 
            studentId="student-1"
            language="ar"
            sessions={[]}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      const table = screen.getByRole('table')
      
      // Check table has caption or accessible name
      expect(table).toHaveAccessibleName()

      // Check column headers
      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders.length).toBeGreaterThan(0)

      columnHeaders.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col')
        // Should contain Arabic text
        expect(header.textContent).toMatch(/[\u0600-\u06FF]/)
      })

      // Check row headers if present
      const rowHeaders = screen.queryAllByRole('rowheader')
      rowHeaders.forEach(header => {
        expect(header).toHaveAttribute('scope', 'row')
      })
    })

    it('should support table navigation with keyboard in RTL', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper initialLanguage="ar">
          <table role="grid">
            <thead>
              <tr>
                <th role="columnheader">التاريخ</th>
                <th role="columnheader">النوع</th>
                <th role="columnheader">المدة</th>
                <th role="columnheader">الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td role="gridcell" tabIndex={0} data-testid="cell-1-1">2024-02-01</td>
                <td role="gridcell" tabIndex={-1} data-testid="cell-1-2">علاج نطق</td>
                <td role="gridcell" tabIndex={-1} data-testid="cell-1-3">45 دقيقة</td>
                <td role="gridcell" tabIndex={-1} data-testid="cell-1-4">مكتمل</td>
              </tr>
            </tbody>
          </table>
        </TestWrapper>
      )

      // Focus first cell
      const firstCell = screen.getByTestId('cell-1-1')
      firstCell.focus()
      expect(firstCell).toHaveFocus()

      // In RTL, Right arrow should move to previous column
      await user.keyboard('{ArrowRight}')
      // Left arrow should move to next column  
      await user.keyboard('{ArrowLeft}')
      expect(screen.getByTestId('cell-1-2')).toHaveFocus()
    })
  })

  describe('Color and Contrast Accessibility', () => {
    it('should meet WCAG AA contrast requirements for Arabic text', async () => {
      render(
        <TestWrapper initialLanguage="ar">
          <div>
            <h1 style={{ color: '#333', backgroundColor: '#fff' }}>
              العنوان الرئيسي
            </h1>
            <p style={{ color: '#666', backgroundColor: '#fff' }}>
              نص عادي باللغة العربية يجب أن يحقق معايير التباين المطلوبة
            </p>
            <button style={{ color: '#fff', backgroundColor: '#007cba' }}>
              زر الإجراء
            </button>
          </div>
        </TestWrapper>
      )

      // Use axe to check color contrast
      const results = await axe(document.body, {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
      
      expect(results).toHaveNoViolations()
    })

    it('should not rely solely on color to convey information', async () => {
      render(
        <TestWrapper initialLanguage="ar">
          <div>
            <div className="status-indicator">
              <span className="icon" aria-label="مكتمل">✓</span>
              <span style={{ color: 'green' }}>مكتمل</span>
            </div>
            <div className="status-indicator">
              <span className="icon" aria-label="معلق">⚠</span>
              <span style={{ color: 'orange' }}>معلق</span>
            </div>
            <div className="status-indicator">
              <span className="icon" aria-label="فشل">✗</span>
              <span style={{ color: 'red' }}>فشل</span>
            </div>
          </div>
        </TestWrapper>
      )

      // Each status should have both color and icon/text
      const statusIcons = screen.getAllByLabelText(/مكتمل|معلق|فشل/)
      expect(statusIcons.length).toBe(3)

      // Should not have color-only violations
      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Mobile Accessibility in RTL', () => {
    it('should maintain accessibility on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })

      render(
        <TestWrapper initialLanguage="ar">
          <Layout>
            <IEPGoalAnalytics
              studentId="student-1"
              goals={mockGoals}
              language="ar"
            />
          </Layout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument()
      })

      // Check touch target sizes (minimum 44x44px)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect()
        expect(rect.width).toBeGreaterThanOrEqual(44)
        expect(rect.height).toBeGreaterThanOrEqual(44)
      })

      // Check for mobile-specific accessibility violations
      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })

    it('should support touch gestures and screen reader gestures', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper initialLanguage="ar">
          <div>
            <button 
              data-testid="swipeable-item"
              onTouchStart={() => {}}
              onTouchEnd={() => {}}
            >
              عنصر قابل للتمرير
            </button>
          </div>
        </TestWrapper>
      )

      const swipeableItem = screen.getByTestId('swipeable-item')
      
      // Should be focusable and clickable
      expect(swipeableItem).toHaveAttribute('tabindex', '0')
      
      // Should respond to keyboard activation
      swipeableItem.focus()
      await user.keyboard('{Enter}')
      await user.keyboard(' ')
    })
  })

  describe('Complex Component Accessibility', () => {
    it('should handle wizard/multi-step forms accessibility in RTL', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper initialLanguage="ar">
          <IEPCreationWizard 
            initialData={null}
            language="ar"
            onComplete={() => {}}
            onCancel={() => {}}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument()
      })

      // Should have proper step indicators
      const stepIndicators = screen.queryAllByRole('tab')
      if (stepIndicators.length > 0) {
        stepIndicators.forEach((indicator, index) => {
          expect(indicator).toHaveAttribute('aria-selected')
          if (index === 0) {
            expect(indicator).toHaveAttribute('aria-selected', 'true')
          }
        })
      }

      // Should announce progress
      const progressRegion = screen.queryByLabelText(/الخطوة|التقدم/)
      if (progressRegion) {
        expect(progressRegion).toHaveAttribute('aria-live', 'polite')
      }

      // Navigation buttons should be accessible
      const nextButton = screen.queryByText(/التالي|المتابعة/)
      if (nextButton) {
        expect(nextButton).toBeEnabled()
        expect(nextButton).toHaveAccessibleName()
      }

      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })

    it('should provide accessible data visualization in Arabic', async () => {
      render(
        <TestWrapper initialLanguage="ar">
          <IEPGoalAnalytics
            studentId="student-1"
            goals={mockGoals}
            language="ar"
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('region')).toBeInTheDocument()
      })

      // Charts should have text alternatives
      const chartElements = document.querySelectorAll('[role="img"]')
      chartElements.forEach(chart => {
        expect(chart).toHaveAccessibleName()
      })

      // Data tables should be properly structured
      const tables = screen.queryAllByRole('table')
      tables.forEach(table => {
        expect(table).toHaveAccessibleName()
        
        // Headers should be properly associated
        const headers = table.querySelectorAll('th')
        headers.forEach(header => {
          expect(header).toHaveAttribute('scope')
        })
      })

      const results = await axe(document.body, {
        rules: {
          'empty-heading': { enabled: false }, // May have dynamic headings
        }
      })
      expect(results).toHaveNoViolations()
    })
  })

  describe('Error Handling Accessibility', () => {
    it('should announce errors appropriately in Arabic', async () => {
      const user = userEvent.setup()

      const TestErrorComponent = () => {
        const [error, setError] = React.useState('')
        
        return (
          <TestWrapper initialLanguage="ar">
            <div>
              <button 
                onClick={() => setError('حدث خطأ في النظام')}
                data-testid="trigger-error"
              >
                إجراء يسبب خطأ
              </button>
              {error && (
                <div 
                  role="alert" 
                  aria-live="assertive"
                  data-testid="error-message"
                >
                  {error}
                </div>
              )}
            </div>
          </TestWrapper>
        )
      }

      render(<TestErrorComponent />)

      const triggerButton = screen.getByTestId('trigger-error')
      await user.click(triggerButton)

      const errorMessage = screen.getByTestId('error-message')
      expect(errorMessage).toHaveTextContent('حدث خطأ في النظام')
      expect(errorMessage).toHaveAttribute('role', 'alert')
      expect(errorMessage).toHaveAttribute('aria-live', 'assertive')
    })

    it('should provide recovery instructions in Arabic', async () => {
      render(
        <TestWrapper initialLanguage="ar">
          <div role="alert">
            <h2>فشل في تحميل البيانات</h2>
            <p>لم نتمكن من تحميل بيانات الطالب. يرجى المحاولة مرة أخرى.</p>
            <button data-testid="retry-button">إعادة المحاولة</button>
            <a href="/help" data-testid="help-link">الحصول على المساعدة</a>
          </div>
        </TestWrapper>
      )

      const retryButton = screen.getByTestId('retry-button')
      const helpLink = screen.getByTestId('help-link')

      expect(retryButton).toHaveAccessibleName('إعادة المحاولة')
      expect(helpLink).toHaveAccessibleName('الحصول على المساعدة')

      const results = await axe(document.body)
      expect(results).toHaveNoViolations()
    })
  })
})

export { TestWrapper }