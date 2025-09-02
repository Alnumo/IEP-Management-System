/**
 * APM Service - Core Application Performance Monitoring
 * 
 * @description Provides comprehensive performance monitoring for the therapy management system
 * Integrates with Sentry APM and provides custom metrics collection for medical-grade operations
 */

import * as Sentry from '@sentry/react';
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';
import { supabase } from '@/lib/supabase';
import { trackCustomMetric, trackBusinessMetric } from '@/lib/sentry-config';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'web_vitals' | 'custom' | 'business' | 'database' | 'api';
  metadata?: Record<string, any>;
}

export interface DatabasePerformanceData {
  queryTime: number;
  queryType: string;
  tableName?: string;
  rowsAffected?: number;
  cached: boolean;
}

export interface APIPerformanceData {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
}

class APMService {
  private metrics: PerformanceMetric[] = [];
  private isInitialized = false;
  private performanceObserver?: PerformanceObserver;

  /**
   * Initialize APM service with Web Vitals tracking
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Core Web Vitals tracking
      this.initializeWebVitals();
      
      // Set up custom performance observers
      this.initializePerformanceObservers();
      
      // Initialize database performance monitoring
      this.initializeDatabaseMonitoring();
      
      // Set up API performance tracking
      this.initializeAPIMonitoring();

      this.isInitialized = true;
      
      this.recordCustomMetric({
        name: 'apm_service_initialized',
        value: Date.now(),
        unit: 'timestamp',
        category: 'custom',
        metadata: { version: '1.3.0', medical_grade: true }
      });

      console.log('APM Service: Performance monitoring initialized');
    } catch (error) {
      console.error('APM Service: Failed to initialize', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Initialize Web Vitals tracking for user experience metrics
   */
  private initializeWebVitals(): void {
    // Cumulative Layout Shift
    getCLS((metric) => {
      this.recordCustomMetric({
        name: 'cumulative_layout_shift',
        value: metric.value,
        unit: 'score',
        category: 'web_vitals',
        metadata: {
          rating: metric.rating,
          entries: metric.entries?.length || 0
        }
      });
    });

    // First Contentful Paint
    getFCP((metric) => {
      this.recordCustomMetric({
        name: 'first_contentful_paint',
        value: metric.value,
        unit: 'ms',
        category: 'web_vitals',
        metadata: {
          rating: metric.rating,
          navigationId: metric.navigationType
        }
      });
    });

    // First Input Delay
    getFID((metric) => {
      this.recordCustomMetric({
        name: 'first_input_delay',
        value: metric.value,
        unit: 'ms',
        category: 'web_vitals',
        metadata: {
          rating: metric.rating,
          eventType: metric.entries?.[0]?.name
        }
      });
    });

    // Largest Contentful Paint
    getLCP((metric) => {
      this.recordCustomMetric({
        name: 'largest_contentful_paint',
        value: metric.value,
        unit: 'ms',
        category: 'web_vitals',
        metadata: {
          rating: metric.rating,
          element: metric.entries?.[0]?.element?.tagName
        }
      });
    });

    // Time to First Byte
    getTTFB((metric) => {
      this.recordCustomMetric({
        name: 'time_to_first_byte',
        value: metric.value,
        unit: 'ms',
        category: 'web_vitals',
        metadata: {
          rating: metric.rating,
          navigationId: metric.navigationType
        }
      });
    });
  }

  /**
   * Initialize custom performance observers for detailed monitoring
   */
  private initializePerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('APM Service: PerformanceObserver not supported');
      return;
    }

    // Observer for navigation timing
    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          
          // Track page load time
          const loadTime = navEntry.loadEventEnd - navEntry.navigationStart;
          this.recordCustomMetric({
            name: 'page_load_time',
            value: loadTime,
            unit: 'ms',
            category: 'custom',
            metadata: {
              url: window.location.pathname,
              type: navEntry.type,
              redirectCount: navEntry.redirectCount
            }
          });

          // Check if load time exceeds threshold (2 seconds)
          if (loadTime > 2000) {
            this.recordPerformanceAlert('page_load_time_exceeded', {
              loadTime,
              threshold: 2000,
              url: window.location.pathname
            });
          }
        }
      }
    });

    this.performanceObserver.observe({ 
      entryTypes: ['navigation', 'resource', 'measure'] 
    });
  }

  /**
   * Initialize database performance monitoring
   */
  private initializeDatabaseMonitoring(): void {
    // Wrap Supabase client to track query performance
    const originalFrom = supabase.from.bind(supabase);
    
    supabase.from = (table: string) => {
      const queryStartTime = performance.now();
      const originalQuery = originalFrom(table);
      
      // Wrap common query methods
      const wrapQueryMethod = (method: any, methodName: string) => {
        return async (...args: any[]) => {
          const queryStart = performance.now();
          try {
            const result = await method.apply(originalQuery, args);
            const queryTime = performance.now() - queryStart;
            
            this.recordDatabasePerformance({
              queryTime,
              queryType: methodName,
              tableName: table,
              rowsAffected: result.data?.length,
              cached: false // Supabase doesn't provide cache info directly
            });

            // Alert if query exceeds 50ms threshold
            if (queryTime > 50) {
              this.recordPerformanceAlert('slow_database_query', {
                table,
                queryType: methodName,
                queryTime,
                threshold: 50
              });
            }

            return result;
          } catch (error) {
            const queryTime = performance.now() - queryStart;
            this.recordDatabasePerformance({
              queryTime,
              queryType: methodName,
              tableName: table,
              cached: false
            });
            
            throw error;
          }
        };
      };

      // Wrap select, insert, update, delete methods
      originalQuery.select = wrapQueryMethod(originalQuery.select.bind(originalQuery), 'select');
      originalQuery.insert = wrapQueryMethod(originalQuery.insert.bind(originalQuery), 'insert');
      originalQuery.update = wrapQueryMethod(originalQuery.update.bind(originalQuery), 'update');
      originalQuery.delete = wrapQueryMethod(originalQuery.delete.bind(originalQuery), 'delete');

      return originalQuery;
    };
  }

  /**
   * Initialize API performance monitoring
   */
  private initializeAPIMonitoring(): void {
    // Intercept fetch requests for API monitoring
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      
      try {
        const response = await originalFetch(input, init);
        const responseTime = performance.now() - startTime;
        
        this.recordAPIPerformance({
          endpoint: url,
          method,
          responseTime,
          statusCode: response.status,
          success: response.ok
        });

        // Alert if API response time exceeds 500ms threshold
        if (responseTime > 500) {
          this.recordPerformanceAlert('slow_api_response', {
            endpoint: url,
            method,
            responseTime,
            threshold: 500,
            statusCode: response.status
          });
        }

        return response;
      } catch (error) {
        const responseTime = performance.now() - startTime;
        
        this.recordAPIPerformance({
          endpoint: url,
          method,
          responseTime,
          statusCode: 0,
          success: false
        });
        
        throw error;
      }
    };
  }

  /**
   * Record custom performance metric
   */
  recordCustomMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const performanceMetric: PerformanceMetric = {
      ...metric,
      id: `${metric.category}_${metric.name}_${Date.now()}`,
      timestamp: Date.now()
    };

    this.metrics.push(performanceMetric);
    
    // Send to Sentry
    trackCustomMetric(metric.name, metric.value, metric.unit);
    
    // Keep only last 100 metrics in memory
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Record database performance data
   */
  recordDatabasePerformance(data: DatabasePerformanceData): void {
    this.recordCustomMetric({
      name: `db_query_${data.queryType}`,
      value: data.queryTime,
      unit: 'ms',
      category: 'database',
      metadata: {
        table: data.tableName,
        rowsAffected: data.rowsAffected,
        cached: data.cached
      }
    });

    // Alert if query exceeds 50ms threshold
    if (data.queryTime > 50) {
      this.recordPerformanceAlert('slow_database_query', {
        table: data.tableName,
        queryType: data.queryType,
        queryTime: data.queryTime,
        threshold: 50
      });
    }

    // Track business metric
    trackBusinessMetric(
      `database_${data.queryType}`,
      data.queryTime,
      data.queryTime < 50
    );
  }

  /**
   * Record API performance data
   */
  recordAPIPerformance(data: APIPerformanceData): void {
    this.recordCustomMetric({
      name: `api_${data.method.toLowerCase()}`,
      value: data.responseTime,
      unit: 'ms',
      category: 'api',
      metadata: {
        endpoint: data.endpoint,
        statusCode: data.statusCode,
        success: data.success
      }
    });

    // Alert if API response time exceeds 500ms threshold
    if (data.responseTime > 500) {
      this.recordPerformanceAlert('slow_api_response', {
        endpoint: data.endpoint,
        method: data.method,
        responseTime: data.responseTime,
        threshold: 500,
        statusCode: data.statusCode
      });
    }

    // Track business metric
    trackBusinessMetric(
      `api_${data.method.toLowerCase()}`,
      data.responseTime,
      data.success && data.responseTime < 500
    );
  }

  /**
   * Record performance alert
   */
  recordPerformanceAlert(alertType: string, data: Record<string, any>): void {
    Sentry.addBreadcrumb({
      category: 'performance_alert',
      message: `Performance threshold exceeded: ${alertType}`,
      level: 'warning',
      data: {
        alertType,
        ...data,
        timestamp: Date.now()
      }
    });

    console.warn(`Performance Alert: ${alertType}`, data);
  }

  /**
   * Track critical user workflows
   */
  trackUserWorkflow(workflowName: string, startTime: number): void {
    const duration = performance.now() - startTime;
    
    this.recordCustomMetric({
      name: `workflow_${workflowName}`,
      value: duration,
      unit: 'ms',
      category: 'business',
      metadata: {
        workflow: workflowName,
        language: document.dir === 'rtl' ? 'arabic' : 'english'
      }
    });
  }

  /**
   * Get current performance metrics
   */
  getMetrics(category?: PerformanceMetric['category']): PerformanceMetric[] {
    if (category) {
      return this.metrics.filter(metric => metric.category === category);
    }
    return [...this.metrics];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    webVitals: Record<string, number>;
    averageLoadTime: number;
    slowQueriesCount: number;
    slowAPICallsCount: number;
  } {
    const webVitals = this.metrics
      .filter(m => m.category === 'web_vitals')
      .reduce((acc, m) => {
        acc[m.name] = m.value;
        return acc;
      }, {} as Record<string, number>);

    const loadTimes = this.metrics
      .filter(m => m.name === 'page_load_time')
      .map(m => m.value);
    
    const averageLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length 
      : 0;

    const slowQueriesCount = this.metrics
      .filter(m => m.category === 'database' && m.value > 50).length;

    const slowAPICallsCount = this.metrics
      .filter(m => m.category === 'api' && m.value > 500).length;

    return {
      webVitals,
      averageLoadTime,
      slowQueriesCount,
      slowAPICallsCount
    };
  }

  /**
   * Clean up performance monitoring
   */
  cleanup(): void {
    if (this.performanceObserver && typeof this.performanceObserver.disconnect === 'function') {
      this.performanceObserver.disconnect();
    }
    this.performanceObserver = undefined;
    this.metrics = [];
    this.isInitialized = false;
  }
}

// Export singleton instance
export const apmService = new APMService();

// Auto-initialize APM service (but not during tests)
if (typeof window !== 'undefined' && !import.meta.env.VITEST) {
  apmService.initialize().catch(console.error);
}