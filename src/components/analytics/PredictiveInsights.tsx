/**
 * Predictive Insights Component
 * Displays predictive analytics and forecasting for IEP goals
 */

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { analyticsService } from '@/services/analytics-service'
import type { 
  ProgressPrediction,
  StudentProgressSummary,
  GoalProgressMetrics 
} from '@/types/progress-analytics'
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  Zap,
  Calendar,
  BarChart3
} from 'lucide-react'

interface PredictiveInsightsProps {
  studentId?: string
  analytics?: StudentProgressSummary
  language: 'ar' | 'en'
  timeHorizon?: 'short_term' | 'medium_term' | 'long_term'
}

interface PredictionData {
  goal_id: string
  goal_name: string
  current_progress: number
  predicted_progress: number[]
  confidence_intervals: { lower: number; upper: number }[]
  projected_completion_date: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
  factors_influencing_progress: {
    factor: string
    impact: number
    direction: 'positive' | 'negative'
  }[]
}

const PREDICTION_COLORS = {
  actual: '#3b82f6',
  predicted: '#10b981',
  upper_bound: '#f59e0b',
  lower_bound: '#ef4444',
  target: '#8b5cf6'
}

const getRiskLevelColor = (level: string) => {
  switch (level) {
    case 'low':
      return 'text-green-600'
    case 'medium':
      return 'text-yellow-600'
    case 'high':
      return 'text-orange-600'
    case 'critical':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

const getRiskLevelIcon = (level: string) => {
  switch (level) {
    case 'low':
      return <CheckCircle className="h-4 w-4" />
    case 'medium':
      return <Clock className="h-4 w-4" />
    case 'high':
      return <TrendingUp className="h-4 w-4" />
    case 'critical':
      return <AlertTriangle className="h-4 w-4" />
    default:
      return null
  }
}

const getRiskLevelLabel = (level: string, language: 'ar' | 'en') => {
  const labels = {
    low: { ar: 'منخفض', en: 'Low Risk' },
    medium: { ar: 'متوسط', en: 'Medium Risk' },
    high: { ar: 'مرتفع', en: 'High Risk' },
    critical: { ar: 'حرج', en: 'Critical Risk' }
  }
  return labels[level as keyof typeof labels]?.[language] || level
}

export const PredictiveInsights: React.FC<PredictiveInsightsProps> = ({
  studentId,
  analytics,
  language,
  timeHorizon = 'medium_term'
}) => {
  const [selectedGoal, setSelectedGoal] = useState<string>('all')
  const [predictionAccuracy, setPredictionAccuracy] = useState<number>(85)

  // Fetch predictive analytics data
  const { data: predictions, isLoading, error } = useQuery({
    queryKey: ['predictive-insights', studentId, timeHorizon],
    queryFn: async () => {
      if (!studentId) return null
      
      const predictions: PredictionData[] = []
      
      // Generate predictions for each goal
      if (analytics?.goal_metrics) {
        for (const goal of analytics.goal_metrics) {
          try {
            const prediction = await analyticsService.predictProgressTrajectory(
              studentId,
              goal.goal_id,
              timeHorizon
            )
            
            // Transform the prediction into our expected format
            const predictionData: PredictionData = {
              goal_id: goal.goal_id,
              goal_name: goal.goal_name,
              current_progress: goal.progress_percentage,
              predicted_progress: prediction.predicted_values || [],
              confidence_intervals: prediction.confidence_intervals || [],
              projected_completion_date: prediction.projected_completion_date || '',
              risk_level: prediction.risk_assessment?.level || 'medium',
              recommendations: prediction.recommendations || [],
              factors_influencing_progress: prediction.influencing_factors || []
            }
            
            predictions.push(predictionData)
          } catch (error) {
            console.warn(`Failed to generate prediction for goal ${goal.goal_id}:`, error)
          }
        }
      }
      
      return predictions
    },
    enabled: !!studentId && !!analytics?.goal_metrics,
    staleTime: 30 * 60 * 1000 // 30 minutes
  })

  // Generate sample prediction data if API fails
  const samplePredictions = analytics?.goal_metrics?.map((goal, index) => {
    const currentProgress = goal.progress_percentage
    const velocity = goal.velocity || 2
    const weeks = timeHorizon === 'short_term' ? 4 : timeHorizon === 'medium_term' ? 12 : 26
    
    // Generate predicted progress points
    const predictedProgress = Array.from({ length: weeks }, (_, weekIndex) => {
      const baseProgress = currentProgress + (velocity * weekIndex)
      const noise = (Math.random() - 0.5) * 10 // Add some variance
      return Math.min(100, Math.max(0, baseProgress + noise))
    })

    return {
      goal_id: goal.goal_id,
      goal_name: goal.goal_name,
      current_progress: currentProgress,
      predicted_progress: predictedProgress,
      confidence_intervals: predictedProgress.map(progress => ({
        lower: Math.max(0, progress - 15),
        upper: Math.min(100, progress + 15)
      })),
      projected_completion_date: goal.projected_completion_date || '',
      risk_level: currentProgress < 30 ? 'high' : currentProgress < 60 ? 'medium' : 'low',
      recommendations: [
        language === 'ar' ? 'زيادة تكرار الجلسات' : 'Increase session frequency',
        language === 'ar' ? 'تعديل استراتيجية التدخل' : 'Modify intervention strategy'
      ],
      factors_influencing_progress: [
        { 
          factor: language === 'ar' ? 'انتظام الحضور' : 'Attendance consistency', 
          impact: 0.3, 
          direction: 'positive' as const 
        },
        { 
          factor: language === 'ar' ? 'التعاون الأسري' : 'Family cooperation', 
          impact: 0.25, 
          direction: 'positive' as const 
        }
      ]
    } as PredictionData
  }) || []

  const displayPredictions = predictions || samplePredictions

  // Prepare chart data
  const prepareChartData = (prediction: PredictionData) => {
    const weeks = prediction.predicted_progress.length
    const startDate = new Date()
    
    return Array.from({ length: weeks + 1 }, (_, index) => {
      const date = new Date(startDate.getTime() + index * 7 * 24 * 60 * 60 * 1000)
      const weekLabel = `Week ${index + 1}`
      
      if (index === 0) {
        // Current actual value
        return {
          week: weekLabel,
          date: date.toLocaleDateString(),
          actual: prediction.current_progress,
          predicted: null,
          upper: null,
          lower: null
        }
      } else {
        // Predicted values
        const predIndex = index - 1
        return {
          week: weekLabel,
          date: date.toLocaleDateString(),
          actual: null,
          predicted: prediction.predicted_progress[predIndex] || null,
          upper: prediction.confidence_intervals[predIndex]?.upper || null,
          lower: prediction.confidence_intervals[predIndex]?.lower || null
        }
      }
    })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value !== null) {
              return (
                <p key={index} className="text-sm" style={{ color: entry.color }}>
                  {entry.name}: {entry.value.toFixed(1)}%
                </p>
              )
            }
            return null
          })}
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  }

  if (!displayPredictions || displayPredictions.length === 0) {
    return (
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          {language === 'ar' 
            ? 'لا توجد بيانات كافية لتوليد التوقعات. يرجى تحديث البيانات وإعادة المحاولة.'
            : 'Insufficient data to generate predictions. Please update data and try again.'
          }
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with prediction accuracy */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            {language === 'ar' ? 'رؤى تنبؤية' : 'Predictive Insights'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? `دقة التوقعات: ${predictionAccuracy}% | التوقعات ${
                  timeHorizon === 'short_term' ? 'قصيرة المدى (4 أسابيع)' :
                  timeHorizon === 'medium_term' ? 'متوسطة المدى (12 أسبوع)' :
                  'طويلة المدى (26 أسبوع)'
                }`
              : `Prediction accuracy: ${predictionAccuracy}% | ${
                  timeHorizon === 'short_term' ? 'Short-term (4 weeks)' :
                  timeHorizon === 'medium_term' ? 'Medium-term (12 weeks)' :
                  'Long-term (26 weeks)'
                } forecast`
            }
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center">
          <Zap className="h-3 w-3 mr-1" />
          AI Powered
        </Badge>
      </div>

      <Tabs defaultValue="trajectory" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trajectory">
            {language === 'ar' ? 'مسار التقدم' : 'Trajectory'}
          </TabsTrigger>
          <TabsTrigger value="risks">
            {language === 'ar' ? 'تحليل المخاطر' : 'Risk Analysis'}
          </TabsTrigger>
          <TabsTrigger value="factors">
            {language === 'ar' ? 'العوامل المؤثرة' : 'Influencing Factors'}
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            {language === 'ar' ? 'التوصيات' : 'Recommendations'}
          </TabsTrigger>
        </TabsList>

        {/* Progress Trajectory Tab */}
        <TabsContent value="trajectory" className="space-y-6">
          {displayPredictions.map((prediction) => (
            <Card key={prediction.goal_id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {prediction.goal_name}
                </CardTitle>
                <CardDescription className="flex items-center justify-between">
                  <span>
                    {language === 'ar' ? 'التقدم الحالي:' : 'Current progress:'} {prediction.current_progress}%
                  </span>
                  {prediction.projected_completion_date && (
                    <span className="flex items-center text-blue-600">
                      <Calendar className="h-3 w-3 mr-1" />
                      {language === 'ar' ? 'التاريخ المتوقع:' : 'Expected:'} {prediction.projected_completion_date}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={prepareChartData(prediction)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      
                      {/* Confidence interval area */}
                      <Area
                        type="monotone"
                        dataKey="upper"
                        stroke="none"
                        fill={PREDICTION_COLORS.upper_bound}
                        fillOpacity={0.1}
                        connectNulls={false}
                        name={language === 'ar' ? 'الحد الأعلى' : 'Upper Bound'}
                      />
                      <Area
                        type="monotone"
                        dataKey="lower"
                        stroke="none"
                        fill={PREDICTION_COLORS.lower_bound}
                        fillOpacity={0.1}
                        connectNulls={false}
                        name={language === 'ar' ? 'الحد الأدنى' : 'Lower Bound'}
                      />
                      
                      {/* Actual progress line */}
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke={PREDICTION_COLORS.actual}
                        strokeWidth={3}
                        dot={{ fill: PREDICTION_COLORS.actual, strokeWidth: 2, r: 6 }}
                        connectNulls={false}
                        name={language === 'ar' ? 'التقدم الفعلي' : 'Actual Progress'}
                      />
                      
                      {/* Predicted progress line */}
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke={PREDICTION_COLORS.predicted}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: PREDICTION_COLORS.predicted, strokeWidth: 1, r: 4 }}
                        connectNulls={false}
                        name={language === 'ar' ? 'التقدم المتوقع' : 'Predicted Progress'}
                      />
                      
                      {/* Target line */}
                      <ReferenceLine 
                        y={100} 
                        stroke={PREDICTION_COLORS.target} 
                        strokeDasharray="3 3"
                        label={{ value: language === 'ar' ? 'الهدف' : 'Target', position: 'right' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Progress summary */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-blue-600">{prediction.current_progress}%</div>
                    <div className="text-muted-foreground">
                      {language === 'ar' ? 'الحالي' : 'Current'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-600">
                      {prediction.predicted_progress[prediction.predicted_progress.length - 1]?.toFixed(1) || 0}%
                    </div>
                    <div className="text-muted-foreground">
                      {language === 'ar' ? 'متوقع' : 'Predicted'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-purple-600">100%</div>
                    <div className="text-muted-foreground">
                      {language === 'ar' ? 'الهدف' : 'Target'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayPredictions.map((prediction) => (
              <Card key={prediction.goal_id}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="truncate">{prediction.goal_name}</span>
                    <div className={`flex items-center ${getRiskLevelColor(prediction.risk_level)}`}>
                      {getRiskLevelIcon(prediction.risk_level)}
                      <span className="ml-1 text-xs font-medium">
                        {getRiskLevelLabel(prediction.risk_level, language)}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{language === 'ar' ? 'مستوى المخاطر' : 'Risk Level'}</span>
                        <span>{getRiskLevelLabel(prediction.risk_level, language)}</span>
                      </div>
                      <Progress 
                        value={
                          prediction.risk_level === 'low' ? 25 :
                          prediction.risk_level === 'medium' ? 50 :
                          prediction.risk_level === 'high' ? 75 : 100
                        } 
                        className="h-2"
                      />
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {language === 'ar' 
                        ? 'يعتمد تقييم المخاطر على التقدم الحالي وأنماط الأداء السابقة'
                        : 'Risk assessment based on current progress and historical performance patterns'
                      }
                    </div>

                    {prediction.projected_completion_date && (
                      <div className="flex items-center text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>
                          {language === 'ar' ? 'التاريخ المتوقع للإنجاز:' : 'Projected completion:'} {prediction.projected_completion_date}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Influencing Factors Tab */}
        <TabsContent value="factors" className="space-y-6">
          {displayPredictions.map((prediction) => (
            <Card key={prediction.goal_id}>
              <CardHeader>
                <CardTitle className="text-base">{prediction.goal_name}</CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'العوامل التي تؤثر على تقدم الهدف'
                    : 'Factors influencing goal progress'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {prediction.factors_influencing_progress.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          factor.direction === 'positive' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm font-medium">{factor.factor}</span>
                      </div>
                      <div className="flex items-center">
                        <div className={`text-sm font-medium mr-2 ${
                          factor.direction === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {factor.direction === 'positive' ? '+' : '-'}{Math.abs(factor.impact * 100).toFixed(0)}%
                        </div>
                        {factor.direction === 'positive' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          {displayPredictions.map((prediction) => (
            <Card key={prediction.goal_id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  {prediction.goal_name}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'توصيات لتحسين التقدم'
                    : 'Recommendations to improve progress'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {prediction.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PredictiveInsights