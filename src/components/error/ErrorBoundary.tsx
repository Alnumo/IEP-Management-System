import React from 'react'
import { AlertTriangle, RefreshCcw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void
  level?: 'app' | 'page' | 'component'
}

export interface ErrorFallbackProps {
  error: Error | null
  errorInfo: React.ErrorInfo | null
  resetError: () => void
  errorId: string
  level: 'app' | 'page' | 'component'
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2)}`
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    
    // Log error details
    console.group('🚨 Error Boundary Caught Error')
    console.error('Error:', error.name, error.message)
    console.error('Stack:', error.stack)
    console.error('Component Stack:', errorInfo.componentStack)
    console.error('Error ID:', this.state.errorId)
    console.error('Level:', this.props.level || 'component')
    console.groupEnd()

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.state.errorId)
    }

    // Send to monitoring service (placeholder)
    this.reportError(error, errorInfo)
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
    const errorReport = {
      errorId: this.state.errorId,
      level: this.props.level || 'component',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    console.log('📊 Error Report:', errorReport)
    // Example: errorMonitoringService.report(errorReport)
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          errorId={this.state.errorId}
          level={this.props.level || 'component'}
        />
      )
    }

    return this.props.children
  }
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  errorId,
  level
}) => {
  const { language } = useLanguage()
  const isRTL = language === 'ar'

  const getErrorTitle = () => {
    switch (level) {
      case 'app':
        return language === 'ar' ? 'خطأ في التطبيق' : 'Application Error'
      case 'page':
        return language === 'ar' ? 'خطأ في الصفحة' : 'Page Error'
      default:
        return language === 'ar' ? 'حدث خطأ' : 'Something went wrong'
    }
  }

  const getErrorDescription = () => {
    switch (level) {
      case 'app':
        return language === 'ar' 
          ? 'حدث خطأ غير متوقع في التطبيق. نعتذر عن هذا الإزعاج.'
          : 'An unexpected error occurred in the application. We apologize for the inconvenience.'
      case 'page':
        return language === 'ar'
          ? 'لا يمكن تحميل هذه الصفحة حالياً. يرجى المحاولة مرة أخرى.'
          : 'This page could not be loaded right now. Please try again.'
      default:
        return language === 'ar'
          ? 'حدث خطأ أثناء تحميل هذا المكون.'
          : 'An error occurred while loading this component.'
    }
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleReportBug = () => {
    const subject = encodeURIComponent(`Error Report - ${errorId}`)
    const body = encodeURIComponent(`
Error ID: ${errorId}
Level: ${level}
Error: ${error?.name} - ${error?.message}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:

`)
    window.open(`mailto:support@arkantherapy.com?subject=${subject}&body=${body}`)
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <Card className="w-full max-w-md border-red-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-red-800">
            {getErrorTitle()}
          </CardTitle>
          <CardDescription className="text-red-600">
            {getErrorDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded font-mono">
            {language === 'ar' ? 'رقم الخطأ:' : 'Error ID:'} {errorId}
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={resetError} className="w-full" variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
            </Button>
            
            {level === 'app' && (
              <Button onClick={handleGoHome} className="w-full" variant="outline">
                <Home className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'العودة للرئيسية' : 'Go Home'}
              </Button>
            )}
            
            <Button onClick={handleReportBug} className="w-full" variant="ghost">
              <Bug className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'الإبلاغ عن خطأ' : 'Report Bug'}
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                {language === 'ar' ? 'تفاصيل تقنية' : 'Technical Details'}
              </summary>
              <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-auto max-h-40">
                <div className="mb-2">
                  <strong>Error:</strong> {error.name}
                </div>
                <div className="mb-2">
                  <strong>Message:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper hook for functional components error handling
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: any) => {
    console.error('🔥 Unhandled error:', error)
    if (errorInfo) {
      console.error('Error info:', errorInfo)
    }
    
    // TODO: Send to monitoring service
  }
}

export default ErrorBoundary