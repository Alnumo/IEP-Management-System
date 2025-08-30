/**
 * Error monitoring and logging service
 * Centralized error tracking with support for different monitoring providers
 */

export interface ErrorContext {
  userId?: string
  userEmail?: string
  page?: string
  component?: string
  action?: string
  metadata?: Record<string, any>
}

export interface ErrorReport {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info'
  message: string
  stack?: string
  error?: {
    name: string
    message: string
    stack?: string
  }
  context: ErrorContext
  environment: {
    url: string
    userAgent: string
    language: string
    viewport: string
    online: boolean
  }
  performance?: {
    memory?: any
    timing?: any
  }
}

export type MonitoringProvider = 'console' | 'sentry' | 'logrocket' | 'custom'

class ErrorMonitoringService {
  private providers: Set<MonitoringProvider> = new Set(['console'])
  private context: ErrorContext = {}
  private enabled = true
  private errorBuffer: ErrorReport[] = []
  private maxBufferSize = 100

  constructor() {
    this.initializeProviders()
    this.setupGlobalHandlers()
  }

  /**
   * Initialize monitoring providers based on environment
   */
  private initializeProviders() {
    // In development, use console logging
    if (process.env.NODE_ENV === 'development') {
      this.providers.add('console')
    }

    // In production, you would initialize Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // TODO: Initialize production monitoring services
      // if (process.env.REACT_APP_SENTRY_DSN) {
      //   this.initializeSentry()
      // }
      // if (process.env.REACT_APP_LOGROCKET_APP_ID) {
      //   this.initializeLogRocket()
      // }
    }
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(event.reason, {
        component: 'Global',
        action: 'unhandledrejection'
      })
    })

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError(event.error, {
        component: 'Global',
        action: 'globalError',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })
  }

  /**
   * Set global context for all error reports
   */
  setContext(context: Partial<ErrorContext>) {
    this.context = { ...this.context, ...context }
  }

  /**
   * Update user context
   */
  setUser(userId: string, userEmail?: string) {
    this.context.userId = userId
    this.context.userEmail = userEmail
  }

  /**
   * Set current page context
   */
  setPage(page: string) {
    this.context.page = page
  }

  /**
   * Report an error
   */
  reportError(
    error: Error | string,
    additionalContext: Partial<ErrorContext> = {},
    level: 'error' | 'warning' | 'info' = 'error'
  ) {
    if (!this.enabled) return

    const errorReport = this.createErrorReport(error, additionalContext, level)
    
    // Add to buffer
    this.errorBuffer.push(errorReport)
    if (this.errorBuffer.length > this.maxBufferSize) {
      this.errorBuffer.shift() // Remove oldest error
    }

    // Send to all providers
    this.providers.forEach(provider => {
      this.sendToProvider(provider, errorReport)
    })
  }

  /**
   * Create a standardized error report
   */
  private createErrorReport(
    error: Error | string,
    additionalContext: Partial<ErrorContext>,
    level: 'error' | 'warning' | 'info'
  ): ErrorReport {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    const combinedContext = { ...this.context, ...additionalContext }

    return {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      timestamp: new Date().toISOString(),
      level,
      message: errorObj.message,
      stack: errorObj.stack,
      error: {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack
      },
      context: combinedContext,
      environment: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        language: navigator.language,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        online: navigator.onLine
      },
      performance: this.getPerformanceData()
    }
  }

  /**
   * Get performance data if available
   */
  private getPerformanceData() {
    try {
      const data: any = {}

      // Memory usage (Chrome only)
      if ('memory' in performance) {
        data.memory = {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        }
      }

      // Navigation timing
      if (performance.getEntriesByType) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          data.timing = {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            ttfb: navigation.responseStart - navigation.requestStart
          }
        }
      }

      return data
    } catch {
      return undefined
    }
  }

  /**
   * Send error report to specific provider
   */
  private sendToProvider(provider: MonitoringProvider, report: ErrorReport) {
    try {
      switch (provider) {
        case 'console':
          this.sendToConsole(report)
          break
        case 'sentry':
          this.sendToSentry(report)
          break
        case 'logrocket':
          this.sendToLogRocket(report)
          break
        case 'custom':
          this.sendToCustomProvider(report)
          break
      }
    } catch (error) {
      console.warn('Failed to send error to provider:', provider, error)
    }
  }

  /**
   * Console logging provider
   */
  private sendToConsole(report: ErrorReport) {
    const emoji = report.level === 'error' ? '🔥' : report.level === 'warning' ? '⚠️' : 'ℹ️'
    
    console.group(`${emoji} Error Report [${report.level.toUpperCase()}]`)
    console.error('Message:', report.message)
    console.error('ID:', report.id)
    console.error('Context:', report.context)
    console.error('Environment:', report.environment)
    if (report.performance) {
      console.log('Performance:', report.performance)
    }
    if (report.stack) {
      console.error('Stack:', report.stack)
    }
    console.groupEnd()
  }

  /**
   * Sentry provider (placeholder)
   */
  private sendToSentry(report: ErrorReport) {
    // TODO: Implement Sentry integration
    console.log('Would send to Sentry:', report.id)
  }

  /**
   * LogRocket provider (placeholder)
   */
  private sendToLogRocket(report: ErrorReport) {
    // TODO: Implement LogRocket integration
    console.log('Would send to LogRocket:', report.id)
  }

  /**
   * Custom provider for internal analytics
   */
  private sendToCustomProvider(report: ErrorReport) {
    // TODO: Send to custom analytics endpoint
    console.log('Would send to custom provider:', report.id)
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    const recentErrors = this.errorBuffer.filter(
      err => now - new Date(err.timestamp).getTime() < oneHour
    )

    return {
      total: this.errorBuffer.length,
      recent: recentErrors.length,
      byLevel: {
        error: this.errorBuffer.filter(e => e.level === 'error').length,
        warning: this.errorBuffer.filter(e => e.level === 'warning').length,
        info: this.errorBuffer.filter(e => e.level === 'info').length
      },
      mostCommon: this.getMostCommonErrors()
    }
  }

  /**
   * Get most common error patterns
   */
  private getMostCommonErrors() {
    const errorCounts = new Map<string, number>()
    
    this.errorBuffer.forEach(error => {
      const key = `${error.error?.name}: ${error.message}`
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1)
    })

    return Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }))
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  /**
   * Clear error buffer
   */
  clearErrors() {
    this.errorBuffer = []
  }

  /**
   * Export errors (for debugging)
   */
  exportErrors() {
    return {
      errors: this.errorBuffer,
      stats: this.getErrorStats(),
      context: this.context
    }
  }
}

// Create singleton instance
export const errorMonitoring = new ErrorMonitoringService()

// Convenience functions
export const reportError = (error: Error | string, context?: Partial<ErrorContext>) => {
  errorMonitoring.reportError(error, context, 'error')
}

export const reportWarning = (message: string, context?: Partial<ErrorContext>) => {
  errorMonitoring.reportError(message, context, 'warning')
}

export const reportInfo = (message: string, context?: Partial<ErrorContext>) => {
  errorMonitoring.reportError(message, context, 'info')
}

export const setErrorContext = (context: Partial<ErrorContext>) => {
  errorMonitoring.setContext(context)
}

export default errorMonitoring