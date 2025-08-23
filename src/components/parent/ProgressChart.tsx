import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { WeeklyProgress } from '@/types/parent-portal'

interface ProgressChartProps {
  weeklyData: WeeklyProgress[]
  title: string
  className?: string
}

export const ProgressChart: React.FC<ProgressChartProps> = ({
  weeklyData,
  title,
  className = ''
}) => {
  if (!weeklyData.length) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">{title}</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">لا توجد بيانات متاحة</p>
        </div>
      </div>
    )
  }

  // const maxRating = Math.max(...weeklyData.map(w => w.overallRating))
  const currentWeek = weeklyData[weeklyData.length - 1]
  const previousWeek = weeklyData[weeklyData.length - 2]
  
  let trend = 'stable'
  let trendValue = 0
  
  if (previousWeek) {
    const diff = currentWeek.overallRating - previousWeek.overallRating
    trendValue = Math.abs(diff)
    if (diff > 0.2) trend = 'up'
    else if (diff < -0.2) trend = 'down'
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <Minus className="w-4 h-4 text-gray-600" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 text-right">{title}</h3>
        <div className="flex items-center space-x-2 space-x-reverse">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${getTrendColor()}`}>
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
            {trendValue > 0 ? trendValue.toFixed(1) : 'مستقر'}
          </span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative h-48 mb-6">
        <div className="absolute inset-0 flex items-end justify-between">
          {weeklyData.slice(-8).map((week, index) => {
            const height = (week.overallRating / 5) * 100
            const isCurrentWeek = index === weeklyData.length - 1
            
            return (
              <div key={index} className="flex flex-col items-center flex-1 mx-1">
                <div className="relative w-full max-w-8">
                  <div className="bg-gray-200 rounded-t h-48 relative overflow-hidden">
                    <div
                      className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${
                        isCurrentWeek
                          ? 'bg-gradient-to-t from-blue-500 to-blue-400'
                          : 'bg-gradient-to-t from-gray-400 to-gray-300'
                      }`}
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                        <span className="text-xs font-medium text-white">
                          {week.overallRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-center">
                    <p className="text-xs text-gray-600">
                      {new Date(week.weekStartDate).toLocaleDateString('ar-SA', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Week Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3 text-right">
          ملخص الأسبوع الحالي
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-right">
            <p className="text-gray-600 text-sm">الجلسات المكتملة</p>
            <p className="font-semibold text-lg">
              {currentWeek.completedSessions}/{currentWeek.totalSessions}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-600 text-sm">التقييم العام</p>
            <div className="flex items-center justify-end">
              <p className="font-semibold text-lg ml-2">
                {currentWeek.overallRating.toFixed(1)}
              </p>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div
                    key={star}
                    className={`w-4 h-4 ${
                      star <= currentWeek.overallRating
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  >
                    ★
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-right">
            <p className="text-gray-600 text-sm">الأنشطة المنزلية</p>
            <div className="flex items-center justify-end mt-1">
              <span className="font-semibold text-lg ml-2">
                {currentWeek.homeActivity.completionRate}%
              </span>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${currentWeek.homeActivity.completionRate}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {currentWeek.homeActivity.completed} من {currentWeek.homeActivity.assigned} مكتملة
            </p>
          </div>
        </div>

        {/* Key Achievements */}
        {currentWeek.keyAchievements.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h5 className="font-medium text-gray-900 mb-2 text-right">
              الإنجازات الرئيسية
            </h5>
            <ul className="space-y-1">
              {currentWeek.keyAchievements.map((achievement, index) => (
                <li key={index} className="text-sm text-gray-700 text-right flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 ml-2 flex-shrink-0"></span>
                  {achievement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Therapist Feedback */}
        {currentWeek.therapistFeedback && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h5 className="font-medium text-gray-900 mb-2 text-right">
              ملاحظات المعالج
            </h5>
            <p className="text-sm text-gray-700 text-right bg-blue-50 p-3 rounded">
              "{currentWeek.therapistFeedback}"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}