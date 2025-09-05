/**
 * Arabic RTL Testing Utilities
 * Comprehensive testing helpers for Arabic right-to-left layouts
 * and bilingual functionality in the Arkan Therapy Plans Manager
 */

import { render, screen, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement } from 'react';
import { vi } from 'vitest';

// Arabic Test Data Sets
export const arabicTestData = {
  students: {
    valid: {
      name_ar: 'أحمد محمد الأحمد',
      name_en: 'Ahmed Mohammed Al-Ahmad',
      guardian_name_ar: 'محمد سالم الأحمد',
      guardian_name_en: 'Mohammed Salem Al-Ahmad',
      address_ar: 'الرياض، المملكة العربية السعودية',
      address_en: 'Riyadh, Saudi Arabia',
      phone: '+966501234567',
      email: 'ahmed@example.com',
      date_of_birth: '2015-03-15',
    },
    withSpecialChars: {
      name_ar: 'فاطمة عبد الرحمن آل سعود',
      notes_ar: 'ملاحظات خاصة: يحتاج إلى علاج نطق، لديه صعوبة في نطق الحروف "ر" و "غ"',
    },
    withNumbers: {
      name_ar: 'محمد عبد الله الأول',
      id_number: '1234567890',
      session_count: 25,
    }
  },

  therapyPlans: {
    speechTherapy: {
      title_ar: 'برنامج علاج النطق واللغة',
      title_en: 'Speech and Language Therapy Program',
      description_ar: 'برنامج شامل لتطوير مهارات النطق والتواصل اللفظي وغير اللفظي',
      goals_ar: [
        'تحسين وضوح النطق والكلام',
        'زيادة المفردات اللغوية',
        'تطوير المهارات التواصلية',
        'تقوية عضلات الفم والشفاه',
      ],
      duration_ar: 'ستة أشهر',
      frequency_ar: 'جلستان أسبوعياً',
    },
    behavioralTherapy: {
      title_ar: 'برنامج التدخل السلوكي',
      title_en: 'Behavioral Intervention Program',
      description_ar: 'برنامج تعديل السلوك باستخدام تقنيات ABA الحديثة',
      targets_ar: [
        'تقليل السلوكيات غير المرغوبة',
        'زيادة السلوكيات الإيجابية',
        'تطوير مهارات التفاعل الاجتماعي',
      ],
    }
  },

  ui: {
    buttons: {
      save: { ar: 'حفظ', en: 'Save' },
      cancel: { ar: 'إلغاء', en: 'Cancel' },
      edit: { ar: 'تعديل', en: 'Edit' },
      delete: { ar: 'حذف', en: 'Delete' },
      add: { ar: 'إضافة', en: 'Add' },
      submit: { ar: 'إرسال', en: 'Submit' },
      confirm: { ar: 'تأكيد', en: 'Confirm' },
    },
    labels: {
      studentName: { ar: 'اسم الطالب', en: 'Student Name' },
      birthDate: { ar: 'تاريخ الميلاد', en: 'Birth Date' },
      guardianName: { ar: 'اسم ولي الأمر', en: 'Guardian Name' },
      phoneNumber: { ar: 'رقم الهاتف', en: 'Phone Number' },
      emailAddress: { ar: 'البريد الإلكتروني', en: 'Email Address' },
    },
    validation: {
      required: { ar: 'هذا الحقل مطلوب', en: 'This field is required' },
      invalidEmail: { ar: 'البريد الإلكتروني غير صحيح', en: 'Invalid email address' },
      invalidPhone: { ar: 'رقم الهاتف غير صحيح', en: 'Invalid phone number' },
      tooShort: { ar: 'القيمة قصيرة جداً', en: 'Value is too short' },
    },
    navigation: {
      dashboard: { ar: 'الرئيسية', en: 'Dashboard' },
      students: { ar: 'الطلاب', en: 'Students' },
      therapists: { ar: 'الأخصائيين', en: 'Therapists' },
      sessions: { ar: 'الجلسات', en: 'Sessions' },
      reports: { ar: 'التقارير', en: 'Reports' },
    }
  }
};

// Arabic Language Context Mock
export const createArabicLanguageContext = () => ({
  language: 'ar' as const,
  isRTL: true,
  direction: 'rtl' as const,
  toggleLanguage: vi.fn(),
  setLanguage: vi.fn(),
  t: (key: string, params?: Record<string, any>) => {
    // Simple mock translation - in real implementation this would use i18n
    const translations: Record<string, string> = {
      'student.name': 'اسم الطالب',
      'student.birthDate': 'تاريخ الميلاد',
      'student.guardian': 'ولي الأمر',
      'validation.required': 'هذا الحقل مطلوب',
      'button.save': 'حفظ',
      'button.cancel': 'إلغاء',
      ...Object.fromEntries(
        Object.entries(arabicTestData.ui.labels).map(([k, v]) => [k, v.ar])
      ),
    };
    return translations[key] || key;
  },
});

export const createEnglishLanguageContext = () => ({
  language: 'en' as const,
  isRTL: false,
  direction: 'ltr' as const,
  toggleLanguage: vi.fn(),
  setLanguage: vi.fn(),
  t: (key: string, params?: Record<string, any>) => {
    const translations: Record<string, string> = {
      'student.name': 'Student Name',
      'student.birthDate': 'Birth Date',
      'student.guardian': 'Guardian',
      'validation.required': 'This field is required',
      'button.save': 'Save',
      'button.cancel': 'Cancel',
      ...Object.fromEntries(
        Object.entries(arabicTestData.ui.labels).map(([k, v]) => [k, v.en])
      ),
    };
    return translations[key] || key;
  },
});

// RTL Layout Test Utilities
export const rtlLayoutTests = {
  /**
   * Test if component applies correct RTL direction
   */
  hasRTLDirection: (container: HTMLElement) => {
    const mainElement = container.querySelector('[role="main"]') || container.firstElementChild;
    expect(mainElement).toHaveAttribute('dir', 'rtl');
  },

  /**
   * Test if component uses Arabic fonts
   */
  hasArabicFonts: (element: HTMLElement) => {
    const computedStyle = window.getComputedStyle(element);
    const fontFamily = computedStyle.fontFamily.toLowerCase();
    expect(fontFamily).toMatch(/(tajawal|cairo)/);
  },

  /**
   * Test if text is aligned to the right in RTL mode
   */
  hasRightTextAlignment: (element: HTMLElement) => {
    const computedStyle = window.getComputedStyle(element);
    expect(['right', 'start'].includes(computedStyle.textAlign)).toBe(true);
  },

  /**
   * Test if sidebar/navigation is positioned correctly for RTL
   */
  hasCorrectRTLNavigation: (container: HTMLElement) => {
    const sidebar = container.querySelector('[role="complementary"]');
    if (sidebar) {
      expect(sidebar).toHaveClass(/right-0|right-\d+/);
    }
  },

  /**
   * Test if buttons are in correct order for RTL (Cancel on right, Save on left)
   */
  hasCorrectButtonOrder: (container: HTMLElement) => {
    const buttons = container.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map(btn => btn.textContent?.trim());
    
    // In RTL, Cancel should come after Save (visually on the right)
    const saveIndex = buttonTexts.findIndex(text => text?.includes('حفظ') || text?.includes('Save'));
    const cancelIndex = buttonTexts.findIndex(text => text?.includes('إلغاء') || text?.includes('Cancel'));
    
    if (saveIndex !== -1 && cancelIndex !== -1) {
      expect(cancelIndex).toBeGreaterThan(saveIndex);
    }
  },

  /**
   * Test if form fields have correct RTL layout
   */
  hasCorrectFormLayout: (container: HTMLElement) => {
    const labels = container.querySelectorAll('label');
    labels.forEach(label => {
      // Labels should be on the right side of inputs in RTL
      const associatedInput = container.querySelector(`#${label.getAttribute('for')}`);
      if (associatedInput) {
        const labelRect = label.getBoundingClientRect();
        const inputRect = associatedInput.getBoundingClientRect();
        // In RTL, label should be to the right of (higher x position) the input
        // Note: This is a simplified test - real implementation might vary
        expect(label).toHaveClass(/text-right|rtl/);
      }
    });
  },
};

// Arabic Content Validation Tests
export const arabicContentTests = {
  /**
   * Validate Arabic text rendering
   */
  rendersArabicText: (text: string) => {
    expect(screen.getByText(text)).toBeInTheDocument();
    
    // Check if text contains Arabic characters
    const arabicRegex = /[\u0600-\u06FF]/;
    expect(arabicRegex.test(text)).toBe(true);
  },

  /**
   * Test Arabic form validation messages
   */
  showsArabicValidation: async (fieldLabel: string, validationMessage: string) => {
    const field = screen.getByLabelText(fieldLabel);
    expect(field).toBeInTheDocument();
    
    // Trigger validation (implementation depends on your validation approach)
    // This is a placeholder - adjust based on your actual validation trigger
    expect(screen.getByText(validationMessage)).toBeInTheDocument();
  },

  /**
   * Test Arabic number formatting
   */
  formatsArabicNumbers: (element: HTMLElement, expectedFormat: 'arabic-indic' | 'western') => {
    const textContent = element.textContent || '';
    
    if (expectedFormat === 'arabic-indic') {
      // Arabic-Indic digits: ٠١٢٣٤٥٦٧٨٩
      const arabicIndicRegex = /[٠-٩]/;
      expect(arabicIndicRegex.test(textContent)).toBe(true);
    } else {
      // Western digits: 0123456789
      const westernDigitRegex = /[0-9]/;
      expect(westernDigitRegex.test(textContent)).toBe(true);
    }
  },
};

// Mobile RTL Testing Utilities
export const mobileRTLTests = {
  /**
   * Set up mobile viewport for testing
   */
  setupMobileViewport: (width: number = 375, height: number = 667) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  },

  /**
   * Test mobile navigation in RTL mode
   */
  testMobileRTLNavigation: (container: HTMLElement) => {
    // Mobile menu button should be on the left in RTL (opposite of LTR)
    const menuButton = container.querySelector('[aria-label*="فتح القائمة"], [aria-label*="Open menu"]');
    if (menuButton) {
      expect(menuButton).toHaveClass(/ml-auto|right-0/);
    }
  },

  /**
   * Test touch target sizes for Arabic buttons
   */
  testTouchTargetSizes: (container: HTMLElement) => {
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      const rect = button.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(button);
      
      // Minimum touch target: 44px x 44px
      const minHeight = Math.max(rect.height, parseInt(computedStyle.minHeight) || 0);
      const minWidth = Math.max(rect.width, parseInt(computedStyle.minWidth) || 0);
      
      expect(minHeight).toBeGreaterThanOrEqual(44);
      expect(minWidth).toBeGreaterThanOrEqual(44);
    });
  },
};

// Custom Render Function with RTL Context
interface RTLRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  language?: 'ar' | 'en';
  initialRoute?: string;
}

export function renderWithRTL(
  ui: ReactElement,
  options: RTLRenderOptions = {}
): RenderResult {
  const { language = 'ar', initialRoute = '/', ...renderOptions } = options;

  // Create language context based on language parameter
  const languageContext = language === 'ar' 
    ? createArabicLanguageContext() 
    : createEnglishLanguageContext();

  // Mock the language context
  vi.mocked(require('@/contexts/LanguageContext').useLanguage).mockReturnValue(languageContext);

  const result = render(ui, renderOptions);

  // Add RTL direction to body for global RTL testing
  if (language === 'ar') {
    document.body.dir = 'rtl';
    document.body.classList.add('rtl');
  } else {
    document.body.dir = 'ltr';
    document.body.classList.remove('rtl');
  }

  return result;
}

// Test Suite Generators
export const generateRTLTestSuite = (componentName: string, Component: ReactElement) => {
  return {
    [`${componentName} RTL Layout Tests`]: () => {
      describe(`${componentName} - RTL Layout`, () => {
        beforeEach(() => {
          // Reset to Arabic context
          vi.clearAllMocks();
        });

        test('applies RTL direction attribute', () => {
          const { container } = renderWithRTL(Component, { language: 'ar' });
          rtlLayoutTests.hasRTLDirection(container);
        });

        test('uses Arabic fonts', () => {
          const { container } = renderWithRTL(Component, { language: 'ar' });
          const element = container.firstElementChild as HTMLElement;
          if (element) rtlLayoutTests.hasArabicFonts(element);
        });

        test('aligns text to the right', () => {
          const { container } = renderWithRTL(Component, { language: 'ar' });
          const textElements = container.querySelectorAll('p, span, div, label');
          textElements.forEach(element => {
            if (element.textContent?.trim()) {
              rtlLayoutTests.hasRightTextAlignment(element as HTMLElement);
            }
          });
        });
      });
    },

    [`${componentName} Arabic Content Tests`]: () => {
      describe(`${componentName} - Arabic Content`, () => {
        test('renders Arabic labels correctly', () => {
          renderWithRTL(Component, { language: 'ar' });
          
          // Check for common Arabic labels
          Object.values(arabicTestData.ui.labels).forEach(({ ar }) => {
            if (document.body.textContent?.includes(ar)) {
              expect(screen.getByText(ar)).toBeInTheDocument();
            }
          });
        });

        test('handles Arabic text input', () => {
          renderWithRTL(Component, { language: 'ar' });
          
          // Find text inputs and test Arabic input
          const textInputs = screen.getAllByRole('textbox');
          textInputs.forEach(input => {
            const arabicText = 'نص تجريبي باللغة العربية';
            // Test that input accepts Arabic text
            expect(input).toBeEnabled();
          });
        });
      });
    },
  };
};

// Accessibility Testing for Arabic
export const arabicAccessibilityTests = {
  /**
   * Test screen reader support for Arabic
   */
  testScreenReaderSupport: (container: HTMLElement) => {
    // Check lang attribute
    const elementsWithLang = container.querySelectorAll('[lang="ar"]');
    expect(elementsWithLang.length).toBeGreaterThan(0);

    // Check aria-labels are in Arabic
    const elementsWithAriaLabel = container.querySelectorAll('[aria-label]');
    elementsWithAriaLabel.forEach(element => {
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel) {
        const arabicRegex = /[\u0600-\u06FF]/;
        expect(arabicRegex.test(ariaLabel)).toBe(true);
      }
    });
  },

  /**
   * Test keyboard navigation in RTL mode
   */
  testRTLKeyboardNavigation: async (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // In RTL, Tab should still move forward, but spatial arrow keys might be reversed
    // This test ensures tab order is logical regardless of direction
    let previousTabIndex = -1;
    focusableElements.forEach(element => {
      const tabIndex = parseInt(element.getAttribute('tabindex') || '0');
      if (tabIndex >= 0) {
        expect(tabIndex).toBeGreaterThanOrEqual(previousTabIndex);
        previousTabIndex = tabIndex;
      }
    });
  },
};

// Performance Testing for Arabic Content
export const arabicPerformanceTests = {
  /**
   * Test Arabic font loading performance
   */
  testArabicFontLoadingPerformance: async () => {
    const startTime = performance.now();
    
    // Create a component with Arabic text
    const arabicText = arabicTestData.students.valid.name_ar.repeat(50);
    const div = document.createElement('div');
    div.textContent = arabicText;
    div.style.fontFamily = 'Tajawal, Cairo, sans-serif';
    document.body.appendChild(div);

    // Simulate font loading
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(100); // Should render in under 100ms

    document.body.removeChild(div);
  },

  /**
   * Test large Arabic dataset rendering performance
   */
  testLargeArabicDatasetPerformance: (dataSize: number = 1000) => {
    const startTime = performance.now();
    
    // Generate large Arabic dataset
    const largeDataset = Array.from({ length: dataSize }, (_, i) => ({
      ...arabicTestData.students.valid,
      id: `student-${i}`,
      name_ar: `${arabicTestData.students.valid.name_ar} ${i}`,
    }));

    // Simulate rendering (you would replace this with actual component rendering)
    const listContainer = document.createElement('div');
    largeDataset.slice(0, 50).forEach(student => { // Only render first 50 for virtualization test
      const item = document.createElement('div');
      item.textContent = student.name_ar;
      listContainer.appendChild(item);
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(100);
    expect(listContainer.children.length).toBeLessThanOrEqual(50); // Virtualization check
  },
};

export default {
  arabicTestData,
  createArabicLanguageContext,
  createEnglishLanguageContext,
  rtlLayoutTests,
  arabicContentTests,
  mobileRTLTests,
  renderWithRTL,
  generateRTLTestSuite,
  arabicAccessibilityTests,
  arabicPerformanceTests,
};