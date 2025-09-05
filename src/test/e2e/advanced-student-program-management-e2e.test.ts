import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { chromium, Browser, Page, BrowserContext } from 'playwright'

// Mock data for E2E tests
const mockStudentData = {
  name_ar: 'أحمد محمد علي',
  name_en: 'Ahmed Mohammed Ali',
  date_of_birth: '2015-05-15',
  medical_record_number: 'MR2025001',
  parent_name_ar: 'محمد علي',
  parent_name_en: 'Mohammed Ali',
  parent_phone: '+966501234567',
  parent_email: 'mohammed.ali@example.com'
}

const mockTherapistData = {
  name_ar: 'د. سارة أحمد',
  name_en: 'Dr. Sarah Ahmed',
  specialties: ['speech_therapy', 'occupational_therapy'],
  email: 'sarah.ahmed@therapycenter.com',
  phone: '+966502345678'
}

const mockProgramData = {
  name_ar: 'برنامج تطوير النطق المكثف',
  name_en: 'Intensive Speech Development Program',
  duration_weeks: 12,
  sessions_per_week: 3,
  session_duration: 60,
  goals: [
    { goal_ar: 'تحسين النطق والوضوح', goal_en: 'Improve speech clarity' },
    { goal_ar: 'تطوير المفردات', goal_en: 'Develop vocabulary' }
  ]
}

describe('Advanced Student Program Management - E2E Tests', () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  
  const baseUrl = process.env.VITE_APP_URL || 'http://localhost:3000'
  const testTimeout = 30000

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.CI ? 0 : 100
    })
  })

  afterAll(async () => {
    await browser.close()
  })

  beforeEach(async () => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      timezoneId: 'Asia/Riyadh'
    })
    
    page = await context.newPage()
    
    // Setup request interception for API mocking
    await page.route('**/api/**', async (route) => {
      const request = route.request()
      const url = request.url()
      const method = request.method()

      // Mock API responses based on URL patterns
      if (url.includes('/program-templates') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'template-1',
                ...mockProgramData,
                customization_options: {
                  intensity_levels: ['low', 'medium', 'high'],
                  session_types: ['individual', 'group'],
                  assessment_frequencies: ['weekly', 'biweekly', 'monthly']
                }
              }
            ]
          })
        })
      } else if (url.includes('/students') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'student-1',
                ...mockStudentData
              }
            ]
          })
        })
      } else if (url.includes('/therapists') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'therapist-1',
                ...mockTherapistData,
                current_workload: {
                  weekly_hours: 25,
                  capacity_remaining: 15,
                  utilization_percentage: 62.5,
                  active_students: 12
                }
              }
            ]
          })
        })
      } else if (url.includes('/enrollments') && method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'enrollment-1',
              student_id: 'student-1',
              program_template_id: 'template-1',
              assigned_therapist_id: 'therapist-1',
              individual_start_date: '2025-09-01',
              individual_end_date: '2025-12-01',
              enrollment_status: 'active'
            }
          })
        })
      } else {
        // Default success response for other API calls
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], success: true })
        })
      }
    })

    // Navigate to the application
    await page.goto(baseUrl)
    
    // Mock authentication state
    await page.evaluate(() => {
      window.localStorage.setItem('auth-user', JSON.stringify({
        id: 'user-1',
        role: 'admin',
        name: 'Test Administrator'
      }))
    })
  })

  afterEach(async () => {
    await context.close()
  })

  describe('Complete Enrollment Workflow', () => {
    it('should complete full student enrollment with program customization and therapist assignment', async () => {
      // Step 1: Navigate to enrollment section
      await page.click('[data-testid="sidebar-students"]')
      await page.click('[data-testid="new-enrollment-button"]')

      // Step 2: Select program template
      await page.waitForSelector('[data-testid="program-template-selector"]')
      await page.click(`[data-testid="template-${mockProgramData.name_en.replace(/\s+/g, '-').toLowerCase()}"]`)
      
      // Verify template selection
      await expect(page.locator('[data-testid="selected-template"]'))
        .toContainText(mockProgramData.name_en)

      // Step 3: Select student
      await page.waitForSelector('[data-testid="student-selector"]')
      await page.selectOption('[data-testid="student-dropdown"]', 'student-1')
      
      // Verify student selection
      await expect(page.locator('[data-testid="selected-student"]'))
        .toContainText(mockStudentData.name_en)

      // Step 4: Customize program
      await page.click('[data-testid="customize-program-button"]')
      
      // Set program intensity
      await page.selectOption('[data-testid="intensity-level"]', 'high')
      
      // Customize schedule
      await page.fill('[data-testid="sessions-per-week"]', '3')
      await page.check('[data-testid="preferred-day-monday"]')
      await page.check('[data-testid="preferred-day-wednesday"]')
      await page.check('[data-testid="preferred-day-friday"]')
      await page.fill('[data-testid="preferred-time"]', '10:00')

      // Step 5: Assign therapist
      await page.click('[data-testid="assign-therapist-button"]')
      await page.waitForSelector('[data-testid="therapist-assignment-manager"]')
      
      // Select recommended therapist
      await page.click('[data-testid="therapist-recommendation-therapist-1"]')
      
      // Verify therapist workload impact
      await expect(page.locator('[data-testid="workload-impact"]'))
        .toBeVisible()
      
      // Step 6: Review and confirm enrollment
      await page.click('[data-testid="review-enrollment"]')
      
      // Verify enrollment summary
      await expect(page.locator('[data-testid="enrollment-summary"]')).toContainText([
        mockStudentData.name_en,
        mockProgramData.name_en,
        mockTherapistData.name_en,
        '3 sessions per week'
      ])
      
      // Confirm enrollment
      await page.click('[data-testid="confirm-enrollment"]')
      
      // Step 7: Verify successful enrollment
      await page.waitForSelector('[data-testid="enrollment-success"]')
      await expect(page.locator('[data-testid="enrollment-success"]'))
        .toContainText('Enrollment created successfully')
      
      // Verify enrollment appears in the list
      await page.goto(`${baseUrl}/enrollments`)
      await expect(page.locator('[data-testid="enrollment-list"]'))
        .toContainText(mockStudentData.name_en)

    }, testTimeout)

    it('should handle enrollment with Arabic interface', async () => {
      // Switch to Arabic language
      await page.click('[data-testid="language-toggle"]')
      await page.click('[data-testid="language-arabic"]')
      
      // Verify RTL layout
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      
      // Navigate to enrollment in Arabic
      await page.click('[data-testid="sidebar-students"]')
      await page.click('[data-testid="new-enrollment-button"]')
      
      // Verify Arabic content is displayed
      await page.waitForSelector('[data-testid="program-template-selector"]')
      await expect(page.locator('[data-testid="template-title"]'))
        .toContainText(mockProgramData.name_ar)
      
      // Complete enrollment in Arabic
      await page.click(`[data-testid="template-${mockProgramData.name_ar}"]`)
      await page.selectOption('[data-testid="student-dropdown"]', 'student-1')
      
      // Verify Arabic student name is shown
      await expect(page.locator('[data-testid="selected-student"]'))
        .toContainText(mockStudentData.name_ar)
      
      // Continue with enrollment
      await page.click('[data-testid="assign-therapist-button"]')
      await page.click('[data-testid="therapist-recommendation-therapist-1"]')
      await page.click('[data-testid="confirm-enrollment"]')
      
      // Verify success message in Arabic
      await expect(page.locator('[data-testid="enrollment-success"]'))
        .toContainText('تم إنشاء التسجيل بنجاح')
      
    }, testTimeout)

    it('should validate enrollment business rules', async () => {
      await page.click('[data-testid="sidebar-students"]')
      await page.click('[data-testid="new-enrollment-button"]')
      
      // Try to create enrollment without required fields
      await page.click('[data-testid="confirm-enrollment"]')
      
      // Should show validation errors
      await expect(page.locator('[data-testid="validation-error-template"]'))
        .toContainText('Program template is required')
      await expect(page.locator('[data-testid="validation-error-student"]'))
        .toContainText('Student selection is required')
      
      // Select template and student
      await page.click('[data-testid="template-1"]')
      await page.selectOption('[data-testid="student-dropdown"]', 'student-1')
      
      // Try to set invalid schedule
      await page.fill('[data-testid="sessions-per-week"]', '0')
      await page.click('[data-testid="confirm-enrollment"]')
      
      // Should validate minimum sessions
      await expect(page.locator('[data-testid="validation-error-sessions"]'))
        .toContainText('At least 1 session per week is required')
      
      // Set invalid date range
      await page.fill('[data-testid="start-date"]', '2025-12-01')
      await page.fill('[data-testid="end-date"]', '2025-09-01')
      
      // Should validate date logic
      await expect(page.locator('[data-testid="validation-error-dates"]'))
        .toContainText('End date must be after start date')
      
    }, testTimeout)
  })

  describe('Therapist Assignment and Workload Management', () => {
    it('should manage therapist assignments with capacity constraints', async () => {
      // Navigate to therapist management
      await page.click('[data-testid="sidebar-therapists"]')
      await page.click('[data-testid="assignment-manager"]')
      
      // Verify current workload display
      await expect(page.locator('[data-testid="therapist-workload-therapist-1"]'))
        .toContainText('25 hours/week')
      
      // Try to assign beyond capacity
      await page.click('[data-testid="assign-student-button"]')
      await page.selectOption('[data-testid="student-select"]', 'student-1')
      await page.fill('[data-testid="sessions-per-week"]', '20') // Excessive
      
      // Should show capacity warning
      await expect(page.locator('[data-testid="capacity-warning"]'))
        .toContainText('Assignment exceeds therapist capacity')
      
      // Adjust to reasonable workload
      await page.fill('[data-testid="sessions-per-week"]', '3')
      await page.click('[data-testid="confirm-assignment"]')
      
      // Should succeed and update workload
      await expect(page.locator('[data-testid="assignment-success"]'))
        .toBeVisible()
      
      // Verify updated workload
      await expect(page.locator('[data-testid="therapist-workload-therapist-1"]'))
        .toContainText('28 hours/week') // Updated

    }, testTimeout)

    it('should handle therapist substitution workflow', async () => {
      await page.click('[data-testid="sidebar-therapists"]')
      await page.click('[data-testid="substitution-manager"]')
      
      // Request substitution
      await page.click('[data-testid="request-substitution-therapist-1"]')
      
      // Fill substitution details
      await page.fill('[data-testid="start-date"]', '2025-09-15')
      await page.fill('[data-testid="end-date"]', '2025-09-22')
      await page.selectOption('[data-testid="reason"]', 'vacation')
      await page.check('[data-testid="require-same-specialty"]')
      
      // Find substitutes
      await page.click('[data-testid="find-substitutes"]')
      
      // Verify substitute recommendations
      await expect(page.locator('[data-testid="substitute-recommendations"]'))
        .toBeVisible()
      
      // Select substitute
      await page.click('[data-testid="select-substitute-therapist-2"]')
      
      // Create substitution plan
      await page.click('[data-testid="create-plan"]')
      
      // Verify plan details
      await expect(page.locator('[data-testid="substitution-plan"]'))
        .toContainText('Coverage: 100%')
      await expect(page.locator('[data-testid="disruption-score"]'))
        .toContainText('Disruption: Low')
      
      // Execute plan
      await page.click('[data-testid="execute-plan"]')
      
      // Verify execution success
      await expect(page.locator('[data-testid="execution-success"]'))
        .toContainText('Substitution plan executed successfully')

    }, testTimeout)
  })

  describe('Performance Tracking and Analytics', () => {
    it('should track and display therapist performance metrics', async () => {
      await page.click('[data-testid="sidebar-analytics"]')
      await page.click('[data-testid="performance-tracking"]')
      
      // Select therapist for analysis
      await page.selectOption('[data-testid="therapist-select"]', 'therapist-1')
      
      // Verify performance dashboard loads
      await expect(page.locator('[data-testid="performance-dashboard"]'))
        .toBeVisible()
      
      // Check performance metrics
      await expect(page.locator('[data-testid="goal-achievement-rate"]'))
        .toContainText('%')
      await expect(page.locator('[data-testid="session-quality-score"]'))
        .toContainText('%')
      await expect(page.locator('[data-testid="student-engagement"]'))
        .toContainText('%')
      
      // Verify performance charts
      await expect(page.locator('[data-testid="performance-trend-chart"]'))
        .toBeVisible()
      await expect(page.locator('[data-testid="program-comparison-chart"]'))
        .toBeVisible()
      
      // Check peer comparison
      await page.click('[data-testid="peer-comparison-tab"]')
      await expect(page.locator('[data-testid="percentile-rank"]'))
        .toContainText('percentile')
      
      // Generate performance report
      await page.click('[data-testid="generate-report"]')
      await page.selectOption('[data-testid="report-type"]', 'comprehensive')
      await page.fill('[data-testid="period-start"]', '2025-09-01')
      await page.fill('[data-testid="period-end"]', '2025-09-30')
      
      await page.click('[data-testid="generate-report-button"]')
      
      // Verify report generation
      await expect(page.locator('[data-testid="report-generated"]'))
        .toContainText('Performance report generated successfully')

    }, testTimeout)

    it('should display cross-program performance analysis', async () => {
      await page.click('[data-testid="sidebar-analytics"]')
      await page.click('[data-testid="cross-program-analysis"]')
      
      // Select therapist and programs
      await page.selectOption('[data-testid="therapist-select"]', 'therapist-1')
      await page.check('[data-testid="program-template-1"]')
      await page.check('[data-testid="program-template-2"]')
      
      // Run analysis
      await page.click('[data-testid="analyze-performance"]')
      
      // Verify analysis results
      await expect(page.locator('[data-testid="consistency-metrics"]'))
        .toBeVisible()
      await expect(page.locator('[data-testid="program-comparisons"]'))
        .toBeVisible()
      await expect(page.locator('[data-testid="optimization-opportunities"]'))
        .toBeVisible()
      
      // Check skill transferability analysis
      await page.click('[data-testid="skill-transferability-tab"]')
      await expect(page.locator('[data-testid="transferability-score"]'))
        .toContainText('%')

    }, testTimeout)
  })

  describe('Real-time Updates and Notifications', () => {
    it('should handle real-time enrollment updates', async () => {
      await page.click('[data-testid="sidebar-enrollments"]')
      
      // Simulate real-time update
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('enrollment-update', {
          detail: {
            type: 'new_enrollment',
            data: {
              id: 'enrollment-2',
              student_name: 'New Student',
              program_name: 'New Program',
              status: 'active'
            }
          }
        }))
      })
      
      // Verify real-time update appears
      await expect(page.locator('[data-testid="enrollment-list"]'))
        .toContainText('New Student')
      
      // Verify notification
      await expect(page.locator('[data-testid="notification"]'))
        .toContainText('New enrollment created')

    }, testTimeout)

    it('should display capacity alerts in real-time', async () => {
      await page.click('[data-testid="sidebar-capacity"]')
      
      // Simulate capacity alert
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('capacity-alert', {
          detail: {
            type: 'over_assignment',
            therapist_id: 'therapist-1',
            message: 'Therapist approaching capacity limit',
            severity: 'high'
          }
        }))
      })
      
      // Verify alert appears
      await expect(page.locator('[data-testid="capacity-alert"]'))
        .toContainText('Therapist approaching capacity limit')
      
      // Verify alert severity styling
      await expect(page.locator('[data-testid="capacity-alert"]'))
        .toHaveClass(/alert-high/)

    }, testTimeout)
  })

  describe('Mobile Responsiveness', () => {
    it('should work properly on mobile devices', async () => {
      // Switch to mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Navigate using mobile menu
      await page.click('[data-testid="mobile-menu-toggle"]')
      await page.click('[data-testid="mobile-menu-students"]')
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-navigation"]'))
        .toBeVisible()
      
      // Try enrollment on mobile
      await page.click('[data-testid="new-enrollment-mobile"]')
      
      // Verify mobile form layout
      await expect(page.locator('[data-testid="enrollment-form-mobile"]'))
        .toBeVisible()
      
      // Complete enrollment on mobile
      await page.click('[data-testid="template-1"]')
      await page.selectOption('[data-testid="student-dropdown"]', 'student-1')
      await page.click('[data-testid="confirm-enrollment-mobile"]')
      
      // Verify success on mobile
      await expect(page.locator('[data-testid="enrollment-success"]'))
        .toBeVisible()

    }, testTimeout)
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network failures gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort())
      
      await page.click('[data-testid="sidebar-students"]')
      await page.click('[data-testid="new-enrollment-button"]')
      
      // Verify error handling
      await expect(page.locator('[data-testid="network-error"]'))
        .toContainText('Unable to connect to server')
      
      // Verify retry mechanism
      await page.click('[data-testid="retry-button"]')
      await expect(page.locator('[data-testid="loading-indicator"]'))
        .toBeVisible()

    }, testTimeout)

    it('should handle concurrent user actions', async () => {
      // Open multiple tabs/contexts
      const context2 = await browser.newContext()
      const page2 = await context2.newPage()
      await page2.goto(baseUrl)
      
      // Simulate concurrent enrollment attempts
      await Promise.all([
        page.click('[data-testid="sidebar-students"]').then(() => 
          page.click('[data-testid="new-enrollment-button"]')
        ),
        page2.click('[data-testid="sidebar-students"]').then(() => 
          page2.click('[data-testid="new-enrollment-button"]')
        )
      ])
      
      // Both should work without conflicts
      await expect(page.locator('[data-testid="enrollment-form"]'))
        .toBeVisible()
      await expect(page2.locator('[data-testid="enrollment-form"]'))
        .toBeVisible()
      
      await context2.close()

    }, testTimeout)
  })

  describe('Data Persistence and State Management', () => {
    it('should persist enrollment draft across page reloads', async () => {
      await page.click('[data-testid="sidebar-students"]')
      await page.click('[data-testid="new-enrollment-button"]')
      
      // Fill partial enrollment
      await page.click('[data-testid="template-1"]')
      await page.selectOption('[data-testid="student-dropdown"]', 'student-1')
      await page.fill('[data-testid="sessions-per-week"]', '3')
      
      // Enable draft saving
      await page.click('[data-testid="save-draft"]')
      
      // Reload page
      await page.reload()
      
      // Navigate back to enrollment
      await page.click('[data-testid="sidebar-students"]')
      await page.click('[data-testid="new-enrollment-button"]')
      
      // Verify draft is restored
      await expect(page.locator('[data-testid="draft-restored"]'))
        .toContainText('Draft enrollment restored')
      await expect(page.locator('[data-testid="sessions-per-week"]'))
        .toHaveValue('3')

    }, testTimeout)

    it('should maintain user preferences across sessions', async () => {
      // Set language preference
      await page.click('[data-testid="language-toggle"]')
      await page.click('[data-testid="language-arabic"]')
      
      // Set dashboard preferences
      await page.click('[data-testid="sidebar-analytics"]')
      await page.selectOption('[data-testid="default-view"]', 'performance')
      await page.click('[data-testid="save-preferences"]')
      
      // Reload page
      await page.reload()
      
      // Verify preferences are maintained
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      await page.click('[data-testid="sidebar-analytics"]')
      await expect(page.locator('[data-testid="default-view"]'))
        .toHaveValue('performance')

    }, testTimeout)
  })

  describe('Accessibility and Keyboard Navigation', () => {
    it('should support full keyboard navigation', async () => {
      // Navigate using keyboard
      await page.press('body', 'Tab') // Focus first element
      await page.press('body', 'Enter') // Activate
      
      // Continue tabbing through interface
      for (let i = 0; i < 5; i++) {
        await page.press('body', 'Tab')
      }
      
      // Use arrow keys in select elements
      await page.press('[data-testid="student-dropdown"]', 'ArrowDown')
      await page.press('[data-testid="student-dropdown"]', 'Enter')
      
      // Verify keyboard navigation works
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
      expect(focusedElement).toBeTruthy()

    }, testTimeout)

    it('should support screen reader accessibility', async () => {
      // Check ARIA labels
      await page.click('[data-testid="sidebar-students"]')
      await page.click('[data-testid="new-enrollment-button"]')
      
      // Verify form has proper labels
      const formElements = await page.locator('input, select, textarea').all()
      for (const element of formElements) {
        const ariaLabel = await element.getAttribute('aria-label')
        const id = await element.getAttribute('id')
        const hasLabel = ariaLabel || (id && await page.locator(`label[for="${id}"]`).count() > 0)
        expect(hasLabel).toBeTruthy()
      }
      
      // Verify proper heading structure
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
      expect(headings.length).toBeGreaterThan(0)

    }, testTimeout)
  })
})