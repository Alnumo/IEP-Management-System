import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

// Simple Router mock for testing
const MockRouter = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="mock-router">{children}</div>
)

/**
 * Language context mock for testing
 */
export const createMockLanguageContext = (language: 'ar' | 'en' = 'ar') => ({
  language,
  isRTL: language === 'ar',
  toggleLanguage: vi.fn(),
  setLanguage: vi.fn(),
  t: (key: string) => key,
  i18n: {
    language,
    changeLanguage: vi.fn(),
  },
})

/**
 * Test wrapper with all necessary providers
 */
interface TestWrapperProps {
  children: React.ReactNode
  language?: 'ar' | 'en'
  queryClient?: QueryClient
}

const TestWrapper: React.FC<TestWrapperProps> = ({ 
  children, 
  language = 'ar',
  queryClient 
}) => {
  const client = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={language === 'ar' ? 'font-arabic' : 'font-english'}>
      <MockRouter>
        <QueryClientProvider client={client}>
          {children}
        </QueryClientProvider>
      </MockRouter>
    </div>
  )
}

/**
 * Custom render function for testing bilingual components
 */
interface BilingualRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  language?: 'ar' | 'en'
  queryClient?: QueryClient
}

export const renderBilingual = (
  ui: React.ReactElement,
  options: BilingualRenderOptions = {}
) => {
  const { language = 'ar', queryClient, ...renderOptions } = options
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper language={language} queryClient={queryClient}>
      {children}
    </TestWrapper>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Test both Arabic and English versions of a component
 */
export const testBothLanguages = async (
  testName: string,
  testFunction: (language: 'ar' | 'en', isRTL: boolean) => Promise<void> | void
) => {
  describe(testName, () => {
    test('Arabic (RTL)', async () => {
      await testFunction('ar', true)
    })

    test('English (LTR)', async () => {
      await testFunction('en', false)
    })
  })
}

/**
 * RTL layout testing utilities
 */
export const rtlTestUtils = {
  /**
   * Check if element has correct RTL direction
   */
  expectRTLDirection: (element: HTMLElement) => {
    const direction = window.getComputedStyle(element).direction
    expect(direction).toBe('rtl')
  },

  /**
   * Check if element has correct LTR direction
   */
  expectLTRDirection: (element: HTMLElement) => {
    const direction = window.getComputedStyle(element).direction
    expect(direction).toBe('ltr')
  },

  /**
   * Check if element has Arabic font family
   */
  expectArabicFont: (element: HTMLElement) => {
    const fontFamily = window.getComputedStyle(element).fontFamily
    expect(fontFamily).toMatch(/Tajawal|Cairo|font-arabic/)
  },

  /**
   * Check if element has English font family
   */
  expectEnglishFont: (element: HTMLElement) => {
    const fontFamily = window.getComputedStyle(element).fontFamily
    expect(fontFamily).toMatch(/system-ui|font-english/)
  },

  /**
   * Get computed style for RTL-specific properties
   */
  getRTLStyles: (element: HTMLElement) => ({
    direction: window.getComputedStyle(element).direction,
    textAlign: window.getComputedStyle(element).textAlign,
    paddingLeft: window.getComputedStyle(element).paddingLeft,
    paddingRight: window.getComputedStyle(element).paddingRight,
    marginLeft: window.getComputedStyle(element).marginLeft,
    marginRight: window.getComputedStyle(element).marginRight,
  }),
}

/**
 * Arabic text testing utilities
 */
export const arabicTestUtils = {
  /**
   * Sample Arabic text for testing
   */
  sampleTexts: {
    short: 'مرحبا',
    medium: 'إدارة خطط العلاج',
    long: 'نظام إدارة العلاج الطبي الشامل لمركز أركان النمو',
    mixed: 'Welcome مرحبا بك',
  },

  /**
   * Check if text is displayed correctly in Arabic
   */
  expectArabicTextRendering: (element: HTMLElement, expectedText: string) => {
    expect(element).toHaveTextContent(expectedText)
    rtlTestUtils.expectRTLDirection(element)
  },

  /**
   * Check if Arabic numbers are displayed correctly
   */
  expectArabicNumbers: (element: HTMLElement, expectedNumber: string) => {
    expect(element).toHaveTextContent(expectedNumber)
  },

  /**
   * Validate Arabic form input
   */
  expectArabicFormInput: (input: HTMLInputElement) => {
    expect(input).toHaveAttribute('dir', 'rtl')
    expect(input.style.textAlign).toBe('right')
  },
}

/**
 * Mock translation function for tests
 */
export const createMockTranslation = (translations: Record<string, any>) => {
  return (key: string, options?: any) => {
    const keys = key.split('.')
    let result = translations
    
    for (const k of keys) {
      result = result[k]
      if (result === undefined) {
        return key // Return key if translation not found
      }
    }
    
    return typeof result === 'string' ? result : key
  }
}

/**
 * Sample translations for testing
 */
export const mockTranslations = {
  ar: {
    common: {
      save: 'حفظ',
      cancel: 'إلغاء',
      edit: 'تحرير',
      delete: 'حذف',
      loading: 'جارٍ التحميل...',
      error: 'خطأ',
      success: 'نجح',
    },
    therapy: {
      session: 'جلسة علاج',
      plan: 'خطة العلاج',
      student: 'طالب',
      therapist: 'المعالج',
    },
  },
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
    },
    therapy: {
      session: 'Therapy Session',
      plan: 'Therapy Plan',
      student: 'Student',
      therapist: 'Therapist',
    },
  },
}

/**
 * Create mock environment for language testing
 */
export const createLanguageTestEnvironment = (language: 'ar' | 'en' = 'ar') => {
  const mockT = createMockTranslation(mockTranslations[language])
  const mockContext = createMockLanguageContext(language)
  
  return {
    ...mockContext,
    t: mockT,
  }
}

/**
 * Test component accessibility in both languages
 */
export const testBilingualAccessibility = async (
  component: React.ReactElement,
  testName: string
) => {
  const { axe } = await import('jest-axe')
  
  describe(`${testName} - Accessibility`, () => {
    test('should be accessible in Arabic (RTL)', async () => {
      const { container } = renderBilingual(component, { language: 'ar' })
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('should be accessible in English (LTR)', async () => {
      const { container } = renderBilingual(component, { language: 'en' })
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
}

export default {
  renderBilingual,
  testBothLanguages,
  rtlTestUtils,
  arabicTestUtils,
  createMockLanguageContext,
  createMockTranslation,
  mockTranslations,
  createLanguageTestEnvironment,
  testBilingualAccessibility,
}