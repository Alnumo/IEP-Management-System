/**
 * Behavioral Trends Chart Component
 * Displays behavioral analytics and intervention tracking
 */

import React, { useState } from 'react'
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
  BarChart,
  Bar,
  ScatterChart,
  Scatter
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BehavioralTrends } from '@/types/progress-analytics'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Target,
  Clock,
  Activity
} from 'lucide-react'

interface BehavioralTrendsChartProps {
  data: BehavioralTrends
  language: 'ar' | 'en'
  viewType?: 'summary' | 'detailed' | 'intervention'
}

const BEHAVIOR_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#6b7280',
  intervention: '#3b82f6'
}

const getBehaviorTypeColor = (type: string) => {
  switch (type) {
    case 'positive':
    case 'appropriate':
      return BEHAVIOR_COLORS.positive
    case 'negative':
    case 'challenging':
      return BEHAVIOR_COLORS.negative
    case 'intervention':
      return BEHAVIOR_COLORS.intervention
    default:
      return BEHAVIOR_COLORS.neutral
  }
}

const getBehaviorSeverityBadge = (severity: string, language: 'ar' | 'en') => {
  const variants = {
    low: 'secondary',
    medium: 'warning',
    high: 'destructive',
    critical: 'destructive'
  } as const

  const labels = {
    low: { ar: 'منخفض', en: 'Low' },
    medium: { ar: 'متوسط', en: 'Medium' },
    high: { ar: 'مرتفع', en: 'High' },
    critical: { ar: 'حرج', en: 'Critical' }
  }

  return {
    variant: variants[severity as keyof typeof variants] || 'secondary',
    label: labels[severity as keyof typeof labels]?.[language] || severity
  }
}

export const BehavioralTrendsChart: React.FC<BehavioralTrendsChartProps> = ({
  data,
  language,
  viewType = 'summary'
}) => {
  const [selectedBehavior, setSelectedBehavior] = useState<string>('all')
  const [timeframe, setTimeframe] = useState<string>('30days')

  if (!data) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        {language === 'ar' ? 'لا توجد بيانات سلوكية' : 'No behavioral data available'}
      </div>
    )
  }

  // Process data for charts
  const processedTrendData = data.weekly_trends?.map(week => ({
    ...week,
    week: week.week_start,
    positive_rate: (week.positive_behaviors / (week.total_incidents || 1)) * 100,
    negative_rate: (week.challenging_behaviors / (week.total_incidents || 1)) * 100,
    intervention_success_rate: week.intervention_success_rate || 0
  })) || []

  const processedInterventions = data.intervention_effectiveness?.map(intervention => ({
    ...intervention,
    success_percentage: (intervention.successful_instances / intervention.total_instances) * 100,
    frequency: intervention.total_instances
  })) || []

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.dataKey?.includes('rate') || entry.dataKey?.includes('percentage') ? '%' : ''}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderSummaryView = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-green-600">
                  {data.positive_behavior_trend || 0}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'السلوك الإيجابي' : 'Positive Behaviors'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-red-600">
                  {data.challenging_behavior_frequency || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'السلوك التحدي' : 'Challenging Behaviors'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-blue-600">
                  {data.intervention_success_rate || 0}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'نجاح التدخل' : 'Intervention Success'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-purple-600">
                  {data.behavioral_goals_met || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'الأهداف المحققة' : 'Goals Met'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'اتجاهات السلوك الأسبوعية' : 'Weekly Behavioral Trends'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={processedTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="positive_rate"
                  stackId="1"
                  stroke={BEHAVIOR_COLORS.positive}
                  fill={BEHAVIOR_COLORS.positive}
                  fillOpacity={0.6}
                  name={language === 'ar' ? 'السلوك الإيجابي %' : 'Positive Behaviors %'}
                />
                <Area
                  type="monotone"
                  dataKey="negative_rate"
                  stackId="1"
                  stroke={BEHAVIOR_COLORS.negative}
                  fill={BEHAVIOR_COLORS.negative}
                  fillOpacity={0.6}
                  name={language === 'ar' ? 'السلوك التحدي %' : 'Challenging Behaviors %'}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Priority Behaviors */}
      {data.priority_behaviors && data.priority_behaviors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'ar' ? 'السلوكيات ذات الأولوية' : 'Priority Behaviors'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.priority_behaviors.map((behavior, index) => {
                const severity = getBehaviorSeverityBadge(behavior.severity, language)
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{behavior.behavior_name}</h4>
                      <p className="text-sm text-muted-foreground">{behavior.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={severity.variant}>
                          {severity.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'التكرار:' : 'Frequency:'} {behavior.frequency}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {behavior.trend_direction === 'improving' ? (
                          <TrendingDown className="h-5 w-5 text-green-600" />
                        ) : behavior.trend_direction === 'worsening' ? (
                          <TrendingUp className="h-5 w-5 text-red-600" />
                        ) : (
                          <div className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderDetailedView = () => (
    <div className="space-y-6">
      {/* Detailed Behavior Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'تحليل السلوك المفصل' : 'Detailed Behavior Analysis'}
          </CardTitle>
          <div className="flex gap-2">
            <Select value={selectedBehavior} onValueChange={setSelectedBehavior}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === 'ar' ? 'جميع السلوكيات' : 'All Behaviors'}
                </SelectItem>
                <SelectItem value="positive">
                  {language === 'ar' ? 'السلوك الإيجابي' : 'Positive Behaviors'}
                </SelectItem>
                <SelectItem value="challenging">
                  {language === 'ar' ? 'السلوك التحدي' : 'Challenging Behaviors'}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">
                  {language === 'ar' ? '7 أيام' : '7 Days'}
                </SelectItem>
                <SelectItem value="30days">
                  {language === 'ar' ? '30 يوم' : '30 Days'}
                </SelectItem>
                <SelectItem value="90days">
                  {language === 'ar' ? '90 يوم' : '90 Days'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="positive_behaviors"
                  stroke={BEHAVIOR_COLORS.positive}
                  strokeWidth={2}
                  name={language === 'ar' ? 'السلوك الإيجابي' : 'Positive Behaviors'}
                />
                <Line
                  type="monotone"
                  dataKey="challenging_behaviors"
                  stroke={BEHAVIOR_COLORS.negative}
                  strokeWidth={2}
                  name={language === 'ar' ? 'السلوك التحدي' : 'Challenging Behaviors'}
                />
                <Line
                  type="monotone"
                  dataKey="intervention_success_rate"
                  stroke={BEHAVIOR_COLORS.intervention}
                  strokeWidth={2}
                  name={language === 'ar' ? 'معدل نجاح التدخل' : 'Intervention Success Rate'}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderInterventionView = () => (
    <div className="space-y-6">
      {/* Intervention Effectiveness */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'فعالية التدخلات' : 'Intervention Effectiveness'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={processedInterventions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="frequency" 
                  name={language === 'ar' ? 'التكرار' : 'Frequency'} 
                />
                <YAxis 
                  dataKey="success_percentage" 
                  name={language === 'ar' ? 'نسبة النجاح' : 'Success Rate'} 
                  domain={[0, 100]}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
                          <p className="font-medium">{data.intervention_type}</p>
                          <p className="text-sm text-blue-600">
                            {language === 'ar' ? 'نسبة النجاح:' : 'Success Rate:'} {data.success_percentage.toFixed(1)}%
                          </p>
                          <p className="text-sm text-gray-600">
                            {language === 'ar' ? 'التكرار:' : 'Frequency:'} {data.frequency}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter 
                  dataKey="success_percentage" 
                  fill={BEHAVIOR_COLORS.intervention}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Intervention Details */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'تفاصيل التدخلات' : 'Intervention Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {processedInterventions.map((intervention, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{intervention.intervention_type}</h4>
                  <Badge variant={intervention.success_percentage >= 70 ? 'success' : intervention.success_percentage >= 50 ? 'warning' : 'destructive'}>
                    {intervention.success_percentage.toFixed(1)}% 
                    {language === 'ar' ? ' نجاح' : ' Success'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {intervention.description}
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {language === 'ar' ? 'الاستخدامات:' : 'Uses:'}
                    </span>
                    <div className="font-medium">{intervention.total_instances}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {language === 'ar' ? 'النجح:' : 'Successful:'}
                    </span>
                    <div className="font-medium text-green-600">
                      {intervention.successful_instances}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {language === 'ar' ? 'آخر استخدام:' : 'Last Used:'}
                    </span>
                    <div className="font-medium">{intervention.last_used_date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  switch (viewType) {
    case 'detailed':
      return renderDetailedView()
    case 'intervention':
      return renderInterventionView()
    default:
      return renderSummaryView()
  }
}

export default BehavioralTrendsChart