/**
 * Performance Monitoring Service
 * 
 * @description Advanced performance monitoring service for real user monitoring (RUM)
 * Provides comprehensive user experience tracking and performance analytics
 */

import { apmService } from './apm-service';
import { supabase } from '@/lib/supabase';

export interface RUMSession {
  sessionId: string;
  userId?: string;
  userRole?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browserInfo: {
    name: string;
    version: string;
    engine: string;
  };
  screenResolution: {
    width: number;
    height: number;
  };
  language: 'ar' | 'en';
  connectionType?: string;
  startTime: number;
  endTime?: number;
  pageViews: RUMPageView[];
  interactions: RUMInteraction[];
  errors: RUMError[];
  performanceMetrics: RUMPerformanceMetric[];
}

export interface RUMPageView {
  id: string;
  url: string;
  title: string;
  startTime: number;
  endTime?: number;
  loadTime?: number;
  renderTime?: number;
  timeToInteractive?: number;
  scrollDepth: number;
  exitType?: 'navigation' | 'close' | 'refresh' | 'unload';
}

export interface RUMInteraction {
  id: string;
  type: 'click' | 'scroll' | 'keyboard' | 'form_submit' | 'form_focus' | 'drag' | 'touch';
  target: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface RUMError {
  id: string;
  type: 'javascript' | 'network' | 'resource' | 'csp' | 'unhandled_rejection';
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export interface RUMPerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'navigation' | 'resource' | 'user_timing' | 'web_vitals';
  metadata?: Record<string, any>;
}

class PerformanceMonitoringService {
  private currentSession: RUMSession | null = null;
  private currentPageView: RUMPageView | null = null;
  private isInitialized = false;
  private observers: Map<string, any> = new Map();
  private scrollTimeout?: number;
  private lastScrollDepth = 0;

  /**
   * Initialize Real User Monitoring
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create new RUM session
      this.currentSession = this.createRUMSession();
      
      // Set up performance observers
      this.initializePerformanceObservers();
      
      // Set up interaction tracking
      this.initializeInteractionTracking();
      
      // Set up error tracking
      this.initializeErrorTracking();
      
      // Set up page visibility tracking
      this.initializeVisibilityTracking();
      
      // Set up network information tracking
      this.initializeNetworkTracking();

      this.isInitialized = true;

      // Log session start
      apmService.recordCustomMetric({
        name: 'rum_session_started',
        value: Date.now(),
        unit: 'timestamp',
        category: 'custom',
        metadata: {
          sessionId: this.currentSession.sessionId,
          deviceType: this.currentSession.deviceType,
          language: this.currentSession.language,
        }
      });

      console.log('RUM: Real User Monitoring initialized');
    } catch (error) {
      console.error('RUM: Failed to initialize', error);
      throw error;
    }
  }

  /**
   * Create new RUM session
   */
  private createRUMSession(): RUMSession {
    const sessionId = `rum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      sessionId,
      deviceType: this.detectDeviceType(),
      browserInfo: this.getBrowserInfo(),
      screenResolution: {
        width: window.screen.width,
        height: window.screen.height,
      },
      language: document.dir === 'rtl' ? 'ar' : 'en',
      connectionType: this.getConnectionType(),
      startTime: Date.now(),
      pageViews: [],
      interactions: [],
      errors: [],
      performanceMetrics: [],
    };
  }

  /**
   * Start tracking a new page view
   */
  startPageView(url?: string): string {
    const pageViewId = `pv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // End previous page view
    if (this.currentPageView) {
      this.endPageView();
    }

    this.currentPageView = {
      id: pageViewId,
      url: url || window.location.href,
      title: document.title,
      startTime: performance.now(),
      scrollDepth: 0,
    };

    // Track page load performance
    this.trackPageLoadPerformance();

    // Start scroll depth tracking
    this.startScrollDepthTracking();

    if (this.currentSession) {
      this.currentSession.pageViews.push(this.currentPageView);
    }

    return pageViewId;
  }

  /**
   * End current page view
   */
  endPageView(exitType?: RUMPageView['exitType']): void {
    if (!this.currentPageView) return;

    this.currentPageView.endTime = performance.now();
    this.currentPageView.exitType = exitType;

    // Record page view metric
    const duration = this.currentPageView.endTime - this.currentPageView.startTime;
    
    apmService.recordCustomMetric({
      name: 'rum_page_view_duration',
      value: duration,
      unit: 'ms',
      category: 'business',
      metadata: {
        url: this.currentPageView.url,
        title: this.currentPageView.title,
        scrollDepth: this.currentPageView.scrollDepth,
        exitType,
        sessionId: this.currentSession?.sessionId,
      }
    });

    this.currentPageView = null;
  }

  /**
   * Track user interaction
   */
  trackInteraction(
    type: RUMInteraction['type'],
    target: string,
    metadata?: Record<string, any>
  ): string {
    const interactionId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    const interaction: RUMInteraction = {
      id: interactionId,
      type,
      target,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        sessionId: this.currentSession?.sessionId,
        pageViewId: this.currentPageView?.id,
        language: this.currentSession?.language,
      }
    };

    if (this.currentSession) {
      this.currentSession.interactions.push(interaction);
    }

    // Record interaction metric
    apmService.recordCustomMetric({
      name: `rum_interaction_${type}`,
      value: startTime,
      unit: 'timestamp',
      category: 'business',
      metadata: interaction.metadata,
    });

    return interactionId;
  }

  /**
   * Complete interaction tracking with duration
   */
  completeInteraction(interactionId: string, success: boolean = true): void {
    if (!this.currentSession) return;

    const interaction = this.currentSession.interactions.find(i => i.id === interactionId);
    if (!interaction) return;

    const endTime = performance.now();
    interaction.duration = endTime - (interaction.timestamp - performance.timeOrigin);

    // Record interaction completion
    apmService.recordCustomMetric({
      name: `rum_interaction_${interaction.type}_duration`,
      value: interaction.duration,
      unit: 'ms',
      category: 'business',
      metadata: {
        ...interaction.metadata,
        success,
        interactionId,
      }
    });
  }

  /**
   * Track error occurrence
   */
  trackError(
    type: RUMError['type'],
    message: string,
    details?: Partial<Omit<RUMError, 'id' | 'type' | 'message' | 'timestamp'>>
  ): string {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const error: RUMError = {
      id: errorId,
      type,
      message,
      timestamp: Date.now(),
      severity: details?.severity || 'medium',
      ...details,
      context: {
        ...details?.context,
        sessionId: this.currentSession?.sessionId,
        pageViewId: this.currentPageView?.id,
        url: this.currentPageView?.url,
        language: this.currentSession?.language,
      }
    };

    if (this.currentSession) {
      this.currentSession.errors.push(error);
    }

    // Record error metric
    apmService.recordCustomMetric({
      name: `rum_error_${type}`,
      value: Date.now(),
      unit: 'timestamp',
      category: 'custom',
      metadata: error.context,
    });

    return errorId;
  }

  /**
   * Initialize performance observers for detailed metrics
   */
  private initializePerformanceObservers(): void {
    // Navigation timing observer
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.processNavigationTiming(entry as PerformanceNavigationTiming);
            } else if (entry.entryType === 'resource') {
              this.processResourceTiming(entry as PerformanceResourceTiming);
            }
          }
        });

        navObserver.observe({ entryTypes: ['navigation', 'resource'] });
        this.observers.set('navigation', navObserver);

        // Long task observer
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processLongTask(entry);
          }
        });

        try {
          longTaskObserver.observe({ entryTypes: ['longtask'] });
          this.observers.set('longtask', longTaskObserver);
        } catch (e) {
          console.warn('RUM: Long task observer not supported');
        }

        // Layout shift observer
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processLayoutShift(entry);
          }
        });

        try {
          layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
          this.observers.set('layout-shift', layoutShiftObserver);
        } catch (e) {
          console.warn('RUM: Layout shift observer not supported');
        }
      } catch (error) {
        console.warn('RUM: Some performance observers not supported', error);
      }
    }
  }

  /**
   * Initialize interaction tracking
   */
  private initializeInteractionTracking(): void {
    // Click tracking
    document.addEventListener('click', (event) => {
      const target = this.getElementSelector(event.target as Element);
      this.trackInteraction('click', target, {
        x: event.clientX,
        y: event.clientY,
        button: event.button,
      });
    }, { passive: true });

    // Form interaction tracking
    document.addEventListener('submit', (event) => {
      const target = this.getElementSelector(event.target as Element);
      const interactionId = this.trackInteraction('form_submit', target, {
        formName: (event.target as HTMLFormElement).name,
        action: (event.target as HTMLFormElement).action,
      });

      // Track form submission timing
      setTimeout(() => {
        this.completeInteraction(interactionId, true);
      }, 100);
    }, { passive: true });

    document.addEventListener('focusin', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        const target = this.getElementSelector(event.target as Element);
        this.trackInteraction('form_focus', target, {
          inputType: (event.target as HTMLInputElement).type,
          fieldName: (event.target as HTMLInputElement).name,
        });
      }
    }, { passive: true });

    // Keyboard interaction tracking for accessibility
    document.addEventListener('keydown', (event) => {
      if (['Tab', 'Enter', 'Space', 'Escape'].includes(event.key)) {
        const target = this.getElementSelector(event.target as Element);
        this.trackInteraction('keyboard', target, {
          key: event.key,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
        });
      }
    }, { passive: true });
  }

  /**
   * Initialize error tracking
   */
  private initializeErrorTracking(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError('javascript', event.message, {
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        severity: 'high',
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('unhandled_rejection', event.reason?.message || 'Unhandled promise rejection', {
        stack: event.reason?.stack,
        severity: 'high',
        context: { reason: event.reason },
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window && event.target instanceof Element) {
        const element = event.target;
        this.trackError('resource', `Failed to load ${element.tagName}: ${element.getAttribute('src') || element.getAttribute('href')}`, {
          url: element.getAttribute('src') || element.getAttribute('href') || '',
          severity: element.tagName === 'IMG' ? 'low' : 'medium',
          context: { tagName: element.tagName },
        });
      }
    }, true);
  }

  /**
   * Initialize page visibility tracking
   */
  private initializeVisibilityTracking(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.endPageView('unload');
      } else {
        this.startPageView();
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.endPageView('unload');
      this.endSession();
    });

    // Track back/forward navigation
    window.addEventListener('popstate', () => {
      this.endPageView('navigation');
      this.startPageView();
    });
  }

  /**
   * Initialize network information tracking
   */
  private initializeNetworkTracking(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (this.currentSession && connection) {
        this.currentSession.connectionType = connection.effectiveType;
      }
    }
  }

  /**
   * Track page load performance
   */
  private trackPageLoadPerformance(): void {
    if (!this.currentPageView) return;

    // Use Navigation Timing API
    setTimeout(() => {
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navTiming) {
        this.currentPageView!.loadTime = navTiming.loadEventEnd - navTiming.navigationStart;
        this.currentPageView!.renderTime = navTiming.domContentLoadedEventEnd - navTiming.navigationStart;
        this.currentPageView!.timeToInteractive = navTiming.domInteractive - navTiming.navigationStart;
      }
    }, 0);
  }

  /**
   * Start scroll depth tracking
   */
  private startScrollDepthTracking(): void {
    const trackScrollDepth = () => {
      if (!this.currentPageView) return;

      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollDepth = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 100;

      if (scrollDepth > this.lastScrollDepth) {
        this.lastScrollDepth = scrollDepth;
        this.currentPageView.scrollDepth = scrollDepth;

        // Track milestone scroll depths
        if ([25, 50, 75, 90, 100].includes(scrollDepth)) {
          apmService.recordCustomMetric({
            name: `rum_scroll_depth_${scrollDepth}`,
            value: Date.now(),
            unit: 'timestamp',
            category: 'business',
            metadata: {
              scrollDepth,
              url: this.currentPageView.url,
              sessionId: this.currentSession?.sessionId,
            }
          });
        }
      }
    };

    const debouncedTrackScrollDepth = () => {
      if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(trackScrollDepth, 100);
    };

    window.addEventListener('scroll', debouncedTrackScrollDepth, { passive: true });
  }

  /**
   * Process navigation timing data
   */
  private processNavigationTiming(entry: PerformanceNavigationTiming): void {
    const metrics = [
      { name: 'dns_lookup_time', value: entry.domainLookupEnd - entry.domainLookupStart },
      { name: 'tcp_connect_time', value: entry.connectEnd - entry.connectStart },
      { name: 'ssl_time', value: entry.connectEnd - entry.secureConnectionStart },
      { name: 'request_time', value: entry.responseStart - entry.requestStart },
      { name: 'response_time', value: entry.responseEnd - entry.responseStart },
      { name: 'dom_processing_time', value: entry.domComplete - entry.domLoading },
      { name: 'load_event_time', value: entry.loadEventEnd - entry.loadEventStart },
    ];

    metrics.forEach(metric => {
      if (metric.value >= 0) {
        this.addPerformanceMetric(metric.name, metric.value, 'ms', 'navigation');
      }
    });
  }

  /**
   * Process resource timing data
   */
  private processResourceTiming(entry: PerformanceResourceTiming): void {
    // Track slow resources
    const duration = entry.responseEnd - entry.startTime;
    if (duration > 1000) { // Resources taking more than 1 second
      this.addPerformanceMetric(
        `slow_resource_${entry.initiatorType}`,
        duration,
        'ms',
        'resource',
        { name: entry.name, type: entry.initiatorType }
      );
    }
  }

  /**
   * Process long task data
   */
  private processLongTask(entry: any): void {
    this.addPerformanceMetric(
      'long_task_duration',
      entry.duration,
      'ms',
      'user_timing',
      { startTime: entry.startTime }
    );
  }

  /**
   * Process layout shift data
   */
  private processLayoutShift(entry: any): void {
    this.addPerformanceMetric(
      'layout_shift_score',
      entry.value,
      'score',
      'web_vitals',
      { hadRecentInput: entry.hadRecentInput }
    );
  }

  /**
   * Add performance metric to current session
   */
  private addPerformanceMetric(
    name: string,
    value: number,
    unit: string,
    category: RUMPerformanceMetric['category'],
    metadata?: Record<string, any>
  ): void {
    const metric: RUMPerformanceMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      value,
      unit,
      timestamp: Date.now(),
      category,
      metadata: {
        ...metadata,
        sessionId: this.currentSession?.sessionId,
        pageViewId: this.currentPageView?.id,
      }
    };

    if (this.currentSession) {
      this.currentSession.performanceMetrics.push(metric);
    }

    // Also record in APM service
    apmService.recordCustomMetric({
      name: `rum_${name}`,
      value,
      unit,
      category: 'custom',
      metadata: metric.metadata,
    });
  }

  /**
   * Get element selector for tracking
   */
  private getElementSelector(element: Element): string {
    if (!element) return 'unknown';

    if (element.id) return `#${element.id}`;
    if (element.className && typeof element.className === 'string') {
      return `.${element.className.split(' ')[0]}`;
    }
    
    return element.tagName.toLowerCase();
  }

  /**
   * Detect device type
   */
  private detectDeviceType(): RUMSession['deviceType'] {
    const width = window.screen.width;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Get browser information
   */
  private getBrowserInfo(): RUMSession['browserInfo'] {
    const userAgent = navigator.userAgent;
    
    // Simple browser detection
    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';

    if (userAgent.includes('Chrome')) {
      name = 'Chrome';
      engine = 'Blink';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      engine = 'Gecko';
    } else if (userAgent.includes('Safari')) {
      name = 'Safari';
      engine = 'WebKit';
    } else if (userAgent.includes('Edge')) {
      name = 'Edge';
      engine = 'Blink';
    }

    return { name, version, engine };
  }

  /**
   * Get connection type
   */
  private getConnectionType(): string | undefined {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || connection?.type;
    }
    return undefined;
  }

  /**
   * End current session
   */
  endSession(): void {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();

    // End current page view
    this.endPageView('close');

    // Record session summary
    const sessionDuration = this.currentSession.endTime - this.currentSession.startTime;
    
    apmService.recordCustomMetric({
      name: 'rum_session_ended',
      value: sessionDuration,
      unit: 'ms',
      category: 'business',
      metadata: {
        sessionId: this.currentSession.sessionId,
        pageViewsCount: this.currentSession.pageViews.length,
        interactionsCount: this.currentSession.interactions.length,
        errorsCount: this.currentSession.errors.length,
        deviceType: this.currentSession.deviceType,
        language: this.currentSession.language,
      }
    });

    this.currentSession = null;
  }

  /**
   * Get current session data
   */
  getCurrentSession(): RUMSession | null {
    return this.currentSession;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.endSession();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceMonitoringService.initialize().catch(console.error);
    });
  } else {
    performanceMonitoringService.initialize().catch(console.error);
  }
}