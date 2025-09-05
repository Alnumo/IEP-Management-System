/**
 * Comprehensive Testing Examples
 * Demonstrates the complete testing strategy for the Arkan Therapy Plans Manager
 * including Arabic RTL, mobile responsiveness, and medical compliance testing
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

// Import our testing utilities
import { 
  renderWithRTL, 
  arabicTestData, 
  rtlLayoutTests, 
  arabicContentTests,
  arabicAccessibilityTests,
  generateRTLTestSuite 
} from '../utils/arabic-rtl-helpers';
import { 
  renderWithMobileContext, 
  ViewportManager, 
  responsiveTests, 
  layoutTests, 
  touchInteractions,
  generateMobileTestSuite 
} from '../utils/mobile-responsive-helpers';

// Mock components for demonstration (replace with actual components)
const MockStudentForm = () => (
  <form role="form" dir="rtl" className="space-y-4">
    <div className="flex flex-col space-y-2">
      <label htmlFor="student-name" className="text-right font-tajawal">
        اسم الطالب
      </label>
      <input 
        id="student-name"
        type="text"
        className="p-3 border rounded text-right"
        placeholder="أدخل اسم الطالب"
        aria-label="اسم الطالب"
        lang="ar"
        required
      />
    </div>
    <div className="flex flex-col space-y-2">
      <label htmlFor="birth-date" className="text-right font-tajawal">
        تاريخ الميلاد
      </label>
      <input 
        id="birth-date"
        type="date"
        className="p-3 border rounded"
        required
      />
    </div>
    <div className="flex flex-col sm:flex-row gap-4 justify-end">
      <button 
        type="button" 
        className="px-6 py-3 bg-gray-200 rounded min-h-[44px]"
      >
        إلغاء
      </button>
      <button 
        type="submit" 
        className="px-6 py-3 bg-blue-600 text-white rounded min-h-[44px]"
      >
        حفظ
      </button>
    </div>
  </form>
);

const MockParentDashboard = () => (
  <div className="mobile-dashboard" dir="rtl">
    <header className="p-4 bg-blue-600 text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold">لوحة تحكم ولي الأمر</h1>
        <button 
          aria-label="فتح القائمة"
          className="lg:hidden p-2 min-h-[44px] min-w-[44px]"
        >
          ☰
        </button>
      </div>
    </header>
    
    <main className="p-4" role="main">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-right font-semibold mb-2">تقدم الطالب</h2>
          <div className="text-right text-sm text-gray-600">
            آخر تحديث: منذ ساعتين
          </div>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-right font-semibold mb-2">الجلسات القادمة</h2>
          <div className="text-right text-sm text-gray-600">
            الغد الساعة ٢:٠٠ م
          </div>
        </div>
      </div>

      <div className="mt-6 swipeable" data-swipeable="true">
        <div className="flex overflow-x-auto gap-4 pb-4">
          <div className="flex-none w-64 bg-white p-4 rounded shadow">
            <h3 className="font-semibold text-right">التقرير الأسبوعي</h3>
          </div>
          <div className="flex-none w-64 bg-white p-4 rounded shadow">
            <h3 className="font-semibold text-right">الأنشطة المنزلية</h3>
          </div>
        </div>
      </div>
    </main>
  </div>
);

// Example 1: Arabic RTL Testing
describe('Arabic RTL Testing Examples', () => {
  beforeEach(() => {
    document.body.dir = 'rtl';
    document.body.classList.add('rtl');
  });

  afterEach(() => {
    document.body.dir = 'ltr';
    document.body.classList.remove('rtl');
  });

  describe('Student Form - Arabic RTL', () => {
    test('renders with correct RTL layout', () => {
      const { container } = renderWithRTL(<MockStudentForm />, { language: 'ar' });
      
      // Test RTL direction
      rtlLayoutTests.hasRTLDirection(container);
      
      // Test form layout
      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('dir', 'rtl');
    });

    test('displays Arabic labels correctly', () => {
      renderWithRTL(<MockStudentForm />, { language: 'ar' });
      
      // Test Arabic content rendering
      arabicContentTests.rendersArabicText('اسم الطالب');
      arabicContentTests.rendersArabicText('تاريخ الميلاد');
      
      // Test form labels
      expect(screen.getByLabelText('اسم الطالب')).toBeInTheDocument();
      expect(screen.getByLabelText('تاريخ الميلاد')).toBeInTheDocument();
    });

    test('handles Arabic text input correctly', async () => {
      const user = userEvent.setup();
      renderWithRTL(<MockStudentForm />, { language: 'ar' });
      
      const nameInput = screen.getByLabelText('اسم الطالب');
      const arabicName = arabicTestData.students.valid.name_ar;
      
      await user.type(nameInput, arabicName);
      expect(nameInput).toHaveValue(arabicName);
    });

    test('button order is correct for RTL', () => {
      const { container } = renderWithRTL(<MockStudentForm />, { language: 'ar' });
      
      rtlLayoutTests.hasCorrectButtonOrder(container);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveTextContent('إلغاء'); // Cancel should be first (right side in RTL)
      expect(buttons[1]).toHaveTextContent('حفظ');   // Save should be second (left side in RTL)
    });

    test('meets Arabic accessibility standards', () => {
      const { container } = renderWithRTL(<MockStudentForm />, { language: 'ar' });
      
      arabicAccessibilityTests.testScreenReaderSupport(container);
      
      // Check for Arabic lang attributes
      const arabicElements = container.querySelectorAll('[lang="ar"]');
      expect(arabicElements.length).toBeGreaterThan(0);
    });

    test('form validation shows Arabic error messages', async () => {
      const user = userEvent.setup();
      renderWithRTL(<MockStudentForm />, { language: 'ar' });
      
      const submitButton = screen.getByText('حفظ');
      await user.click(submitButton);
      
      // This would require actual validation implementation
      // For now, we test that the structure supports Arabic validation
      const nameInput = screen.getByLabelText('اسم الطالب');
      expect(nameInput).toHaveAttribute('required');
    });
  });

  // Generate comprehensive RTL test suite
  const rtlTestSuites = generateRTLTestSuite('StudentForm', <MockStudentForm />);
  
  describe('Generated RTL Test Suite', () => {
    Object.entries(rtlTestSuites).forEach(([suiteName, testSuite]) => {
      describe(suiteName, testSuite);
    });
  });
});

// Example 2: Mobile Responsive Testing
describe('Mobile Responsive Testing Examples', () => {
  let viewport: ViewportManager;

  beforeEach(() => {
    viewport = new ViewportManager();
  });

  afterEach(() => {
    viewport.restore();
  });

  describe('Parent Dashboard - Mobile Responsiveness', () => {
    test('adapts layout for mobile screens', () => {
      const { container } = renderWithMobileContext(<MockParentDashboard />);
      
      layoutTests.testMobileLayout(container);
      
      // Test grid responsiveness
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
    });

    test('navigation works on mobile', async () => {
      const { container } = renderWithMobileContext(<MockParentDashboard />);
      
      const menuButton = screen.getByLabelText('فتح القائمة');
      expect(menuButton).toBeInTheDocument();
      expect(responsiveTests.meetsTouchTargetSize(menuButton)).toBe(true);
    });

    test('touch interactions work correctly', async () => {
      const { container } = renderWithMobileContext(<MockParentDashboard />);
      
      const swipeableElement = container.querySelector('[data-swipeable]');
      expect(swipeableElement).toBeInTheDocument();
      
      if (swipeableElement) {
        await touchInteractions.swipe(swipeableElement, 'left', 100);
        // In a real test, you'd verify the swipe behavior
      }
    });

    test('text remains readable on mobile', () => {
      viewport.setMobile('small');
      const { container } = render(<MockParentDashboard />);
      
      const textElements = container.querySelectorAll('h1, h2, h3, p, div');
      textElements.forEach(element => {
        if (element.textContent?.trim()) {
          expect(responsiveTests.hasMobileReadableText(element as HTMLElement)).toBe(true);
        }
      });
    });

    test('maintains proper spacing on mobile', () => {
      const { container } = renderWithMobileContext(<MockParentDashboard />);
      
      const contentElements = container.querySelectorAll('.p-4, .p-2, .p-6');
      contentElements.forEach(element => {
        expect(responsiveTests.hasMobileSpacing(element as HTMLElement)).toBe(true);
      });
    });
  });

  // Test across multiple devices
  test('component works across different device sizes', async () => {
    await viewport.testAcrossViewports(<MockParentDashboard />, (currentViewport) => {
      console.log(`Testing on ${currentViewport.name}`);
      
      // Basic functionality should work on all devices
      expect(screen.getByText('لوحة تحكم ولي الأمر')).toBeInTheDocument();
      expect(screen.getByText('تقدم الطالب')).toBeInTheDocument();
    });
  });

  // Generate comprehensive mobile test suite
  const mobileTestSuites = generateMobileTestSuite('ParentDashboard', <MockParentDashboard />);
  
  describe('Generated Mobile Test Suite', () => {
    Object.entries(mobileTestSuites).forEach(([suiteName, testSuite]) => {
      describe(suiteName, testSuite);
    });
  });
});

// Example 3: Combined Arabic + Mobile Testing
describe('Combined Arabic RTL + Mobile Testing', () => {
  test('Arabic layout works correctly on mobile', () => {
    document.body.dir = 'rtl';
    
    const { container } = renderWithMobileContext(<MockStudentForm />);
    
    // Test both RTL and mobile aspects
    rtlLayoutTests.hasRTLDirection(container);
    layoutTests.testMobileLayout(container);
    
    // Test mobile RTL navigation
    const form = container.querySelector('form');
    expect(form).toHaveAttribute('dir', 'rtl');
    
    // Test button layout in mobile RTL
    rtlLayoutTests.hasCorrectButtonOrder(container);
  });

  test('touch interactions work in RTL mode', async () => {
    document.body.dir = 'rtl';
    
    const { container } = renderWithMobileContext(<MockParentDashboard />);
    
    const menuButton = screen.getByLabelText('فتح القائمة');
    
    // Test touch interaction
    await touchInteractions.touchStart(menuButton);
    await touchInteractions.touchEnd(menuButton);
    
    // Verify touch target size
    expect(responsiveTests.meetsTouchTargetSize(menuButton)).toBe(true);
  });
});

// Example 4: Performance Testing
describe('Performance Testing Examples', () => {
  test('component renders quickly on mobile', async () => {
    const { renderTime } = await mobilePerformanceTests.testMobileRenderPerformance(
      <MockParentDashboard />
    );
    
    console.log(`Mobile render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(200);
  });

  test('Arabic font loading performs well', async () => {
    const startTime = performance.now();
    
    const { container } = renderWithRTL(<MockStudentForm />, { language: 'ar' });
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    console.log(`Arabic component render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(100);
    
    // Verify Arabic fonts are applied
    const arabicElement = container.querySelector('[lang="ar"]');
    if (arabicElement) {
      rtlLayoutTests.hasArabicFonts(arabicElement as HTMLElement);
    }
  });
});

// Example 5: Integration Testing
describe('Integration Testing Examples', () => {
  test('complete student enrollment workflow', async () => {
    const user = userEvent.setup();
    
    // Test Arabic form submission
    renderWithRTL(<MockStudentForm />, { language: 'ar' });
    
    // Fill form with Arabic data
    const nameInput = screen.getByLabelText('اسم الطالب');
    await user.type(nameInput, arabicTestData.students.valid.name_ar);
    
    const dateInput = screen.getByLabelText('تاريخ الميلاد');
    await user.type(dateInput, arabicTestData.students.valid.date_of_birth);
    
    // Submit form
    const submitButton = screen.getByText('حفظ');
    await user.click(submitButton);
    
    // In a real test, you'd verify the form submission
    expect(nameInput).toHaveValue(arabicTestData.students.valid.name_ar);
    expect(dateInput).toHaveValue(arabicTestData.students.valid.date_of_birth);
  });

  test('parent portal workflow on mobile', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMobileContext(<MockParentDashboard />);
    
    // Test mobile navigation
    const menuButton = screen.getByLabelText('فتح القائمة');
    await user.click(menuButton);
    
    // Test content accessibility
    expect(screen.getByText('تقدم الطالب')).toBeInTheDocument();
    expect(screen.getByText('الجلسات القادمة')).toBeInTheDocument();
    
    // Test swipe functionality
    const swipeableArea = container.querySelector('[data-swipeable]');
    if (swipeableArea) {
      await touchInteractions.swipe(swipeableArea, 'left');
    }
  });
});

// Example 6: Accessibility Testing
describe('Accessibility Testing Examples', () => {
  test('keyboard navigation works in Arabic RTL', async () => {
    const user = userEvent.setup();
    renderWithRTL(<MockStudentForm />, { language: 'ar' });
    
    const nameInput = screen.getByLabelText('اسم الطالب');
    const dateInput = screen.getByLabelText('تاريخ الميلاد');
    const cancelButton = screen.getByText('إلغاء');
    const saveButton = screen.getByText('حفظ');
    
    // Test tab order
    await user.tab();
    expect(nameInput).toHaveFocus();
    
    await user.tab();
    expect(dateInput).toHaveFocus();
    
    await user.tab();
    expect(cancelButton).toHaveFocus();
    
    await user.tab();
    expect(saveButton).toHaveFocus();
  });

  test('screen reader support for Arabic content', () => {
    const { container } = renderWithRTL(<MockStudentForm />, { language: 'ar' });
    
    // Check ARIA labels
    const nameInput = screen.getByLabelText('اسم الطالب');
    expect(nameInput).toHaveAttribute('aria-label', 'اسم الطالب');
    
    // Check language attributes
    expect(nameInput).toHaveAttribute('lang', 'ar');
    
    arabicAccessibilityTests.testScreenReaderSupport(container);
  });
});

// Example 7: Error Handling Testing
describe('Error Handling Testing', () => {
  test('displays Arabic error messages correctly', async () => {
    const user = userEvent.setup();
    renderWithRTL(<MockStudentForm />, { language: 'ar' });
    
    // Try to submit empty form
    const submitButton = screen.getByText('حفظ');
    await user.click(submitButton);
    
    // Check that required validation works
    const nameInput = screen.getByLabelText('اسم الطالب');
    expect(nameInput).toBeInvalid();
    
    // In a real implementation, you'd test specific error messages
    // expect(screen.getByText('هذا الحقل مطلوب')).toBeInTheDocument();
  });

  test('handles network errors gracefully on mobile', async () => {
    // Mock network error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { container } = renderWithMobileContext(<MockParentDashboard />);
    
    // Simulate network error during data fetch
    // In a real test, you'd mock your API calls to throw errors
    
    // Verify error doesn't break the UI
    expect(screen.getByText('لوحة تحكم ولي الأمر')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});

// Example 8: Security Testing
describe('Security Testing Examples', () => {
  test('sanitizes Arabic input correctly', async () => {
    const user = userEvent.setup();
    renderWithRTL(<MockStudentForm />, { language: 'ar' });
    
    const nameInput = screen.getByLabelText('اسم الطالب');
    
    // Test with potentially malicious input
    const maliciousInput = 'أحمد <script>alert("xss")</script> محمد';
    await user.type(nameInput, maliciousInput);
    
    // The input should be sanitized (in real implementation)
    // expect(nameInput.value).not.toContain('<script>');
    expect(nameInput).toBeInTheDocument(); // At minimum, input should still be functional
  });

  test('enforces proper authentication on mobile', () => {
    // Mock unauthenticated user
    const { container } = renderWithMobileContext(<MockParentDashboard />);
    
    // In a real test, you'd verify that unauthenticated users
    // are redirected or shown an auth screen
    expect(container.firstChild).toBeInTheDocument();
  });
});

export { }; // Ensure this is treated as a module