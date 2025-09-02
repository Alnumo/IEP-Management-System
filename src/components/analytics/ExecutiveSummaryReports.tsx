/**
 * Executive Summary Reports Component
 * Provides high-level executive dashboard and reports for administrators
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExportOptions } from './ExportOptions'
import type { ExecutiveSummary } from '@/types/analytics'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  FileText,
  Download
} from 'lucide-react'

interface ExecutiveSummaryReportsProps {
  data?: ExecutiveSummary
  language: 'ar' | 'en'
  dateRange?: {
    start: string
    end: string
  }
}

const EXECUTIVE_COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  secondary: '#6b7280',
  revenue: '#8b5cf6',
  efficiency: '#14b8a6'
}

// Mock executive summary data
const generateMockExecutiveSummary = (): ExecutiveSummary => ({
  overview: {
    total_revenue: 1250000,
    total_sessions: 8420,
    active_students: 342,
    therapist_utilization: 84,
    overall_satisfaction: 4.6,
    growth_rate: 12.5,
    profit_margin: 22.3,
    operational_efficiency: 87
  },
  financial_metrics: {
    monthly_revenue: [
      { month: 'Jan', revenue: 180000, costs: 140000, profit: 40000 },
      { month: 'Feb', revenue: 195000, costs: 145000, profit: 50000 },
      { month: 'Mar', revenue: 210000, costs: 152000, profit: 58000 },
      { month: 'Apr', revenue: 225000, costs: 158000, profit: 67000 },
      { month: 'May', revenue: 240000, costs: 165000, profit: 75000 },
      { month: 'Jun', revenue: 200000, costs: 160000, profit: 40000 }
    ],
    revenue_by_service: [
      { service: 'ABA Therapy', revenue: 450000, percentage: 36 },
      { service: 'Speech Therapy', revenue: 380000, percentage: 30.4 },
      { service: 'Occupational Therapy', revenue: 280000, percentage: 22.4 },
      { service: 'Assessments', revenue: 140000, percentage: 11.2 }
    ],
    cost_breakdown: [
      { category: 'Staff Salaries', amount: 720000, percentage: 57.6 },
      { category: 'Facility Costs', amount: 180000, percentage: 14.4 },
      { category: 'Equipment', amount: 125000, percentage: 10 },
      { category: 'Administrative', amount: 100000, percentage: 8 },
      { category: 'Other', amount: 125000, percentage: 10 }
    ]
  },
  operational_metrics: {
    capacity_utilization: 78,
    therapist_productivity: 85,
    session_efficiency: 82,
    quality_scores: [
      { metric: 'Client Satisfaction', score: 4.6, target: 4.5 },
      { metric: 'Goal Achievement', score: 78, target: 75 },
      { metric: 'Session Completion', score: 94, target: 90 },
      { metric: 'Documentation Quality', score: 96, target: 95 }
    ],
    regional_performance: [
      { region: 'Riyadh North', sessions: 2840, satisfaction: 4.7, efficiency: 89 },
      { region: 'Riyadh Central', sessions: 3200, satisfaction: 4.5, efficiency: 85 },
      { region: 'Riyadh South', sessions: 2380, satisfaction: 4.6, efficiency: 87 }
    ]
  },
  key_insights: [
    {
      category: 'revenue',
      title_ar: 'نمو الإيرادات القوي',
      title_en: 'Strong Revenue Growth',
      description_ar: 'نمو الإيرادات بنسبة 12.5% مقارنة بالربع السابق',
      description_en: '12.5% revenue growth compared to previous quarter',
      impact: 'positive',
      priority: 'high'
    },
    {
      category: 'efficiency',
      title_ar: 'تحسن في الكفاءة التشغيلية',
      title_en: 'Improved Operational Efficiency',
      description_ar: 'زيادة الكفاءة التشغيلية إلى 87% من 82% الربع السابق',
      description_en: 'Operational efficiency increased to 87% from 82% last quarter',
      impact: 'positive',
      priority: 'medium'
    },
    {
      category: 'capacity',
      title_ar: 'فرصة لزيادة السعة',
      title_en: 'Capacity Expansion Opportunity',
      description_ar: 'استخدام السعة بنسبة 78% يشير إلى إمكانية التوسع',
      description_en: '78% capacity utilization indicates expansion opportunity',
      impact: 'neutral',
      priority: 'medium'
    }
  ],
  strategic_recommendations: [
    {
      category: 'growth',
      title_ar: 'توسيع الخدمات في الرياض الشمالية',
      title_en: 'Expand Services in North Riyadh',
      description_ar: 'الطلب المرتفع والرضا الممتاز يبرران التوسع',
      description_en: 'High demand and excellent satisfaction justify expansion',
      expected_impact: 15,
      timeline: '3-6 months',
      investment_required: 500000
    },
    {
      category: 'efficiency',
      title_ar: 'تحسين نظام الجدولة المركزي',
      title_en: 'Improve Central Scheduling System',
      description_ar: 'تقليل أوقات الانتظار وزيادة استخدام المعالجين',
      description_en: 'Reduce wait times and increase therapist utilization',
      expected_impact: 8,
      timeline: '1-2 months',
      investment_required: 150000
    },
    {
      category: 'quality',
      title_ar: 'برنامج تدريب المعالجين المتقدم',
      title_en: 'Advanced Therapist Training Program',
      description_ar: 'تحسين نتائج العلاج ورضا العملاء',
      description_en: 'Improve treatment outcomes and client satisfaction',
      expected_impact: 12,
      timeline: '2-4 months',
      investment_required: 200000
    }
  ],
  risk_factors: [
    {
      risk: 'Staff Turnover',
      risk_ar: 'دوران الموظفين',
      probability: 'medium',
      impact: 'high',
      mitigation: 'Implement retention programs',
      mitigation_ar: 'تطبيق برامج الاحتفاظ بالموظفين'
    },
    {
      risk: 'Increased Competition',
      risk_ar: 'زيادة المنافسة',
      probability: 'high',
      impact: 'medium',
      mitigation: 'Strengthen service differentiation',
      mitigation_ar: 'تعزيز تمييز الخدمات'
    }
  ]
})

export const ExecutiveSummaryReports: React.FC<ExecutiveSummaryReportsProps> = ({
  data = generateMockExecutiveSummary(),
  language,
  dateRange = {
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  }
}) => {
  const [selectedView, setSelectedView] = useState('overview')
  const [selectedRegion, setSelectedRegion] = useState('all')

  const executiveKPIs = [
    {
      title: language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: data.overview.total_revenue,
      format: 'currency',
      icon: DollarSign,
      color: EXECUTIVE_COLORS.revenue,
      change: data.overview.growth_rate,
      trend: 'up'
    },
    {
      title: language === 'ar' ? 'الطلاب النشطون' : 'Active Students',
      value: data.overview.active_students,
      format: 'number',
      icon: Users,
      color: EXECUTIVE_COLORS.primary,
      change: 8.3,
      trend: 'up'
    },
    {
      title: language === 'ar' ? 'هامش الربح' : 'Profit Margin',
      value: data.overview.profit_margin,
      format: 'percentage',
      icon: TrendingUp,
      color: EXECUTIVE_COLORS.success,
      change: 2.1,
      trend: 'up'
    },
    {
      title: language === 'ar' ? 'الكفاءة التشغيلية' : 'Operational Efficiency',
      value: data.overview.operational_efficiency,
      format: 'percentage',
      icon: Target,
      color: EXECUTIVE_COLORS.efficiency,
      change: 3.7,
      trend: 'up'
    },
    {
      title: language === 'ar' ? 'رضا العملاء' : 'Client Satisfaction',
      value: data.overview.overall_satisfaction,
      format: 'rating',
      icon: Award,
      color: EXECUTIVE_COLORS.warning,
      change: 0.2,
      trend: 'up'
    },
    {
      title: language === 'ar' ? 'إجمالي الجلسات' : 'Total Sessions',
      value: data.overview.total_sessions,
      format: 'number',
      icon: Calendar,
      color: EXECUTIVE_COLORS.secondary,
      change: 15.8,
      trend: 'up'
    }
  ]

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return `${(value / 1000).toFixed(0)}K ر.س`
      case 'percentage':
        return `${value}%`
      case 'rating':
        return `${value}/5`
      case 'number':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  const getInsightIcon = (category: string) => {
    switch (category) {
      case 'revenue':
        return <DollarSign className="h-4 w-4" />
      case 'efficiency':
        return <Target className="h-4 w-4" />
      case 'capacity':
        return <Building className="h-4 w-4" />
      default:
        return <BarChart3 className="h-4 w-4" />
    }
  }

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'success'
      case 'negative':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
              {entry.dataKey === 'revenue' || entry.dataKey === 'costs' || entry.dataKey === 'profit' ? ' ر.س' : ''}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Options */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <BarChart3 className="h-6 w-6 mr-2" />
            {language === 'ar' ? 'التقارير التنفيذية' : 'Executive Summary Reports'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'ar' 
              ? `نظرة عامة شاملة للأداء من ${dateRange.start} إلى ${dateRange.end}`
              : `Comprehensive performance overview from ${dateRange.start} to ${dateRange.end}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {language === 'ar' ? 'جميع المناطق' : 'All Regions'}
              </SelectItem>
              <SelectItem value="north">
                {language === 'ar' ? 'الرياض الشمالية' : 'North Riyadh'}
              </SelectItem>
              <SelectItem value="central">
                {language === 'ar' ? 'الرياض الوسط' : 'Central Riyadh'}
              </SelectItem>
              <SelectItem value="south">
                {language === 'ar' ? 'الرياض الجنوبية' : 'South Riyadh'}
              </SelectItem>
            </SelectContent>
          </Select>
          <ExportOptions 
            data={data}
            filename={`executive-summary-${Date.now()}`}
            formats={['pdf', 'excel', 'csv']}
            includeCharts={true}
          />
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {executiveKPIs.map((kpi, index) => {
          const IconComponent = kpi.icon
          return (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <IconComponent className="h-8 w-8" style={{ color: kpi.color }} />
                  <div className={`flex items-center text-xs ${
                    kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {kpi.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {kpi.change > 0 ? '+' : ''}{kpi.change}%
                  </div>
                </div>
                <div className="text-2xl font-bold" style={{ color: kpi.color }}>
                  {formatValue(kpi.value, kpi.format)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {kpi.title}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="financial">
            {language === 'ar' ? 'المالية' : 'Financial'}
          </TabsTrigger>
          <TabsTrigger value="operational">
            {language === 'ar' ? 'التشغيلية' : 'Operational'}
          </TabsTrigger>
          <TabsTrigger value="insights">
            {language === 'ar' ? 'الرؤى' : 'Insights'}
          </TabsTrigger>
          <TabsTrigger value="strategy">
            {language === 'ar' ? 'الاستراتيجية' : 'Strategy'}
          </TabsTrigger>
          <TabsTrigger value="risks">
            {language === 'ar' ? 'المخاطر' : 'Risks'}
          </TabsTrigger>
        </TabsList>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'اتجاه الإيرادات والأرباح' : 'Revenue & Profit Trend'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.financial_metrics.monthly_revenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stackId="1"
                        stroke={EXECUTIVE_COLORS.primary}
                        fill={EXECUTIVE_COLORS.primary}
                        fillOpacity={0.6}
                        name={language === 'ar' ? 'الإيرادات' : 'Revenue'}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stackId="2"
                        stroke={EXECUTIVE_COLORS.success}
                        fill={EXECUTIVE_COLORS.success}
                        fillOpacity={0.8}
                        name={language === 'ar' ? 'الربح' : 'Profit'}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Service */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'الإيرادات حسب الخدمة' : 'Revenue by Service'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.financial_metrics.revenue_by_service}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ service, percentage }) => `${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {data.financial_metrics.revenue_by_service.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(EXECUTIVE_COLORS)[index % Object.values(EXECUTIVE_COLORS).length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={([value]: [number]) => [`${(value / 1000).toFixed(0)}K ر.س`, language === 'ar' ? 'الإيرادات' : 'Revenue']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'تفصيل التكاليف' : 'Cost Breakdown'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.financial_metrics.cost_breakdown.map((cost, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{cost.category}</span>
                        <span className="font-medium">{(cost.amount / 1000).toFixed(0)}K ر.س ({cost.percentage}%)</span>
                      </div>
                      <Progress value={cost.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Operational Tab */}
        <TabsContent value="operational" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quality Scores */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'مقاييس الجودة' : 'Quality Metrics'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.operational_metrics.quality_scores}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" angle={-45} textAnchor="end" height={60} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="score" fill={EXECUTIVE_COLORS.primary} name={language === 'ar' ? 'النتيجة' : 'Score'} />
                      <Bar dataKey="target" fill={EXECUTIVE_COLORS.secondary} name={language === 'ar' ? 'الهدف' : 'Target'} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Regional Performance */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'الأداء الإقليمي' : 'Regional Performance'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.operational_metrics.regional_performance.map((region, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{region.region}</h4>
                        <Badge variant="secondary">{region.sessions.toLocaleString()} جلسة</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'ar' ? 'الرضا:' : 'Satisfaction:'}
                          </span>
                          <div className="font-medium">{region.satisfaction}/5</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'ar' ? 'الكفاءة:' : 'Efficiency:'}
                          </span>
                          <div className="font-medium">{region.efficiency}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Utilization Metrics */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'مقاييس الاستخدام' : 'Utilization Metrics'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {data.operational_metrics.capacity_utilization}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'استخدام السعة' : 'Capacity Utilization'}
                    </div>
                    <Progress value={data.operational_metrics.capacity_utilization} className="mt-2" />
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {data.operational_metrics.therapist_productivity}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'إنتاجية المعالجين' : 'Therapist Productivity'}
                    </div>
                    <Progress value={data.operational_metrics.therapist_productivity} className="mt-2" />
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {data.operational_metrics.session_efficiency}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'كفاءة الجلسات' : 'Session Efficiency'}
                    </div>
                    <Progress value={data.operational_metrics.session_efficiency} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.key_insights.map((insight, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      {getInsightIcon(insight.category)}
                      <Badge variant={getInsightColor(insight.impact)} className="ml-2">
                        {insight.priority}
                      </Badge>
                    </div>
                  </div>
                  <h4 className="font-medium mb-2">
                    {language === 'ar' ? insight.title_ar : insight.title_en}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? insight.description_ar : insight.description_en}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Strategy Tab */}
        <TabsContent value="strategy" className="space-y-6">
          <div className="space-y-4">
            {data.strategic_recommendations.map((rec, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium">
                      {language === 'ar' ? rec.title_ar : rec.title_en}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        +{rec.expected_impact}% {language === 'ar' ? 'تأثير' : 'Impact'}
                      </Badge>
                      <Badge variant="secondary">
                        {(rec.investment_required / 1000).toFixed(0)}K ر.س
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {language === 'ar' ? rec.description_ar : rec.description_en}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'الجدول الزمني:' : 'Timeline:'}
                      </span>
                      <div className="font-medium">{rec.timeline}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'الفئة:' : 'Category:'}
                      </span>
                      <div className="font-medium capitalize">{rec.category}</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'التأثير المتوقع' : 'Expected Impact'}
                    </span>
                    <Progress value={rec.expected_impact * 5} className="h-2 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks" className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {language === 'ar' 
                ? 'تقييم المخاطر الرئيسية التي قد تؤثر على الأداء المستقبلي'
                : 'Assessment of key risks that may impact future performance'
              }
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.risk_factors.map((risk, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">
                      {language === 'ar' ? risk.risk_ar : risk.risk}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        risk.probability === 'high' ? 'destructive' :
                        risk.probability === 'medium' ? 'warning' : 'secondary'
                      }>
                        {risk.probability}
                      </Badge>
                      <Badge variant={
                        risk.impact === 'high' ? 'destructive' :
                        risk.impact === 'medium' ? 'warning' : 'secondary'
                      }>
                        {risk.impact} {language === 'ar' ? 'تأثير' : 'impact'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h5 className="text-sm font-medium mb-1">
                      {language === 'ar' ? 'استراتيجية التخفيف:' : 'Mitigation Strategy:'}
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? risk.mitigation_ar : risk.mitigation}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ExecutiveSummaryReports