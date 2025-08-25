import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUpIcon, TrendingDownIcon, MinusIcon, TargetIcon, UsersIcon, BookOpenIcon, BrainIcon, HeartIcon, ActivityIcon, DownloadIcon, RefreshCwIcon } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts'
import {
  StudentProgressSummary,
  ProgressDataPoint
} from '@/types/progress-analytics'

interface ProgressAnalyticsDashboardProps {
  studentId: string
  onExportReport?: () => void
}

const ProgressAnalyticsDashboard: React.FC<ProgressAnalyticsDashboardProps> = ({
  studentId,
  onExportReport
}) => {
  const [progressData, setProgressData] = useState<StudentProgressSummary | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('last_month')
  const [selectedTherapyType, setSelectedTherapyType] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Mock data - in real implementation, fetch from API
  useEffect(() => {
    const mockProgressData: StudentProgressSummary = {
      student_id: studentId,
      student_name: 'أحمد محمد / Ahmed Mohamed',
      assessment_period: {
        start_date: '2024-07-01',
        end_date: '2024-08-24'
      },
      overall_progress_score: 78,
      therapy_domains: [
        {
          domain: 'Applied Behavior Analysis',
          therapy_type: 'aba',
          overall_progress_percentage: 85,
          active_goals_count: 8,
          achieved_goals_count: 12,
          total_goals_count: 20,
          average_progress_rate: 12.5,
          strengths: ['Mand repertoire expansion', 'Improved compliance', 'Social initiations'],
          areas_for_improvement: ['Intraverbal skills', 'Group instruction following'],
          recent_achievements: ['Mastered 15 new mands', 'Increased spontaneous requests'],
          upcoming_milestones: ['Level 2 Listener Responding', 'Independent play skills']
        },
        {
          domain: 'Speech Language Therapy',
          therapy_type: 'speech',
          overall_progress_percentage: 72,
          active_goals_count: 6,
          achieved_goals_count: 8,
          total_goals_count: 14,
          average_progress_rate: 8.3,
          strengths: ['Articulation improvement', 'Vocabulary growth'],
          areas_for_improvement: ['Complex sentence structure', 'Narrative skills'],
          recent_achievements: ['Clear /r/ production', '50 new vocabulary words'],
          upcoming_milestones: ['Multi-step directions', 'Story retelling']
        },
        {
          domain: 'Occupational Therapy',
          therapy_type: 'occupational',
          overall_progress_percentage: 68,
          active_goals_count: 5,
          achieved_goals_count: 6,
          total_goals_count: 11,
          average_progress_rate: 7.2,
          strengths: ['Fine motor precision', 'Sensory regulation'],
          areas_for_improvement: ['Bilateral coordination', 'Visual-motor integration'],
          recent_achievements: ['Independent shoe tying', 'Improved pencil grip'],
          upcoming_milestones: ['Cutting curved lines', 'Balance bike riding']
        }
      ],
      goal_metrics: [
        {
          goal_id: 'goal-1',
          goal_name: 'Increase manding frequency',
          therapy_type: 'aba',
          baseline_value: 5,
          current_value: 18,
          target_value: 25,
          progress_percentage: 72,
          trend: 'improving',
          velocity: 2.1,
          data_points: [
            { date: '2024-07-01', value: 5 },
            { date: '2024-07-08', value: 7 },
            { date: '2024-07-15', value: 10 },
            { date: '2024-07-22', value: 12 },
            { date: '2024-07-29', value: 15 },
            { date: '2024-08-05', value: 16 },
            { date: '2024-08-12', value: 17 },
            { date: '2024-08-19', value: 18 }
          ],
          milestones_achieved: [
            { id: 'm1', description: 'First spontaneous mand', target_value: 1, achieved: true, achievement_date: '2024-07-05' },
            { id: 'm2', description: '10 mands per session', target_value: 10, achieved: true, achievement_date: '2024-07-18' }
          ],
          projected_completion_date: '2024-09-15',
          status: 'in_progress'
        }
      ],
      session_attendance: {
        total_scheduled_sessions: 24,
        attended_sessions: 22,
        cancelled_sessions: 2,
        makeup_sessions: 1,
        attendance_percentage: 92,
        consistency_score: 88,
        attendance_trend: 'stable',
        monthly_breakdown: [
          { month: 'July 2024', scheduled: 12, attended: 11, percentage: 92 },
          { month: 'August 2024', scheduled: 12, attended: 11, percentage: 92 }
        ]
      },
      behavioral_trends: [
        {
          behavior_category: 'Task Engagement',
          trend_direction: 'improving',
          frequency_change_percentage: 35,
          intensity_change_percentage: 20,
          duration_change_percentage: 45,
          data_points: [
            { date: '2024-07-01', value: 60 },
            { date: '2024-07-08', value: 65 },
            { date: '2024-07-15', value: 72 },
            { date: '2024-07-22', value: 78 },
            { date: '2024-08-01', value: 82 },
            { date: '2024-08-08', value: 85 },
            { date: '2024-08-15', value: 88 },
            { date: '2024-08-22', value: 90 }
          ],
          intervention_effectiveness: 85
        }
      ],
      skill_acquisition_rate: {
        new_skills_acquired: 18,
        skills_in_progress: 12,
        skill_generalization_rate: 75,
        maintenance_success_rate: 88,
        learning_velocity: 2.3,
        difficulty_level_progression: [
          {
            skill_domain: 'Communication',
            beginner_skills: 15,
            intermediate_skills: 8,
            advanced_skills: 3,
            mastery_level_distribution: {
              'Mastered': 15,
              'Emerging': 8,
              'Not Started': 3
            }
          }
        ]
      },
      recommendations: [
        {
          category: 'goal_adjustment',
          priority: 'high',
          recommendation: 'Increase manding opportunities in natural environment',
          rationale: 'Current progress suggests readiness for more complex manding scenarios',
          implementation_timeline: '2 weeks',
          expected_outcome: '15% increase in spontaneous manding'
        }
      ],
      next_review_date: '2024-09-15'
    }

    setTimeout(() => {
      setProgressData(mockProgressData)
      setLoading(false)
    }, 1000)
  }, [studentId, selectedTimeRange])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUpIcon className="h-4 w-4 text-green-500" />
      case 'declining':
        return <TrendingDownIcon className="h-4 w-4 text-red-500" />
      default:
        return <MinusIcon className="h-4 w-4 text-yellow-500" />
    }
  }

  const getTherapyIcon = (therapyType: string) => {
    switch (therapyType) {
      case 'aba':
        return <BrainIcon className="h-5 w-5" />
      case 'speech':
        return <BookOpenIcon className="h-5 w-5" />
      case 'occupational':
        return <ActivityIcon className="h-5 w-5" />
      case 'physical':
        return <HeartIcon className="h-5 w-5" />
      default:
        return <TargetIcon className="h-5 w-5" />
    }
  }

  const formatProgressData = (dataPoints: ProgressDataPoint[]) => {
    return dataPoints.map(point => ({
      date: new Date(point.date).toLocaleDateString('ar-SA'),
      value: point.value,
      displayDate: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCwIcon className="h-8 w-8 animate-spin text-blue-500" />
        <span className="mr-2 text-lg">جاري تحميل البيانات... Loading Analytics...</span>
      </div>
    )
  }

  if (!progressData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            لا توجد بيانات تقدم متاحة / No progress data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const pieChartData = progressData.therapy_domains.map(domain => ({
    name: domain.domain,
    value: domain.overall_progress_percentage,
    color: domain.therapy_type === 'aba' ? '#8884d8' : 
           domain.therapy_type === 'speech' ? '#82ca9d' : 
           domain.therapy_type === 'occupational' ? '#ffc658' : '#ff7c7c'
  }))

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1']

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            تحليلات التقدم / Progress Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            {progressData.student_name} • {progressData.assessment_period.start_date} - {progressData.assessment_period.end_date}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_week">الأسبوع الماضي / Last Week</SelectItem>
              <SelectItem value="last_month">الشهر الماضي / Last Month</SelectItem>
              <SelectItem value="last_quarter">الربع الماضي / Last Quarter</SelectItem>
              <SelectItem value="last_year">السنة الماضية / Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedTherapyType} onValueChange={setSelectedTherapyType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع العلاجات / All Therapies</SelectItem>
              <SelectItem value="aba">تحليل السلوك التطبيقي / ABA</SelectItem>
              <SelectItem value="speech">علاج النطق / Speech</SelectItem>
              <SelectItem value="occupational">العلاج الوظيفي / OT</SelectItem>
              <SelectItem value="physical">العلاج الطبيعي / PT</SelectItem>
            </SelectContent>
          </Select>
          {onExportReport && (
            <Button onClick={onExportReport} variant="outline">
              <DownloadIcon className="h-4 w-4 ml-2" />
              تصدير التقرير / Export Report
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              النتيجة الإجمالية / Overall Score
            </CardTitle>
            <TargetIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressData.overall_progress_score}%</div>
            <p className="text-xs text-muted-foreground">
              {progressData.overall_progress_score >= 80 ? 'ممتاز / Excellent' :
               progressData.overall_progress_score >= 70 ? 'جيد / Good' :
               progressData.overall_progress_score >= 60 ? 'مقبول / Fair' : 'يحتاج تحسين / Needs Improvement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              نسبة الحضور / Attendance Rate
            </CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressData.session_attendance.attendance_percentage}%</div>
            <p className="text-xs text-muted-foreground">
              {progressData.session_attendance.attended_sessions} من أصل {progressData.session_attendance.total_scheduled_sessions} جلسة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              الأهداف المحققة / Achieved Goals
            </CardTitle>
            <TargetIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progressData.therapy_domains.reduce((sum, domain) => sum + domain.achieved_goals_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              من أصل {progressData.therapy_domains.reduce((sum, domain) => sum + domain.total_goals_count, 0)} هدف
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              معدل التعلم / Learning Velocity
            </CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progressData.skill_acquisition_rate.learning_velocity}
            </div>
            <p className="text-xs text-muted-foreground">
              مهارات جديدة في الأسبوع / skills per week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">نظرة عامة / Overview</TabsTrigger>
          <TabsTrigger value="goals">الأهداف / Goals</TabsTrigger>
          <TabsTrigger value="behavior">السلوك / Behavior</TabsTrigger>
          <TabsTrigger value="skills">المهارات / Skills</TabsTrigger>
          <TabsTrigger value="recommendations">التوصيات / Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Therapy Domains Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>نظرة عامة على العلاجات / Therapy Overview</CardTitle>
                <CardDescription>
                  التقدم في مختلف مجالات العلاج / Progress across therapy domains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>مقارنة الأهداف / Goals Comparison</CardTitle>
                <CardDescription>
                  الأهداف المحققة مقابل النشطة / Achieved vs Active goals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={progressData.therapy_domains}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="domain" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="achieved_goals_count" fill="#82ca9d" name="محقق / Achieved" />
                    <Bar dataKey="active_goals_count" fill="#8884d8" name="نشط / Active" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Therapy Domains Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {progressData.therapy_domains.map((domain, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {getTherapyIcon(domain.therapy_type)}
                    <CardTitle className="text-lg">{domain.domain}</CardTitle>
                  </div>
                  <CardDescription>
                    {domain.overall_progress_percentage}% تقدم إجمالي / overall progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>الأهداف المحققة / Achieved</span>
                      <span>{domain.achieved_goals_count}/{domain.total_goals_count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(domain.achieved_goals_count / domain.total_goals_count) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">نقاط القوة / Strengths</h4>
                    <div className="space-y-1">
                      {domain.strengths.slice(0, 2).map((strength, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">الإنجازات الأخيرة / Recent Achievements</h4>
                    <div className="space-y-1">
                      {domain.recent_achievements.slice(0, 2).map((achievement, idx) => (
                        <div key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          {achievement}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          {/* Goal Progress Chart */}
          {progressData.goal_metrics.map((goal, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTherapyIcon(goal.therapy_type)}
                    <CardTitle>{goal.goal_name}</CardTitle>
                    {getTrendIcon(goal.trend)}
                  </div>
                  <Badge variant={
                    goal.status === 'achieved' ? 'default' :
                    goal.status === 'in_progress' ? 'secondary' :
                    goal.status === 'not_started' ? 'outline' : 'destructive'
                  }>
                    {goal.status === 'achieved' ? 'مكتمل / Achieved' :
                     goal.status === 'in_progress' ? 'قيد التنفيذ / In Progress' :
                     goal.status === 'not_started' ? 'لم يبدأ / Not Started' : 'متوقف / Discontinued'}
                  </Badge>
                </div>
                <CardDescription>
                  التقدم: {goal.progress_percentage}% • السرعة: {goal.velocity} وحدة/أسبوع
                  <br />
                  القيمة الحالية: {goal.current_value} • الهدف: {goal.target_value}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formatProgressData(goal.data_points)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="displayDate" />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => `التاريخ / Date: ${label}`}
                      formatter={(value) => [`${value}`, 'القيمة / Value']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                      name="التقدم / Progress"
                    />
                    <ReferenceLine y={goal.baseline_value} stroke="#ff7c7c" strokeDasharray="5 5" label="الخط القاعدي / Baseline" />
                    <ReferenceLine y={goal.target_value} stroke="#82ca9d" strokeDasharray="5 5" label="الهدف / Target" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="behavior" className="space-y-6">
          {/* Behavioral Trends */}
          {progressData.behavioral_trends.map((trend, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{trend.behavior_category}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(trend.trend_direction)}
                    <Badge variant="outline">
                      فعالية التدخل: {trend.intervention_effectiveness}%
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  تغير التكرار: {trend.frequency_change_percentage >= 0 ? '+' : ''}{trend.frequency_change_percentage}%
                  • تغير الشدة: {trend.intensity_change_percentage >= 0 ? '+' : ''}{trend.intensity_change_percentage}%
                  • تغير المدة: {trend.duration_change_percentage >= 0 ? '+' : ''}{trend.duration_change_percentage}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={formatProgressData(trend.data_points)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="displayDate" />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => `التاريخ / Date: ${label}`}
                      formatter={(value) => [`${value}%`, 'النسبة / Percentage']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3}
                      name="مستوى السلوك / Behavior Level"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          {/* Skills Acquisition */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>إحصائيات اكتساب المهارات / Skill Acquisition Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {progressData.skill_acquisition_rate.new_skills_acquired}
                    </div>
                    <div className="text-sm text-gray-600">مهارات جديدة / New Skills</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {progressData.skill_acquisition_rate.skills_in_progress}
                    </div>
                    <div className="text-sm text-gray-600">قيد التطوير / In Progress</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>معدل التعميم / Generalization Rate</span>
                    <span>{progressData.skill_acquisition_rate.skill_generalization_rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${progressData.skill_acquisition_rate.skill_generalization_rate}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>معدل المحافظة / Maintenance Rate</span>
                    <span>{progressData.skill_acquisition_rate.maintenance_success_rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${progressData.skill_acquisition_rate.maintenance_success_rate}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>توزيع مستوى الصعوبة / Difficulty Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {progressData.skill_acquisition_rate.difficulty_level_progression.map((domain, index) => (
                  <div key={index} className="space-y-4">
                    <h4 className="font-medium">{domain.skill_domain}</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={[
                        { level: 'مبتدئ / Beginner', count: domain.beginner_skills },
                        { level: 'متوسط / Intermediate', count: domain.intermediate_skills },
                        { level: 'متقدم / Advanced', count: domain.advanced_skills }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="level" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {/* Recommendations */}
          <div className="space-y-4">
            {progressData.recommendations.map((rec, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{rec.recommendation}</CardTitle>
                    <Badge variant={
                      rec.priority === 'high' ? 'destructive' :
                      rec.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {rec.priority === 'high' ? 'عالي / High' :
                       rec.priority === 'medium' ? 'متوسط / Medium' : 'منخفض / Low'}
                    </Badge>
                  </div>
                  <CardDescription>
                    التصنيف: {rec.category === 'goal_adjustment' ? 'تعديل الأهداف / Goal Adjustment' :
                              rec.category === 'intervention_modification' ? 'تعديل التدخل / Intervention Modification' :
                              rec.category === 'frequency_change' ? 'تغيير التكرار / Frequency Change' :
                              rec.category === 'additional_support' ? 'دعم إضافي / Additional Support' : 'احتفال / Celebration'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-1">المبرر / Rationale</h4>
                    <p className="text-sm text-gray-600">{rec.rationale}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-1">الجدول الزمني / Timeline</h4>
                      <p className="text-sm text-gray-600">{rec.implementation_timeline}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">النتيجة المتوقعة / Expected Outcome</h4>
                      <p className="text-sm text-gray-600">{rec.expected_outcome}</p>
                    </div>
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

export default ProgressAnalyticsDashboard