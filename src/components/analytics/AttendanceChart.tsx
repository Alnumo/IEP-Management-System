/**
 * Attendance Chart Component
 * Displays attendance metrics and trends with bilingual support
 */

import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { AttendanceMetrics } from '@/types/progress-analytics'
import { Calendar, Users, TrendingUp, AlertTriangle } from 'lucide-react'

interface AttendanceChartProps {
  data: AttendanceMetrics
  language: 'ar' | 'en'
  chartType?: 'overview' | 'trend' | 'breakdown' | 'comparison'
}

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1']

export const AttendanceChart: React.FC<AttendanceChartProps> = ({
  data,
  language,
  chartType = 'overview'
}) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        {language === 'ar' ? 'لا توجد بيانات حضور' : 'No attendance data available'}
      </div>
    )
  }

  // Prepare data for different chart types
  const overviewData = [
    {
      name: language === 'ar' ? 'حضر' : 'Attended',
      value: data.attended_sessions,
      color: COLORS[0]
    },
    {
      name: language === 'ar' ? 'ألغي' : 'Cancelled',
      value: data.cancelled_sessions,
      color: COLORS[2]
    },
    {
      name: language === 'ar' ? 'تعويضي' : 'Makeup',
      value: data.makeup_sessions,
      color: COLORS[1]
    }
  ]

  const getAttendanceTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600'
      case 'declining':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getAttendanceTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '↗'
      case 'declining':
        return '↘'
      default:
        return '→'
    }
  }

  const getAttendanceTrendLabel = (trend: string) => {
    if (language === 'ar') {
      switch (trend) {
        case 'improving':
          return 'تحسن'
        case 'declining':
          return 'تراجع'
        default:
          return 'مستقر'
      }
    }
    return trend
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.dataKey === 'attendance_rate' ? '%' : ''}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  switch (chartType) {
    case 'trend':
      return (
        <div className="space-y-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthly_breakdown || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="attendance_rate"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name={language === 'ar' ? 'معدل الحضور %' : 'Attendance Rate %'}
                />
                <Line
                  type="monotone"
                  dataKey="consistency_score"
                  stroke="#10b981"
                  strokeWidth={2}
                  name={language === 'ar' ? 'درجة الاستمرارية' : 'Consistency Score'}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.attendance_percentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                {language === 'ar' ? 'معدل الحضور الإجمالي' : 'Overall Attendance Rate'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.consistency_score}
              </div>
              <div className="text-sm text-muted-foreground">
                {language === 'ar' ? 'درجة الاستمرارية' : 'Consistency Score'}
              </div>
            </div>
          </div>
        </div>
      )

    case 'breakdown':
      return (
        <div className="space-y-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly_breakdown || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="attended" 
                  fill="#22c55e"
                  name={language === 'ar' ? 'حضر' : 'Attended'}
                />
                <Bar 
                  dataKey="cancelled" 
                  fill="#ef4444"
                  name={language === 'ar' ? 'ألغي' : 'Cancelled'}
                />
                <Bar 
                  dataKey="makeup" 
                  fill="#f59e0b"
                  name={language === 'ar' ? 'تعويضي' : 'Makeup'}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )

    case 'comparison':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64">
            <h4 className="text-sm font-medium mb-2">
              {language === 'ar' ? 'توزيع الجلسات' : 'Session Distribution'}
            </h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overviewData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {overviewData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              {language === 'ar' ? 'إحصائيات مفصلة' : 'Detailed Statistics'}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إجمالي الجلسات المجدولة:' : 'Total Scheduled:'}
                </span>
                <span className="font-medium">{data.total_scheduled_sessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'الجلسات المحضورة:' : 'Attended:'}
                </span>
                <span className="font-medium text-green-600">{data.attended_sessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'الجلسات الملغاة:' : 'Cancelled:'}
                </span>
                <span className="font-medium text-red-600">{data.cancelled_sessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'الجلسات التعويضية:' : 'Makeup:'}
                </span>
                <span className="font-medium text-yellow-600">{data.makeup_sessions}</span>
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'اتجاه الحضور:' : 'Attendance Trend:'}
                </span>
                <div className={`flex items-center ${getAttendanceTrendColor(data.attendance_trend)}`}>
                  <span className="mr-1">{getAttendanceTrendIcon(data.attendance_trend)}</span>
                  <span className="text-sm font-medium">
                    {getAttendanceTrendLabel(data.attendance_trend)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )

    case 'overview':
    default:
      return (
        <div className="space-y-4">
          {/* Main Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-500" />
                  <div className="ml-3">
                    <div className="text-2xl font-bold">{data.attendance_percentage}%</div>
                    <div className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'معدل الحضور' : 'Attendance Rate'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div className="ml-3">
                    <div className="text-2xl font-bold">{data.consistency_score}</div>
                    <div className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'درجة الاستمرارية' : 'Consistency Score'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bars */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{language === 'ar' ? 'الجلسات المحضورة' : 'Attended Sessions'}</span>
                <span>{data.attended_sessions} / {data.total_scheduled_sessions}</span>
              </div>
              <Progress 
                value={(data.attended_sessions / data.total_scheduled_sessions) * 100} 
                className="h-2"
              />
            </div>

            {data.cancelled_sessions > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-red-600">
                    {language === 'ar' ? 'الجلسات الملغاة' : 'Cancelled Sessions'}
                  </span>
                  <span>{data.cancelled_sessions}</span>
                </div>
                <Progress 
                  value={(data.cancelled_sessions / data.total_scheduled_sessions) * 100} 
                  className="h-2 [&>*]:bg-red-500"
                />
              </div>
            )}

            {data.makeup_sessions > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-yellow-600">
                    {language === 'ar' ? 'الجلسات التعويضية' : 'Makeup Sessions'}
                  </span>
                  <span>{data.makeup_sessions}</span>
                </div>
                <Progress 
                  value={(data.makeup_sessions / data.total_scheduled_sessions) * 100} 
                  className="h-2 [&>*]:bg-yellow-500"
                />
              </div>
            )}
          </div>

          {/* Trend Indicator */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">
              {language === 'ar' ? 'الاتجاه:' : 'Trend:'}
            </span>
            <Badge 
              variant={
                data.attendance_trend === 'improving' ? 'success' :
                data.attendance_trend === 'declining' ? 'destructive' :
                'secondary'
              }
              className="flex items-center"
            >
              <span className="mr-1">{getAttendanceTrendIcon(data.attendance_trend)}</span>
              {getAttendanceTrendLabel(data.attendance_trend)}
            </Badge>
          </div>
        </div>
      )
  }
}

export default AttendanceChart