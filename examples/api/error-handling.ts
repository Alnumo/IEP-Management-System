/**
 * API Error Handling Examples
 * 
 * Why: Demonstrates error handling patterns for therapy applications:
 * - Bilingual error messages (Arabic/English)
 * - Therapy-specific error types and handling
 * - Network error recovery strategies
 * - User-friendly error presentation
 * - Error logging and monitoring
 * - Retry mechanisms with exponential backoff
 */

import { Language } from '../types/therapy-types'

// Error types specific to therapy applications
export type TherapyErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_DENIED'
  | 'VALIDATION_ERROR'
  | 'SESSION_NOT_FOUND'
  | 'STUDENT_NOT_FOUND'
  | 'THERAPIST_NOT_FOUND'
  | 'SCHEDULE_CONFLICT'
  | 'SESSION_ALREADY_COMPLETED'
  | 'INVALID_SESSION_STATUS'
  | 'FILE_UPLOAD_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'SERVER_ERROR'
  | 'MAINTENANCE_MODE'
  | 'ARABIC_TEXT_VALIDATION_ERROR'

// Bilingual error interface
export interface BilingualError {
  code: TherapyErrorCode
  message: string
  message_ar: string
  details?: {
    field?: string
    value?: any
    constraints?: string[]
    constraints_ar?: string[]
  }
  timestamp: Date
  requestId?: string
  retryable: boolean
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: BilingualError
  metadata?: {
    total?: number
    page?: number
    limit?: number
  }
}

// Error message mappings
const ERROR_MESSAGES: Record<TherapyErrorCode, { en: string; ar: string }> = {
  NETWORK_ERROR: {
    en: 'Network connection failed. Please check your internet connection.',
    ar: 'فشل الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.'
  },
  AUTHENTICATION_FAILED: {
    en: 'Authentication failed. Please log in again.',
    ar: 'فشل في المصادقة. يرجى تسجيل الدخول مرة أخرى.'
  },
  AUTHORIZATION_DENIED: {
    en: 'You do not have permission to perform this action.',
    ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'
  },
  VALIDATION_ERROR: {
    en: 'The provided data is invalid. Please check your input.',
    ar: 'البيانات المدخلة غير صحيحة. يرجى مراجعة المدخلات.'
  },
  SESSION_NOT_FOUND: {
    en: 'The therapy session could not be found.',
    ar: 'لم يتم العثور على جلسة العلاج.'
  },
  STUDENT_NOT_FOUND: {
    en: 'The student could not be found.',
    ar: 'لم يتم العثور على الطالب.'
  },
  THERAPIST_NOT_FOUND: {
    en: 'The therapist could not be found.',
    ar: 'لم يتم العثور على المعالج.'
  },
  SCHEDULE_CONFLICT: {
    en: 'There is a scheduling conflict. Please choose a different time.',
    ar: 'يوجد تعارض في المواعيد. يرجى اختيار وقت آخر.'
  },
  SESSION_ALREADY_COMPLETED: {
    en: 'This therapy session has already been completed.',
    ar: 'تم إكمال جلسة العلاج هذه بالفعل.'
  },
  INVALID_SESSION_STATUS: {
    en: 'Invalid session status for this operation.',
    ar: 'حالة الجلسة غير صالحة لهذه العملية.'
  },
  FILE_UPLOAD_FAILED: {
    en: 'File upload failed. Please try again.',
    ar: 'فشل في رفع الملف. يرجى المحاولة مرة أخرى.'
  },
  QUOTA_EXCEEDED: {
    en: 'You have exceeded your usage quota. Please upgrade your plan.',
    ar: 'لقد تجاوزت حد الاستخدام المسموح. يرجى ترقية خطتك.'
  },
  SERVER_ERROR: {
    en: 'An internal server error occurred. Please try again later.',
    ar: 'حدث خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.'
  },
  MAINTENANCE_MODE: {
    en: 'The system is currently under maintenance. Please try again later.',
    ar: 'النظام قيد الصيانة حالياً. يرجى المحاولة لاحقاً.'
  },
  ARABIC_TEXT_VALIDATION_ERROR: {
    en: 'Arabic text validation failed. Please ensure the text contains Arabic characters.',
    ar: 'فشل في التحقق من النص العربي. يرجى التأكد من أن النص يحتوي على أحرف عربية.'
  }
}

// Error creation utility
export const createBilingualError = (
  code: TherapyErrorCode,
  details?: BilingualError['details'],
  requestId?: string
): BilingualError => {
  const messages = ERROR_MESSAGES[code]
  
  return {
    code,
    message: messages.en,
    message_ar: messages.ar,
    details,
    timestamp: new Date(),
    requestId,
    retryable: isRetryableError(code)
  }
}

// Determine if error is retryable
export const isRetryableError = (code: TherapyErrorCode): boolean => {
  const retryableErrors: TherapyErrorCode[] = [
    'NETWORK_ERROR',
    'SERVER_ERROR',
    'FILE_UPLOAD_FAILED'
  ]
  
  return retryableErrors.includes(code)
}

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export const getErrorSeverity = (code: TherapyErrorCode): ErrorSeverity => {
  const severityMap: Record<TherapyErrorCode, ErrorSeverity> = {
    NETWORK_ERROR: 'medium',
    AUTHENTICATION_FAILED: 'high',
    AUTHORIZATION_DENIED: 'high',
    VALIDATION_ERROR: 'low',
    SESSION_NOT_FOUND: 'medium',
    STUDENT_NOT_FOUND: 'medium',
    THERAPIST_NOT_FOUND: 'medium',
    SCHEDULE_CONFLICT: 'medium',
    SESSION_ALREADY_COMPLETED: 'low',
    INVALID_SESSION_STATUS: 'medium',
    FILE_UPLOAD_FAILED: 'low',
    QUOTA_EXCEEDED: 'high',
    SERVER_ERROR: 'critical',
    MAINTENANCE_MODE: 'high',
    ARABIC_TEXT_VALIDATION_ERROR: 'low'
  }
  
  return severityMap[code]
}

// Enhanced fetch wrapper with error handling
export class TherapyApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private retryAttempts: number = 3
  private retryDelay: number = 1000 // milliseconds

  constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    }
  }

  // Main request method with error handling
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const requestId = this.generateRequestId()

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          'X-Request-ID': requestId,
          ...options.headers
        }
      })

      // Handle different HTTP status codes
      if (!response.ok) {
        return this.handleHttpError(response, requestId)
      }

      const data = await response.json()
      
      // Check for application-level errors
      if (data.error) {
        return {
          success: false,
          error: this.enhanceError(data.error, requestId)
        }
      }

      return {
        success: true,
        data: data.data || data,
        metadata: data.metadata
      }

    } catch (error) {
      // Network or parsing errors
      if (retryCount < this.retryAttempts && this.shouldRetry(error)) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount))
        return this.request<T>(endpoint, options, retryCount + 1)
      }

      return {
        success: false,
        error: this.createNetworkError(error, requestId)
      }
    }
  }

  // HTTP error handler
  private async handleHttpError(response: Response, requestId: string): Promise<ApiResponse> {
    let errorData: any = {}
    
    try {
      errorData = await response.json()
    } catch {
      // If response body is not JSON, create generic error
    }

    const errorCode = this.mapHttpStatusToErrorCode(response.status)
    const error = createBilingualError(errorCode, errorData.details, requestId)

    // Log error for monitoring
    this.logError(error, response.status)

    return {
      success: false,
      error
    }
  }

  // Map HTTP status codes to therapy error codes
  private mapHttpStatusToErrorCode(status: number): TherapyErrorCode {
    switch (status) {
      case 401:
        return 'AUTHENTICATION_FAILED'
      case 403:
        return 'AUTHORIZATION_DENIED'
      case 404:
        return 'SESSION_NOT_FOUND' // Default, can be more specific
      case 409:
        return 'SCHEDULE_CONFLICT'
      case 422:
        return 'VALIDATION_ERROR'
      case 429:
        return 'QUOTA_EXCEEDED'
      case 503:
        return 'MAINTENANCE_MODE'
      case 500:
      case 502:
      case 504:
        return 'SERVER_ERROR'
      default:
        return 'SERVER_ERROR'
    }
  }

  // Create network error
  private createNetworkError(error: any, requestId: string): BilingualError {
    return createBilingualError('NETWORK_ERROR', {
      constraints: [error.message],
      constraints_ar: ['خطأ في الشبكة']
    }, requestId)
  }

  // Enhance error with additional context
  private enhanceError(error: any, requestId: string): BilingualError {
    return {
      ...error,
      requestId,
      timestamp: new Date(),
      retryable: isRetryableError(error.code)
    }
  }

  // Determine if error should trigger retry
  private shouldRetry(error: any): boolean {
    return error.name === 'TypeError' || // Network errors
           error.name === 'AbortError' ||
           error.code === 'NETWORK_ERROR'
  }

  // Delay utility for retry backoff
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Error logging
  private logError(error: BilingualError, httpStatus?: number): void {
    const logData = {
      error,
      httpStatus,
      severity: getErrorSeverity(error.code),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }

    // In production, send to monitoring service
    console.error('Therapy API Error:', logData)
    
    // Example: Send to monitoring service
    // this.sendToMonitoring(logData)
  }

  // Convenience methods for common operations
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Error display utility
export const getErrorMessage = (error: BilingualError, language: Language): string => {
  return language === 'ar' ? error.message_ar : error.message
}

// Error notification helper
export const createErrorNotification = (
  error: BilingualError,
  language: Language
) => {
  const severity = getErrorSeverity(error.code)
  
  return {
    type: severity === 'critical' || severity === 'high' ? 'error' : 'warning',
    title: {
      ar: severity === 'critical' ? 'خطأ حرج' : 'تحذير',
      en: severity === 'critical' ? 'Critical Error' : 'Warning'
    },
    message: {
      ar: error.message_ar,
      en: error.message
    },
    duration: severity === 'critical' ? 0 : 5000, // Persistent for critical errors
    action: error.retryable ? {
      label: { ar: 'إعادة المحاولة', en: 'Retry' },
      onClick: () => {/* Retry logic */}
    } : undefined
  }
}

// Validation error helper
export const createValidationError = (
  field: string,
  value: any,
  constraints: string[],
  constraints_ar: string[]
): BilingualError => {
  return createBilingualError('VALIDATION_ERROR', {
    field,
    value,
    constraints,
    constraints_ar
  })
}

// Arabic text validation error
export const createArabicValidationError = (
  field: string,
  value: string
): BilingualError => {
  return createBilingualError('ARABIC_TEXT_VALIDATION_ERROR', {
    field,
    value,
    constraints: ['Text must contain Arabic characters'],
    constraints_ar: ['النص يجب أن يحتوي على أحرف عربية']
  })
}

// Usage examples:
/*
// Initialize API client
const apiClient = new TherapyApiClient('https://api.therapy-app.com', {
  'Authorization': 'Bearer your-token'
})

// Example: Create therapy session with error handling
async function createTherapySession(sessionData: any) {
  const response = await apiClient.post('/sessions', sessionData)
  
  if (!response.success) {
    const errorNotification = createErrorNotification(response.error!, 'ar')
    showNotification(errorNotification)
    return null
  }
  
  return response.data
}

// Example: Handle specific errors
async function getSession(sessionId: string) {
  const response = await apiClient.get(`/sessions/${sessionId}`)
  
  if (!response.success) {
    switch (response.error!.code) {
      case 'SESSION_NOT_FOUND':
        // Handle session not found
        break
      case 'AUTHORIZATION_DENIED':
        // Redirect to login
        break
      case 'NETWORK_ERROR':
        // Show retry option
        break
      default:
        // Generic error handling
    }
  }
  
  return response.data
}

// Example: Validate Arabic text
function validateArabicInput(text: string, fieldName: string): BilingualError | null {
  const arabicRegex = /[\u0600-\u06FF]/
  
  if (!arabicRegex.test(text)) {
    return createArabicValidationError(fieldName, text)
  }
  
  return null
}

// Example: Form validation with bilingual errors
function validateTherapyForm(formData: any): BilingualError[] {
  const errors: BilingualError[] = []
  
  if (!formData.titleAr) {
    errors.push(createValidationError(
      'titleAr',
      formData.titleAr,
      ['Arabic title is required'],
      ['العنوان العربي مطلوب']
    ))
  } else {
    const arabicError = validateArabicInput(formData.titleAr, 'titleAr')
    if (arabicError) {
      errors.push(arabicError)
    }
  }
  
  return errors
}
*/
