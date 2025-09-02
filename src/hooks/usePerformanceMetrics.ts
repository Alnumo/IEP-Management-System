/**
 * Performance Metrics Hook
 * 
 * @description Custom React hook for managing performance metrics collection
 * Provides real-time performance monitoring and Web Vitals tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apmService, PerformanceMetric } from '@/services/apm-service';
import { supabase } from '@/lib/supabase';

export interface PerformanceMetricsState {
  webVitals: {
    cls: number | null; // Cumulative Layout Shift
    fcp: number | null; // First Contentful Paint
    fid: number | null; // First Input Delay
    lcp: number | null; // Largest Contentful Paint
    ttfb: number | null; // Time to First Byte
  };
  customMetrics: PerformanceMetric[];
  summary: {
    averageLoadTime: number;
    slowQueriesCount: number;
    slowAPICallsCount: number;
  };
  isLoading: boolean;
  error: string | null;
}

export interface PerformanceThresholds {
  pageLoadTime: number;
  apiResponseTime: number;
  databaseQueryTime: number;
  webVitalsLCP: number;
  webVitalsFID: number;
  webVitalsCLS: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  pageLoadTime: 2000, // 2 seconds
  apiResponseTime: 500, // 500ms
  databaseQueryTime: 50, // 50ms
  webVitalsLCP: 2500, // 2.5 seconds (good)
  webVitalsFID: 100, // 100ms (good)
  webVitalsCLS: 0.1, // 0.1 (good)
};

export const usePerformanceMetrics = () => {
  const [state, setState] = useState<PerformanceMetricsState>({
    webVitals: {
      cls: null,
      fcp: null,
      fid: null,
      lcp: null,
      ttfb: null,
    },
    customMetrics: [],
    summary: {
      averageLoadTime: 0,
      slowQueriesCount: 0,
      slowAPICallsCount: 0,
    },
    isLoading: true,
    error: null,
  });

  const queryClient = useQueryClient();
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);

  // Initialize performance monitoring
  useEffect(() => {
    const initializePerformanceMonitoring = async () => {
      try {
        await apmService.initialize();
        setState(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        console.error('Failed to initialize performance monitoring:', error);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'Failed to initialize performance monitoring' 
        }));
      }
    };

    initializePerformanceMonitoring();

    return () => {
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
      }
    };
  }, []);

  // Real-time metrics update
  useEffect(() => {
    const updateMetrics = () => {
      const summary = apmService.getPerformanceSummary();
      const allMetrics = apmService.getMetrics();
      const webVitalsMetrics = apmService.getMetrics('web_vitals');

      // Extract Web Vitals
      const webVitals = {
        cls: webVitalsMetrics.find(m => m.name === 'cumulative_layout_shift')?.value || null,
        fcp: webVitalsMetrics.find(m => m.name === 'first_contentful_paint')?.value || null,
        fid: webVitalsMetrics.find(m => m.name === 'first_input_delay')?.value || null,
        lcp: webVitalsMetrics.find(m => m.name === 'largest_contentful_paint')?.value || null,
        ttfb: webVitalsMetrics.find(m => m.name === 'time_to_first_byte')?.value || null,
      };

      setState(prev => ({
        ...prev,
        webVitals,
        customMetrics: allMetrics,
        summary,
      }));
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    
    // Initial update
    updateMetrics();

    return () => clearInterval(interval);
  }, []);

  // Track page performance metrics
  const trackPagePerformance = useCallback((pageName: string) => {
    const startTime = performance.now();
    
    return {
      end: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        apmService.recordCustomMetric({
          name: `page_${pageName}_render_time`,
          value: duration,
          unit: 'ms',
          category: 'custom',
          metadata: {
            page: pageName,
            language: document.dir === 'rtl' ? 'arabic' : 'english',
            timestamp: Date.now(),
          },
        });

        return duration;
      },
    };
  }, []);

  // Track user interactions
  const trackUserInteraction = useCallback((
    interactionType: string, 
    elementType?: string,
    metadata?: Record<string, any>
  ) => {
    const startTime = performance.now();
    
    return {
      end: (success: boolean = true) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        apmService.recordCustomMetric({
          name: `interaction_${interactionType}`,
          value: duration,
          unit: 'ms',
          category: 'business',
          metadata: {
            interactionType,
            elementType,
            success,
            language: document.dir === 'rtl' ? 'arabic' : 'english',
            ...metadata,
          },
        });

        return duration;
      },
    };
  }, []);

  // Track form submissions
  const trackFormSubmission = useCallback((
    formName: string,
    formData?: Record<string, any>
  ) => {
    const startTime = performance.now();
    
    return {
      end: (success: boolean, errorMessage?: string) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        apmService.recordCustomMetric({
          name: `form_${formName}_submission`,
          value: duration,
          unit: 'ms',
          category: 'business',
          metadata: {
            formName,
            success,
            errorMessage,
            fieldCount: formData ? Object.keys(formData).length : 0,
            language: document.dir === 'rtl' ? 'arabic' : 'english',
          },
        });

        // Track critical therapy workflows
        if (formName.includes('therapy') || formName.includes('iep') || formName.includes('session')) {
          apmService.trackUserWorkflow(formName, startTime);
        }

        return duration;
      },
    };
  }, []);

  // Get performance statistics from database
  const { 
    data: databaseStats, 
    isLoading: isLoadingStats,
    refetch: refetchStats 
  } = useQuery({
    queryKey: ['performance-statistics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_performance_statistics', {
        p_time_range_hours: 24
      });

      if (error) throw error;
      return data?.[0] || null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Check performance against thresholds
  const getPerformanceRating = useCallback((
    metricName: keyof PerformanceThresholds,
    value: number,
    thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS
  ): 'excellent' | 'good' | 'fair' | 'poor' => {
    const threshold = thresholds[metricName];
    
    switch (metricName) {
      case 'webVitalsCLS':
        if (value <= 0.1) return 'excellent';
        if (value <= 0.25) return 'good';
        if (value <= 0.5) return 'fair';
        return 'poor';
      
      case 'webVitalsLCP':
        if (value <= 2500) return 'excellent';
        if (value <= 4000) return 'good';
        if (value <= 6000) return 'fair';
        return 'poor';
      
      case 'webVitalsFID':
        if (value <= 100) return 'excellent';
        if (value <= 300) return 'good';
        if (value <= 500) return 'fair';
        return 'poor';
      
      default:
        // For other metrics, lower is better
        const ratio = value / threshold;
        if (ratio <= 0.5) return 'excellent';
        if (ratio <= 1.0) return 'good';
        if (ratio <= 2.0) return 'fair';
        return 'poor';
    }
  }, []);

  // Get recent performance alerts
  const { data: recentAlerts } = useQuery({
    queryKey: ['performance-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  // Manual refresh of all performance data
  const refreshMetrics = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['performance-statistics'] }),
      queryClient.invalidateQueries({ queryKey: ['performance-alerts'] }),
    ]);
  }, [queryClient]);

  // Export performance data for reporting
  const exportPerformanceData = useCallback(async (
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ) => {
    const hoursMap = {
      '1h': 1,
      '24h': 24,
      '7d': 168,
      '30d': 720,
    };

    try {
      const { data, error } = await supabase.rpc('get_performance_statistics', {
        p_time_range_hours: hoursMap[timeRange]
      });

      if (error) throw error;

      // Combine with current metrics
      const currentMetrics = apmService.getMetrics();
      const webVitals = state.webVitals;

      return {
        timeRange,
        timestamp: new Date().toISOString(),
        databaseStats: data?.[0] || null,
        webVitals,
        customMetrics: currentMetrics,
        alerts: recentAlerts || [],
      };
    } catch (error) {
      console.error('Failed to export performance data:', error);
      throw error;
    }
  }, [state.webVitals, recentAlerts]);

  return {
    // State
    ...state,
    databaseStats,
    recentAlerts,
    isLoadingStats,

    // Actions
    trackPagePerformance,
    trackUserInteraction,
    trackFormSubmission,
    refreshMetrics,
    exportPerformanceData,
    
    // Utils
    getPerformanceRating,
    
    // Constants
    thresholds: DEFAULT_THRESHOLDS,
  };
};

export default usePerformanceMetrics;