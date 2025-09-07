/**
 * StudentForm Component Unit Tests
 * Test ID: 1.1-UNIT-004 (Priority: P0 - Critical)
 * Component: Core business component for student management
 * 
 * Description: Validate StudentForm renders correctly with Arabic/English content
 * Setup: StudentForm with bilingual test data
 * Assertions: Form fields render, validation works, Arabic input accepted
 * Data: Student records with Arabic names, mixed language content
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudentForm } from '@/components/forms/StudentForm'
import { 
  renderWithArabicContext, 
  renderWithEnglishContext,
  getArabicInputTestCases,
  validateArabicCharacterRendering,
  validateRTLLayout,
  setupArabicFonts
} from '@/test/utils/arabic-rtl-test-helpers'
import type { Student } from '@/types/student'

// Mock student data for testing
const mockStudentData: Student = {
  id: 'test-student-id',
  first_name_ar: 'أحمد',
  last_name_ar: 'محمد',
  first_name_en: 'Ahmed',
  last_name_en: 'Mohammed',
  date_of_birth: '2015-01-15',
  gender: 'male',
  nationality_ar: 'سعودي',
  nationality_en: 'Saudi',
  national_id: '1234567890',
  phone: '+966501234567',
  email: 'ahmed@example.com',
  address_ar: 'الرياض، المملكة العربية السعودية',
  address_en: 'Riyadh, Saudi Arabia',
  city_ar: 'الرياض',
  city_en: 'Riyadh',
  postal_code: '12345',
  diagnosis_ar: 'اضطراب طيف التوحد',
  diagnosis_en: 'Autism Spectrum Disorder',
  severity_level: 'moderate',
  allergies_ar: 'حساسية من الفول السوداني',
  allergies_en: 'Peanut allergy',
  medications_ar: 'لا توجد أدوية حالياً',
  medications_en: 'No current medications',
  special_needs_ar: 'يحتاج إلى بيئة هادئة',
  special_needs_en: 'Needs quiet environment',
  school_name_ar: 'مدرسة الأمل الابتدائية',
  school_name_en: 'Al Amal Elementary School',
  grade_level: 'الصف الثاني',
  educational_support_ar: 'دعم تعليمي إضافي',
  educational_support_en: 'Additional educational support',
  referral_source_ar: 'طبيب الأطفال',
  referral_source_en: 'Pediatrician',
  therapy_goals_ar: 'تطوير مهارات التواصل والتفاعل الاجتماعي',
  therapy_goals_en: 'Develop communication and social interaction skills',
  profile_photo_url: '',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z'
}

// Mock functions
const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

describe('1.1-UNIT-004: StudentForm Component', () => {
  beforeEach(() => {
    setupArabicFonts()
    mockOnSubmit.mockClear()
    mockOnCancel.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('P0: Critical Component Rendering', () => {
    it('renders StudentForm correctly with Arabic context', () => {
      // Test Description: Validate StudentForm renders correctly with Arabic content
      // Justification: Core business component
      
      renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Verify Arabic form title
      expect(screen.getByText('إضافة طالب جديد')).toBeInTheDocument()
      
      // Verify Arabic tab labels
      expect(screen.getByText('المعلومات الأساسية')).toBeInTheDocument()
      expect(screen.getByText('معلومات الاتصال')).toBeInTheDocument()
      expect(screen.getByText('المعلومات الطبية')).toBeInTheDocument()
      expect(screen.getByText('التعليم والعلاج')).toBeInTheDocument()

      // Verify Arabic field labels
      expect(screen.getByText('الاسم الأول (عربي) *')).toBeInTheDocument()
      expect(screen.getByText('اسم العائلة (عربي) *')).toBeInTheDocument()
      expect(screen.getByText('تاريخ الميلاد *')).toBeInTheDocument()
      expect(screen.getByText('الجنس *')).toBeInTheDocument()
    })

    it('renders StudentForm correctly with English context', () => {
      renderWithEnglishContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Verify English form title
      expect(screen.getByText('Add New Student')).toBeInTheDocument()
      
      // Verify English tab labels
      expect(screen.getByText('Basic Info')).toBeInTheDocument()
      expect(screen.getByText('Contact Info')).toBeInTheDocument()
      expect(screen.getByText('Medical Info')).toBeInTheDocument()
      expect(screen.getByText('Education & Therapy')).toBeInTheDocument()

      // Verify English field labels
      expect(screen.getByText('First Name (Arabic) *')).toBeInTheDocument()
      expect(screen.getByText('Last Name (Arabic) *')).toBeInTheDocument()
      expect(screen.getByText('Date of Birth *')).toBeInTheDocument()
      expect(screen.getByText('Gender *')).toBeInTheDocument()
    })

    it('renders form in edit mode with existing student data', () => {
      renderWithArabicContext(
        <StudentForm
          initialData={mockStudentData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Verify edit mode title
      expect(screen.getByText('تعديل بيانات الطالب')).toBeInTheDocument()
      
      // Verify form fields are pre-populated
      expect(screen.getByDisplayValue('أحمد')).toBeInTheDocument()
      expect(screen.getByDisplayValue('محمد')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2015-01-15')).toBeInTheDocument()
      expect(screen.getByDisplayValue('+966501234567')).toBeInTheDocument()
    })

    it('validates RTL layout for Arabic form elements', () => {
      const { container } = renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Verify main container has RTL direction
      const mainDiv = container.querySelector('div[dir="rtl"]')
      expect(mainDiv).toBeInTheDocument()
      validateRTLLayout(mainDiv!)

      // Verify Arabic input fields have correct RTL styling
      const arabicInputs = container.querySelectorAll('input[class*="font-arabic"]')
      arabicInputs.forEach(input => {
        expect(input).toHaveClass('text-right')
        validateRTLLayout(input as HTMLElement)
      })
    })
  })

  describe('Form Validation', () => {
    it('validates required Arabic fields', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Try to submit empty form
      const submitButton = screen.getByText('إضافة الطالب')
      await user.click(submitButton)

      // Should show validation errors for required fields
      await waitFor(() => {
        expect(screen.getByText('الاسم الأول يجب أن يكون حرفين على الأقل')).toBeInTheDocument()
        expect(screen.getByText('اسم العائلة يجب أن يكون حرفين على الأقل')).toBeInTheDocument()
        expect(screen.getByText('تاريخ الميلاد مطلوب')).toBeInTheDocument()
        expect(screen.getByText('يجب اختيار الجنس')).toBeInTheDocument()
      })

      // Form should not submit
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('accepts valid Arabic input in required fields', async () => {
      const user = userEvent.setup()
      const testCases = getArabicInputTestCases()
      
      renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Fill required Arabic fields
      const firstNameInput = screen.getByPlaceholderText('الاسم الأول بالعربي')
      const lastNameInput = screen.getByPlaceholderText('اسم العائلة بالعربي')
      const dobInput = screen.getByRole('textbox', { name: /تاريخ الميلاد/i })

      await user.type(firstNameInput, testCases.validArabicNames[0].split(' ')[0])
      await user.type(lastNameInput, testCases.validArabicNames[0].split(' ')[1])
      await user.type(dobInput, '2015-01-15')

      // Select gender
      const genderSelect = screen.getByRole('combobox')
      await user.click(genderSelect)
      const maleOption = screen.getByText('ذكر')
      await user.click(maleOption)

      // Verify Arabic text is accepted and displayed correctly
      expect(firstNameInput).toHaveValue('أحمد')
      expect(lastNameInput).toHaveValue('محمد')
      
      // Validate Arabic character rendering
      validateArabicCharacterRendering(firstNameInput)
      validateArabicCharacterRendering(lastNameInput)
    })

    it('validates email format with Arabic context', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Navigate to contact tab
      const contactTab = screen.getByText('معلومات الاتصال')
      await user.click(contactTab)

      // Enter invalid email
      const emailInput = screen.getByPlaceholderText('student@example.com')
      await user.type(emailInput, 'invalid-email')
      await user.tab() // Trigger validation

      // Should show Arabic validation message
      await waitFor(() => {
        expect(screen.getByText('يرجى إدخال بريد إلكتروني صالح')).toBeInTheDocument()
      })
    })

    it('validates mixed Arabic/English content in optional fields', async () => {
      const user = userEvent.setup()
      const testCases = getArabicInputTestCases()
      
      renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Test mixed content in optional fields
      const firstNameEnInput = screen.getByPlaceholderText('الاسم الأول بالإنجليزي')
      await user.type(firstNameEnInput, testCases.mixedContent[1]) // 'Student: الطالب أحمد'

      expect(firstNameEnInput).toHaveValue(testCases.mixedContent[1])
      validateArabicCharacterRendering(firstNameEnInput)
    })
  })

  describe('Medical Information Handling', () => {
    it('handles Arabic medical terminology correctly', async () => {
      const user = userEvent.setup()
      const testCases = getArabicInputTestCases()
      
      renderWithArabicContext(
        <StudentForm
          initialData={mockStudentData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Navigate to medical tab
      const medicalTab = screen.getByText('المعلومات الطبية')
      await user.click(medicalTab)

      // Test medical terminology input
      const diagnosisTextarea = screen.getByPlaceholderText('التشخيص الطبي للحالة')
      expect(diagnosisTextarea).toHaveValue('اضطراب طيف التوحد')
      
      // Verify medical terms render correctly
      validateArabicCharacterRendering(diagnosisTextarea)
      
      // Test entering new medical terminology
      await user.clear(diagnosisTextarea)
      await user.type(diagnosisTextarea, testCases.medicalTerms[1]) // 'تأخر النمو'
      
      expect(diagnosisTextarea).toHaveValue('تأخر النمو')
      validateArabicCharacterRendering(diagnosisTextarea)
    })

    it('validates severity level selection with Arabic labels', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Navigate to medical tab
      const medicalTab = screen.getByText('المعلومات الطبية')
      await user.click(medicalTab)

      // Test severity level selection
      const severitySelect = screen.getByRole('combobox', { name: /درجة الشدة/i })
      await user.click(severitySelect)

      // Verify Arabic options are available
      expect(screen.getByText('خفيفة')).toBeInTheDocument()
      expect(screen.getByText('متوسطة')).toBeInTheDocument()
      expect(screen.getByText('شديدة')).toBeInTheDocument()

      // Select moderate severity
      const moderateOption = screen.getByText('متوسطة')
      await user.click(moderateOption)

      // Verify selection
      expect(severitySelect).toHaveTextContent('متوسطة')
    })
  })

  describe('Form Submission', () => {
    it('submits form with correct Arabic data structure', async () => {
      const user = userEvent.setup()
      const testCases = getArabicInputTestCases()
      
      renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Fill required fields
      const firstNameArInput = screen.getByPlaceholderText('الاسم الأول بالعربي')
      const lastNameArInput = screen.getByPlaceholderText('اسم العائلة بالعربي')
      const dobInput = screen.getByRole('textbox', { name: /تاريخ الميلاد/i })

      await user.type(firstNameArInput, 'أحمد')
      await user.type(lastNameArInput, 'محمد')
      await user.type(dobInput, '2015-01-15')

      // Select gender
      const genderSelect = screen.getByRole('combobox', { name: /الجنس/i })
      await user.click(genderSelect)
      const maleOption = screen.getByText('ذكر')
      await user.click(maleOption)

      // Submit form
      const submitButton = screen.getByText('إضافة الطالب')
      await user.click(submitButton)

      // Verify form submission
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            first_name_ar: 'أحمد',
            last_name_ar: 'محمد',
            date_of_birth: '2015-01-15',
            gender: 'male'
          })
        )
      })
    })

    it('handles form submission errors gracefully', async () => {
      const user = userEvent.setup()
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock submission error
      mockOnSubmit.mockRejectedValue(new Error('Submission failed'))
      
      renderWithArabicContext(
        <StudentForm
          initialData={mockStudentData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const submitButton = screen.getByText('تحديث الطالب')
      await user.click(submitButton)

      // Error should be logged
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringContaining('Form submission error:'),
          expect.any(Error)
        )
      })

      mockConsoleError.mockRestore()
    })

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const cancelButton = screen.getByText('إلغاء')
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalledOnce()
    })
  })

  describe('Loading and Disabled States', () => {
    it('shows loading state during form submission', () => {
      renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )

      // Submit button should show loading text
      expect(screen.getByText('جاري الحفظ...')).toBeInTheDocument()
      
      // Submit button should be disabled
      const submitButton = screen.getByText('جاري الحفظ...')
      expect(submitButton).toBeDisabled()
    })

    it('disables submit button when form is invalid', () => {
      renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Submit button should be disabled with empty form
      const submitButton = screen.getByText('إضافة الطالب')
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Tab Navigation', () => {
    it('allows navigation between form tabs', async () => {
      const user = userEvent.setup()
      
      renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Navigate to contact tab
      const contactTab = screen.getByText('معلومات الاتصال')
      await user.click(contactTab)

      // Should show contact fields
      expect(screen.getByText('رقم الهاتف')).toBeInTheDocument()
      expect(screen.getByText('البريد الإلكتروني')).toBeInTheDocument()

      // Navigate to medical tab
      const medicalTab = screen.getByText('المعلومات الطبية')
      await user.click(medicalTab)

      // Should show medical fields
      expect(screen.getByText('التشخيص (عربي)')).toBeInTheDocument()
      expect(screen.getByText('درجة الشدة')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('maintains Arabic text alignment on mobile viewports', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      window.dispatchEvent(new Event('resize'))

      const { container } = renderWithArabicContext(
        <StudentForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Arabic inputs should maintain right alignment
      const arabicInputs = container.querySelectorAll('input[class*="font-arabic"]')
      arabicInputs.forEach(input => {
        expect(input).toHaveClass('text-right')
      })

      // Form should maintain RTL layout
      const rtlDiv = container.querySelector('div[dir="rtl"]')
      expect(rtlDiv).toBeInTheDocument()
    })
  })
})

/**
 * Test Coverage Summary for 1.1-UNIT-004:
 * ✅ Component rendering with Arabic context
 * ✅ Component rendering with English context
 * ✅ Edit mode with existing data
 * ✅ RTL layout validation
 * ✅ Required field validation
 * ✅ Arabic input acceptance
 * ✅ Email format validation
 * ✅ Mixed Arabic/English content
 * ✅ Medical terminology handling
 * ✅ Severity level selection
 * ✅ Form submission with Arabic data
 * ✅ Error handling
 * ✅ Cancel functionality
 * ✅ Loading states
 * ✅ Form validation states
 * ✅ Tab navigation
 * ✅ Responsive design
 * 
 * Risk Coverage: Validates core business component functionality
 * Ensures Arabic medical data is properly handled and displayed
 * Covers critical healthcare workflow component
 */