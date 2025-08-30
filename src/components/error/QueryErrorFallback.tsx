import React from 'react'
import { AlertCircle, RefreshCcw, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useLanguage } from '@/contexts/LanguageContext'

interface QueryErrorFallbackProps {
  error: Error
  resetErrorBoundary?: () => void
  refetch?: () => void
  isNetworkError?: boolean
}

export const QueryErrorFallback: React.FC<QueryErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  refetch,
  isNetworkError = false
}) => {
  const { language } = useLanguage()
  const isRTL = language === 'ar'

  const getErrorMessage = () => {
    if (isNetworkError) {
      return language === 'ar' 
        ? 'فشل في تحميل البيانات. تحقق من اتصالك بالإنترنت.'
        : 'Failed to load data. Check your internet connection.'
    }

    if (error.message.includes('Authentication')) {
      return language === 'ar'
        ? 'انتهت جلسة المصادقة. يرجى تسجيل الدخول مرة أخرى.'
        : 'Authentication session expired. Please log in again.'
    }

    if (error.message.includes('Network')) {
      return language === 'ar'
        ? 'مشكلة في الاتصال بالخادم. يرجى المحاولة لاحقاً.'
        : 'Server connection issue. Please try again later.'
    }

    return language === 'ar'
      ? 'حدث خطأ أثناء تحميل البيانات.'
      : 'An error occurred while loading data.'
  }

  const handleRetry = () => {
    if (refetch) {
      refetch()
    } else if (resetErrorBoundary) {
      resetErrorBoundary()
    }
  }

  return (
    <div className={`p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <Alert variant="destructive" className="max-w-md mx-auto">
        <div className="flex items-center gap-2">
          {isNetworkError ? (
            <WifiOff className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {language === 'ar' ? 'خطأ في التحميل' : 'Loading Error'}
          </AlertTitle>
        </div>
        <AlertDescription className="mt-2">
          {getErrorMessage()}
        </AlertDescription>
        
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button 
            onClick={handleRetry}
            size="sm" 
            variant="outline"
            className="w-full sm:w-auto"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
          </Button>
          
          {navigator.onLine ? (
            <div className="flex items-center text-sm text-green-600 gap-1">
              <Wifi className="h-3 w-3" />
              {language === 'ar' ? 'متصل' : 'Online'}
            </div>
          ) : (
            <div className="flex items-center text-sm text-red-600 gap-1">
              <WifiOff className="h-3 w-3" />
              {language === 'ar' ? 'غير متصل' : 'Offline'}
            </div>
          )}
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-gray-600">
              {language === 'ar' ? 'تفاصيل الخطأ' : 'Error Details'}
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {error.stack || error.message}
            </pre>
          </details>
        )}
      </Alert>
    </div>
  )
}

export default QueryErrorFallback