/**
 * Service Delivery Efficiency Metrics Component
 * Displays efficiency analytics for therapy service delivery
 */

import React, { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ServiceDeliveryMetrics } from '@/types/analytics'
import {
  Clock,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Target,
  Zap,
  BarChart3,
  Activity,
  Timer
} from 'lucide-react'

interface ServiceDeliveryMetricsProps {
  data?: ServiceDeliveryMetrics
  language: 'ar' | 'en'
  timeframe?: 'week' | 'month' | 'quarter' | 'year'
}

const EFFICIENCY_COLORS = {
  excellent: '#22c55e',
  good: '#84cc16',
  average: '#f59e0b',
  poor: '#ef4444',
  utilization: '#3b82f6',
  productivity: '#8b5cf6'
}

const getEfficiencyLevel = (score: number) => {
  if (score >= 90) return { level: 'excellent', color: EFFICIENCY_COLORS.excellent }
  if (score >= 75) return { level: 'good', color: EFFICIENCY_COLORS.good }
  if (score >= 60) return { level: 'average', color: EFFICIENCY_COLORS.average }
  return { level: 'poor', color: EFFICIENCY_COLORS.poor }
}

const getEfficiencyLevelLabel = (level: string, language: 'ar' | 'en') => {
  const labels = {
    excellent: { ar: 'ممتاز', en: 'Excellent' },
    good: { ar: 'جيد', en: 'Good' },
    average: { ar: 'متوسط', en: 'Average' },
    poor: { ar: 'ضعيف', en: 'Poor' }
  }
  return labels[level as keyof typeof labels]?.[language] || level
}

// Mock data for demonstration
const generateMockData = (): ServiceDeliveryMetrics => ({
  overall_efficiency_score: 82,
  utilization_rate: 78,
  productivity_metrics: {
    sessions_per_therapist_per_day: 6.5,
    average_session_duration: 45,
    session_completion_rate: 94,
    no_show_rate: 8,
    cancellation_rate: 12
  },
  resource_utilization: {
    therapy_room_utilization: 85,
    equipment_utilization: 72,
    therapist_availability: 88,
    scheduling_efficiency: 76
  },
  quality_metrics: {
    client_satisfaction_score: 4.2,
    goal_achievement_rate: 71,
    treatment_adherence_rate: 89,
    documentation_completeness: 96
  },
  cost_efficiency: {
    cost_per_session: 180,
    revenue_per_session: 220,
    profit_margin: 18,
    operational_cost_ratio: 65
  },
  trends: {
    weekly_trends: Array.from({ length: 12 }, (_, i) => ({
      week: `Week ${i + 1}`,
      efficiency_score: 75 + Math.random() * 20,
      utilization_rate: 70 + Math.random() * 25,
      productivity_score: 65 + Math.random() * 30,
      quality_score: 80 + Math.random() * 15
    })),
    monthly_comparison: [
      { month: 'Jan', current_year: 78, previous_year: 72 },
      { month: 'Feb', current_year: 82, previous_year: 75 },
      { month: 'Mar', current_year: 85, previous_year: 78 },
      { month: 'Apr', current_year: 81, previous_year: 80 },
      { month: 'May', current_year: 86, previous_year: 82 },
      { month: 'Jun', current_year: 84, previous_year: 85 }
    ]
  },
  bottlenecks: [
    {
      area: 'scheduling',
      impact_score: 7.5,
      description_ar: 'تضارب في جدولة المواعيد',
      description_en: 'Scheduling conflicts'
    },
    {
      area: 'documentation',
      impact_score: 6.2,
      description_ar: 'تأخير في توثيق الجلسات',
      description_en: 'Delayed session documentation'
    },
    {
      area: 'resource_allocation',
      impact_score: 5.8,
      description_ar: 'عدم توزيع المعدات بكفاءة',
      description_en: 'Inefficient equipment allocation'
    }
  ],
  recommendations: [
    {
      priority: 'high',
      category: 'scheduling',
      title_ar: 'تحسين نظام الجدولة',
      title_en: 'Improve scheduling system',
      description_ar: 'تنفيذ نظام جدولة ذكي لتقليل التضارب',
      description_en: 'Implement smart scheduling to reduce conflicts',
      expected_impact: 15
    },
    {
      priority: 'medium',
      category: 'training',
      title_ar: 'تدريب الموظفين على الكفاءة',
      title_en: 'Staff efficiency training',
      description_ar: 'برنامج تدريبي لتحسين إنتاجية المعالجين',
      description_en: 'Training program to improve therapist productivity',
      expected_impact: 10
    }
  ]
})

export const ServiceDeliveryMetrics: React.FC<ServiceDeliveryMetricsProps> = ({
  data = generateMockData(),
  language,
  timeframe = 'month'
}) => {
  const [selectedMetric, setSelectedMetric] = useState('overall')
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe)

  const efficiencyLevel = getEfficiencyLevel(data.overall_efficiency_score)

  const kpiCards = [
    {
      title: language === 'ar' ? 'نقاط الكفاءة الإجمالية' : 'Overall Efficiency Score',
      value: data.overall_efficiency_score,
      format: 'percentage',
      icon: Target,
      color: efficiencyLevel.color,
      trend: 'up',
      change: 5.2
    },
    {
      title: language === 'ar' ? 'معدل الاستخدام' : 'Utilization Rate',
      value: data.utilization_rate,
      format: 'percentage',
      icon: BarChart3,
      color: EFFICIENCY_COLORS.utilization,
      trend: 'up',
      change: 3.1
    },
    {
      title: language === 'ar' ? 'الجلسات في اليوم' : 'Sessions Per Day',
      value: data.productivity_metrics.sessions_per_therapist_per_day,
      format: 'decimal',
      icon: Calendar,
      color: EFFICIENCY_COLORS.productivity,
      trend: 'stable',
      change: 0.2
    },
    {
      title: language === 'ar' ? 'معدل الإنجاز' : 'Completion Rate',
      value: data.productivity_metrics.session_completion_rate,
      format: 'percentage',
      icon: CheckCircle,
      color: EFFICIENCY_COLORS.excellent,
      trend: 'up',
      change: 2.3
    }
  ]

  const utilizationData = [
    {
      name: language === 'ar' ? 'غرف العلاج' : 'Therapy Rooms',
      value: data.resource_utilization.therapy_room_utilization,
      color: EFFICIENCY_COLORS.utilization
    },
    {
      name: language === 'ar' ? 'المعدات' : 'Equipment',
      value: data.resource_utilization.equipment_utilization,
      color: EFFICIENCY_COLORS.productivity
    },
    {
      name: language === 'ar' ? 'المعالجين' : 'Therapists',
      value: data.resource_utilization.therapist_availability,
      color: EFFICIENCY_COLORS.good
    },
    {
      name: language === 'ar' ? 'الجدولة' : 'Scheduling',
      value: data.resource_utilization.scheduling_efficiency,
      color: EFFICIENCY_COLORS.average
    }
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.dataKey?.includes('rate') || entry.dataKey?.includes('score') ? '%' : ''}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            {language === 'ar' ? 'مقاييس كفاءة الخدمة' : 'Service Delivery Efficiency'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? 'تحليل كفاءة تقديم الخدمات العلاجية'
              : 'Analysis of therapy service delivery efficiency'
            }
          </p>
        </div>
        <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">
              {language === 'ar' ? 'أسبوعي' : 'Weekly'}
            </SelectItem>
            <SelectItem value="month">
              {language === 'ar' ? 'شهري' : 'Monthly'}
            </SelectItem>
            <SelectItem value="quarter">
              {language === 'ar' ? 'ربع سنوي' : 'Quarterly'}
            </SelectItem>
            <SelectItem value="year">
              {language === 'ar' ? 'سنوي' : 'Yearly'}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => {
          const IconComponent = kpi.icon
          return (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <IconComponent className="h-8 w-8" style={{ color: kpi.color }} />
                    <div className="ml-3">
                      <div className="text-2xl font-bold" style={{ color: kpi.color }}>
                        {kpi.format === 'percentage' ? `${kpi.value}%` : 
                         kpi.format === 'decimal' ? kpi.value.toFixed(1) : 
                         kpi.value}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {kpi.title}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center text-xs ${
                      kpi.trend === 'up' ? 'text-green-600' :
                      kpi.trend === 'down' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : kpi.trend === 'down' ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : (
                        <Activity className="h-3 w-3 mr-1" />
                      )}
                      {kpi.change > 0 ? '+' : ''}{kpi.change}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="productivity">
            {language === 'ar' ? 'الإنتاجية' : 'Productivity'}
          </TabsTrigger>
          <TabsTrigger value="utilization">
            {language === 'ar' ? 'الاستخدام' : 'Utilization'}
          </TabsTrigger>
          <TabsTrigger value="quality">
            {language === 'ar' ? 'الجودة' : 'Quality'}
          </TabsTrigger>
          <TabsTrigger value="improvements">
            {language === 'ar' ? 'التحسينات' : 'Improvements'}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Efficiency Trends */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'اتجاهات الكفاءة' : 'Efficiency Trends'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trends.weekly_trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="efficiency_score"
                        stroke={EFFICIENCY_COLORS.excellent}
                        strokeWidth={2}
                        name={language === 'ar' ? 'نقاط الكفاءة' : 'Efficiency Score'}
                      />
                      <Line
                        type="monotone"
                        dataKey="utilization_rate"
                        stroke={EFFICIENCY_COLORS.utilization}
                        strokeWidth={2}
                        name={language === 'ar' ? 'معدل الاستخدام' : 'Utilization Rate'}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Resource Utilization */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'استخدام الموارد' : 'Resource Utilization'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {utilizationData.map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.name}</span>
                        <span className="font-medium">{item.value}%</span>
                      </div>
                      <Progress 
                        value={item.value} 
                        className="h-2"
                        style={{
                          ['--progress-background' as any]: item.color
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Year-over-Year Comparison */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'مقارنة السنة بالسنة' : 'Year-over-Year Comparison'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trends.monthly_comparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="current_year"
                        fill={EFFICIENCY_COLORS.utilization}
                        name={language === 'ar' ? 'السنة الحالية' : 'Current Year'}
                      />
                      <Bar
                        dataKey="previous_year"
                        fill={EFFICIENCY_COLORS.average}
                        name={language === 'ar' ? 'السنة السابقة' : 'Previous Year'}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Timer className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <div className="text-2xl font-bold">{data.productivity_metrics.average_session_duration}</div>
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'دقيقة متوسط الجلسة' : 'Avg Session Minutes'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <div className="text-2xl font-bold">{data.productivity_metrics.session_completion_rate}%</div>
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'معدل إنجاز الجلسات' : 'Session Completion'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                <div className="text-2xl font-bold">{data.productivity_metrics.no_show_rate}%</div>
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'معدل عدم الحضور' : 'No-Show Rate'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                <div className="text-2xl font-bold">{data.productivity_metrics.cancellation_rate}%</div>
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'معدل الإلغاء' : 'Cancellation Rate'}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Utilization Tab */}
        <TabsContent value="utilization" className="space-y-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" data={utilizationData}>
                <RadialBar
                  minAngle={15}
                  label={{ position: 'insideStart', fill: '#fff' }}
                  background
                  clockWise
                  dataKey="value"
                />
                <Legend iconSize={18} wrapperStyle={{ top: 0, left: 350 }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'مقاييس الجودة' : 'Quality Metrics'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{language === 'ar' ? 'رضا العملاء' : 'Client Satisfaction'}</span>
                      <span>{data.quality_metrics.client_satisfaction_score}/5</span>
                    </div>
                    <Progress value={data.quality_metrics.client_satisfaction_score * 20} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{language === 'ar' ? 'تحقيق الأهداف' : 'Goal Achievement'}</span>
                      <span>{data.quality_metrics.goal_achievement_rate}%</span>
                    </div>
                    <Progress value={data.quality_metrics.goal_achievement_rate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{language === 'ar' ? 'الالتزام بالعلاج' : 'Treatment Adherence'}</span>
                      <span>{data.quality_metrics.treatment_adherence_rate}%</span>
                    </div>
                    <Progress value={data.quality_metrics.treatment_adherence_rate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{language === 'ar' ? 'اكتمال التوثيق' : 'Documentation Complete'}</span>
                      <span>{data.quality_metrics.documentation_completeness}%</span>
                    </div>
                    <Progress value={data.quality_metrics.documentation_completeness} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Efficiency */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'كفاءة التكلفة' : 'Cost Efficiency'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'تكلفة الجلسة:' : 'Cost per Session:'}
                    </span>
                    <span className="font-medium">{data.cost_efficiency.cost_per_session} ر.س</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'إيراد الجلسة:' : 'Revenue per Session:'}
                    </span>
                    <span className="font-medium">{data.cost_efficiency.revenue_per_session} ر.س</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'هامش الربح:' : 'Profit Margin:'}
                    </span>
                    <span className="font-medium text-green-600">{data.cost_efficiency.profit_margin}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'نسبة التكلفة التشغيلية:' : 'Operational Cost Ratio:'}
                    </span>
                    <span className="font-medium">{data.cost_efficiency.operational_cost_ratio}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Improvements Tab */}
        <TabsContent value="improvements" className="space-y-6">
          {/* Bottlenecks */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? 'العقد الضيقة' : 'Identified Bottlenecks'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'المناطق التي تحتاج إلى تحسين لزيادة الكفاءة'
                  : 'Areas that need improvement to increase efficiency'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.bottlenecks.map((bottleneck, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">
                        {language === 'ar' ? bottleneck.description_ar : bottleneck.description_en}
                      </h4>
                      <p className="text-sm text-muted-foreground capitalize">
                        {bottleneck.area.replace('_', ' ')}
                      </p>
                    </div>
                    <Badge 
                      variant={bottleneck.impact_score >= 7 ? 'destructive' : bottleneck.impact_score >= 5 ? 'warning' : 'secondary'}
                    >
                      {language === 'ar' ? 'التأثير:' : 'Impact:'} {bottleneck.impact_score}/10
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? 'التوصيات للتحسين' : 'Improvement Recommendations'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recommendations.map((rec, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">
                        {language === 'ar' ? rec.title_ar : rec.title_en}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          rec.priority === 'high' ? 'destructive' :
                          rec.priority === 'medium' ? 'warning' : 'secondary'
                        }>
                          {rec.priority}
                        </Badge>
                        <Badge variant="outline">
                          +{rec.expected_impact}%
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? rec.description_ar : rec.description_en}
                    </p>
                    <div className="mt-3">
                      <span className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'التأثير المتوقع:' : 'Expected Impact:'}
                      </span>
                      <Progress value={rec.expected_impact * 5} className="h-2 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ServiceDeliveryMetrics