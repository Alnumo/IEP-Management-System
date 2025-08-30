import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar, 
  Award, 
  AlertCircle, 
  CheckCircle,
  Clock,
  BarChart3,
  LineChart,
  Plus,
  Edit,
  Save,
  X
} from 'lucide-react'
import { LineChart as RechartsLineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useLanguage } from '@/contexts/LanguageContext'
import { analyticsService } from '@/services/analytics-service'
import type { 
  StudentProgressSummary, 
  GoalProgressMetrics, 
  TherapyDomainProgress, 
  BehavioralTrend,
  ProgressDataPoint,
  Milestone
} from '@/types/progress-analytics'

interface StudentProgressTrackerProps {
  studentId: string
  className?: string
  compact?: boolean
}

interface NewProgressEntry {
  goalId: string
  value: number
  notes: string
  date: string
  sessionId?: string
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042']

export const StudentProgressTracker: React.FC<StudentProgressTrackerProps> = ({
  studentId,
  className = '',
  compact = false
}) => {
  const { language, isRTL } = useLanguage()

  // State management
  const [progressSummary, setProgressSummary] = useState<StudentProgressSummary | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1month' | '3months' | '6months' | '1year'>('3months')
  const [selectedView, setSelectedView] = useState<'goals' | 'domains' | 'behaviors' | 'milestones' | 'predictions'>('goals')
  const [loading, setLoading] = useState(true)
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [newProgressEntry, setNewProgressEntry] = useState<NewProgressEntry>({
    goalId: '',
    value: 0,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [showAddProgress, setShowAddProgress] = useState(false)

  useEffect(() => {
    loadProgressData()
  }, [studentId, selectedTimeRange])

  const loadProgressData = async () => {
    try {
      setLoading(true)
      
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      
      switch (selectedTimeRange) {
        case '1month':
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case '3months':
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case '6months':
          startDate.setMonth(startDate.getMonth() - 6)
          break
        case '1year':
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
      }

      const summary = await analyticsService.getStudentProgressSummary(
        studentId,
        startDate.toISOString().split('T')[0],
        endDate
      )
      
      setProgressSummary(summary)
    } catch (error) {
      console.error('Error loading progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProgressEntry = async () => {
    if (!newProgressEntry.goalId || newProgressEntry.value === 0) return

    try {
      // Add progress entry logic here
      console.log('Adding progress entry:', newProgressEntry)
      
      // Reset form
      setNewProgressEntry({
        goalId: '',
        value: 0,
        notes: '',
        date: new Date().toISOString().split('T')[0]
      })
      setShowAddProgress(false)
      
      // Reload data
      await loadProgressData()
    } catch (error) {
      console.error('Error adding progress entry:', error)
    }
  }

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />
    }
  }

  const getStatusBadge = (status: string, progress: number) => {
    if (status === 'achieved') {
      return <Badge variant="default" className="bg-green-100 text-green-800">✓ {language === 'ar' ? 'مكتمل' : 'Achieved'}</Badge>
    }
    if (progress >= 90) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">{language === 'ar' ? 'قريب من الإنجاز' : 'Near Complete'}</Badge>
    }
    if (progress >= 50) {
      return <Badge variant="outline">{language === 'ar' ? 'قيد التطوير' : 'In Progress'}</Badge>
    }
    if (progress >= 25) {
      return <Badge variant="secondary">{language === 'ar' ? 'بداية' : 'Early Stage'}</Badge>
    }
    return <Badge variant="outline" className="text-red-600">{language === 'ar' ? 'يحتاج اهتمام' : 'Needs Attention'}</Badge>
  }

  const renderGoalProgressChart = (goal: GoalProgressMetrics) => {
    if (!goal.data_points || goal.data_points.length === 0) {
      return (
        <div className="h-32 flex items-center justify-center text-gray-400">
          {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
        </div>
      )
    }

    return (
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={goal.data_points}>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: number) => [value, language === 'ar' ? 'القيمة' : 'Value']}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#8884d8" 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            {goal.target_value && (
              <Line 
                type="monotone" 
                dataKey={() => goal.target_value}
                stroke="#ff7300" 
                strokeDasharray="5 5"
                strokeWidth={1}
                dot={false}
                name={language === 'ar' ? 'الهدف' : 'Target'}
              />
            )}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const renderGoalsTab = () => (
    <div className="space-y-6">
      {/* Add Progress Entry */}
      {!compact && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'تسجيل تقدم جديد' : 'Record New Progress'}
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setShowAddProgress(!showAddProgress)}
                className="flex items-center"
              >
                {showAddProgress ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span className={isRTL ? 'mr-2' : 'ml-2'}>
                  {showAddProgress ? 
                    (language === 'ar' ? 'إلغاء' : 'Cancel') : 
                    (language === 'ar' ? 'إضافة' : 'Add')
                  }
                </span>
              </Button>
            </div>
          </CardHeader>
          {showAddProgress && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'الهدف' : 'Goal'}</Label>
                  <Select value={newProgressEntry.goalId} onValueChange={(value) => 
                    setNewProgressEntry(prev => ({ ...prev, goalId: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر الهدف' : 'Select Goal'} />
                    </SelectTrigger>
                    <SelectContent>
                      {progressSummary?.goal_metrics.map((goal) => (
                        <SelectItem key={goal.goal_id} value={goal.goal_id}>
                          {goal.goal_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'القيمة' : 'Value'}</Label>
                  <Input
                    type="number"
                    value={newProgressEntry.value}
                    onChange={(e) => setNewProgressEntry(prev => ({ 
                      ...prev, 
                      value: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
                  <Input
                    type="date"
                    value={newProgressEntry.date}
                    onChange={(e) => setNewProgressEntry(prev => ({ 
                      ...prev, 
                      date: e.target.value 
                    }))}
                  />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                  <Input
                    value={newProgressEntry.notes}
                    onChange={(e) => setNewProgressEntry(prev => ({ 
                      ...prev, 
                      notes: e.target.value 
                    }))}
                    placeholder={language === 'ar' ? 'ملاحظات اختيارية' : 'Optional notes'}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={handleAddProgressEntry} className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'حفظ التقدم' : 'Save Progress'}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {progressSummary?.goal_metrics.map((goal) => (
          <Card key={goal.goal_id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {goal.goal_name}
                  </CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <Badge variant="outline" className="mr-2">
                      {goal.therapy_type.toUpperCase()}
                    </Badge>
                    {getTrendIcon(goal.trend)}
                    <span className="ml-1 text-sm">
                      {goal.trend === 'improving' ? (language === 'ar' ? 'تحسن' : 'Improving') :
                       goal.trend === 'declining' ? (language === 'ar' ? 'تراجع' : 'Declining') :
                       (language === 'ar' ? 'ثابت' : 'Stable')}
                    </span>
                  </CardDescription>
                </div>
                <div className="text-right">
                  {getStatusBadge(goal.status, goal.progress_percentage)}
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {goal.progress_percentage}%
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{language === 'ar' ? 'الحالي:' : 'Current:'} {goal.current_value}</span>
                  <span>{language === 'ar' ? 'الهدف:' : 'Target:'} {goal.target_value}</span>
                </div>
                <Progress value={goal.progress_percentage} className="h-3" />
              </div>

              {/* Mini Chart */}
              {renderGoalProgressChart(goal)}

              {/* Goal Metrics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">{language === 'ar' ? 'السرعة:' : 'Velocity:'}</span>
                  <span className="font-medium ml-2">
                    {goal.velocity > 0 ? '+' : ''}{goal.velocity.toFixed(1)}/week
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">{language === 'ar' ? 'الإنجاز المتوقع:' : 'Est. Completion:'}</span>
                  <span className="font-medium ml-2">
                    {goal.projected_completion_date ? 
                      new Date(goal.projected_completion_date).toLocaleDateString() : 
                      'TBD'
                    }
                  </span>
                </div>
              </div>

              {/* Milestones */}
              {goal.milestones_achieved.length > 0 && (
                <div>
                  <h4 className={`font-medium mb-2 flex items-center ${language === 'ar' ? 'font-arabic' : ''}`}>
                    <Award className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'المعالم المحققة' : 'Milestones Achieved'}
                  </h4>
                  <div className="space-y-1">
                    {goal.milestones_achieved.slice(0, 3).map((milestone: Milestone, index: number) => (
                      <div key={index} className="flex items-center text-sm">
                        <CheckCircle className="w-3 h-3 text-green-600 mr-2 flex-shrink-0" />
                        <span className="text-gray-600">{milestone.description}</span>
                      </div>
                    ))}
                    {goal.milestones_achieved.length > 3 && (
                      <p className="text-sm text-gray-500">
                        +{goal.milestones_achieved.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!compact && (
                <div className="flex justify-between pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex items-center">
                    <BarChart3 className="w-4 h-4 mr-1" />
                    {language === 'ar' ? 'تفاصيل' : 'Details'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingGoal(goal.goal_id)} className="flex items-center">
                    <Edit className="w-4 h-4 mr-1" />
                    {language === 'ar' ? 'تحديث' : 'Update'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!loading && (!progressSummary?.goal_metrics || progressSummary.goal_metrics.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className={`text-lg font-medium text-gray-600 mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'لا توجد أهداف محددة' : 'No Goals Set'}
            </h3>
            <p className={`text-gray-500 mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'ابدأ بإضافة أهداف علاجية للطالب' : 'Start by adding therapy goals for this student'}
            </p>
            <Button className="flex items-center mx-auto">
              <Plus className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'إضافة هدف' : 'Add Goal'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderDomainsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {progressSummary?.therapy_domains.map((domain, index) => (
          <Card key={domain.domain} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
                {domain.domain}
              </CardTitle>
              <CardDescription>
                <Badge variant="outline" className="mb-2">
                  {domain.therapy_type.toUpperCase()}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Overall Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'التقدم الكلي' : 'Overall Progress'}
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      {domain.overall_progress_percentage}%
                    </span>
                  </div>
                  <Progress value={domain.overall_progress_percentage} className="h-2" />
                </div>

                {/* Goals Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-50 rounded p-2">
                    <div className="text-lg font-bold text-green-600">
                      {domain.achieved_goals_count}
                    </div>
                    <div className="text-xs text-green-700">
                      {language === 'ar' ? 'مكتمل' : 'Achieved'}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded p-2">
                    <div className="text-lg font-bold text-blue-600">
                      {domain.active_goals_count}
                    </div>
                    <div className="text-xs text-blue-700">
                      {language === 'ar' ? 'نشط' : 'Active'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-lg font-bold text-gray-600">
                      {domain.total_goals_count}
                    </div>
                    <div className="text-xs text-gray-700">
                      {language === 'ar' ? 'إجمالي' : 'Total'}
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                {domain.strengths.length > 0 && (
                  <div>
                    <h5 className={`font-medium mb-2 text-green-700 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'نقاط القوة' : 'Strengths'}
                    </h5>
                    <div className="space-y-1">
                      {domain.strengths.slice(0, 2).map((strength, idx) => (
                        <div key={idx} className="flex items-start text-sm">
                          <CheckCircle className="w-3 h-3 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Areas for Improvement */}
                {domain.areas_for_improvement.length > 0 && (
                  <div>
                    <h5 className={`font-medium mb-2 text-orange-700 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'مجالات التحسين' : 'Areas for Improvement'}
                    </h5>
                    <div className="space-y-1">
                      {domain.areas_for_improvement.slice(0, 2).map((area, idx) => (
                        <div key={idx} className="flex items-start text-sm">
                          <AlertCircle className="w-3 h-3 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600">{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Achievements */}
                {domain.recent_achievements.length > 0 && (
                  <div className="pt-2 border-t">
                    <h5 className={`font-medium mb-2 text-blue-700 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'إنجازات حديثة' : 'Recent Achievements'}
                    </h5>
                    <div className="space-y-1">
                      {domain.recent_achievements.slice(0, 2).map((achievement, idx) => (
                        <div key={idx} className="flex items-start text-sm">
                          <Award className="w-3 h-3 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600">{achievement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderBehaviorsTab = () => (
    <div className="space-y-6">
      {progressSummary?.behavioral_trends.map((trend, index) => (
        <Card key={trend.behavior_category} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className={`text-base ${language === 'ar' ? 'font-arabic' : ''}`}>
              {trend.behavior_category}
            </CardTitle>
            <CardDescription className="flex items-center">
              {getTrendIcon(trend.trend_direction)}
              <span className="ml-2">
                {trend.trend_direction === 'improving' ? (language === 'ar' ? 'تحسن' : 'Improving') :
                 trend.trend_direction === 'worsening' ? (language === 'ar' ? 'تراجع' : 'Worsening') :
                 (language === 'ar' ? 'ثابت' : 'Stable')}
              </span>
              <Badge 
                variant={trend.intervention_effectiveness > 75 ? 'default' : 'outline'}
                className="ml-2"
              >
                {trend.intervention_effectiveness}% {language === 'ar' ? 'فعالية' : 'Effective'}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Behavior Metrics */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className={`text-lg font-bold ${
                      trend.frequency_change_percentage > 0 ? 'text-red-600' : 
                      trend.frequency_change_percentage < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {trend.frequency_change_percentage > 0 ? '+' : ''}{trend.frequency_change_percentage}%
                    </div>
                    <div className="text-xs text-gray-600">
                      {language === 'ar' ? 'التكرار' : 'Frequency'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${
                      trend.intensity_change_percentage > 0 ? 'text-red-600' : 
                      trend.intensity_change_percentage < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {trend.intensity_change_percentage > 0 ? '+' : ''}{trend.intensity_change_percentage}%
                    </div>
                    <div className="text-xs text-gray-600">
                      {language === 'ar' ? 'الشدة' : 'Intensity'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${
                      trend.duration_change_percentage > 0 ? 'text-red-600' : 
                      trend.duration_change_percentage < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {trend.duration_change_percentage > 0 ? '+' : ''}{trend.duration_change_percentage}%
                    </div>
                    <div className="text-xs text-gray-600">
                      {language === 'ar' ? 'المدة' : 'Duration'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Behavior Chart */}
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend.data_points}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: number) => [value, language === 'ar' ? 'القيمة' : 'Value']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={CHART_COLORS[index % CHART_COLORS.length]} 
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderMilestonesTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'المعالم والإنجازات' : 'Milestones & Achievements'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'تتبع المعالم المهمة في رحلة التعلم' : 'Track important milestones in the learning journey'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-gray-500">
            {language === 'ar' ? 'سيتم إضافة بيانات المعالم هنا' : 'Milestone data will be displayed here'}
          </p>
        </CardContent>
      </Card>
    </div>
  )

  const renderPredictionsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'التوقعات والتنبؤات' : 'Predictions & Forecasting'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'توقعات ذكية للتقدم المستقبلي' : 'AI-powered predictions for future progress'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-gray-500">
            {language === 'ar' ? 'سيتم إضافة التوقعات الذكية هنا' : 'AI predictions will be displayed here'}
          </p>
        </CardContent>
      </Card>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!progressSummary) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className={`text-lg font-medium text-gray-600 mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'لا توجد بيانات تقدم' : 'No Progress Data'}
          </h3>
          <p className={`text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'لا توجد بيانات تقدم متاحة لهذا الطالب' : 'No progress data is available for this student'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-bold text-gray-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {progressSummary.student_name}
            </h2>
            <p className={`text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'تتبع التقدم' : 'Progress Tracking'} • 
              {language === 'ar' ? ' النتيجة الإجمالية: ' : ' Overall Score: '}{progressSummary.overall_progress_score}%
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">{language === 'ar' ? 'شهر واحد' : '1 Month'}</SelectItem>
                <SelectItem value="3months">{language === 'ar' ? '3 أشهر' : '3 Months'}</SelectItem>
                <SelectItem value="6months">{language === 'ar' ? '6 أشهر' : '6 Months'}</SelectItem>
                <SelectItem value="1year">{language === 'ar' ? 'سنة واحدة' : '1 Year'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Overall Progress Summary */}
      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{language === 'ar' ? 'النتيجة الإجمالية' : 'Overall Score'}</p>
                  <p className="text-2xl font-bold text-blue-600">{progressSummary.overall_progress_score}%</p>
                </div>
                <Target className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{language === 'ar' ? 'الأهداف النشطة' : 'Active Goals'}</p>
                  <p className="text-2xl font-bold text-green-600">{progressSummary.goal_metrics.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{language === 'ar' ? 'معدل الحضور' : 'Attendance Rate'}</p>
                  <p className="text-2xl font-bold text-purple-600">{progressSummary.session_attendance.attendance_percentage}%</p>
                </div>
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{language === 'ar' ? 'المراجعة القادمة' : 'Next Review'}</p>
                  <p className="text-sm font-bold text-orange-600">
                    {new Date(progressSummary.next_review_date).toLocaleDateString()}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={selectedView} onValueChange={(value: any) => setSelectedView(value)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="goals" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الأهداف' : 'Goals'}
          </TabsTrigger>
          <TabsTrigger value="domains" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'المجالات' : 'Domains'}
          </TabsTrigger>
          <TabsTrigger value="behaviors" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'السلوك' : 'Behaviors'}
          </TabsTrigger>
          <TabsTrigger value="milestones" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'المعالم' : 'Milestones'}
          </TabsTrigger>
          <TabsTrigger value="predictions" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'التوقعات' : 'Predictions'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals">{renderGoalsTab()}</TabsContent>
        <TabsContent value="domains">{renderDomainsTab()}</TabsContent>
        <TabsContent value="behaviors">{renderBehaviorsTab()}</TabsContent>
        <TabsContent value="milestones">{renderMilestonesTab()}</TabsContent>
        <TabsContent value="predictions">{renderPredictionsTab()}</TabsContent>
      </Tabs>
    </div>
  )
}

export default StudentProgressTracker