import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Clock, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  CheckCircle,
  AlertCircle,
  Award,
  Activity,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  RefreshCw
} from 'lucide-react'
import { 
  LineChart as RechartsLineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import { useLanguage } from '@/contexts/LanguageContext'

interface SessionAnalyticsProps {
  studentId?: string
  therapistId?: string
  programId?: string
  timeRange?: 'week' | 'month' | 'quarter' | 'year'
  className?: string
}

interface SessionMetrics {
  totalSessions: number
  completedSessions: number
  cancelledSessions: number
  averageDuration: number
  completionRate: number
  attendanceRate: number
  satisfactionScore: number
  progressRate: number
}

interface SessionTrend {
  date: string
  sessions: number
  duration: number
  satisfaction: number
  progress: number
  attendance: number
}

interface TherapyEffectiveness {
  therapy_type: string
  effectiveness_score: number
  improvement_rate: number
  goal_achievement_rate: number
  session_count: number
  average_duration: number
  student_satisfaction: number
  parent_satisfaction: number
}

interface SessionInsight {
  type: 'success' | 'warning' | 'info' | 'alert'
  title: string
  description: string
  metric: string
  change: number
  recommendation?: string
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042']

export const SessionAnalytics: React.FC<SessionAnalyticsProps> = ({
  studentId,
  therapistId,
  programId,
  timeRange = 'month',
  className = ''
}) => {
  const { language, isRTL } = useLanguage()

  // State management
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null)
  const [trends, setTrends] = useState<SessionTrend[]>([])
  const [effectiveness, setEffectiveness] = useState<TherapyEffectiveness[]>([])
  const [insights, setInsights] = useState<SessionInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'overview' | 'trends' | 'effectiveness' | 'insights'>('overview')
  const [selectedTherapyType, setSelectedTherapyType] = useState<'all' | 'aba' | 'speech' | 'occupational' | 'physical'>('all')

  useEffect(() => {
    loadAnalyticsData()
  }, [studentId, therapistId, programId, timeRange, selectedTherapyType])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Simulate API calls - replace with actual implementation
      await Promise.all([
        loadSessionMetrics(),
        loadSessionTrends(),
        loadTherapyEffectiveness(),
        loadSessionInsights()
      ])
      
    } catch (error) {
      console.error('Error loading session analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSessionMetrics = async () => {
    // Mock data - replace with actual API call
    const mockMetrics: SessionMetrics = {
      totalSessions: 156,
      completedSessions: 144,
      cancelledSessions: 12,
      averageDuration: 45,
      completionRate: 92.3,
      attendanceRate: 94.7,
      satisfactionScore: 4.6,
      progressRate: 87.4
    }
    setMetrics(mockMetrics)
  }

  const loadSessionTrends = async () => {
    // Mock trend data - replace with actual API call
    const mockTrends: SessionTrend[] = [
      { date: '2024-01-01', sessions: 24, duration: 44, satisfaction: 4.5, progress: 85, attendance: 92 },
      { date: '2024-01-08', sessions: 26, duration: 46, satisfaction: 4.6, progress: 87, attendance: 94 },
      { date: '2024-01-15', sessions: 28, duration: 45, satisfaction: 4.7, progress: 89, attendance: 96 },
      { date: '2024-01-22', sessions: 25, duration: 47, satisfaction: 4.5, progress: 86, attendance: 91 },
      { date: '2024-01-29', sessions: 27, duration: 43, satisfaction: 4.8, progress: 91, attendance: 95 },
      { date: '2024-02-05', sessions: 29, duration: 46, satisfaction: 4.6, progress: 88, attendance: 93 },
      { date: '2024-02-12', sessions: 31, duration: 48, satisfaction: 4.7, progress: 92, attendance: 97 },
      { date: '2024-02-19', sessions: 28, duration: 44, satisfaction: 4.9, progress: 90, attendance: 94 }
    ]
    setTrends(mockTrends)
  }

  const loadTherapyEffectiveness = async () => {
    // Mock effectiveness data - replace with actual API call
    const mockEffectiveness: TherapyEffectiveness[] = [
      {
        therapy_type: 'ABA Therapy',
        effectiveness_score: 88.5,
        improvement_rate: 15.2,
        goal_achievement_rate: 82.3,
        session_count: 45,
        average_duration: 50,
        student_satisfaction: 4.7,
        parent_satisfaction: 4.8
      },
      {
        therapy_type: 'Speech Therapy',
        effectiveness_score: 91.2,
        improvement_rate: 18.7,
        goal_achievement_rate: 87.5,
        session_count: 38,
        average_duration: 40,
        student_satisfaction: 4.8,
        parent_satisfaction: 4.9
      },
      {
        therapy_type: 'Occupational Therapy',
        effectiveness_score: 85.7,
        improvement_rate: 12.8,
        goal_achievement_rate: 78.9,
        session_count: 32,
        average_duration: 45,
        student_satisfaction: 4.5,
        parent_satisfaction: 4.6
      },
      {
        therapy_type: 'Physical Therapy',
        effectiveness_score: 89.3,
        improvement_rate: 16.4,
        goal_achievement_rate: 84.2,
        session_count: 28,
        average_duration: 35,
        student_satisfaction: 4.6,
        parent_satisfaction: 4.7
      }
    ]
    setEffectiveness(mockEffectiveness)
  }

  const loadSessionInsights = async () => {
    // Mock insights data - replace with actual API call
    const mockInsights: SessionInsight[] = [
      {
        type: 'success',
        title: language === 'ar' ? 'تحسن ملحوظ في معدل الحضور' : 'Significant Improvement in Attendance',
        description: language === 'ar' ? 'ارتفع معدل الحضور بنسبة 12% هذا الشهر' : 'Attendance rate increased by 12% this month',
        metric: 'attendance_rate',
        change: 12.3,
        recommendation: language === 'ar' ? 'استمر في استراتيجيات التحفيز الحالية' : 'Continue current motivation strategies'
      },
      {
        type: 'warning',
        title: language === 'ar' ? 'انخفاض في مدة الجلسات' : 'Decrease in Session Duration',
        description: language === 'ar' ? 'متوسط مدة الجلسات انخفض بـ 8 دقائق' : 'Average session duration decreased by 8 minutes',
        metric: 'session_duration',
        change: -8.2,
        recommendation: language === 'ar' ? 'مراجعة خطط الجلسات لضمان الكفاءة' : 'Review session plans to ensure efficiency'
      },
      {
        type: 'info',
        title: language === 'ar' ? 'نمو في عدد الجلسات' : 'Growth in Session Volume',
        description: language === 'ar' ? 'زيادة 15% في إجمالي عدد الجلسات' : '15% increase in total number of sessions',
        metric: 'session_count',
        change: 15.7,
        recommendation: language === 'ar' ? 'التأكد من توفر الموارد الكافية' : 'Ensure adequate resource availability'
      },
      {
        type: 'alert',
        title: language === 'ar' ? 'تحتاج مراجعة: رضا الطلاب' : 'Review Needed: Student Satisfaction',
        description: language === 'ar' ? 'انخفاض طفيف في تقييمات رضا الطلاب' : 'Slight decrease in student satisfaction ratings',
        metric: 'satisfaction',
        change: -0.3,
        recommendation: language === 'ar' ? 'جمع ملاحظات الطلاب وأولياء الأمور' : 'Collect feedback from students and parents'
      }
    ]
    setInsights(mockInsights)
  }

  const getInsightIcon = (type: SessionInsight['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-600" />
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Activity className="w-5 h-5 text-blue-600" />
    }
  }

  const renderMetricCard = (
    title: string, 
    value: string | number, 
    change?: number, 
    suffix?: string,
    icon?: React.ReactNode
  ) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {value}{suffix}
            </p>
            {change !== undefined && (
              <div className={`flex items-center mt-1 text-sm ${
                change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : 
                 change < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                <span>{change > 0 ? '+' : ''}{change}%</span>
              </div>
            )}
          </div>
          {icon && <div className="text-gray-400 ml-4">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  )

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderMetricCard(
            language === 'ar' ? 'إجمالي الجلسات' : 'Total Sessions',
            metrics.totalSessions,
            8.5,
            '',
            <Calendar className="w-6 h-6" />
          )}
          {renderMetricCard(
            language === 'ar' ? 'معدل الإكمال' : 'Completion Rate',
            metrics.completionRate,
            2.3,
            '%',
            <CheckCircle className="w-6 h-6" />
          )}
          {renderMetricCard(
            language === 'ar' ? 'متوسط المدة' : 'Average Duration',
            metrics.averageDuration,
            -3.2,
            ' min',
            <Clock className="w-6 h-6" />
          )}
          {renderMetricCard(
            language === 'ar' ? 'تقييم الرضا' : 'Satisfaction Score',
            metrics.satisfactionScore,
            4.7,
            '/5',
            <Award className="w-6 h-6" />
          )}
        </div>
      )}

      {/* Session Summary Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'توزيع الجلسات' : 'Session Distribution'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'نظرة عامة على حالة الجلسات' : 'Overview of session status'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { 
                          name: language === 'ar' ? 'مكتملة' : 'Completed', 
                          value: metrics.completedSessions,
                          fill: CHART_COLORS[0]
                        },
                        { 
                          name: language === 'ar' ? 'ملغية' : 'Cancelled', 
                          value: metrics.cancelledSessions,
                          fill: CHART_COLORS[1]
                        }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[metrics.completedSessions, metrics.cancelledSessions].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'مؤشرات الأداء' : 'Performance Indicators'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'المقاييس الرئيسية للأداء' : 'Key performance metrics'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'معدل الحضور' : 'Attendance Rate'}
                    </span>
                    <span className="text-sm font-bold">{metrics.attendanceRate}%</span>
                  </div>
                  <Progress value={metrics.attendanceRate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'معدل التقدم' : 'Progress Rate'}
                    </span>
                    <span className="text-sm font-bold">{metrics.progressRate}%</span>
                  </div>
                  <Progress value={metrics.progressRate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'معدل الإكمال' : 'Completion Rate'}
                    </span>
                    <span className="text-sm font-bold">{metrics.completionRate}%</span>
                  </div>
                  <Progress value={metrics.completionRate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'تقييم الرضا' : 'Satisfaction Score'}
                    </span>
                    <span className="text-sm font-bold">{metrics.satisfactionScore}/5</span>
                  </div>
                  <Progress value={(metrics.satisfactionScore / 5) * 100} className="h-2" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderTrendsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'اتجاهات الجلسات' : 'Session Trends'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'تحليل الاتجاهات الزمنية للجلسات' : 'Temporal analysis of session patterns'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => {
                    const label = name === 'sessions' ? (language === 'ar' ? 'الجلسات' : 'Sessions') :
                                 name === 'duration' ? (language === 'ar' ? 'المدة' : 'Duration') :
                                 name === 'satisfaction' ? (language === 'ar' ? 'الرضا' : 'Satisfaction') :
                                 name === 'progress' ? (language === 'ar' ? 'التقدم' : 'Progress') :
                                 name === 'attendance' ? (language === 'ar' ? 'الحضور' : 'Attendance') : name
                    return [value, label]
                  }}
                />
                <Legend 
                  formatter={(value) => {
                    const label = value === 'sessions' ? (language === 'ar' ? 'عدد الجلسات' : 'Session Count') :
                                 value === 'duration' ? (language === 'ar' ? 'متوسط المدة' : 'Avg Duration') :
                                 value === 'satisfaction' ? (language === 'ar' ? 'الرضا' : 'Satisfaction') :
                                 value === 'progress' ? (language === 'ar' ? 'التقدم %' : 'Progress %') :
                                 value === 'attendance' ? (language === 'ar' ? 'الحضور %' : 'Attendance %') : value
                    return label
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sessions" 
                  stroke={CHART_COLORS[0]} 
                  strokeWidth={2}
                  yAxisId={0}
                />
                <Line 
                  type="monotone" 
                  dataKey="progress" 
                  stroke={CHART_COLORS[1]} 
                  strokeWidth={2}
                  yAxisId={0}
                />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke={CHART_COLORS[2]} 
                  strokeWidth={2}
                  yAxisId={0}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Pattern Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'تحليل الأنماط الأسبوعية' : 'Weekly Pattern Analysis'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'توزيع الجلسات حسب أيام الأسبوع' : 'Session distribution by day of week'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { day: language === 'ar' ? 'الأحد' : 'Sunday', sessions: 22 },
                  { day: language === 'ar' ? 'الاثنين' : 'Monday', sessions: 28 },
                  { day: language === 'ar' ? 'الثلاثاء' : 'Tuesday', sessions: 31 },
                  { day: language === 'ar' ? 'الأربعاء' : 'Wednesday', sessions: 25 },
                  { day: language === 'ar' ? 'الخميس' : 'Thursday', sessions: 29 },
                  { day: language === 'ar' ? 'السبت' : 'Saturday', sessions: 18 }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sessions" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderEffectivenessTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'فعالية البرامج العلاجية' : 'Therapy Program Effectiveness'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'مقارنة فعالية أنواع العلاج المختلفة' : 'Comparative effectiveness of different therapy types'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {effectiveness.map((therapy, index) => (
              <div key={therapy.therapy_type} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {therapy.therapy_type}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={therapy.effectiveness_score >= 85 ? 'default' : 'outline'}
                      className={therapy.effectiveness_score >= 85 ? 'bg-green-100 text-green-800' : ''}
                    >
                      {therapy.effectiveness_score}% {language === 'ar' ? 'فعالية' : 'Effective'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {therapy.improvement_rate}%
                    </div>
                    <div className="text-sm text-gray-600">
                      {language === 'ar' ? 'معدل التحسن' : 'Improvement Rate'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {therapy.goal_achievement_rate}%
                    </div>
                    <div className="text-sm text-gray-600">
                      {language === 'ar' ? 'تحقيق الأهداف' : 'Goal Achievement'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {therapy.session_count}
                    </div>
                    <div className="text-sm text-gray-600">
                      {language === 'ar' ? 'عدد الجلسات' : 'Session Count'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {therapy.student_satisfaction}/5
                    </div>
                    <div className="text-sm text-gray-600">
                      {language === 'ar' ? 'رضا الطلاب' : 'Student Satisfaction'}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'الفعالية الكلية' : 'Overall Effectiveness'}
                    </span>
                    <span className="text-sm font-bold">{therapy.effectiveness_score}%</span>
                  </div>
                  <Progress value={therapy.effectiveness_score} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'مقارنة شاملة للبرامج' : 'Comprehensive Program Comparison'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={effectiveness.map(therapy => ({
                therapy: therapy.therapy_type.replace(' Therapy', ''),
                effectiveness: therapy.effectiveness_score,
                improvement: therapy.improvement_rate * 5, // Scale to 0-100
                goals: therapy.goal_achievement_rate,
                satisfaction: therapy.student_satisfaction * 20 // Scale to 0-100
              }))}>
                <PolarGrid />
                <PolarAngleAxis dataKey="therapy" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name={language === 'ar' ? 'الفعالية' : 'Effectiveness'}
                  dataKey="effectiveness"
                  stroke={CHART_COLORS[0]}
                  fill={CHART_COLORS[0]}
                  fillOpacity={0.3}
                />
                <Radar
                  name={language === 'ar' ? 'تحقيق الأهداف' : 'Goal Achievement'}
                  dataKey="goals"
                  stroke={CHART_COLORS[1]}
                  fill={CHART_COLORS[1]}
                  fillOpacity={0.3}
                />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderInsightsTab = () => (
    <div className="space-y-6">
      {/* AI Insights Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights.map((insight, index) => (
          <Card 
            key={index} 
            className={`border-l-4 ${
              insight.type === 'success' ? 'border-l-green-500' :
              insight.type === 'warning' ? 'border-l-orange-500' :
              insight.type === 'alert' ? 'border-l-red-500' :
              'border-l-blue-500'
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <h3 className={`font-semibold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {insight.title}
                  </h3>
                  <p className={`text-gray-600 mb-3 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {insight.description}
                  </p>
                  
                  <div className="flex items-center mb-3">
                    <div className={`text-lg font-bold ${
                      insight.change > 0 ? 'text-green-600' : 
                      insight.change < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {insight.change > 0 ? '+' : ''}{insight.change}%
                    </div>
                    <div className="ml-2 text-sm text-gray-500">
                      vs {language === 'ar' ? 'الشهر السابق' : 'previous month'}
                    </div>
                  </div>
                  
                  {insight.recommendation && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className={`font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'التوصية:' : 'Recommendation:'}
                      </h4>
                      <p className={`text-sm text-gray-700 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {insight.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Target className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'خطوات العمل الموصى بها' : 'Recommended Action Items'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start p-3 border rounded-lg">
              <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                1
              </div>
              <div>
                <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'مراجعة استراتيجيات إشراك الطلاب' : 'Review Student Engagement Strategies'}
                </h4>
                <p className={`text-sm text-gray-600 mt-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'تحليل أسباب انخفاض تقييمات الرضا واتخاذ إجراءات تصحيحية' : 'Analyze causes of decreased satisfaction ratings and implement corrective measures'}
                </p>
              </div>
            </div>

            <div className="flex items-start p-3 border rounded-lg">
              <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                2
              </div>
              <div>
                <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'تحسين كفاءة الجلسات' : 'Optimize Session Efficiency'}
                </h4>
                <p className={`text-sm text-gray-600 mt-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'مراجعة خطط الجلسات لتحقيق أقصى استفادة من الوقت المتاح' : 'Review session plans to maximize utilization of available time'}
                </p>
              </div>
            </div>

            <div className="flex items-start p-3 border rounded-lg">
              <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                3
              </div>
              <div>
                <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'الاستفادة من النجاحات' : 'Leverage Success Factors'}
                </h4>
                <p className={`text-sm text-gray-600 mt-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'تطبيق الممارسات الناجحة في تحسين الحضور على المجالات الأخرى' : 'Apply successful attendance improvement practices to other areas'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold text-gray-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تحليل الجلسات العلاجية' : 'Therapy Session Analytics'}
          </h2>
          <p className={`text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'رؤى شاملة حول أداء وفعالية الجلسات' : 'Comprehensive insights into session performance and effectiveness'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={selectedTherapyType} onValueChange={(value: any) => setSelectedTherapyType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</SelectItem>
              <SelectItem value="aba">{language === 'ar' ? 'تحليل السلوك' : 'ABA'}</SelectItem>
              <SelectItem value="speech">{language === 'ar' ? 'النطق' : 'Speech'}</SelectItem>
              <SelectItem value="occupational">{language === 'ar' ? 'الوظيفي' : 'Occupational'}</SelectItem>
              <SelectItem value="physical">{language === 'ar' ? 'الطبيعي' : 'Physical'}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" className="flex items-center" onClick={loadAnalyticsData}>
            <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
          
          <Button variant="outline" size="sm" className="flex items-center">
            <Download className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'تصدير' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedView} onValueChange={(value: any) => setSelectedView(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="trends" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الاتجاهات' : 'Trends'}
          </TabsTrigger>
          <TabsTrigger value="effectiveness" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الفعالية' : 'Effectiveness'}
          </TabsTrigger>
          <TabsTrigger value="insights" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الرؤى' : 'Insights'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{renderOverviewTab()}</TabsContent>
        <TabsContent value="trends">{renderTrendsTab()}</TabsContent>
        <TabsContent value="effectiveness">{renderEffectivenessTab()}</TabsContent>
        <TabsContent value="insights">{renderInsightsTab()}</TabsContent>
      </Tabs>
    </div>
  )
}

export default SessionAnalytics