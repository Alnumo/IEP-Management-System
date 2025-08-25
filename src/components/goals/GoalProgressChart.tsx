import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Target, Calendar, BarChart3 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { TherapyGoal } from '@/types/therapy-data'
import { format, parseISO, subDays, subWeeks, subMonths } from 'date-fns'

interface GoalProgressChartProps {
  goal: TherapyGoal
}

export default function GoalProgressChart({ goal }: GoalProgressChartProps) {
  const { language } = useLanguage()
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [showTrend, setShowTrend] = useState(true)

  // Filter progress data based on time range
  const getFilteredData = () => {
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case '7d':
        startDate = subDays(now, 7)
        break
      case '30d':
        startDate = subDays(now, 30)
        break
      case '90d':
        startDate = subDays(now, 90)
        break
      default:
        startDate = parseISO(goal.start_date)
    }

    return goal.progress_data
      .filter(data => parseISO(data.measurement_date) >= startDate)
      .sort((a, b) => parseISO(a.measurement_date).getTime() - parseISO(b.measurement_date).getTime())
      .map(data => ({
        ...data,
        date: format(parseISO(data.measurement_date), 'MMM dd'),
        fullDate: data.measurement_date,
        percentage: Math.min(100, Math.round((data.measured_value / goal.target_criteria.target_value) * 100))
      }))
  }

  const filteredData = getFilteredData()
  const targetValue = goal.target_criteria.target_value
  const currentValue = filteredData.length > 0 ? filteredData[filteredData.length - 1].measured_value : 0
  const previousValue = filteredData.length > 1 ? filteredData[filteredData.length - 2].measured_value : 0
  const progressPercentage = Math.min(100, Math.round((currentValue / targetValue) * 100))

  // Calculate trend
  const getTrend = () => {
    if (filteredData.length < 2) return 'stable'
    
    const recent = filteredData.slice(-3).map(d => d.measured_value)
    const average = recent.reduce((sum, val) => sum + val, 0) / recent.length
    const lastValue = recent[recent.length - 1]
    
    if (lastValue > average * 1.1) return 'improving'
    if (lastValue < average * 0.9) return 'declining'
    return 'stable'
  }

  const trend = getTrend()

  const getTrendIcon = () => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <Minus className="w-4 h-4 text-yellow-600" />
    }
  }

  const getTrendText = () => {
    const trendMap = {
      'improving': language === 'ar' ? 'تحسن' : 'Improving',
      'declining': language === 'ar' ? 'تراجع' : 'Declining',
      'stable': language === 'ar' ? 'مستقر' : 'Stable'
    }
    return trendMap[trend as keyof typeof trendMap]
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'improving':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'declining':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-md">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-blue-600">
            {language === 'ar' ? 'القيمة:' : 'Value:'} {payload[0].value} {goal.baseline_measurement.measurement_unit}
          </p>
          <p className="text-sm text-gray-600">
            {language === 'ar' ? 'النسبة:' : 'Progress:'} {data.percentage}%
          </p>
          {data.notes && (
            <p className="text-sm text-gray-500 mt-1 max-w-xs">{data.notes}</p>
          )}
        </div>
      )
    }
    return null
  }

  const getTimeRangeText = (range: string) => {
    const rangeMap = {
      '7d': language === 'ar' ? '7 أيام' : '7 Days',
      '30d': language === 'ar' ? '30 يوم' : '30 Days',
      '90d': language === 'ar' ? '90 يوم' : '90 Days',
      'all': language === 'ar' ? 'جميع البيانات' : 'All Data'
    }
    return rangeMap[range as keyof typeof rangeMap]
  }

  if (filteredData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <BarChart3 className="w-5 h-5" />
            {language === 'ar' ? 'مخطط التقدم' : 'Progress Chart'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
            <Target className="w-12 h-12 text-muted-foreground" />
            <div>
              <h3 className={`font-medium text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لا توجد بيانات تقدم' : 'No Progress Data Available'}
              </h3>
              <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'ابدأ بإضافة بيانات التقدم لعرض المخطط' : 'Start by adding progress data to see the chart'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'القيمة الحالية' : 'Current Value'}
                </p>
                <p className="text-2xl font-bold">{currentValue}</p>
                <p className="text-xs text-muted-foreground">{goal.baseline_measurement.measurement_unit}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'نسبة التقدم' : 'Progress'}
                </p>
                <p className="text-2xl font-bold">{progressPercentage}%</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'من الهدف' : 'of target'}
                </p>
              </div>
              <div className={`text-2xl ${progressPercentage >= 80 ? 'text-green-500' : progressPercentage >= 60 ? 'text-yellow-500' : 'text-blue-500'}`}>
                📊
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'الاتجاه' : 'Trend'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon()}
                  <span className="text-sm font-medium">{getTrendText()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'نقاط البيانات' : 'Data Points'}
                </p>
                <p className="text-2xl font-bold">{filteredData.length}</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'قياسات' : 'measurements'}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              <BarChart3 className="w-5 h-5" />
              {language === 'ar' ? 'مخطط التقدم' : 'Progress Chart'}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Badge className={getTrendColor()}>
                {getTrendIcon()}
                <span className="ml-1">{getTrendText()}</span>
              </Badge>
              
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">{getTimeRangeText('7d')}</SelectItem>
                  <SelectItem value="30d">{getTimeRangeText('30d')}</SelectItem>
                  <SelectItem value="90d">{getTimeRangeText('90d')}</SelectItem>
                  <SelectItem value="all">{getTimeRangeText('all')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  label={{ 
                    value: goal.baseline_measurement.measurement_unit, 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Target line */}
                <ReferenceLine 
                  y={targetValue} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  label={{
                    value: language === 'ar' ? 'الهدف' : 'Target',
                    position: 'topRight'
                  }}
                />
                
                {/* Progress line */}
                <Line
                  type="monotone"
                  dataKey="measured_value"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  name={language === 'ar' ? 'التقدم' : 'Progress'}
                />
                
                {/* Baseline line */}
                <ReferenceLine 
                  y={goal.baseline_measurement.baseline_value} 
                  stroke="#6b7280" 
                  strokeDasharray="3 3" 
                  label={{
                    value: language === 'ar' ? 'الأساس' : 'Baseline',
                    position: 'bottomRight'
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'القيم المقاسة' : 'Measured Values'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-red-400 rounded"></div>
              <span className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الهدف المطلوب' : 'Target Goal'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-gray-400 rounded"></div>
              <span className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الخط الأساسي' : 'Baseline'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'ملخص البيانات' : 'Data Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'أول قياس:' : 'First Measurement:'}
              </span>
              <p>{filteredData[0].measured_value} {goal.baseline_measurement.measurement_unit}</p>
              <p className="text-muted-foreground">{filteredData[0].date}</p>
            </div>
            <div>
              <span className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'آخر قياس:' : 'Latest Measurement:'}
              </span>
              <p>{filteredData[filteredData.length - 1].measured_value} {goal.baseline_measurement.measurement_unit}</p>
              <p className="text-muted-foreground">{filteredData[filteredData.length - 1].date}</p>
            </div>
            <div>
              <span className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'أعلى قيمة:' : 'Highest Value:'}
              </span>
              <p>{Math.max(...filteredData.map(d => d.measured_value))} {goal.baseline_measurement.measurement_unit}</p>
            </div>
            <div>
              <span className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'متوسط القيم:' : 'Average Value:'}
              </span>
              <p>
                {Math.round(filteredData.reduce((sum, d) => sum + d.measured_value, 0) / filteredData.length)} {goal.baseline_measurement.measurement_unit}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}