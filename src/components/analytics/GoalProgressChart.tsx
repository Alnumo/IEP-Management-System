/**
 * Goal Progress Chart Component
 * Displays progress charts for IEP goals with bilingual support
 */

import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { GoalProgressMetrics } from '@/types/progress-analytics'

interface GoalProgressChartProps {
  data: GoalProgressMetrics[]
  language: 'ar' | 'en'
  chartType?: 'bar' | 'pie' | 'progress'
}

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6']

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
    case 'mastered':
      return 'success'
    case 'in_progress':
      return 'warning'
    case 'not_started':
      return 'secondary'
    case 'at_risk':
      return 'destructive'
    default:
      return 'secondary'
  }
}

const getStatusLabel = (status: string, language: 'ar' | 'en') => {
  const labels = {
    completed: { ar: 'مكتمل', en: 'Completed' },
    mastered: { ar: 'متقن', en: 'Mastered' },
    in_progress: { ar: 'قيد التنفيذ', en: 'In Progress' },
    not_started: { ar: 'لم يبدأ', en: 'Not Started' },
    at_risk: { ar: 'في خطر', en: 'At Risk' }
  }
  return labels[status as keyof typeof labels]?.[language] || status
}

export const GoalProgressChart: React.FC<GoalProgressChartProps> = ({
  data,
  language,
  chartType = 'progress'
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        {language === 'ar' ? 'لا توجد بيانات للأهداف' : 'No goal data available'}
      </div>
    )
  }

  // Prepare data for charts
  const chartData = data.map((goal, index) => ({
    name: goal.goal_name.length > 30 
      ? `${goal.goal_name.substring(0, 30)}...`
      : goal.goal_name,
    fullName: goal.goal_name,
    progress: goal.progress_percentage,
    current: goal.current_value,
    target: goal.target_value,
    baseline: goal.baseline_value,
    status: goal.status,
    therapy_type: goal.therapy_type,
    color: COLORS[index % COLORS.length]
  }))

  // Status distribution for pie chart
  const statusDistribution = data.reduce((acc, goal) => {
    const status = goal.status || 'not_started'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(statusDistribution).map(([status, count], index) => ({
    name: getStatusLabel(status, language),
    value: count,
    color: COLORS[index % COLORS.length]
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.fullName}</p>
          <p className="text-sm text-blue-600">
            {language === 'ar' ? 'التقدم:' : 'Progress:'} {data.progress}%
          </p>
          <p className="text-sm text-gray-600">
            {language === 'ar' ? 'الحالي:' : 'Current:'} {data.current} / {data.target}
          </p>
          <Badge variant={getStatusColor(data.status)} className="mt-1">
            {getStatusLabel(data.status, language)}
          </Badge>
        </div>
      )
    }
    return null
  }

  switch (chartType) {
    case 'bar':
      return (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={language === 'ar' ? 45 : -45}
                textAnchor={language === 'ar' ? 'start' : 'end'}
                height={60}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="progress" 
                fill="#3b82f6"
                name={language === 'ar' ? 'نسبة التقدم %' : 'Progress %'}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )

    case 'pie':
      return (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )

    case 'progress':
    default:
      return (
        <div className="space-y-4">
          {data.map((goal, index) => (
            <div key={goal.goal_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate" title={goal.goal_name}>
                    {goal.goal_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={getStatusColor(goal.status)} className="text-xs">
                      {getStatusLabel(goal.status, language)}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">
                      {goal.therapy_type}
                    </span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-bold text-lg">{goal.progress_percentage}%</div>
                  <div className="text-xs text-muted-foreground">
                    {goal.current_value} / {goal.target_value}
                  </div>
                </div>
              </div>
              
              <Progress 
                value={goal.progress_percentage} 
                className="h-2"
                style={{
                  ['--progress-background' as any]: COLORS[index % COLORS.length]
                }}
              />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {language === 'ar' ? 'الخط الأساسي:' : 'Baseline:'} {goal.baseline_value}
                </span>
                {goal.velocity !== undefined && (
                  <span>
                    {language === 'ar' ? 'السرعة:' : 'Velocity:'} {goal.velocity.toFixed(1)}/
                    {language === 'ar' ? 'أسبوع' : 'week'}
                  </span>
                )}
                <span className={`flex items-center ${
                  goal.trend === 'improving' ? 'text-green-600' :
                  goal.trend === 'declining' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {goal.trend === 'improving' ? '↗' :
                   goal.trend === 'declining' ? '↘' : '→'}
                  {language === 'ar' ? 
                    (goal.trend === 'improving' ? 'تحسن' :
                     goal.trend === 'declining' ? 'تراجع' : 'مستقر') :
                    goal.trend
                  }
                </span>
              </div>

              {goal.projected_completion_date && (
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  {language === 'ar' ? 'التاريخ المتوقع للإنجاز:' : 'Projected completion:'} {goal.projected_completion_date}
                </div>
              )}
            </div>
          ))}
        </div>
      )
  }
}

export default GoalProgressChart