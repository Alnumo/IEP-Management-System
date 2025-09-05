/**
 * Recommendation Explanation Modal
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Detailed explanation modal with supporting data visualization
 * Provides transparency into AI decision-making process
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Alert, AlertDescription } from '../ui/alert'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import {
  BrainIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon,
  BarChart3Icon, PieChartIcon, ActivityIcon, TargetIcon,
  CheckCircleIcon, AlertTriangleIcon, InfoIcon, StarIcon,
  CalendarIcon, ClockIcon, UsersIcon, FileTextIcon, EyeIcon
} from 'lucide-react'

import { AIRecommendationsAPI } from '../../services/ai-recommendations-api'
import { useAuth } from '../../contexts/AuthContext'
import type {
  AIRecommendation,
  RecommendationExplanation
} from '../../types/ai-recommendations'

interface RecommendationExplanationModalProps {
  recommendation: AIRecommendation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ConfidenceAnalysis {
  overallConfidence: number
  confidenceFactors: Record<string, number>
  riskAssessment: 'low' | 'medium' | 'high'
  clinicalSafetyScore: number
  recommendedAction: 'accept' | 'review' | 'reject'
  explanation: string
}

export const RecommendationExplanationModal: React.FC<RecommendationExplanationModalProps> = ({
  recommendation,
  open,
  onOpenChange
}) => {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const isRTL = i18n.language === 'ar'

  const [confidenceAnalysis, setConfidenceAnalysis] = useState<ConfidenceAnalysis | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch detailed confidence analysis
  useEffect(() => {
    if (recommendation && open && user) {
      fetchConfidenceAnalysis()
    }
  }, [recommendation, open, user])

  const fetchConfidenceAnalysis = async () => {
    if (!recommendation || !user) return

    setLoading(true)
    try {
      const result = await AIRecommendationsAPI.getConfidenceAnalysis(
        recommendation.id,
        user.id
      )
      
      if (result.data) {
        setConfidenceAnalysis(result.data)
      }
    } catch (error) {
      console.error('Error fetching confidence analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!recommendation) return null

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

  // Prepare confidence factors data for visualization
  const confidenceFactorsData = confidenceAnalysis 
    ? Object.entries(confidenceAnalysis.confidenceFactors).map(([factor, value]) => ({
        name: t(`ai.confidence.factors.${factor}`),
        value: Math.round(value * 100),
        fullValue: value
      }))
    : []

  // Prepare assessment scores data
  const assessmentData = recommendation.explanation.supportingData?.assessmentScores
    ? Object.entries(recommendation.explanation.supportingData.assessmentScores).map(([test, score]) => ({
        test: test.replace('_', ' ').toUpperCase(),
        score: typeof score === 'number' ? score : 0,
        normalized: typeof score === 'number' ? (score / 150) * 100 : 0 // Normalize to percentage
      }))
    : []

  // Prepare progress trends data
  const progressTrendsData = recommendation.explanation.supportingData?.progressTrends?.map(trend => ({
    metric: trend.metric,
    trend: trend.trend,
    significance: trend.significance * 100,
    icon: trend.trend === 'improving' ? TrendingUpIcon : 
          trend.trend === 'declining' ? TrendingDownIcon : MinusIcon,
    color: trend.trend === 'improving' ? '#10B981' : 
           trend.trend === 'declining' ? '#EF4444' : '#6B7280'
  })) || []

  // Therapeutic approaches data for radar chart
  const therapeuticApproachesData = recommendation.recommendations.therapeuticApproaches
    ?.map(approach => ({
        approach: approach.approach.substring(0, 15) + (approach.approach.length > 15 ? '...' : ''),
        priority: approach.priority,
        fullName: approach.approach
      })) || []

  // Get risk assessment color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // Get confidence level
  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.8) return { level: 'high', color: 'text-green-600' }
    if (confidence >= 0.6) return { level: 'medium', color: 'text-yellow-600' }
    return { level: 'low', color: 'text-red-600' }
  }

  const confidenceLevel = getConfidenceLevel(recommendation.confidence)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainIcon className="w-6 h-6 text-blue-600" />
            {t('ai.explanation.title')}
            <Badge variant="outline" className="ml-2">
              {t(`ai.recommendations.types.${recommendation.recommendationType}`)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{t('ai.explanation.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="confidence">{t('ai.explanation.tabs.confidence')}</TabsTrigger>
            <TabsTrigger value="data">{t('ai.explanation.tabs.data')}</TabsTrigger>
            <TabsTrigger value="clinical">{t('ai.explanation.tabs.clinical')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Confidence Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TargetIcon className="w-5 h-5" />
                  {t('ai.explanation.confidenceSummary')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {(recommendation.confidence * 100).toFixed(1)}%
                    </div>
                    <div className={`text-sm ${confidenceLevel.color}`}>
                      {t(`ai.confidence.${confidenceLevel.level}`)} {t('ai.confidence.level')}
                    </div>
                  </div>
                  <div className="w-32">
                    <Progress 
                      value={recommendation.confidence * 100} 
                      className="h-3"
                    />
                  </div>
                </div>

                {confidenceAnalysis && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {(confidenceAnalysis.clinicalSafetyScore * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-600">
                        {t('ai.explanation.clinicalSafety')}
                      </div>
                    </div>
                    <div className="text-center">
                      <Badge className={getRiskColor(confidenceAnalysis.riskAssessment)}>
                        {t(`ai.risk.${confidenceAnalysis.riskAssessment}`)}
                      </Badge>
                      <div className="text-xs text-gray-600 mt-1">
                        {t('ai.explanation.riskLevel')}
                      </div>
                    </div>
                    <div className="text-center">
                      <Badge variant={
                        confidenceAnalysis.recommendedAction === 'accept' ? 'default' :
                        confidenceAnalysis.recommendedAction === 'review' ? 'secondary' : 'destructive'
                      }>
                        {t(`ai.explanation.actions.${confidenceAnalysis.recommendedAction}`)}
                      </Badge>
                      <div className="text-xs text-gray-600 mt-1">
                        {t('ai.explanation.recommendedAction')}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Primary Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  {t('ai.explanation.primaryFactors')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendation.explanation.primaryFactors.map((factor, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{factor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommendation Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ActivityIcon className="w-5 h-5" />
                  {t('ai.explanation.recommendationDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Session Parameters */}
                {(recommendation.recommendations.sessionFrequency || recommendation.recommendations.sessionDuration) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {t('ai.explanation.sessionParameters')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {recommendation.recommendations.sessionFrequency && (
                        <div className="flex justify-between">
                          <span>{t('ai.recommendations.session.frequency')}:</span>
                          <span className="font-medium">
                            {recommendation.recommendations.sessionFrequency.recommended} / 
                            {t(`ai.recommendations.session.${recommendation.recommendations.sessionFrequency.unit}`)}
                          </span>
                        </div>
                      )}
                      {recommendation.recommendations.sessionDuration && (
                        <div className="flex justify-between">
                          <span>{t('ai.recommendations.session.duration')}:</span>
                          <span className="font-medium">
                            {recommendation.recommendations.sessionDuration.recommended}
                            {t(`ai.recommendations.session.${recommendation.recommendations.sessionDuration.unit}`)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Therapeutic Approaches */}
                {recommendation.recommendations.therapeuticApproaches && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <StarIcon className="w-4 h-4" />
                      {t('ai.explanation.therapeuticApproaches')}
                    </h4>
                    <div className="space-y-2">
                      {recommendation.recommendations.therapeuticApproaches.map((approach, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{approach.approach}</div>
                            <div className="text-xs text-gray-600 mt-1">{approach.rationale}</div>
                          </div>
                          <div className="flex items-center gap-1 ml-4">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 10 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${
                                    i < approach.priority ? 'bg-yellow-400' : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs ml-1">{approach.priority}/10</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Explanation Text */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileTextIcon className="w-5 h-5" />
                  {t('ai.explanation.detailedExplanation')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm leading-relaxed">
                    {isRTL ? recommendation.explanation.textAr : recommendation.explanation.textEn}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Confidence Tab */}
          <TabsContent value="confidence" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-gray-600">{t('ai.explanation.loadingAnalysis')}</p>
                </div>
              </div>
            ) : confidenceAnalysis ? (
              <>
                {/* Confidence Factors Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3Icon className="w-5 h-5" />
                      {t('ai.explanation.confidenceFactors')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={confidenceFactorsData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            fontSize={12}
                          />
                          <YAxis 
                            domain={[0, 100]}
                            label={{ value: t('ai.explanation.confidencePercentage'), angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            formatter={(value: number) => [`${value}%`, t('ai.explanation.confidence')]}
                          />
                          <Bar dataKey="value" fill="#3B82F6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('ai.explanation.detailedAnalysis')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(confidenceAnalysis.confidenceFactors).map(([factor, value]) => (
                        <div key={factor} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{t(`ai.confidence.factors.${factor}`)}</span>
                            <span className="text-sm font-mono">{(value * 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={value * 100} className="h-2" />
                          <p className="text-xs text-gray-600">
                            {t(`ai.confidence.descriptions.${factor}`)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert>
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>
                  {t('ai.explanation.noConfidenceData')}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Supporting Data Tab */}
          <TabsContent value="data" className="space-y-6">
            {/* Assessment Scores */}
            {assessmentData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3Icon className="w-5 h-5" />
                    {t('ai.explanation.assessmentScores')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={assessmentData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="test" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [value, t('ai.explanation.score')]} />
                        <Bar dataKey="score" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Trends */}
            {progressTrendsData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUpIcon className="w-5 h-5" />
                    {t('ai.explanation.progressTrends')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {progressTrendsData.map((trend, index) => {
                      const IconComponent = trend.icon
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <IconComponent className="w-5 h-5" style={{ color: trend.color }} />
                            <div>
                              <span className="font-medium">{trend.metric}</span>
                              <div className="text-sm text-gray-600">
                                {t(`ai.trends.${trend.trend}`)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {trend.significance.toFixed(1)}% {t('ai.explanation.significance')}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Therapeutic Approaches Radar */}
            {therapeuticApproachesData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" />
                    {t('ai.explanation.approachPriorities')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={therapeuticApproachesData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="approach" fontSize={12} />
                        <PolarRadiusAxis 
                          angle={90} 
                          domain={[0, 10]}
                          tick={{ fontSize: 10 }}
                        />
                        <Radar
                          name="Priority"
                          dataKey="priority"
                          stroke="#3B82F6"
                          fill="#3B82F6"
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => [
                            `${value}/10`,
                            props.payload.fullName
                          ]}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Clinical Evidence Tab */}
          <TabsContent value="clinical" className="space-y-6">
            {/* Clinical Evidence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileTextIcon className="w-5 h-5" />
                  {t('ai.explanation.clinicalEvidence')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 leading-relaxed">
                    {recommendation.explanation.clinicalEvidence}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Demographic Context */}
            {recommendation.explanation.supportingData?.demographicFactors && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="w-5 h-5" />
                    {t('ai.explanation.demographicContext')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recommendation.explanation.supportingData.demographicFactors.map((factor, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <InfoIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">{factor}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Clinical Recommendations */}
            <Alert>
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('ai.explanation.clinicalNote.title')}: </strong>
                {t('ai.explanation.clinicalNote.description')}
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}