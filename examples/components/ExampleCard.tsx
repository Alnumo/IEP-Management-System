import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExampleCardProps {
  title: string
  description: string
  progress?: number
  status?: 'loading' | 'success' | 'error' | 'default'
  badge?: string
  actionText?: string
  onAction?: () => void
  className?: string
  isRTL?: boolean
}

/**
 * ExampleCard - Demonstrates the project's card design pattern
 * 
 * Why: Shows how to create consistent, accessible cards with:
 * - Arabic/RTL text support with proper alignment
 * - Loading states with shimmer effects
 * - Status indicators with appropriate colors
 * - Progress visualization for therapy goals
 * - Gradient styling matching the design system
 * - Responsive behavior for mobile devices
 * 
 * Pattern: Glass morphism card with hover effects and status-based styling
 */
export const ExampleCard: React.FC<ExampleCardProps> = ({
  title,
  description,
  progress,
  status = 'default',
  badge,
  actionText,
  onAction,
  className,
  isRTL = false
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'border-teal-200 bg-teal-50/50'
      case 'success':
        return 'border-green-200 bg-green-50/50'
      case 'error':
        return 'border-red-200 bg-red-50/50'
      default:
        return 'border-white/20 bg-white/90'
    }
  }

  return (
    <Card 
      className={cn(
        'backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl',
        getStatusColor(),
        isRTL && 'text-right font-arabic',
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <CardHeader className="pb-3">
        <div className={cn(
          'flex items-start justify-between gap-2',
          isRTL && 'flex-row-reverse'
        )}>
          <div className="flex-1">
            <CardTitle className={cn(
              'text-lg font-semibold text-gray-900 line-clamp-1',
              isRTL && 'text-right font-arabic'
            )}>
              {title}
            </CardTitle>
            <CardDescription className={cn(
              'mt-1 text-sm text-gray-600 line-clamp-2',
              isRTL && 'text-right font-arabic'
            )}>
              {description}
            </CardDescription>
          </div>
          
          <div className={cn(
            'flex items-center gap-2',
            isRTL && 'flex-row-reverse'
          )}>
            {getStatusIcon()}
            {badge && (
              <Badge 
                variant="secondary" 
                className={cn(
                  'text-xs bg-teal-100 text-teal-700',
                  isRTL && 'font-arabic'
                )}
              >
                {badge}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-3">
        {progress !== undefined && (
          <div className="space-y-2">
            <div className={cn(
              'flex justify-between text-sm',
              isRTL && 'flex-row-reverse font-arabic'
            )}>
              <span className="text-gray-600">
                {isRTL ? 'التقدم' : 'Progress'}
              </span>
              <span className="font-medium text-gray-900">
                {progress}%
              </span>
            </div>
            <Progress 
              value={progress} 
              className="h-2 bg-gray-200"
            />
          </div>
        )}

        {status === 'loading' && (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-gray-200 rounded loading-shimmer"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4 loading-shimmer"></div>
          </div>
        )}
      </CardContent>

      {(actionText || onAction) && (
        <CardFooter className="pt-3">
          <Button
            onClick={onAction}
            variant="outline"
            size="sm"
            className={cn(
              'w-full bg-gradient-to-r from-teal-50 to-green-50 border-teal-200 text-teal-700 hover:from-teal-100 hover:to-green-100',
              isRTL && 'font-arabic'
            )}
            disabled={status === 'loading'}
          >
            {status === 'loading' && (
              <Loader2 className={cn(
                'h-3 w-3 animate-spin',
                isRTL ? 'ml-2' : 'mr-2'
              )} />
            )}
            {actionText || (isRTL ? 'عرض التفاصيل' : 'View Details')}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

// Usage Examples:
export const ExampleCardUsage = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-6">
      {/* Default Card */}
      <ExampleCard
        title="خطة العلاج الأساسية"
        description="خطة علاجية شاملة للطفل تتضمن جلسات النطق والعلاج الطبيعي"
        badge="نشط"
        actionText="عرض الخطة"
        isRTL={true}
      />

      {/* Progress Card */}
      <ExampleCard
        title="Speech Therapy Goals"
        description="Weekly speech therapy sessions with progress tracking"
        progress={75}
        status="success"
        badge="On Track"
        actionText="View Progress"
      />

      {/* Loading Card */}
      <ExampleCard
        title="تحديث البيانات"
        description="جاري تحديث معلومات الطفل..."
        status="loading"
        isRTL={true}
      />

      {/* Error Card */}
      <ExampleCard
        title="Connection Error"
        description="Unable to sync therapy session data"
        status="error"
        badge="Retry"
        actionText="Try Again"
      />
    </div>
  )
}
