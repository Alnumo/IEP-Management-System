/**
 * Sentry Configuration for APM Performance Monitoring
 * 
 * @description Configures Sentry for performance monitoring, error tracking,
 * and user experience metrics in compliance with HIPAA and PDPL requirements
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

/**
 * Initialize Sentry APM with performance monitoring
 * Ensures no sensitive medical data is logged
 */
export const initializeSentry = () => {
  // Only initialize in production or staging
  const shouldInitialize = import.meta.env.PROD || 
                          import.meta.env.VITE_ENVIRONMENT === 'staging';
  
  if (!shouldInitialize) {
    console.log('Sentry: Development mode - APM disabled');
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENVIRONMENT || 'production',
    
    // Performance Monitoring Configuration
    integrations: [
      new BrowserTracing({
        // Enable automatic route tracking for React Router
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          // Will be configured with React Router history
        ),
        
        // Custom performance monitoring
        tracingOrigins: [
          'localhost',
          /^https:\/\/[^/]*\.supabase\.co/,
          /^https:\/\/[^/]*\.netlify\.app/,
          /^https:\/\/arkan-therapy/
        ],
      }),
    ],

    // Performance monitoring sample rate (100% for comprehensive monitoring)
    tracesSampleRate: import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE 
                      ? parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) 
                      : 1.0,
    
    // Error tracking sample rate
    sampleRate: 1.0,

    // Release tracking for deployment monitoring
    release: import.meta.env.VITE_APP_VERSION || '1.3.0',

    // Privacy and Compliance Configuration
    beforeSend(event, hint) {
      // Filter out sensitive medical data from error reports
      if (event.exception) {
        event.exception.values?.forEach((exception) => {
          if (exception.stacktrace?.frames) {
            exception.stacktrace.frames.forEach((frame) => {
              // Remove potential medical data from frame contexts
              if (frame.vars) {
                Object.keys(frame.vars).forEach((key) => {
                  if (isSensitiveDataKey(key)) {
                    frame.vars![key] = '[REDACTED - MEDICAL DATA]';
                  }
                });
              }
            });
          }
        });
      }

      // Filter sensitive data from event context
      if (event.contexts?.state) {
        event.contexts.state = sanitizeStateData(event.contexts.state);
      }

      return event;
    },

    // Custom error filtering
    ignoreErrors: [
      // Common browser errors that don't affect functionality
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Network errors that are expected in mobile environments
      /^NetworkError/,
      /^Failed to fetch/,
    ],

    // Performance monitoring tags
    initialScope: {
      tags: {
        component: 'therapy-management',
        medical_grade: 'true',
        compliance: 'hipaa-pdpl'
      },
    },
  });

  // Set user context (without sensitive medical information)
  Sentry.setTag('language_mode', document.dir === 'rtl' ? 'arabic' : 'english');
};

/**
 * Check if data key contains sensitive medical information
 */
function isSensitiveDataKey(key: string): boolean {
  const sensitiveKeywords = [
    'medical', 'diagnosis', 'medication', 'allergy', 'therapy_notes',
    'clinical', 'patient', 'iep', 'assessment', 'emergency_contact',
    'phone', 'email', 'address', 'ssn', 'id_number'
  ];
  
  return sensitiveKeywords.some(keyword => 
    key.toLowerCase().includes(keyword)
  );
}

/**
 * Sanitize state data to remove sensitive information
 */
function sanitizeStateData(state: any): any {
  if (typeof state !== 'object' || state === null) {
    return state;
  }

  const sanitized = { ...state };
  
  Object.keys(sanitized).forEach(key => {
    if (isSensitiveDataKey(key)) {
      sanitized[key] = '[REDACTED - SENSITIVE DATA]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeStateData(sanitized[key]);
    }
  });

  return sanitized;
}

/**
 * Custom transaction naming for better performance insights
 */
export const setPerformanceTransaction = (name: string, operation: string = 'navigation') => {
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
  if (transaction) {
    transaction.setName(name);
    transaction.setTag('operation_type', operation);
  }
};

/**
 * Track custom performance metrics
 */
export const trackCustomMetric = (metricName: string, value: number, unit: string = 'ms') => {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `${metricName}: ${value}${unit}`,
    level: 'info',
    data: {
      metric: metricName,
      value,
      unit,
      timestamp: Date.now()
    }
  });
};

/**
 * Track business-critical operations performance
 */
export const trackBusinessMetric = (operation: string, duration: number, success: boolean) => {
  Sentry.addBreadcrumb({
    category: 'business_metrics',
    message: `${operation}: ${duration}ms ${success ? 'SUCCESS' : 'FAILED'}`,
    level: success ? 'info' : 'warning',
    data: {
      operation,
      duration,
      success,
      timestamp: Date.now()
    }
  });
};