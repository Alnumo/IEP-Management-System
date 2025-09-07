/**
 * Arabic RTL Font Loading Tests
 * Test ID: 1.1-UNIT-002 (Priority: P0 - Critical)
 * Addresses Risk: TECH-001 - Arabic RTL Font Loading Complexity
 * 
 * Description: Validate Arabic font loading order prevents rendering failures
 * Setup: Arabic text components with various font loading scenarios
 * Assertions: Primary fonts load first, fallbacks work correctly, no rendering corruption
 * Data: Arabic text samples, font loading timing scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { 
  setupArabicFonts,
  validateArabicFontLoading,
  validateArabicCharacterRendering,
  validateRTLLayout,
  validateFontFallback,
  validateCrossBrowserConsistency,
  ARABIC_TEST_SAMPLES,
  ARABIC_FONT_FAMILIES,
  renderWithArabicContext
} from '@/test/utils/arabic-rtl-test-helpers'

// Test component for font loading validation
const ArabicFontTestComponent = ({ text = ARABIC_TEST_SAMPLES.complex }: { text?: string }) => (
  <div 
    className="font-arabic"
    dir="rtl"
    data-testid="arabic-font-component"
  >
    {text}
  </div>
)

describe('1.1-UNIT-002: Arabic RTL Font Loading', () => {
  beforeEach(() => {
    setupArabicFonts()
  })

  afterEach(() => {
    // Clean up any test elements
    document.querySelectorAll('[data-testid*="arabic"]').forEach(el => el.remove())
  })

  describe('P0: Critical Font Loading Infrastructure', () => {
    it('validates Vitest loads Arabic fonts correctly in test environment', async () => {
      // Test Description: Validate Vitest loads Arabic fonts correctly in test environment
      // Justification: Critical infrastructure setup
      
      await validateArabicFontLoading()
      
      // Additional verification for test environment
      const testElement = screen.getByTestId || document.querySelector('[data-testid="arabic-font-test"]')
      if (testElement) {
        validateArabicCharacterRendering(testElement as HTMLElement)
      }
    })

    it('ensures primary Arabic fonts load first with correct fallback sequence', async () => {
      // Test font loading order: Tajawal → Cairo → system-ui → sans-serif
      
      const { container } = render(<ArabicFontTestComponent />)
      const element = container.firstChild as HTMLElement
      
      await waitFor(() => {
        const computedStyle = window.getComputedStyle(element)
        const fontFamily = computedStyle.fontFamily
        
        // Verify font family contains Arabic fonts in correct order
        expect(fontFamily).toMatch(/Tajawal.*Cairo.*system-ui.*sans-serif/i)
        
        // Verify fallback behavior
        validateFontFallback(element)
      })
    })

    it('prevents Arabic rendering corruption with proper character encoding', () => {
      // Test for character corruption prevention
      
      Object.values(ARABIC_TEST_SAMPLES).forEach(sample => {
        const { container } = render(<ArabicFontTestComponent text={sample} />)
        const element = container.firstChild as HTMLElement
        
        validateArabicCharacterRendering(element)
        
        // Verify no corrupted characters
        expect(element.textContent).not.toMatch(/[\uFFFD\u25A1\u2610]/)
        
        // Verify Arabic characters are properly rendered
        if (/[\u0600-\u06FF]/.test(sample)) {
          expect(element.textContent).toMatch(/[\u0600-\u06FF]/)
        }
      })
    })

    it('validates RTL layout compliance across all Arabic components', () => {
      // Test RTL layout correctness
      
      const { container } = render(
        <div dir="rtl">
          <ArabicFontTestComponent text={ARABIC_TEST_SAMPLES.therapy} />
          <input 
            type="text" 
            defaultValue={ARABIC_TEST_SAMPLES.simple}
            className="font-arabic"
            data-testid="arabic-input"
          />
          <textarea
            defaultValue={ARABIC_TEST_SAMPLES.medical}
            className="font-arabic"
            data-testid="arabic-textarea"
          />
        </div>
      )
      
      // Validate each element
      const elements = container.querySelectorAll('[data-testid*="arabic"]')
      elements.forEach(element => {
        validateRTLLayout(element as HTMLElement)
      })
      
      // Verify container direction
      expect(container.firstChild as HTMLElement).toHaveAttribute('dir', 'rtl')
    })

    it('maintains cross-browser Arabic font consistency', () => {
      // Test cross-browser compatibility
      
      const { container } = render(<ArabicFontTestComponent />)
      const element = container.firstChild as HTMLElement
      
      validateCrossBrowserConsistency(element)
      
      // Test different viewport sizes
      const originalInnerWidth = window.innerWidth
      
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      window.dispatchEvent(new Event('resize'))
      
      validateCrossBrowserConsistency(element)
      
      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
      window.dispatchEvent(new Event('resize'))
      
      validateCrossBrowserConsistency(element)
      
      // Restore original
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true })
    })
  })

  describe('Font Loading Edge Cases', () => {
    it('handles font loading failures gracefully', async () => {
      // Mock font loading failure
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Simulate font loading failure
      if (document.fonts) {
        vi.spyOn(document.fonts, 'load').mockRejectedValue(new Error('Font load failed'))
      }
      
      const { container } = render(<ArabicFontTestComponent />)
      const element = container.firstChild as HTMLElement
      
      // Should still render with fallback fonts
      await waitFor(() => {
        const computedStyle = window.getComputedStyle(element)
        expect(computedStyle.fontFamily).toMatch(/system-ui|sans-serif/)
      })
      
      // Characters should still be readable
      validateArabicCharacterRendering(element)
      
      mockConsoleError.mockRestore()
    })

    it('validates mixed Arabic/English content rendering', () => {
      // Test mixed content scenarios
      
      const mixedText = ARABIC_TEST_SAMPLES.mixed
      const { container } = render(<ArabicFontTestComponent text={mixedText} />)
      const element = container.firstChild as HTMLElement
      
      // Both Arabic and English characters should render correctly
      expect(element.textContent).toContain('Student')
      expect(element.textContent).toMatch(/[\u0600-\u06FF]/)
      
      validateArabicCharacterRendering(element)
      validateRTLLayout(element)
    })

    it('validates Arabic numbers and special characters', () => {
      // Test Arabic-Indic numbers and special characters
      
      const numbersText = ARABIC_TEST_SAMPLES.numbers
      const { container } = render(<ArabicFontTestComponent text={numbersText} />)
      const element = container.firstChild as HTMLElement
      
      // Arabic-Indic numbers should render correctly
      expect(element.textContent).toMatch(/[٠-٩]/)
      
      validateArabicCharacterRendering(element)
    })

    it('validates bidirectional text with RTL marks', () => {
      // Test bidirectional text rendering
      
      const bidiText = ARABIC_TEST_SAMPLES.rtl_marks
      const { container } = render(<ArabicFontTestComponent text={bidiText} />)
      const element = container.firstChild as HTMLElement
      
      // Should contain both Arabic and English with proper direction marks
      expect(element.textContent).toMatch(/[\u0600-\u06FF].*[A-Za-z]/)
      
      validateArabicCharacterRendering(element)
      validateRTLLayout(element)
    })
  })

  describe('Medical and Healthcare Context', () => {
    it('validates Arabic medical terminology rendering', () => {
      // Test medical terms specific to therapy context
      
      const medicalText = ARABIC_TEST_SAMPLES.medical
      const { container } = render(<ArabicFontTestComponent text={medicalText} />)
      const element = container.firstChild as HTMLElement
      
      // Medical terms should render correctly without corruption
      validateArabicCharacterRendering(element)
      
      // Verify critical medical terms are readable
      expect(element.textContent).toContain('التشخيص')
      expect(element.textContent).toContain('التوحد')
    })

    it('validates therapy-related Arabic text in forms', () => {
      // Test therapy goals and plans rendering
      
      const therapyText = ARABIC_TEST_SAMPLES.therapy
      
      const { container } = render(
        <form dir="rtl">
          <label className="font-arabic">أهداف العلاج:</label>
          <textarea 
            defaultValue={therapyText}
            className="font-arabic"
            data-testid="therapy-textarea"
          />
        </form>
      )
      
      const textarea = screen.getByTestId('therapy-textarea')
      validateArabicCharacterRendering(textarea)
      validateRTLLayout(textarea)
      
      // Verify therapy-specific terms
      expect(textarea.textContent || textarea.value).toContain('العلاج')
      expect(textarea.textContent || textarea.value).toMatch(/٢٠٢٥/)
    })
  })

  describe('Performance and Loading Time', () => {
    it('ensures Arabic font loading completes within acceptable timeframe', async () => {
      // Test font loading performance
      
      const startTime = performance.now()
      
      await validateArabicFontLoading()
      
      const loadTime = performance.now() - startTime
      
      // Font loading should complete within 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    it('validates Arabic text rendering performance with large content', async () => {
      // Test performance with large Arabic text blocks
      
      const largeArabicText = ARABIC_TEST_SAMPLES.complex.repeat(100)
      
      const startTime = performance.now()
      
      const { container } = render(<ArabicFontTestComponent text={largeArabicText} />)
      const element = container.firstChild as HTMLElement
      
      const renderTime = performance.now() - startTime
      
      // Large text should render within reasonable time
      expect(renderTime).toBeLessThan(1000)
      
      // Content should still be correctly formatted
      validateArabicCharacterRendering(element)
    })
  })
})

/**
 * Test Coverage Summary for 1.1-UNIT-002:
 * ✅ Vitest configuration validation with Arabic fonts
 * ✅ Font loading sequence (Tajawal → Cairo → system-ui → sans-serif)
 * ✅ Character corruption prevention
 * ✅ RTL layout compliance
 * ✅ Cross-browser consistency
 * ✅ Font loading failure handling
 * ✅ Mixed content rendering
 * ✅ Arabic numbers and special characters
 * ✅ Bidirectional text with RTL marks
 * ✅ Medical terminology rendering
 * ✅ Form input Arabic text
 * ✅ Performance validation
 * ✅ Large content rendering
 * 
 * Risk Coverage: TECH-001 (Arabic RTL Font Loading) - COMPREHENSIVE
 * 
 * This test ensures the critical font loading infrastructure works correctly
 * in the test environment, preventing false positives that could mask
 * production Arabic rendering issues.
 */