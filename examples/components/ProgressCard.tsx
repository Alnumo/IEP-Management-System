import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Target, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressMetric {
  label: string
  value: number
  target: number
  trend: 'up' | 'down' | 'stable'
  color: 'green' | 'blue' | 'orange' | 'red'
}

interface ProgressCardProps {
  title: string
  subtitle?: string
  studentName: string
  sessionDate: string
  metrics: ProgressMetric[]
  overallProgress: number
  isRTL?: boolean
  className?: string
}

/**
 * ProgressCard - Demonstrates therapy progress tracking patterns
 * 
 * Why: Shows how to visualize therapy progress with:
 * - Multiple progress metrics with color coding
 * - Trend indicators for improvement tracking
 * - Arabic/RTL support for therapy session data
 * - Animated progress bars with smooth transitions
 * - Student information display
 * - Target vs actual progress comparison
 * 
 * Pattern: Progress visualization card with metrics and trends
 */
export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  subtitle,
  studentName,
  sessionDate,
  metrics,
  overallProgress,
  isRTL = false,
  className
}) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return <div className="h-3 w-3 rounded-full bg-gray-400" />
    }
  }

  const getProgressColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-500'
      case 'blue':
        return 'bg-blue-500'
      case 'orange':
        return 'bg-orange-500'
      case 'red':
        return 'bg-red-500'
      default:
        return 'bg-teal-500'
    }
  }

  const getOverallStatus = () => {
    if (overallProgress >= 80) return { text: isRTL ? 'ممتاز' : 'Excellent', color: 'bg-green-100 text-green-700' }
    if (overallProgress >= 60) return { text: isRTL ? 'جيد' : 'Good', color: 'bg-blue-100 text-blue-700' }
    if (overallProgress >= 40) return { text: isRTL ? 'متوسط' : 'Average', color: 'bg-orange-100 text-orange-700' }
    return { text: isRTL ? 'يحتاج تحسين' : 'Needs Improvement', color: 'bg-red-100 text-red-700' }
  }

  const status = getOverallStatus()

  return (
    <Card 
      className={cn(
        'backdrop-blur-sm border-white/20 bg-white/90 hover:shadow-xl transition-all duration-300',
        isRTL && 'text-right font-arabic',
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <CardHeader className="pb-4">
        <div className={cn(
          'flex items-start justify-between gap-3',
          isRTL && 'flex-row-reverse'
        )}>
          <div className="flex-1">
            <CardTitle className={cn(
              'text-lg font-semibold text-gray-900 mb-1',
              isRTL && 'text-right font-arabic'
            )}>
              {title}
            </CardTitle>
            {subtitle && (
              <p className={cn(
                'text-sm text-gray-600',
                isRTL && 'text-right font-arabic'
              )}>
                {subtitle}
              </p>
            )}
          </div>
          
          <Badge className={cn('text-xs', status.color)}>
            {status.text}
          </Badge>
        </div>

        {/* Student and Session Info */}
        <div className={cn(
          'flex items-center gap-4 mt-3 pt-3 border-t border-gray-100',
          isRTL && 'flex-row-reverse'
        )}>
          <div className={cn(
            'flex items-center gap-2 text-sm text-gray-600',
            isRTL && 'flex-row-reverse'
          )}>
            <User className="h-4 w-4" />
            <span className={isRTL ? 'font-arabic' : ''}>{studentName}</span>
          </div>
          <div className={cn(
            'flex items-center gap-2 text-sm text-gray-600',
            isRTL && 'flex-row-reverse'
          )}>
            <Calendar className="h-4 w-4" />
            <span>{sessionDate}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className={cn(
            'flex items-center justify-between',
            isRTL && 'flex-row-reverse'
          )}>
            <div className={cn(
              'flex items-center gap-2',
              isRTL && 'flex-row-reverse'
            )}>
              <Target className="h-4 w-4 text-teal-500" />
              <span className={cn(
                'font-medium text-gray-900',
                isRTL && 'font-arabic'
              )}>
                {isRTL ? 'التقدم العام' : 'Overall Progress'}
              </span>
            </div>
            <span className="text-lg font-bold text-teal-600">
              {overallProgress}%
            </span>
          </div>
          <Progress 
            value={overallProgress} 
            className="h-3 bg-gray-200"
          />
        </div>

        {/* Individual Metrics */}
        <div className="space-y-4">
          <h4 className={cn(
            'font-medium text-gray-900 text-sm',
            isRTL && 'text-right font-arabic'
          )}>
            {isRTL ? 'تفاصيل الأداء' : 'Performance Details'}
          </h4>
          
          {metrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className={cn(
                'flex items-center justify-between',
                isRTL && 'flex-row-reverse'
              )}>
                <div className={cn(
                  'flex items-center gap-2',
                  isRTL && 'flex-row-reverse'
                )}>
                  <span className={cn(
                    'text-sm font-medium text-gray-700',
                    isRTL && 'font-arabic'
                  )}>
                    {metric.label}
                  </span>
                  {getTrendIcon(metric.trend)}
                </div>
                <div className={cn(
                  'flex items-center gap-2 text-sm',
                  isRTL && 'flex-row-reverse'
                )}>
                  <span className="font-semibold text-gray-900">
                    {metric.value}
                  </span>
                  <span className="text-gray-500">
                    / {metric.target}
                  </span>
                </div>
              </div>
              
              <div className="relative">
                <Progress 
                  value={(metric.value / metric.target) * 100} 
                  className="h-2 bg-gray-200"
                />
                <div 
                  className={cn(
                    'absolute top-0 left-0 h-2 rounded-full transition-all duration-500',
                    getProgressColor(metric.color)
                  )}
                  style={{ 
                    width: `${Math.min((metric.value / metric.target) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Usage Examples:
export const ProgressCardUsage = () => {
  const arabicMetrics: ProgressMetric[] = [
    { label: 'النطق الواضح', value: 8, target: 10, trend: 'up', color: 'green' },
    { label: 'المفردات الجديدة', value: 15, target: 20, trend: 'up', color: 'blue' },
    { label: 'التركيب النحوي', value: 6, target: 10, trend: 'stable', color: 'orange' },
    { label: 'الفهم السمعي', value: 9, target: 10, trend: 'up', color: 'green' }
  ]

  const englishMetrics: ProgressMetric[] = [
    { label: 'Articulation', value: 7, target: 10, trend: 'up', color: 'green' },
    { label: 'Vocabulary', value: 12, target: 15, trend: 'up', color: 'blue' },
    { label: 'Grammar', value: 4, target: 10, trend: 'down', color: 'red' },
    { label: 'Comprehension', value: 8, target: 10, trend: 'up', color: 'green' }
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 p-6">
      {/* Arabic Progress Card */}
      <ProgressCard
        title="جلسة علاج النطق"
        subtitle="الأسبوع الثالث - مارس 2024"
        studentName="أحمد محمد علي"
        sessionDate="2024-03-15"
        metrics={arabicMetrics}
        overallProgress={76}
        isRTL={true}
      />

      {/* English Progress Card */}
      <ProgressCard
        title="Speech Therapy Session"
        subtitle="Week 3 - March 2024"
        studentName="Sarah Johnson"
        sessionDate="2024-03-15"
        metrics={englishMetrics}
        overallProgress={62}
        isRTL={false}
      />

      {/* Low Progress Example */}
      <ProgressCard
        title="خطة التدخل المبكر"
        subtitle="تقييم شهري"
        studentName="فاطمة أحمد"
        sessionDate="2024-03-10"
        metrics={[
          { label: 'التفاعل الاجتماعي', value: 3, target: 10, trend: 'up', color: 'orange' },
          { label: 'المهارات الحركية', value: 2, target: 10, trend: 'stable', color: 'red' }
        ]}
        overallProgress={25}
        isRTL={true}
      />

      {/* Excellent Progress Example */}
      <ProgressCard
        title="Physical Therapy Goals"
        subtitle="Monthly Assessment"
        studentName="Michael Chen"
        sessionDate="2024-03-12"
        metrics={[
          { label: 'Balance', value: 9, target: 10, trend: 'up', color: 'green' },
          { label: 'Coordination', value: 8, target: 10, trend: 'up', color: 'green' },
          { label: 'Strength', value: 10, target: 10, trend: 'up', color: 'green' }
        ]}
        overallProgress={90}
        isRTL={false}
      />
    </div>
  )
}
