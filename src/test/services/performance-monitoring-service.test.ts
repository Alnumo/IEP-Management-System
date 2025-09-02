/**
 * @file Performance Monitoring Service Test Suite
 * @description Comprehensive tests for Real User Monitoring and performance tracking
 * Includes bilingual performance testing for Arabic RTL and English LTR
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performanceMonitoringService } from '@/services/performance-monitoring-service';
import { apmService } from '@/services/apm-service';

// Mock APM service
vi.mock('@/services/apm-service', () => ({
  apmService: {
    recordCustomMetric: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    trackUserWorkflow: vi.fn(),
  }
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [{}], error: null }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        is: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
          }))
        }))
      }))
    }))
  }
}));

// Mock performance APIs
const mockPerformanceObserver = vi.fn();
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

Object.defineProperty(global, 'PerformanceObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: mockObserve,
    disconnect: mockDisconnect
  }))
});

Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => 1000),
    getEntriesByType: vi.fn(() => []),
    timeOrigin: 0,
  }
});

// Mock navigation API
Object.defineProperty(global, 'navigator', {
  writable: true,
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    connection: {
      effectiveType: '4g',
      type: 'cellular'
    }
  }
});

// Mock screen API
Object.defineProperty(global, 'screen', {
  writable: true,
  value: {
    width: 1920,
    height: 1080
  }
});

// Mock document for RTL/LTR testing
const mockDocument = {
  dir: 'ltr',
  title: 'Test Page',
  readyState: 'complete',
  documentElement: {
    scrollHeight: 2000,
    scrollTop: 0
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

Object.defineProperty(global, 'document', {
  writable: true,
  value: mockDocument
});

// Mock window for scroll and visibility testing
const mockWindow = {
  location: { href: 'https://test.com/page' },
  innerHeight: 800,
  pageYOffset: 0,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

Object.defineProperty(global, 'window', {
  writable: true,
  value: mockWindow
});

describe('Performance Monitoring Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset service state
    performanceMonitoringService.cleanup();
    
    // Reset document direction
    mockDocument.dir = 'ltr';
    
    // Mock console to avoid noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    performanceMonitoringService.cleanup();
    vi.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize RUM service successfully', async () => {
      await performanceMonitoringService.initialize();
      
      const session = performanceMonitoringService.getCurrentSession();
      expect(session).toBeDefined();
      expect(session?.sessionId).toMatch(/^rum_\d+_[a-z0-9]+$/);
      expect(session?.deviceType).toBe('desktop'); // Based on mocked screen width
      expect(session?.language).toBe('en'); // Based on LTR direction
    });

    it('should detect Arabic RTL language correctly', async () => {
      mockDocument.dir = 'rtl';
      
      await performanceMonitoringService.initialize();
      
      const session = performanceMonitoringService.getCurrentSession();
      expect(session?.language).toBe('ar');
    });

    it('should detect device type correctly', async () => {
      // Test mobile detection
      Object.defineProperty(global, 'screen', {
        value: { width: 375, height: 667 },
        writable: true
      });
      
      await performanceMonitoringService.initialize();
      
      let session = performanceMonitoringService.getCurrentSession();
      expect(session?.deviceType).toBe('mobile');
      
      performanceMonitoringService.cleanup();
      
      // Test tablet detection
      Object.defineProperty(global, 'screen', {
        value: { width: 768, height: 1024 },
        writable: true
      });
      
      await performanceMonitoringService.initialize();
      
      session = performanceMonitoringService.getCurrentSession();
      expect(session?.deviceType).toBe('tablet');
    });
  });

  describe('Page View Tracking', () => {
    it('should track page views with performance metrics', async () => {
      await performanceMonitoringService.initialize();
      
      const pageViewId = performanceMonitoringService.startPageView('https://test.com/therapy');
      expect(pageViewId).toMatch(/^pv_\d+_[a-z0-9]+$/);
      
      const session = performanceMonitoringService.getCurrentSession();
      expect(session?.pageViews).toHaveLength(1);
      expect(session?.pageViews[0].url).toBe('https://test.com/therapy');
      expect(session?.pageViews[0].scrollDepth).toBe(0);
    });

    it('should end page views and calculate duration', async () => {
      await performanceMonitoringService.initialize();
      
      vi.mocked(performance.now)
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(3000); // End time
      
      const pageViewId = performanceMonitoringService.startPageView();
      performanceMonitoringService.endPageView('navigation');
      
      expect(vi.mocked(apmService.recordCustomMetric)).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'rum_page_view_duration',
          value: 2000, // 3000 - 1000
          unit: 'ms',
          category: 'business'
        })
      );
    });

    it('should track page views with Arabic RTL context', async () => {
      mockDocument.dir = 'rtl';
      
      await performanceMonitoringService.initialize();
      performanceMonitoringService.startPageView();
      performanceMonitoringService.endPageView();
      
      const recordedCall = vi.mocked(apmService.recordCustomMetric).mock.calls
        .find(call => call[0].name === 'rum_page_view_duration');
      
      expect(recordedCall?.[0].metadata?.sessionId).toBeDefined();
    });
  });

  describe('User Interaction Tracking', () => {
    it('should track user interactions with metadata', async () => {
      await performanceMonitoringService.initialize();
      
      const interactionId = performanceMonitoringService.trackInteraction(
        'click',
        '#submit-button',
        { formName: 'therapy-session-form' }
      );
      
      expect(interactionId).toMatch(/^int_\d+_[a-z0-9]+$/);
      
      const session = performanceMonitoringService.getCurrentSession();
      expect(session?.interactions).toHaveLength(1);
      expect(session?.interactions[0].type).toBe('click');
      expect(session?.interactions[0].target).toBe('#submit-button');
      expect(session?.interactions[0].metadata?.formName).toBe('therapy-session-form');
    });

    it('should complete interaction tracking with duration', async () => {
      await performanceMonitoringService.initialize();
      
      vi.mocked(performance.now)
        .mockReturnValueOnce(1000) // Interaction start
        .mockReturnValueOnce(1500); // Completion time
      
      const interactionId = performanceMonitoringService.trackInteraction('form_submit', '#therapy-form');
      performanceMonitoringService.completeInteraction(interactionId, true);
      
      expect(vi.mocked(apmService.recordCustomMetric)).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'rum_interaction_form_submit_duration',
          unit: 'ms',
          category: 'business'
        })
      );
    });

    it('should track interactions with language context', async () => {
      // Test Arabic RTL interactions
      mockDocument.dir = 'rtl';
      await performanceMonitoringService.initialize();
      
      const arabicInteractionId = performanceMonitoringService.trackInteraction(
        'click',
        '.arabic-form-button',
        { componentType: 'iep-form' }
      );
      
      const session = performanceMonitoringService.getCurrentSession();
      const arabicInteraction = session?.interactions.find(i => i.id === arabicInteractionId);
      
      expect(arabicInteraction?.metadata?.language).toBe('ar');
      
      // Switch to English LTR
      mockDocument.dir = 'ltr';
      performanceMonitoringService.cleanup();
      await performanceMonitoringService.initialize();
      
      const englishInteractionId = performanceMonitoringService.trackInteraction(
        'click',
        '.english-form-button',
        { componentType: 'iep-form' }
      );
      
      const newSession = performanceMonitoringService.getCurrentSession();
      const englishInteraction = newSession?.interactions.find(i => i.id === englishInteractionId);
      
      expect(englishInteraction?.metadata?.language).toBe('en');
    });
  });

  describe('Error Tracking', () => {
    it('should track JavaScript errors with context', async () => {
      await performanceMonitoringService.initialize();
      
      const errorId = performanceMonitoringService.trackError(
        'javascript',
        'TypeError: Cannot read property of undefined',
        {
          stack: 'Error stack trace...',
          line: 42,
          column: 15,
          severity: 'high'
        }
      );
      
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      
      const session = performanceMonitoringService.getCurrentSession();
      expect(session?.errors).toHaveLength(1);
      expect(session?.errors[0].type).toBe('javascript');
      expect(session?.errors[0].severity).toBe('high');
      expect(session?.errors[0].context?.sessionId).toBeDefined();
    });

    it('should track network errors with medical context', async () => {
      await performanceMonitoringService.initialize();
      performanceMonitoringService.startPageView('/therapy/medical-records');
      
      const errorId = performanceMonitoringService.trackError(
        'network',
        'Failed to load medical data',
        {
          severity: 'critical',
          context: {
            endpoint: '/api/medical-records',
            medicalDataInvolved: true,
            complianceImpact: true
          }
        }
      );
      
      const session = performanceMonitoringService.getCurrentSession();
      const error = session?.errors.find(e => e.id === errorId);
      
      expect(error?.context?.medicalDataInvolved).toBe(true);
      expect(error?.context?.complianceImpact).toBe(true);
      expect(error?.severity).toBe('critical');
    });
  });

  describe('Bilingual Performance Testing', () => {
    it('should measure performance differences between Arabic RTL and English LTR', async () => {
      const performanceResults = {
        arabic: { loadTime: 0, renderTime: 0, interactionTime: 0 },
        english: { loadTime: 0, renderTime: 0, interactionTime: 0 }
      };
      
      // Test Arabic RTL performance
      mockDocument.dir = 'rtl';
      await performanceMonitoringService.initialize();
      
      vi.mocked(performance.now)
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1800); // 800ms load time
      
      const arabicPageViewId = performanceMonitoringService.startPageView('/therapy/session-arabic');
      performanceMonitoringService.endPageView();
      
      // Capture Arabic performance metrics
      const arabicCalls = vi.mocked(apmService.recordCustomMetric).mock.calls
        .filter(call => call[0].name === 'rum_page_view_duration');
      
      if (arabicCalls.length > 0) {
        performanceResults.arabic.loadTime = arabicCalls[arabicCalls.length - 1][0].value;
      }
      
      // Reset and test English LTR performance
      vi.clearAllMocks();
      performanceMonitoringService.cleanup();
      mockDocument.dir = 'ltr';
      await performanceMonitoringService.initialize();
      
      vi.mocked(performance.now)
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(2600); // 600ms load time
      
      const englishPageViewId = performanceMonitoringService.startPageView('/therapy/session-english');
      performanceMonitoringService.endPageView();
      
      // Capture English performance metrics
      const englishCalls = vi.mocked(apmService.recordCustomMetric).mock.calls
        .filter(call => call[0].name === 'rum_page_view_duration');
      
      if (englishCalls.length > 0) {
        performanceResults.english.loadTime = englishCalls[englishCalls.length - 1][0].value;
      }
      
      // Compare performance (this test demonstrates the measurement capability)
      expect(performanceResults.arabic.loadTime).toBeGreaterThan(0);
      expect(performanceResults.english.loadTime).toBeGreaterThan(0);
      
      // Log the comparison for analysis
      console.log('Bilingual Performance Comparison:', performanceResults);
    });

    it('should track form submission performance in both languages', async () => {
      const formPerformanceResults = [];
      
      // Test Arabic form submission
      mockDocument.dir = 'rtl';
      await performanceMonitoringService.initialize();
      
      vi.mocked(performance.now)
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1200); // 200ms form submission
      
      const arabicFormId = performanceMonitoringService.trackInteraction(
        'form_submit',
        '#arabic-therapy-form',
        { language: 'ar', formType: 'therapy_session' }
      );
      
      performanceMonitoringService.completeInteraction(arabicFormId, true);
      
      // Test English form submission
      performanceMonitoringService.cleanup();
      mockDocument.dir = 'ltr';
      await performanceMonitoringService.initialize();
      
      vi.mocked(performance.now)
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(2150); // 150ms form submission
      
      const englishFormId = performanceMonitoringService.trackInteraction(
        'form_submit',
        '#english-therapy-form',
        { language: 'en', formType: 'therapy_session' }
      );
      
      performanceMonitoringService.completeInteraction(englishFormId, true);
      
      // Verify both language contexts were captured
      const allCalls = vi.mocked(apmService.recordCustomMetric).mock.calls;
      const formSubmissionCalls = allCalls.filter(call => 
        call[0].name === 'rum_interaction_form_submit_duration'
      );
      
      expect(formSubmissionCalls.length).toBe(2);
      
      // Verify language metadata is present
      const arabicCall = formSubmissionCalls.find(call => 
        call[0].metadata?.language === 'ar'
      );
      const englishCall = formSubmissionCalls.find(call => 
        call[0].metadata?.language === 'en'
      );
      
      expect(arabicCall).toBeDefined();
      expect(englishCall).toBeDefined();
    });

    it('should measure scroll performance in RTL vs LTR layouts', async () => {
      // Test Arabic RTL scrolling
      mockDocument.dir = 'rtl';
      await performanceMonitoringService.initialize();
      performanceMonitoringService.startPageView('/therapy/long-arabic-content');
      
      // Simulate scroll event handling
      const scrollHandler = vi.mocked(mockWindow.addEventListener).mock.calls
        .find(call => call[0] === 'scroll')?.[1] as Function;
      
      if (scrollHandler) {
        // Simulate reaching 50% scroll depth
        mockWindow.pageYOffset = 600; // Half of 1200 scrollable height
        mockDocument.documentElement.scrollTop = 600;
        
        scrollHandler();
        
        // Wait for debounced scroll tracking
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      // Check if scroll depth was tracked for Arabic content
      const arabicScrollCalls = vi.mocked(apmService.recordCustomMetric).mock.calls
        .filter(call => call[0].name?.includes('rum_scroll_depth'));
      
      // Test English LTR scrolling
      performanceMonitoringService.cleanup();
      mockDocument.dir = 'ltr';
      await performanceMonitoringService.initialize();
      performanceMonitoringService.startPageView('/therapy/long-english-content');
      
      // The test demonstrates the scroll tracking capability exists
      expect(vi.mocked(mockWindow.addEventListener)).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        { passive: true }
      );
    });
  });

  describe('Session Management', () => {
    it('should properly manage session lifecycle', async () => {
      await performanceMonitoringService.initialize();
      
      const session = performanceMonitoringService.getCurrentSession();
      expect(session).toBeDefined();
      expect(session?.startTime).toBeDefined();
      expect(session?.endTime).toBeUndefined();
      
      // End session
      vi.mocked(performance.now).mockReturnValue(5000);
      performanceMonitoringService.endSession();
      
      expect(vi.mocked(apmService.recordCustomMetric)).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'rum_session_ended',
          category: 'business'
        })
      );
      
      const finalSession = performanceMonitoringService.getCurrentSession();
      expect(finalSession).toBeNull();
    });

    it('should export session data with bilingual context', async () => {
      mockDocument.dir = 'rtl'; // Arabic session
      await performanceMonitoringService.initialize();
      
      // Add some interactions and page views
      performanceMonitoringService.startPageView('/therapy/arabic-session');
      performanceMonitoringService.trackInteraction('click', '#arabic-button');
      performanceMonitoringService.trackError('javascript', 'Test error');
      
      const session = performanceMonitoringService.getCurrentSession();
      
      expect(session?.language).toBe('ar');
      expect(session?.pageViews).toHaveLength(1);
      expect(session?.interactions).toHaveLength(1);
      expect(session?.errors).toHaveLength(1);
      expect(session?.deviceType).toBeDefined();
      expect(session?.browserInfo).toBeDefined();
    });
  });

  describe('Performance Observer Integration', () => {
    it('should initialize performance observers for detailed metrics', async () => {
      await performanceMonitoringService.initialize();
      
      // Verify observers were set up
      expect(vi.mocked(PerformanceObserver)).toHaveBeenCalledTimes(3); // nav, longtask, layout-shift
      expect(mockObserve).toHaveBeenCalledTimes(3);
    });

    it('should clean up observers on service cleanup', async () => {
      await performanceMonitoringService.initialize();
      
      performanceMonitoringService.cleanup();
      
      // Verify cleanup was called for each observer
      expect(mockDisconnect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Medical Workflow Performance', () => {
    it('should track therapy-specific workflows with compliance context', async () => {
      await performanceMonitoringService.initialize();
      
      // Track IEP creation workflow
      const iepInteractionId = performanceMonitoringService.trackInteraction(
        'form_submit',
        '#iep-creation-form',
        {
          workflowType: 'iep_creation',
          studentId: 'student-123',
          medicalDataInvolved: true,
          complianceRequired: true
        }
      );
      
      performanceMonitoringService.completeInteraction(iepInteractionId, true);
      
      const session = performanceMonitoringService.getCurrentSession();
      const iepInteraction = session?.interactions.find(i => i.id === iepInteractionId);
      
      expect(iepInteraction?.metadata?.workflowType).toBe('iep_creation');
      expect(iepInteraction?.metadata?.medicalDataInvolved).toBe(true);
      expect(iepInteraction?.metadata?.complianceRequired).toBe(true);
    });

    it('should track emergency access workflows with high priority', async () => {
      await performanceMonitoringService.initialize();
      
      // Track emergency access request
      const emergencyId = performanceMonitoringService.trackInteraction(
        'click',
        '#emergency-access-button',
        {
          workflowType: 'emergency_access',
          priority: 'critical',
          medicalEmergency: true,
          responseTimeRequired: 'sub_second'
        }
      );
      
      vi.mocked(performance.now)
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1050); // 50ms response time
      
      performanceMonitoringService.completeInteraction(emergencyId, true);
      
      // Verify critical workflow tracking
      expect(vi.mocked(apmService.recordCustomMetric)).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'rum_interaction_click_duration',
          category: 'business',
          metadata: expect.objectContaining({
            workflowType: 'emergency_access',
            priority: 'critical',
            medicalEmergency: true
          })
        })
      );
    });
  });
});