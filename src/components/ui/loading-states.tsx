import React from 'react'
import { Loader2, Users, BookOpen, Calendar, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'

interface LoadingStateProps {
  type?: 'default' | 'skeleton' | 'card' | 'table' | 'form'
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'default',
  size = 'md',
  message,
  className = ''
}) => {
  const { language } = useLanguage()
  const isRTL = language === 'ar'

  const defaultMessage = language === 'ar' ? 'جاري التحميل...' : 'Loading...'
  const displayMessage = message || defaultMessage

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }

  if (type === 'skeleton') {
    return <SkeletonLoader className={className} />
  }

  if (type === 'card') {
    return <CardSkeleton className={className} />
  }

  if (type === 'table') {
    return <TableSkeleton className={className} />
  }

  if (type === 'form') {
    return <FormSkeleton className={className} />
  }

  return (
    <div className={`flex items-center justify-center p-8 ${isRTL ? 'rtl' : 'ltr'} ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-teal-600`} />
        <p className="text-sm text-gray-600 font-medium">
          {displayMessage}
        </p>
      </div>
    </div>
  )
}

export const SkeletonLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  </div>
)

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Card className={className}>
    <CardContent className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-4/5"></div>
        </div>
      </div>
    </CardContent>
  </Card>
)

export const TableSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-gray-50 rounded-t">
        <div className="h-4 bg-gray-200 rounded flex-1"></div>
        <div className="h-4 bg-gray-200 rounded flex-1"></div>
        <div className="h-4 bg-gray-200 rounded flex-1"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
      
      {/* Rows */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b">
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
      ))}
    </div>
  </div>
)

export const FormSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    <div className="animate-pulse space-y-4">
      {/* Form fields */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      ))}
      
      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  </div>
)

// Specialized loading components for different contexts
export const StudentsLoading: React.FC<{ className?: string }> = ({ className }) => {
  const { language } = useLanguage()
  return (
    <LoadingState
      type="card"
      message={language === 'ar' ? 'جاري تحميل بيانات الطلاب...' : 'Loading students data...'}
      className={className}
    />
  )
}

export const CoursesLoading: React.FC<{ className?: string }> = ({ className }) => {
  const { language } = useLanguage()
  return (
    <LoadingState
      type="card"
      message={language === 'ar' ? 'جاري تحميل الدورات...' : 'Loading courses...'}
      className={className}
    />
  )
}

export const AttendanceLoading: React.FC<{ className?: string }> = ({ className }) => {
  const { language } = useLanguage()
  return (
    <LoadingState
      type="table"
      message={language === 'ar' ? 'جاري تحميل سجلات الحضور...' : 'Loading attendance records...'}
      className={className}
    />
  )
}

// Context-aware loading component
interface SmartLoadingProps {
  context: 'students' | 'courses' | 'attendance' | 'general'
  type?: LoadingStateProps['type']
  size?: LoadingStateProps['size']
  className?: string
}

export const SmartLoading: React.FC<SmartLoadingProps> = ({
  context,
  type,
  size,
  className
}) => {
  const { language } = useLanguage()
  
  const getContextualMessage = () => {
    const messages = {
      students: language === 'ar' ? 'جاري تحميل بيانات الطلاب...' : 'Loading students...',
      courses: language === 'ar' ? 'جاري تحميل الدورات...' : 'Loading courses...',
      attendance: language === 'ar' ? 'جاري تحميل سجلات الحضور...' : 'Loading attendance...',
      general: language === 'ar' ? 'جاري التحميل...' : 'Loading...'
    }
    return messages[context]
  }

  const getContextualIcon = () => {
    const icons = {
      students: Users,
      courses: BookOpen,
      attendance: Calendar,
      general: FileText
    }
    return icons[context]
  }

  const Icon = getContextualIcon()

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Icon className="h-8 w-8 text-teal-200" />
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 absolute inset-0" />
        </div>
        <p className="text-sm text-gray-600 font-medium">
          {getContextualMessage()}
        </p>
      </div>
    </div>
  )
}

export default LoadingState