/**
 * Retry utilities for handling failed requests with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  jitter?: boolean
  retryCondition?: (error: Error) => boolean
}

export interface RetryResult<T> {
  data?: T
  error?: Error
  attempts: number
  totalTime: number
  success: boolean
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and server errors (5xx)
    if (error.message.includes('Network')) return true
    if (error.message.includes('timeout')) return true
    if (error.message.includes('fetch')) return true
    
    // Don't retry on auth errors (401, 403) or client errors (4xx)
    if (error.message.includes('Authentication')) return false
    if (error.message.includes('Unauthorized')) return false
    if (error.message.includes('Forbidden')) return false
    
    return true
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  const startTime = Date.now()
  
  let lastError: Error | undefined
  let attempts = 0

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    attempts = attempt
    
    try {
      console.log(`🔄 Attempt ${attempt}/${opts.maxAttempts}`)
      const data = await fn()
      const totalTime = Date.now() - startTime
      
      console.log(`✅ Success after ${attempt} attempts (${totalTime}ms)`)
      return {
        data,
        attempts,
        totalTime,
        success: true
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      lastError = err
      
      console.warn(`❌ Attempt ${attempt} failed:`, err.message)
      
      // Don't retry if condition fails or it's the last attempt
      if (!opts.retryCondition(err) || attempt === opts.maxAttempts) {
        break
      }
      
      // Calculate delay with exponential backoff
      const baseDelay = opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt - 1)
      const clampedDelay = Math.min(baseDelay, opts.maxDelay)
      
      // Add jitter to prevent thundering herd
      const delay = opts.jitter 
        ? clampedDelay * (0.5 + Math.random() * 0.5)
        : clampedDelay
      
      console.log(`⏳ Retrying in ${Math.round(delay)}ms...`)
      await sleep(delay)
    }
  }

  const totalTime = Date.now() - startTime
  console.error(`💥 All ${attempts} attempts failed (${totalTime}ms)`)
  
  return {
    error: lastError,
    attempts,
    totalTime,
    success: false
  }
}

/**
 * Enhanced retry specifically for API calls
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  options: RetryOptions & {
    context?: string
    logErrors?: boolean
  } = {}
): Promise<T> {
  const { context = 'API call', logErrors = true, ...retryOptions } = options
  
  const result = await withRetry(apiCall, {
    ...retryOptions,
    retryCondition: (error) => {
      // Enhanced retry logic for API calls
      const isNetworkError = error.message.includes('Network') || 
                            error.message.includes('fetch') ||
                            error.message.includes('timeout')
      
      const isServerError = error.message.includes('500') ||
                           error.message.includes('502') ||
                           error.message.includes('503') ||
                           error.message.includes('504')
      
      const isRetryable = isNetworkError || isServerError
      
      if (logErrors) {
        console.log(`🔍 ${context} error analysis:`, {
          message: error.message,
          isNetworkError,
          isServerError,
          willRetry: isRetryable
        })
      }
      
      return isRetryable
    }
  })

  if (!result.success) {
    throw result.error || new Error(`${context} failed after ${result.attempts} attempts`)
  }

  return result.data!
}

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker<T> {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private readonly fn: () => Promise<T>,
    private readonly options: {
      failureThreshold?: number
      resetTimeout?: number
      monitoringPeriod?: number
    } = {}
  ) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
      ...options
    }
  }

  async execute(): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout!) {
        this.state = 'half-open'
        console.log('🔄 Circuit breaker: half-open')
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    try {
      const result = await this.fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.options.failureThreshold!) {
      this.state = 'open'
      console.warn(`⚡ Circuit breaker opened after ${this.failures} failures`)
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }
}

/**
 * Simple sleep utility
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: Error): boolean => {
  const retryablePatterns = [
    /network/i,
    /timeout/i,
    /fetch/i,
    /500/,
    /502/,
    /503/,
    /504/
  ]

  return retryablePatterns.some(pattern => pattern.test(error.message))
}

/**
 * Get human-readable error message
 */
export const getRetryErrorMessage = (error: Error, language: 'ar' | 'en' = 'en'): string => {
  if (error.message.includes('Network')) {
    return language === 'ar' 
      ? 'فشل الاتصال بالخادم. تحقق من اتصالك بالإنترنت.'
      : 'Network connection failed. Check your internet connection.'
  }

  if (error.message.includes('timeout')) {
    return language === 'ar'
      ? 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.'
      : 'Request timeout. Please try again.'
  }

  if (error.message.includes('Authentication')) {
    return language === 'ar'
      ? 'انتهت جلسة المصادقة. يرجى تسجيل الدخول مرة أخرى.'
      : 'Authentication expired. Please log in again.'
  }

  return language === 'ar'
    ? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
    : 'An unexpected error occurred. Please try again.'
}