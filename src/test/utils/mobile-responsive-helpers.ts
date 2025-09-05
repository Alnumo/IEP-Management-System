/**
 * Mobile Responsive Testing Utilities
 * Comprehensive testing helpers for mobile responsiveness, touch interactions,
 * and cross-device compatibility in the Arkan Therapy Plans Manager
 */

import { render, screen, fireEvent, waitFor, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement } from 'react';
import { vi } from 'vitest';

// Device Breakpoints and Specifications
export const deviceBreakpoints = {
  // Mobile devices
  mobile: {
    small: { width: 320, height: 568, name: 'iPhone SE' },
    medium: { width: 375, height: 667, name: 'iPhone 8' },
    large: { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
    android: { width: 360, height: 640, name: 'Pixel 3' },
  },
  
  // Tablet devices
  tablet: {
    portrait: { width: 768, height: 1024, name: 'iPad' },
    landscape: { width: 1024, height: 768, name: 'iPad Landscape' },
    large: { width: 820, height: 1180, name: 'iPad Air' },
  },
  
  // Desktop devices  
  desktop: {
    small: { width: 1024, height: 768, name: 'Small Desktop' },
    medium: { width: 1440, height: 900, name: 'Medium Desktop' },
    large: { width: 1920, height: 1080, name: 'Large Desktop' },
  },
} as const;

// Touch Interaction Utilities
export const touchInteractions = {
  /**
   * Simulate touch start event
   */
  touchStart: (element: Element, options: { clientX?: number; clientY?: number } = {}) => {
    const { clientX = 0, clientY = 0 } = options;
    fireEvent.touchStart(element, {
      touches: [{ clientX, clientY, identifier: 0 }],
      changedTouches: [{ clientX, clientY, identifier: 0 }],
    });
  },

  /**
   * Simulate touch move event
   */
  touchMove: (element: Element, options: { clientX?: number; clientY?: number } = {}) => {
    const { clientX = 0, clientY = 0 } = options;
    fireEvent.touchMove(element, {
      touches: [{ clientX, clientY, identifier: 0 }],
      changedTouches: [{ clientX, clientY, identifier: 0 }],
    });
  },

  /**
   * Simulate touch end event
   */
  touchEnd: (element: Element, options: { clientX?: number; clientY?: number } = {}) => {
    const { clientX = 0, clientY = 0 } = options;
    fireEvent.touchEnd(element, {
      touches: [],
      changedTouches: [{ clientX, clientY, identifier: 0 }],
    });
  },

  /**
   * Simulate swipe gesture
   */
  swipe: async (
    element: Element,
    direction: 'left' | 'right' | 'up' | 'down',
    distance: number = 100
  ) => {
    const rect = element.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    let endX = startX;
    let endY = startY;

    switch (direction) {
      case 'left':
        endX = startX - distance;
        break;
      case 'right':
        endX = startX + distance;
        break;
      case 'up':
        endY = startY - distance;
        break;
      case 'down':
        endY = startY + distance;
        break;
    }

    touchInteractions.touchStart(element, { clientX: startX, clientY: startY });
    touchInteractions.touchMove(element, { clientX: endX, clientY: endY });
    touchInteractions.touchEnd(element, { clientX: endX, clientY: endY });

    // Allow for swipe animations to complete
    await waitFor(() => {}, { timeout: 500 });
  },

  /**
   * Simulate pinch zoom gesture
   */
  pinchZoom: async (
    element: Element,
    scale: number = 1.5,
    center: { x?: number; y?: number } = {}
  ) => {
    const rect = element.getBoundingClientRect();
    const centerX = center.x ?? rect.left + rect.width / 2;
    const centerY = center.y ?? rect.top + rect.height / 2;

    const distance = 50;
    const scaledDistance = distance * scale;

    // Two finger touch start
    fireEvent.touchStart(element, {
      touches: [
        { clientX: centerX - distance, clientY: centerY, identifier: 0 },
        { clientX: centerX + distance, clientY: centerY, identifier: 1 },
      ],
    });

    // Move fingers apart (zoom in) or together (zoom out)
    fireEvent.touchMove(element, {
      touches: [
        { clientX: centerX - scaledDistance, clientY: centerY, identifier: 0 },
        { clientX: centerX + scaledDistance, clientY: centerY, identifier: 1 },
      ],
    });

    fireEvent.touchEnd(element, {
      touches: [],
      changedTouches: [
        { clientX: centerX - scaledDistance, clientY: centerY, identifier: 0 },
        { clientX: centerX + scaledDistance, clientY: centerY, identifier: 1 },
      ],
    });
  },

  /**
   * Simulate long press
   */
  longPress: async (element: Element, duration: number = 800) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    touchInteractions.touchStart(element, { clientX: centerX, clientY: centerY });
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    touchInteractions.touchEnd(element, { clientX: centerX, clientY: centerY });
  },
};

// Viewport Management Utilities
export class ViewportManager {
  private originalInnerWidth: number;
  private originalInnerHeight: number;

  constructor() {
    this.originalInnerWidth = window.innerWidth;
    this.originalInnerHeight = window.innerHeight;
  }

  /**
   * Set viewport to specific device dimensions
   */
  setViewport(width: number, height: number, deviceName?: string): void {
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

    // Update screen dimensions
    Object.defineProperty(window.screen, 'width', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window.screen, 'height', {
      writable: true,
      configurable: true,
      value: height,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    // Log for debugging
    if (deviceName) {
      console.debug(`Viewport set to ${deviceName}: ${width}x${height}`);
    }
  }

  /**
   * Set to mobile viewport
   */
  setMobile(device: keyof typeof deviceBreakpoints.mobile = 'medium'): void {
    const { width, height, name } = deviceBreakpoints.mobile[device];
    this.setViewport(width, height, name);
  }

  /**
   * Set to tablet viewport
   */
  setTablet(device: keyof typeof deviceBreakpoints.tablet = 'portrait'): void {
    const { width, height, name } = deviceBreakpoints.tablet[device];
    this.setViewport(width, height, name);
  }

  /**
   * Set to desktop viewport
   */
  setDesktop(device: keyof typeof deviceBreakpoints.desktop = 'medium'): void {
    const { width, height, name } = deviceBreakpoints.desktop[device];
    this.setViewport(width, height, name);
  }

  /**
   * Restore original viewport
   */
  restore(): void {
    this.setViewport(this.originalInnerWidth, this.originalInnerHeight);
  }

  /**
   * Test component across multiple viewports
   */
  async testAcrossViewports(
    component: ReactElement,
    testFn: (viewport: { width: number; height: number; name: string }) => void | Promise<void>
  ): Promise<void> {
    const viewports = [
      deviceBreakpoints.mobile.medium,
      deviceBreakpoints.tablet.portrait,
      deviceBreakpoints.desktop.medium,
    ];

    for (const viewport of viewports) {
      this.setViewport(viewport.width, viewport.height, viewport.name);
      
      // Re-render component for new viewport
      const { unmount } = render(component);
      
      try {
        await testFn(viewport);
      } finally {
        unmount();
      }
    }

    this.restore();
  }
}

// Responsive Design Testing Utilities
export const responsiveTests = {
  /**
   * Test if element is hidden on mobile
   */
  isHiddenOnMobile: (element: HTMLElement): boolean => {
    const styles = window.getComputedStyle(element);
    return styles.display === 'none' || styles.visibility === 'hidden';
  },

  /**
   * Test if element uses mobile-appropriate spacing
   */
  hasMobileSpacing: (element: HTMLElement): boolean => {
    const styles = window.getComputedStyle(element);
    const padding = parseInt(styles.padding) || 0;
    const margin = parseInt(styles.margin) || 0;
    
    // Mobile elements should have reasonable spacing (not too cramped)
    return padding >= 8 && margin >= 4;
  },

  /**
   * Test if text is readable on mobile (font size >= 16px)
   */
  hasMobileReadableText: (element: HTMLElement): boolean => {
    const styles = window.getComputedStyle(element);
    const fontSize = parseFloat(styles.fontSize);
    return fontSize >= 16;
  },

  /**
   * Test if element meets minimum touch target size (44x44px)
   */
  meetsTouchTargetSize: (element: HTMLElement, minSize: number = 44): boolean => {
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    
    const actualHeight = Math.max(rect.height, parseFloat(styles.minHeight) || 0);
    const actualWidth = Math.max(rect.width, parseFloat(styles.minWidth) || 0);
    
    return actualHeight >= minSize && actualWidth >= minSize;
  },

  /**
   * Test if navigation is mobile-friendly
   */
  hasMobileFriendlyNavigation: (container: HTMLElement): boolean => {
    // Check for hamburger menu or mobile navigation toggle
    const mobileMenuButton = container.querySelector('[aria-label*="menu"], [role="button"][aria-expanded]');
    const mobileNav = container.querySelector('.mobile-nav, .lg\\:hidden');
    
    return !!(mobileMenuButton || mobileNav);
  },

  /**
   * Test if form is mobile-optimized
   */
  hasMobileOptimizedForm: (form: HTMLElement): boolean => {
    const inputs = form.querySelectorAll('input, select, textarea');
    let isOptimized = true;

    inputs.forEach(input => {
      const inputElement = input as HTMLInputElement;
      
      // Check for appropriate input types
      const type = inputElement.type;
      const hasAppropriateInputType = [
        'email', 'tel', 'number', 'date', 'time'
      ].includes(type) || type === 'text';

      // Check for appropriate keyboard hints
      const inputMode = inputElement.getAttribute('inputmode');
      const hasInputMode = inputMode !== null;

      if (!hasAppropriateInputType && !hasInputMode) {
        isOptimized = false;
      }
    });

    return isOptimized;
  },
};

// Layout Testing Utilities
export const layoutTests = {
  /**
   * Test if layout adapts correctly to mobile
   */
  testMobileLayout: (container: HTMLElement) => {
    // Check if elements stack vertically on mobile
    const flexContainers = container.querySelectorAll('[class*="flex"]');
    flexContainers.forEach(flexContainer => {
      const styles = window.getComputedStyle(flexContainer);
      const isColumn = styles.flexDirection === 'column';
      const hasResponsiveFlex = flexContainer.className.includes('flex-col') || 
                               flexContainer.className.includes('sm:flex-row') ||
                               flexContainer.className.includes('md:flex-row');
      
      expect(isColumn || hasResponsiveFlex).toBe(true);
    });
  },

  /**
   * Test if grid layouts collapse appropriately
   */
  testResponsiveGrid: (container: HTMLElement) => {
    const gridContainers = container.querySelectorAll('[class*="grid"]');
    gridContainers.forEach(gridContainer => {
      const styles = window.getComputedStyle(gridContainer);
      const columns = styles.gridTemplateColumns;
      
      // On mobile, grid should typically be single column or auto-fit
      expect(columns).toMatch(/(auto|1fr|repeat\(1,|repeat\(auto-fit)/);
    });
  },

  /**
   * Test if sidebar/drawer behavior works on mobile
   */
  testMobileSidebar: async (container: HTMLElement) => {
    const sidebar = container.querySelector('[role="complementary"], .sidebar');
    if (!sidebar) return;

    // Sidebar should be hidden by default on mobile
    const initialStyles = window.getComputedStyle(sidebar);
    const isInitiallyHidden = initialStyles.transform.includes('translate') || 
                             initialStyles.display === 'none' ||
                             sidebar.className.includes('hidden');
    
    expect(isInitiallyHidden).toBe(true);

    // Find toggle button
    const toggleButton = container.querySelector('[aria-controls], [data-toggle="sidebar"]');
    if (toggleButton) {
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const updatedStyles = window.getComputedStyle(sidebar);
        const isVisible = !updatedStyles.transform.includes('translate') && 
                         updatedStyles.display !== 'none';
        expect(isVisible).toBe(true);
      });
    }
  },
};

// Performance Testing for Mobile
export const mobilePerformanceTests = {
  /**
   * Test component rendering performance on mobile viewport
   */
  testMobileRenderPerformance: async (component: ReactElement) => {
    const viewport = new ViewportManager();
    viewport.setMobile('medium');

    const startTime = performance.now();
    const { container } = render(component);
    const renderTime = performance.now() - startTime;

    // Mobile rendering should be fast (under 200ms for most components)
    expect(renderTime).toBeLessThan(200);

    viewport.restore();
    return { renderTime, container };
  },

  /**
   * Test scroll performance on mobile
   */
  testMobileScrollPerformance: async (scrollableElement: HTMLElement) => {
    const scrollEvents: number[] = [];
    
    const handleScroll = () => {
      scrollEvents.push(performance.now());
    };

    scrollableElement.addEventListener('scroll', handleScroll);

    // Simulate rapid scrolling
    for (let i = 0; i < 50; i += 10) {
      scrollableElement.scrollTop = i;
      await new Promise(resolve => setTimeout(resolve, 16)); // 60 FPS
    }

    scrollableElement.removeEventListener('scroll', handleScroll);

    // Check that scroll events fired consistently (indicating smooth scrolling)
    expect(scrollEvents.length).toBeGreaterThan(0);
    
    // Check frame rate consistency (16ms = 60 FPS)
    const averageFrameTime = scrollEvents.reduce((acc, time, index) => {
      if (index === 0) return acc;
      return acc + (time - scrollEvents[index - 1]);
    }, 0) / (scrollEvents.length - 1);

    expect(averageFrameTime).toBeLessThan(33); // Should be better than 30 FPS
  },
};

// Custom Render Function with Mobile Context
interface MobileRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  viewport?: keyof typeof deviceBreakpoints.mobile | 'tablet' | 'desktop';
  orientation?: 'portrait' | 'landscape';
}

export function renderWithMobileContext(
  ui: ReactElement,
  options: MobileRenderOptions = {}
): RenderResult & { viewport: ViewportManager } {
  const { viewport = 'medium', orientation = 'portrait', ...renderOptions } = options;
  
  const viewportManager = new ViewportManager();

  // Set up viewport based on options
  if (viewport === 'tablet') {
    viewportManager.setTablet(orientation === 'landscape' ? 'landscape' : 'portrait');
  } else if (viewport === 'desktop') {
    viewportManager.setDesktop('medium');
  } else {
    viewportManager.setMobile(viewport as keyof typeof deviceBreakpoints.mobile);
  }

  const result = render(ui, renderOptions);

  return {
    ...result,
    viewport: viewportManager,
  };
}

// Test Suite Generators for Mobile Testing
export const generateMobileTestSuite = (componentName: string, Component: ReactElement) => {
  return {
    [`${componentName} Mobile Layout Tests`]: () => {
      describe(`${componentName} - Mobile Layout`, () => {
        let viewport: ViewportManager;

        beforeEach(() => {
          viewport = new ViewportManager();
        });

        afterEach(() => {
          viewport.restore();
        });

        test('adapts layout for mobile screens', () => {
          viewport.setMobile('medium');
          const { container } = render(Component);
          layoutTests.testMobileLayout(container);
        });

        test('maintains touch-friendly interactions', () => {
          viewport.setMobile('medium');
          const { container } = render(Component);
          
          const interactiveElements = container.querySelectorAll('button, a, input, [role="button"]');
          interactiveElements.forEach(element => {
            expect(responsiveTests.meetsTouchTargetSize(element as HTMLElement)).toBe(true);
          });
        });

        test('text remains readable on mobile', () => {
          viewport.setMobile('small');
          const { container } = render(Component);
          
          const textElements = container.querySelectorAll('p, span, label, button');
          textElements.forEach(element => {
            if (element.textContent?.trim()) {
              expect(responsiveTests.hasMobileReadableText(element as HTMLElement)).toBe(true);
            }
          });
        });
      });
    },

    [`${componentName} Touch Interaction Tests`]: () => {
      describe(`${componentName} - Touch Interactions`, () => {
        test('responds to touch events', async () => {
          const { container } = renderWithMobileContext(Component);
          
          const touchableElements = container.querySelectorAll('button, [role="button"]');
          
          for (const element of touchableElements) {
            await touchInteractions.touchStart(element);
            await touchInteractions.touchEnd(element);
            // Element should respond to touch (this test may need customization per component)
          }
        });

        test('supports swipe gestures where applicable', async () => {
          const { container } = renderWithMobileContext(Component);
          
          const swipeableElements = container.querySelectorAll('[data-swipeable], .swipeable');
          
          for (const element of swipeableElements) {
            await touchInteractions.swipe(element, 'left');
            // Test should verify swipe behavior (customize per component)
          }
        });
      });
    },

    [`${componentName} Cross-Device Tests`]: () => {
      describe(`${componentName} - Cross-Device Compatibility`, () => {
        const viewport = new ViewportManager();

        afterEach(() => {
          viewport.restore();
        });

        test('works on small mobile screens', () => {
          viewport.setMobile('small');
          const { container } = render(Component);
          expect(container.firstChild).toBeInTheDocument();
        });

        test('works on tablet screens', () => {
          viewport.setTablet('portrait');
          const { container } = render(Component);
          expect(container.firstChild).toBeInTheDocument();
        });

        test('works on desktop screens', () => {
          viewport.setDesktop('medium');
          const { container } = render(Component);
          expect(container.firstChild).toBeInTheDocument();
        });
      });
    },
  };
};

// Integration with Arabic RTL Testing
export const mobileRTLIntegration = {
  /**
   * Test mobile layout in both RTL and LTR modes
   */
  testMobileBidirectional: async (component: ReactElement) => {
    const viewport = new ViewportManager();
    viewport.setMobile('medium');

    // Test LTR mobile
    document.body.dir = 'ltr';
    const { container: ltrContainer, unmount: unmountLTR } = render(component);
    layoutTests.testMobileLayout(ltrContainer);
    unmountLTR();

    // Test RTL mobile
    document.body.dir = 'rtl';
    const { container: rtlContainer, unmount: unmountRTL } = render(component);
    layoutTests.testMobileLayout(rtlContainer);
    unmountRTL();

    viewport.restore();
  },

  /**
   * Test mobile navigation in RTL mode
   */
  testMobileRTLNavigation: (container: HTMLElement) => {
    // In RTL mobile, hamburger menu should be on the right
    const menuButton = container.querySelector('[aria-label*="فتح القائمة"], [data-toggle="menu"]');
    if (menuButton) {
      const styles = window.getComputedStyle(menuButton);
      const isOnRight = styles.right !== 'auto' || menuButton.className.includes('right');
      expect(isOnRight).toBe(true);
    }
  },
};

export default {
  deviceBreakpoints,
  touchInteractions,
  ViewportManager,
  responsiveTests,
  layoutTests,
  mobilePerformanceTests,
  renderWithMobileContext,
  generateMobileTestSuite,
  mobileRTLIntegration,
};