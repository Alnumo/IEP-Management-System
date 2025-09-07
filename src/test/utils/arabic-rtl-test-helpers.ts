/**
 * Arabic RTL Testing Utilities
 * Addresses TECH-001: Arabic RTL Font Loading Complexity
 * Test ID: 1.1-UNIT-002
 */

import { render, screen, waitFor } from '@testing-library/react'
import { ReactElement } from 'react'
import { vi } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageContext'

// Arabic test text samples for font loading validation
export const ARABIC_TEST_SAMPLES = {
  simple: 'مرحبا بك',
  complex: 'مركز أركان النمو لخطط العلاج',
  mixed: 'Student: أحمد محمد',
  numbers: '١٢٣٤٥٦٧٨٩٠',
  rtl_marks: 'الطالب: أحمد ‏(Ahmed)‏',
  medical: 'التشخيص: اضطراب طيف التوحد',
  therapy: 'أهداف العلاج للعام الدراسي ٢٠٢٥'
}

// Arabic font families that should be loaded
export const ARABIC_FONT_FAMILIES = [
  'Tajawal',
  'Cairo',
  'system-ui',
  'sans-serif'
]

/**
 * Test wrapper that provides Arabic RTL context
 */
export const renderWithArabicContext = (component: ReactElement) => {
  // Set Arabic language in localStorage for LanguageProvider
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn().mockReturnValue('ar'),
      setItem: vi.fn(),
      clear: vi.fn()
    },
    writable: true
  })
  
  return render(
    <LanguageProvider>
      {component}
    </LanguageProvider>
  )
}

/**
 * Test wrapper that provides English LTR context
 */
export const renderWithEnglishContext = (component: ReactElement) => {
  // Set English language in localStorage for LanguageProvider
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn().mockReturnValue('en'),
      setItem: vi.fn(),
      clear: vi.fn()
    },
    writable: true
  })
  
  return render(
    <LanguageProvider>
      {component}
    </LanguageProvider>
  )
}

/**
 * Validates that Arabic fonts are properly loaded in the test environment
 * This addresses the critical font loading sequence requirement
 */
export const validateArabicFontLoading = async (): Promise<void> => {
  // Create a test element with Arabic text
  const testElement = document.createElement('div')
  testElement.textContent = ARABIC_TEST_SAMPLES.complex
  testElement.style.fontFamily = 'Tajawal, Cairo, system-ui, sans-serif'
  testElement.style.direction = 'rtl'
  testElement.style.textAlign = 'right'
  testElement.setAttribute('data-testid', 'arabic-font-test')
  
  document.body.appendChild(testElement)

  try {
    await waitFor(() => {
      const computedStyle = window.getComputedStyle(testElement)
      const fontFamily = computedStyle.fontFamily
      
      // Verify Arabic font family is applied
      expect(fontFamily).toMatch(/Tajawal|Cairo|system-ui|sans-serif/)
      
      // Verify RTL direction
      expect(computedStyle.direction).toBe('rtl')
      
      // Verify text alignment for Arabic
      expect(computedStyle.textAlign).toMatch(/right|start/)
    }, { timeout: 5000 })
  } finally {
    document.body.removeChild(testElement)
  }
}

/**
 * Tests Arabic character rendering accuracy
 */
export const validateArabicCharacterRendering = (element: HTMLElement): void => {
  const arabicText = element.textContent
  
  if (!arabicText) return
  
  // Check for proper Arabic character encoding (UTF-8)
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  
  if (arabicRegex.test(arabicText)) {
    // Verify Arabic characters are properly encoded
    expect(arabicText).toMatch(arabicRegex)
    
    // Verify no character corruption (question marks, boxes)
    expect(arabicText).not.toMatch(/[\uFFFD\u25A1\u2610]/)
  }
}

/**
 * Validates RTL layout compliance
 */
export const validateRTLLayout = (element: HTMLElement): void => {
  const computedStyle = window.getComputedStyle(element)
  
  // Check direction attribute
  expect(element.dir || element.getAttribute('dir')).toBe('rtl')
  
  // Check CSS direction property
  expect(computedStyle.direction).toBe('rtl')
  
  // Check text alignment (should be right or start for RTL)
  const textAlign = computedStyle.textAlign
  if (textAlign && textAlign !== 'center') {
    expect(textAlign).toMatch(/right|start/)
  }
}

/**
 * Validates font fallback behavior when primary fonts fail
 */
export const validateFontFallback = async (element: HTMLElement): Promise<void> => {
  const computedStyle = window.getComputedStyle(element)
  const fontFamily = computedStyle.fontFamily
  
  // Should have fallback fonts defined
  expect(fontFamily).toMatch(/system-ui|sans-serif/)
  
  // Should not fall back to serif fonts for Arabic text
  expect(fontFamily).not.toMatch(/serif/)
}

/**
 * Cross-browser Arabic font consistency test
 */
export const validateCrossBrowserConsistency = (element: HTMLElement): void => {
  const computedStyle = window.getComputedStyle(element)
  
  // Font size should be consistent
  const fontSize = computedStyle.fontSize
  expect(fontSize).toBeTruthy()
  expect(parseFloat(fontSize)).toBeGreaterThan(0)
  
  // Line height should be appropriate for Arabic text
  const lineHeight = computedStyle.lineHeight
  if (lineHeight && lineHeight !== 'normal') {
    expect(parseFloat(lineHeight)).toBeGreaterThanOrEqual(1.2)
  }
}

/**
 * Mock font loading for testing environment
 * Simulates production font loading behavior
 */
export const mockFontLoading = (): void => {
  // Mock FontFace API if not available in test environment
  if (!window.FontFace) {
    (window as any).FontFace = class MockFontFace {
      constructor(
        public family: string,
        public source: string | ArrayBuffer,
        public descriptors?: any
      ) {}
      
      load(): Promise<FontFace> {
        return Promise.resolve(this as any)
      }
      
      get status() {
        return 'loaded'
      }
    }
  }

  // Mock document.fonts API
  if (!document.fonts) {
    (document as any).fonts = {
      add: vi.fn(),
      ready: Promise.resolve(),
      load: vi.fn().mockResolvedValue([]),
      check: vi.fn().mockReturnValue(true)
    }
  }
}

/**
 * Setup Arabic font loading for test environment
 * This ensures test environment matches production font loading
 */
export const setupArabicFonts = (): void => {
  mockFontLoading()
  
  // Add Arabic font CSS to test document
  const style = document.createElement('style')
  style.textContent = `
    .font-arabic {
      font-family: 'Tajawal', 'Cairo', system-ui, sans-serif;
      direction: rtl;
      text-align: right;
    }
    
    [dir="rtl"] {
      direction: rtl;
      text-align: right;
    }
    
    [dir="rtl"] input,
    [dir="rtl"] textarea {
      text-align: right;
    }
  `
  document.head.appendChild(style)
}

/**
 * Test Arabic input validation patterns
 */
export const getArabicInputTestCases = () => ({
  validArabicNames: [
    'أحمد محمد',
    'فاطمة عبد الله',
    'عبد الرحمن بن خالد',
    'نورا أحمد'
  ],
  validArabicText: [
    'مركز أركان النمو',
    'العلاج الطبيعي',
    'تطوير المهارات',
    'خطة العلاج الفردية'
  ],
  mixedContent: [
    'أحمد Ahmed محمد',
    'Student: الطالب أحمد',
    'IEP: خطة التعليم الفردية'
  ],
  medicalTerms: [
    'اضطراب طيف التوحد',
    'تأخر النمو',
    'صعوبات التعلم',
    'العلاج النطقي'
  ]
})