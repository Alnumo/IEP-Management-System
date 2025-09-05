/**
 * AI Recommendations Dashboard
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Clinical decision support interface for AI-generated therapy recommendations
 * Follows existing UI patterns with bilingual support
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Progress } from '../ui/progress'
import { Alert, AlertDescription } from '../ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import { Skeleton } from '../ui/skeleton'
import {
  BrainIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon,
  ClockIcon, StarIcon, TrendingUpIcon, TrendingDownIcon,
  FileTextIcon, ThumbsUpIcon, ThumbsDownIcon, EditIcon,
  RefreshCwIcon, DownloadIcon, FilterIcon, EyeIcon,
  MessageSquareIcon, TargetIcon, CalendarIcon, ActivityIcon
} from 'lucide-react'

import { AIRecommendationsAPI } from '../../services/ai-recommendations-api'
import { useAuth } from '../../contexts/AuthContext'
import type {
  AIRecommendation,
  RecommendationType,
  RecommendationStatus,
  TherapistFeedback
} from '../../types/ai-recommendations'

interface AIRecommendationsDashboardProps {
  studentId?: string
  showFilters?: boolean
  compactView?: boolean
}

export const AIRecommendationsDashboard: React.FC<AIRecommendationsDashboardProps> = ({
  studentId,
  showFilters = true,
  compactView = false
}) => {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const isRTL = i18n.language === 'ar'

  // State management
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [selectedRecommendation, setSelectedRecommendation] = useState<AIRecommendation | null>(null)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [explanationDialogOpen, setExplanationDialogOpen] = useState(false)

  // Filter states
  const [statusFilter, setStatusFilter] = useState<RecommendationStatus[]>([])
  const [typeFilter, setTypeFilter] = useState<RecommendationType[]>([])
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  // Fetch recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const result = await AIRecommendationsAPI.listRecommendations(
        {
          studentId,
          status: statusFilter.length > 0 ? statusFilter : undefined,
          type: typeFilter.length > 0 ? typeFilter : undefined,
          limit: compactView ? 5 : 20
        },
        user.id
      )

      if (result.data) {
        let filteredRecs = result.data.recommendations
        
        // Apply confidence filter
        if (confidenceFilter !== 'all') {
          filteredRecs = filteredRecs.filter(rec => {
            if (confidenceFilter === 'high') return rec.confidence >= 0.8
            if (confidenceFilter === 'medium') return rec.confidence >= 0.6 && rec.confidence < 0.8
            if (confidenceFilter === 'low') return rec.confidence < 0.6
            return true
          })
        }
        
        setRecommendations(filteredRecs)
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoading(false)
    }
  }, [user, studentId, statusFilter, typeFilter, confidenceFilter, compactView])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  // Generate new recommendations
  const generateRecommendations = async () => {
    if (!user || !studentId) return

    setLoading(true)
    try {
      await AIRecommendationsAPI.generateRecommendations({
        studentId,
        includeAssessmentData: true,
        includeProgressData: true,
        userId: user.id
      })
      
      // Refresh the list
      await fetchRecommendations()
    } catch (error) {
      console.error('Error generating recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Submit therapist feedback
  const submitFeedback = async (
    recommendation: AIRecommendation,
    decision: 'accept' | 'reject' | 'modify',
    reasoning: string,
    modifications?: any
  ) => {
    if (!user) return

    try {
      await AIRecommendationsAPI.submitFeedback(
        recommendation.id,
        {
          therapistId: user.id,
          decision,
          reasoning,
          reasoningAr: isRTL ? reasoning : '',
          reasoningEn: !isRTL ? reasoning : '',
          modifications
        },
        user.id
      )
      
      setFeedbackDialogOpen(false)
      await fetchRecommendations()
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }

  // Get status badge variant
  const getStatusBadge = (status: RecommendationStatus, confidence: number) => {
    const confidenceLevel = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low'
    
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="flex items-center gap-1">
          <ClockIcon className="w-3 h-3" />
          {t('ai.recommendations.status.pending')}
        </Badge>
      case 'accepted':
        return <Badge variant="default" className="bg-green-600 flex items-center gap-1">
          <CheckCircleIcon className="w-3 h-3" />
          {t('ai.recommendations.status.accepted')}
        </Badge>
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircleIcon className="w-3 h-3" />
          {t('ai.recommendations.status.rejected')}
        </Badge>
      case 'modified':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <EditIcon className="w-3 h-3" />
          {t('ai.recommendations.status.modified')}
        </Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Get confidence indicator
  const getConfidenceIndicator = (confidence: number) => {
    const level = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low'
    const color = level === 'high' ? 'text-green-600' : level === 'medium' ? 'text-yellow-600' : 'text-red-600'
    const bgColor = level === 'high' ? 'bg-green-100' : level === 'medium' ? 'bg-yellow-100' : 'bg-red-100'

    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${bgColor}`}>
        <div className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
        <span className={`text-xs font-medium ${color}`}>
          {(confidence * 100).toFixed(1)}% {t(`ai.confidence.${level}`)}
        </span>
      </div>
    )
  }

  // Get recommendation type icon
  const getRecommendationTypeIcon = (type: RecommendationType) => {
    switch (type) {
      case 'therapy_plan':
        return <TargetIcon className="w-4 h-4" />
      case 'session_adjustment':
        return <CalendarIcon className="w-4 h-4" />
      case 'goal_modification':
        return <StarIcon className="w-4 h-4" />
      case 'assessment_update':
        return <FileTextIcon className="w-4 h-4" />
      default:
        return <BrainIcon className="w-4 h-4" />
    }
  }

  if (loading && recommendations.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrainIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">
            {t('ai.recommendations.title')}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={generateRecommendations}
            disabled={loading || !studentId}
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('ai.recommendations.generate')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <Select 
                value={confidenceFilter} 
                onValueChange={(value: any) => setConfidenceFilter(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('ai.recommendations.filters.confidence')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('ai.recommendations.filters.all')}</SelectItem>
                  <SelectItem value="high">{t('ai.confidence.high')}</SelectItem>
                  <SelectItem value="medium">{t('ai.confidence.medium')}</SelectItem>
                  <SelectItem value="low">{t('ai.confidence.low')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BrainIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t('ai.recommendations.empty.title')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('ai.recommendations.empty.description')}
            </p>
            {studentId && (
              <Button onClick={generateRecommendations} disabled={loading}>
                <BrainIcon className="w-4 h-4 mr-2" />
                {t('ai.recommendations.generate')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map((recommendation) => (
            <Card key={recommendation.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      {getRecommendationTypeIcon(recommendation.recommendationType)}
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {t(`ai.recommendations.types.${recommendation.recommendationType}`)}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(recommendation.status, recommendation.confidence)}
                        {getConfidenceIndicator(recommendation.confidence)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(recommendation.createdAt).toLocaleDateString(isRTL ? 'ar' : 'en')}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Session Recommendations */}
                {recommendation.recommendations.sessionFrequency && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">{t('ai.recommendations.session.title')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">{t('ai.recommendations.session.frequency')}: </span>
                        <span className="font-medium">
                          {recommendation.recommendations.sessionFrequency.recommended} / 
                          {t(`ai.recommendations.session.${recommendation.recommendations.sessionFrequency.unit}`)}
                        </span>
                      </div>
                      {recommendation.recommendations.sessionDuration && (
                        <div>
                          <span className="text-gray-600">{t('ai.recommendations.session.duration')}: </span>
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ActivityIcon className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">{t('ai.recommendations.approaches.title')}</span>
                    </div>
                    <div className="space-y-2">
                      {recommendation.recommendations.therapeuticApproaches.slice(0, 3).map((approach, index) => (
                        <div key={index} className="flex items-center justify-between bg-blue-50 rounded-lg p-2">
                          <div>
                            <span className="font-medium text-sm">{approach.approach}</span>
                            <div className="text-xs text-gray-600 mt-1">{approach.rationale}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <StarIcon className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs">{approach.priority}/10</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanation Summary */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    {isRTL ? recommendation.explanation.textAr : recommendation.explanation.textEn}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRecommendation(recommendation)
                        setExplanationDialogOpen(true)
                      }}
                      className="flex items-center gap-1"
                    >
                      <EyeIcon className="w-3 h-3" />
                      {t('ai.recommendations.actions.viewDetails')}
                    </Button>
                  </div>

                  {recommendation.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => submitFeedback(recommendation, 'reject', 'Rejected by therapist')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <ThumbsDownIcon className="w-3 h-3 mr-1" />
                        {t('ai.recommendations.actions.reject')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => submitFeedback(recommendation, 'accept', 'Accepted by therapist')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <ThumbsUpIcon className="w-3 h-3 mr-1" />
                        {t('ai.recommendations.actions.accept')}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Explanation Dialog */}
      <Dialog open={explanationDialogOpen} onOpenChange={setExplanationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainIcon className="w-5 h-5" />
              {t('ai.recommendations.explanation.title')}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecommendation && (
            <div className="space-y-6">
              {/* Confidence Analysis */}
              <div className="space-y-3">
                <h3 className="font-semibold">{t('ai.recommendations.explanation.confidence')}</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span>{t('ai.recommendations.explanation.overallConfidence')}</span>
                    <span className="font-mono">
                      {(selectedRecommendation.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={selectedRecommendation.confidence * 100} 
                    className="h-2"
                  />
                </div>
              </div>

              {/* Primary Factors */}
              <div className="space-y-3">
                <h3 className="font-semibold">{t('ai.recommendations.explanation.primaryFactors')}</h3>
                <div className="space-y-2">
                  {selectedRecommendation.explanation.primaryFactors.map((factor, index) => (
                    <div key={index} className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
                      <CheckCircleIcon className="w-4 h-4 text-blue-600 mt-0.5" />
                      <span className="text-sm">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supporting Data */}
              {selectedRecommendation.explanation.supportingData && (
                <div className="space-y-3">
                  <h3 className="font-semibold">{t('ai.recommendations.explanation.supportingData')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedRecommendation.explanation.supportingData.demographicFactors && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium mb-2">{t('ai.recommendations.explanation.demographics')}</h4>
                        <div className="space-y-1 text-sm">
                          {selectedRecommendation.explanation.supportingData.demographicFactors.map((factor, index) => (
                            <div key={index} className="text-gray-700">{factor}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedRecommendation.explanation.supportingData.progressTrends && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium mb-2">{t('ai.recommendations.explanation.progressTrends')}</h4>
                        <div className="space-y-2">
                          {selectedRecommendation.explanation.supportingData.progressTrends.map((trend, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span>{trend.metric}</span>
                              <div className="flex items-center gap-1">
                                {trend.trend === 'improving' ? (
                                  <TrendingUpIcon className="w-3 h-3 text-green-600" />
                                ) : trend.trend === 'declining' ? (
                                  <TrendingDownIcon className="w-3 h-3 text-red-600" />
                                ) : (
                                  <div className="w-3 h-0.5 bg-gray-400" />
                                )}
                                <span>{t(`ai.trends.${trend.trend}`)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Clinical Evidence */}
              <div className="space-y-3">
                <h3 className="font-semibold">{t('ai.recommendations.explanation.clinicalEvidence')}</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    {selectedRecommendation.explanation.clinicalEvidence}
                  </p>
                </div>
              </div>

              {/* Full Explanation */}
              <div className="space-y-3">
                <h3 className="font-semibold">{t('ai.recommendations.explanation.detailed')}</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm leading-relaxed">
                    {isRTL ? selectedRecommendation.explanation.textAr : selectedRecommendation.explanation.textEn}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}