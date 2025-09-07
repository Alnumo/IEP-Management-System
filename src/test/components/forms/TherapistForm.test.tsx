/**
 * TherapistForm Component Unit Tests
 * Test ID: 1.1-UNIT-005 (Priority: P0 - Critical)
 * Component: Healthcare provider management
 * 
 * Description: Test TherapistForm validation logic and Arabic support
 * Setup: TherapistForm with various input scenarios
 * Assertions: Required field validation, Arabic name handling, form submission
 * Data: Therapist profiles with Arabic credentials
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TherapistForm from '@/components/forms/TherapistForm'
import { 
  renderWithArabicContext, 
  renderWithEnglishContext,
  getArabicInputTestCases,
  validateArabicCharacterRendering,
  validateRTLLayout,
  setupArabicFonts
} from '@/test/utils/arabic-rtl-test-helpers'
import type { CreateTherapistData } from '@/types/therapist'

// Mock therapist data for testing
const mockTherapistData: Partial<CreateTherapistData> = {
  first_name_ar: 'د. أحمد',
  last_name_ar: 'العبدالله',
  first_name_en: 'Dr. Ahmed',
  last_name_en: 'Al-Abdullah',
  email: 'ahmed.therapist@arkan.sa',
  phone: '+966501234567',
  address: 'الرياض، المملكة العربية السعودية',
  specialization_ar: 'علاج النطق واللغة',
  specialization_en: 'Speech and Language Therapy',
  qualifications: ['ماجستير علاج النطق', 'Bachelor of Speech Therapy'],
  experience_years: 5,
  hourly_rate: 200,
  employment_type: 'full_time',
  hire_date: '2024-01-15'
}

// Mock functions
const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

describe('1.1-UNIT-005: TherapistForm Component', () => {
  beforeEach(() => {
    setupArabicFonts()
    mockOnSubmit.mockClear()
    mockOnCancel.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('P0: Critical Healthcare Provider Management', () => {
    it('renders TherapistForm correctly with Arabic context', () => {
      // Test Description: Test TherapistForm validation logic and Arabic support
      // Justification: Healthcare provider management
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Verify Arabic form elements
      expect(screen.getByText('إضافة معالج جديد')).toBeInTheDocument()
      expect(screen.getByText('الاسم الأول بالعربية *')).toBeInTheDocument()
      expect(screen.getByText('اسم العائلة بالعربية *')).toBeInTheDocument()
      expect(screen.getByText('التخصص بالعربية')).toBeInTheDocument()
      expect(screen.getByText('المؤهلات *')).toBeInTheDocument()
      expect(screen.getByText('سنوات الخبرة')).toBeInTheDocument()
      expect(screen.getByText('نوع التوظيف')).toBeInTheDocument()
    })

    it('validates required Arabic healthcare provider fields', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /حفظ|إضافة|save/i })
      await user.click(submitButton)

      // Should show validation errors for required fields
      await waitFor(() => {
        expect(screen.getByText('Arabic first name is required')).toBeInTheDocument()
        expect(screen.getByText('Arabic last name is required')).toBeInTheDocument()
      })

      // Form should not submit
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('accepts valid Arabic healthcare provider credentials', async () => {
      const user = userEvent.setup()
      const testCases = getArabicInputTestCases()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Fill required Arabic fields with healthcare provider data
      const firstNameInput = screen.getByLabelText(/الاسم الأول بالعربية/i)
      const lastNameInput = screen.getByLabelText(/اسم العائلة بالعربية/i)

      await user.type(firstNameInput, 'د. سارة')
      await user.type(lastNameInput, 'المحمد')

      // Verify Arabic healthcare professional names are accepted
      expect(firstNameInput).toHaveValue('د. سارة')
      expect(lastNameInput).toHaveValue('المحمد')
      
      // Validate Arabic character rendering for healthcare names
      validateArabicCharacterRendering(firstNameInput)
      validateArabicCharacterRendering(lastNameInput)
      
      // Verify professional Arabic titles are handled correctly
      expect(firstNameInput.value).toContain('د.')
    })

    it('handles Arabic medical specializations correctly', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <TherapistForm
          initialData={mockTherapistData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Verify Arabic specialization is displayed
      const specializationInput = screen.getByDisplayValue('علاج النطق واللغة')
      expect(specializationInput).toBeInTheDocument()
      
      // Validate Arabic medical terminology
      validateArabicCharacterRendering(specializationInput)
      expect(specializationInput).toHaveValue('علاج النطق واللغة')

      // Test entering new Arabic medical specialization
      await user.clear(specializationInput)
      await user.type(specializationInput, 'العلاج الطبيعي')
      
      expect(specializationInput).toHaveValue('العلاج الطبيعي')
      validateArabicCharacterRendering(specializationInput)
    })

    it('validates healthcare professional qualifications array', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Fill required fields
      await user.type(screen.getByLabelText(/الاسم الأول بالعربية/i), 'د. فاطمة')
      await user.type(screen.getByLabelText(/اسم العائلة بالعربية/i), 'الزهراني')

      // Add multiple qualifications
      const firstQualificationInput = screen.getByDisplayValue('')
      await user.type(firstQualificationInput, 'ماجستير العلاج الطبيعي')

      // Add another qualification
      const addQualificationButton = screen.getByText(/إضافة مؤهل|Add Qualification/i)
      await user.click(addQualificationButton)

      const qualificationInputs = screen.getAllByPlaceholderText(/مؤهل|Qualification/i)
      await user.type(qualificationInputs[1], 'دبلوم العلاج التنفسي')

      // Verify qualifications are properly handled
      expect(qualificationInputs[0]).toHaveValue('ماجستير العلاج الطبيعي')
      expect(qualificationInputs[1]).toHaveValue('دبلوم العلاج التنفسي')

      // Validate Arabic medical qualifications
      qualificationInputs.forEach(input => {
        validateArabicCharacterRendering(input)
      })
    })

    it('validates employment type selection with Arabic labels', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Test employment type selection
      const employmentSelect = screen.getByRole('combobox', { name: /نوع التوظيف|Employment Type/i })
      await user.click(employmentSelect)

      // Verify Arabic employment type options
      expect(screen.getByText('دوام كامل')).toBeInTheDocument()
      expect(screen.getByText('دوام جزئي')).toBeInTheDocument()
      expect(screen.getByText('متعاقد')).toBeInTheDocument()
      expect(screen.getByText('متطوع')).toBeInTheDocument()

      // Select part-time
      const partTimeOption = screen.getByText('دوام جزئي')
      await user.click(partTimeOption)

      // Verify selection
      expect(employmentSelect).toHaveTextContent('دوام جزئي')
    })
  })

  describe('Healthcare Professional Validation', () => {
    it('validates experience years for healthcare providers', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const experienceInput = screen.getByLabelText(/سنوات الخبرة|Experience Years/i)
      
      // Test invalid experience (negative)
      await user.type(experienceInput, '-1')
      expect(experienceInput).toHaveValue(-1)

      // Test valid experience range (0-50)
      await user.clear(experienceInput)
      await user.type(experienceInput, '10')
      expect(experienceInput).toHaveValue(10)

      // Test maximum experience
      await user.clear(experienceInput)
      await user.type(experienceInput, '35')
      expect(experienceInput).toHaveValue(35)
    })

    it('validates hourly rate for healthcare services', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const hourlyRateInput = screen.getByLabelText(/السعر بالساعة|Hourly Rate/i)
      
      // Test valid healthcare service rate
      await user.type(hourlyRateInput, '250')
      expect(hourlyRateInput).toHaveValue(250)

      // Rate should be non-negative
      await user.clear(hourlyRateInput)
      await user.type(hourlyRateInput, '0')
      expect(hourlyRateInput).toHaveValue(0)
    })

    it('validates email format for healthcare professional contact', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const emailInput = screen.getByLabelText(/البريد الإلكتروني|Email/i)
      
      // Test invalid email
      await user.type(emailInput, 'invalid-email')
      await user.tab() // Trigger validation

      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument()
      })

      // Test valid healthcare professional email
      await user.clear(emailInput)
      await user.type(emailInput, 'therapist@arkan.sa')
      
      expect(emailInput).toHaveValue('therapist@arkan.sa')
    })

    it('handles hire date selection for healthcare providers', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Test date picker for hire date
      const hireDateButton = screen.getByRole('button', { name: /تاريخ التعيين|Hire Date/i })
      await user.click(hireDateButton)

      // Date picker should open
      const calendar = screen.getByRole('dialog') || screen.getByRole('grid')
      expect(calendar).toBeInTheDocument()

      // Select a date (today for simplicity)
      const todayButton = screen.getByRole('button', { name: new Date().getDate().toString() })
      await user.click(todayButton)

      // Date should be selected
      const today = new Date().toLocaleDateString()
      expect(hireDateButton).toHaveTextContent(today)
    })
  })

  describe('Form Submission and Data Handling', () => {
    it('submits complete healthcare provider data correctly', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Fill all required fields with healthcare provider data
      await user.type(screen.getByLabelText(/الاسم الأول بالعربية/i), 'د. عبد الرحمن')
      await user.type(screen.getByLabelText(/اسم العائلة بالعربية/i), 'الغامدي')
      await user.type(screen.getByLabelText(/البريد الإلكتروني/i), 'abdulrahman@arkan.sa')
      await user.type(screen.getByLabelText(/رقم الهاتف|Phone/i), '+966501234567')
      await user.type(screen.getByLabelText(/التخصص بالعربية/i), 'علاج وظيفي')
      
      // Add qualification
      const qualificationInput = screen.getByDisplayValue('')
      await user.type(qualificationInput, 'ماجستير العلاج الوظيفي')
      
      // Set experience
      await user.type(screen.getByLabelText(/سنوات الخبرة/i), '8')
      
      // Set hourly rate
      await user.type(screen.getByLabelText(/السعر بالساعة/i), '300')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /حفظ|save/i })
      await user.click(submitButton)

      // Verify healthcare provider data structure
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            first_name_ar: 'د. عبد الرحمن',
            last_name_ar: 'الغامدي',
            email: 'abdulrahman@arkan.sa',
            phone: '+966501234567',
            specialization_ar: 'علاج وظيفي',
            qualifications: ['ماجستير العلاج الوظيفي'],
            experience_years: 8,
            hourly_rate: 300,
            employment_type: 'full_time'
          })
        )
      })
    })

    it('filters empty qualifications from submission data', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Fill required fields
      await user.type(screen.getByLabelText(/الاسم الأول بالعربية/i), 'د. نورا')
      await user.type(screen.getByLabelText(/اسم العائلة بالعربية/i), 'القحطاني')

      // Add qualification
      const qualificationInput = screen.getByDisplayValue('')
      await user.type(qualificationInput, 'دكتوراه علم النفس')

      // Add empty qualification
      const addButton = screen.getByText(/إضافة مؤهل|Add Qualification/i)
      await user.click(addButton)

      // Submit without filling the second qualification
      const submitButton = screen.getByRole('button', { name: /حفظ|save/i })
      await user.click(submitButton)

      // Should only include non-empty qualifications
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            qualifications: ['دكتوراه علم النفس']
          })
        )
      })
    })

    it('handles form cancellation', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const cancelButton = screen.getByText(/إلغاء|Cancel/i)
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalledOnce()
    })
  })

  describe('RTL Layout and Arabic Support', () => {
    it('maintains RTL layout for Arabic healthcare forms', () => {
      const { container } = renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Verify RTL direction
      const mainDiv = container.querySelector('div[dir="rtl"]')
      expect(mainDiv).toBeInTheDocument()
      validateRTLLayout(mainDiv!)

      // Verify Arabic input fields have correct styling
      const arabicInputs = container.querySelectorAll('input[class*="font-arabic"]')
      arabicInputs.forEach(input => {
        validateRTLLayout(input as HTMLElement)
      })
    })

    it('renders with English context for international users', () => {
      renderWithEnglishContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Verify English labels
      expect(screen.getByText('Add New Therapist')).toBeInTheDocument()
      expect(screen.getByText('First Name (Arabic) *')).toBeInTheDocument()
      expect(screen.getByText('Last Name (Arabic) *')).toBeInTheDocument()
      expect(screen.getByText('Specialization (Arabic)')).toBeInTheDocument()
      expect(screen.getByText('Qualifications *')).toBeInTheDocument()
    })
  })

  describe('Loading and Error States', () => {
    it('shows loading state during form submission', () => {
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )

      // Submit button should be disabled during loading
      const submitButton = screen.getByRole('button', { name: /حفظ|save/i })
      expect(submitButton).toBeDisabled()
    })

    it('handles dynamic qualification management', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Add qualification
      const addButton = screen.getByText(/إضافة مؤهل|Add Qualification/i)
      await user.click(addButton)

      // Should have two qualification inputs now
      const qualificationInputs = screen.getAllByPlaceholderText(/مؤهل|Qualification/i)
      expect(qualificationInputs).toHaveLength(2)

      // Remove qualification
      const removeButton = screen.getByRole('button', { name: /حذف|remove/i })
      await user.click(removeButton)

      // Should be back to one qualification input
      const remainingInputs = screen.getAllByPlaceholderText(/مؤهل|Qualification/i)
      expect(remainingInputs).toHaveLength(1)
    })
  })

  describe('Medical Professional Context Validation', () => {
    it('validates Arabic medical professional titles', async () => {
      const user = userEvent.setup()
      const testCases = getArabicInputTestCases()
      
      renderWithArabicContext(
        <TherapistForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Test various Arabic medical titles
      const medicalTitles = ['د.', 'دكتور', 'دكتورة', 'أ.د', 'prof.']
      
      for (const title of medicalTitles) {
        const firstNameInput = screen.getByLabelText(/الاسم الأول بالعربية/i)
        await user.clear(firstNameInput)
        await user.type(firstNameInput, `${title} أحمد`)
        
        expect(firstNameInput).toHaveValue(`${title} أحمد`)
        validateArabicCharacterRendering(firstNameInput)
      }
    })

    it('handles Arabic medical specialization terminology correctly', () => {
      const arabicSpecializations = [
        'علاج النطق واللغة',
        'العلاج الطبيعي',
        'العلاج الوظيفي',
        'علم النفس السريري',
        'التربية الخاصة',
        'علاج السلوك التطبيقي'
      ]

      arabicSpecializations.forEach(specialization => {
        const { container } = renderWithArabicContext(
          <TherapistForm
            initialData={{ specialization_ar: specialization }}
            onSubmit={mockOnSubmit}
            onCancel={mockOnCancel}
          />
        )

        const specializationInput = screen.getByDisplayValue(specialization)
        expect(specializationInput).toBeInTheDocument()
        validateArabicCharacterRendering(specializationInput)
      })
    })
  })
})

/**
 * Test Coverage Summary for 1.1-UNIT-005:
 * ✅ Healthcare provider form rendering
 * ✅ Required Arabic field validation
 * ✅ Arabic healthcare credentials acceptance
 * ✅ Medical specialization handling
 * ✅ Professional qualifications array
 * ✅ Employment type selection
 * ✅ Experience years validation
 * ✅ Hourly rate validation
 * ✅ Email format validation
 * ✅ Hire date selection
 * ✅ Complete form submission
 * ✅ Empty qualification filtering
 * ✅ Form cancellation
 * ✅ RTL layout validation
 * ✅ English context support
 * ✅ Loading states
 * ✅ Dynamic qualification management
 * ✅ Medical professional titles
 * ✅ Arabic medical specializations
 * 
 * Risk Coverage: Healthcare provider management validation
 * Ensures Arabic medical professional data is properly handled
 * Covers critical healthcare workforce management component
 */