import React from 'react'
import { TrendingUp, TrendingDown, Users, Clock, Calendar, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import type { ScheduleStats } from '@/types/scheduling'

/**
 * Schedule Stats Overview Component
 * 
 * Displays key scheduling metrics and performance indicators
 * with real-time updates and bilingual support.
 */

interface ScheduleStatsOverviewProps {
  stats?: ScheduleStats
  isLoading?: boolean
}

export function ScheduleStatsOverview({ stats, isLoading = false }: ScheduleStatsOverviewProps) {
  const { language } = useLanguage()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground">
          {language === 'ar' ? 'لا توجد إحصائيات متاحة' : 'No statistics available'}
        </CardContent>
      </Card>
    )
  }

  const utilizationColor = stats.utilization_percentage >= 80 ? 'text-green-600' : 
                           stats.utilization_percentage >= 60 ? 'text-yellow-600' : 
                           'text-red-600'

  return (
    <div className="space-y-4">
      {/* Utilization Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {language === 'ar' ? 'معدل الاستخدام' : 'Utilization Rate'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={cn('text-2xl font-bold', utilizationColor)}>
                {stats.utilization_percentage.toFixed(1)}%
              </span>
              <Badge variant={stats.utilization_percentage >= 75 ? 'default' : 'secondary'}>
                {stats.utilization_percentage >= 75 
                  ? (language === 'ar' ? 'مثالي' : 'Optimal')
                  : (language === 'ar' ? 'منخفض' : 'Low')
                }
              </Badge>
            </div>
            <Progress 
              value={stats.utilization_percentage} 
              className="h-2" 
            />
            <p className="text-xs text-muted-foreground">
              {stats.utilized_slots} / {stats.total_available_slots} {language === 'ar' ? 'فترة مستخدمة' : 'slots used'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            {language === 'ar' ? 'الجلسات النشطة' : 'Active Sessions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-2xl font-bold">
              {stats.total_sessions}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'مؤكدة' : 'Confirmed'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.confirmed_sessions}</span>
                  <Badge variant="outline" className="text-xs">
                    {((stats.confirmed_sessions / stats.total_sessions) * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'مكتملة' : 'Completed'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.completed_sessions}</span>
                  <Badge variant="outline" className="text-xs">
                    {((stats.completed_sessions / stats.total_sessions) * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>

              {stats.cancelled_sessions > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'ملغية' : 'Cancelled'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-red-600">{stats.cancelled_sessions}</span>
                    <Badge variant="destructive" className="text-xs">
                      {((stats.cancelled_sessions / stats.total_sessions) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Therapist Workload */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {language === 'ar' ? 'عبء العمل للمعالجين' : 'Therapist Workload'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'متوسط الجلسات/اليوم' : 'Avg Sessions/Day'}
              </span>
              <span className="font-medium">
                {stats.average_sessions_per_therapist.toFixed(1)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'إجمالي ساعات العمل' : 'Total Work Hours'}
              </span>
              <span className="font-medium">
                {stats.total_therapy_hours} {language === 'ar' ? 'ساعة' : 'hrs'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'المعالجين النشطين' : 'Active Therapists'}
              </span>
              <span className="font-medium">
                {stats.active_therapists}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conflicts & Issues */}
      {stats.conflicts_count > 0 && (
        <Card className="border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="w-4 h-4" />
              {language === 'ar' ? 'التضارب والمشاكل' : 'Conflicts & Issues'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'تضارب في الجدولة' : 'Schedule Conflicts'}
                </span>
                <Badge variant="destructive">
                  {stats.conflicts_count}
                </Badge>
              </div>

              {stats.overbooked_therapists > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'معالجين محملين زيادة' : 'Overbooked Therapists'}
                  </span>
                  <Badge variant="destructive">
                    {stats.overbooked_therapists}
                  </Badge>
                </div>
              )}

              {stats.room_conflicts > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'تضارب في الغرف' : 'Room Conflicts'}
                  </span>
                  <Badge variant="destructive">
                    {stats.room_conflicts}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {language === 'ar' ? 'مقاييس الأداء' : 'Performance Metrics'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'معدل الحضور' : 'Attendance Rate'}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-600">
                  {stats.attendance_rate?.toFixed(1) || '0'}%
                </span>
                <TrendingUp className="w-3 h-3 text-green-600" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'معدل الإلغاء' : 'Cancellation Rate'}
              </span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'font-medium',
                  (stats.cancellation_rate || 0) > 10 ? 'text-red-600' : 'text-green-600'
                )}>
                  {stats.cancellation_rate?.toFixed(1) || '0'}%
                </span>
                {(stats.cancellation_rate || 0) > 10 ? 
                  <TrendingUp className="w-3 h-3 text-red-600" /> :
                  <TrendingDown className="w-3 h-3 text-green-600" />
                }
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'متوسط مدة الجلسة' : 'Avg Session Duration'}
              </span>
              <span className="font-medium">
                {stats.average_session_duration || 0} {language === 'ar' ? 'دقيقة' : 'min'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      {stats.weekly_trend && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {language === 'ar' ? 'الاتجاه الأسبوعي' : 'Weekly Trend'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'مقارنة بالأسبوع الماضي' : 'vs Last Week'}
              </span>
              <div className="flex items-center gap-2">
                {stats.weekly_trend > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      +{stats.weekly_trend.toFixed(1)}%
                    </span>
                  </>
                ) : stats.weekly_trend < 0 ? (
                  <>
                    <TrendingDown className="w-3 h-3 text-red-600" />
                    <span className="text-sm font-medium text-red-600">
                      {stats.weekly_trend.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    0%
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}