/**
 * Recommendation Feedback Dialog
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Comprehensive feedback capture system for therapist input on AI recommendations
 * Supports acceptance, rejection, and modification workflows
 */

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import {
  ThumbsUpIcon, ThumbsDownIcon, EditIcon, AlertTriangleIcon,
  CheckCircleIcon, MessageSquareIcon, ClockIcon, StarIcon,
  CalendarIcon, ActivityIcon, BrainIcon, SaveIcon
} from 'lucide-react'

import type {
  AIRecommendation,
  TherapistFeedback,
  TherapyRecommendation
} from '../../types/ai-recommendations'

interface RecommendationFeedbackDialogProps {
  recommendation: AIRecommendation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitFeedback: (
    decision: 'accept' | 'reject' | 'modify',
    reasoning: string,
    modifications?: Partial<TherapyRecommendation>
  ) => Promise<void>
  loading?: boolean
}

export const RecommendationFeedbackDialog: React.FC<RecommendationFeedbackDialogProps> = ({
  recommendation,
  open,
  onOpenChange,
  onSubmitFeedback,
  loading = false
}) => {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

  // Form state
  const [selectedDecision, setSelectedDecision] = useState<'accept' | 'reject' | 'modify' | null>(null)
  const [reasoning, setReasoning] = useState('')
  const [modifications, setModifications] = useState<Partial<TherapyRecommendation>>({})
  
  // Modification form state
  const [sessionFrequency, setSessionFrequency] = useState<number | null>(null)
  const [sessionDuration, setSessionDuration] = useState<number | null>(null)
  const [selectedApproaches, setSelectedApproaches] = useState<string[]>([])
  const [customApproach, setCustomApproach] = useState('')

  // Predefined rejection reasons
  const rejectionReasons = [
    'ai.feedback.rejectionReasons.clinicallyInappropriate',
    'ai.feedback.rejectionReasons.insufficientData',
    'ai.feedback.rejectionReasons.conflictsWithFamily',
    'ai.feedback.rejectionReasons.resourceConstraints',
    'ai.feedback.rejectionReasons.patientSpecificFactors',
    'ai.feedback.rejectionReasons.other'
  ]

  // Common therapeutic approaches
  const therapeuticApproaches = [
    'Speech Sound Production',
    'Language Comprehension', 
    'Social Communication',
    'Articulation Therapy',
    'Language Stimulation',
    'Behavioral Intervention',
    'Play-Based Therapy',
    'Parent Training',
    'Augmentative Communication'
  ]

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open && recommendation) {
      setSelectedDecision(null)
      setReasoning('')
      setModifications({})
      setSessionFrequency(recommendation.recommendations.sessionFrequency?.recommended || null)
      setSessionDuration(recommendation.recommendations.sessionDuration?.recommended || null)
      setSelectedApproaches(
        recommendation.recommendations.therapeuticApproaches?.map(a => a.approach) || []
      )
      setCustomApproach('')
    }
  }, [open, recommendation])

  // Handle decision change
  const handleDecisionChange = (decision: 'accept' | 'reject' | 'modify') => {
    setSelectedDecision(decision)
    
    // Set default reasoning based on decision
    if (decision === 'accept' && !reasoning) {
      setReasoning(t('ai.feedback.defaultReasons.accept'))
    } else if (decision === 'reject' && !reasoning) {
      setReasoning('')
    }
  }

  // Handle modifications
  const handleModificationChange = () => {
    const mods: Partial<TherapyRecommendation> = {}

    if (sessionFrequency !== recommendation?.recommendations.sessionFrequency?.recommended) {
      mods.sessionFrequency = {
        current: recommendation?.recommendations.sessionFrequency?.current || 2,
        recommended: sessionFrequency || 2,
        unit: recommendation?.recommendations.sessionFrequency?.unit || 'weekly'
      }
    }

    if (sessionDuration !== recommendation?.recommendations.sessionDuration?.recommended) {
      mods.sessionDuration = {
        current: recommendation?.recommendations.sessionDuration?.current || 60,
        recommended: sessionDuration || 60,
        unit: recommendation?.recommendations.sessionDuration?.unit || 'minutes'
      }
    }

    if (selectedApproaches.length > 0) {
      const approaches = selectedApproaches.map((approach, index) => ({
        approach,
        priority: 8 - index, // Descending priority
        rationale: 'Modified by therapist based on clinical judgment'
      }))

      if (customApproach) {
        approaches.push({
          approach: customApproach,
          priority: 10,
          rationale: 'Custom approach added by therapist'
        })
      }

      mods.therapeuticApproaches = approaches
    }

    setModifications(mods)
  }

  React.useEffect(() => {
    if (selectedDecision === 'modify') {
      handleModificationChange()
    }
  }, [sessionFrequency, sessionDuration, selectedApproaches, customApproach, selectedDecision])

  // Submit feedback
  const handleSubmit = async () => {
    if (!selectedDecision || !reasoning.trim()) return

    try {
      await onSubmitFeedback(
        selectedDecision,
        reasoning.trim(),
        selectedDecision === 'modify' ? modifications : undefined
      )
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }

  // Get decision badge
  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'accept':
        return (
          <Badge variant="default" className="bg-green-600">
            <ThumbsUpIcon className="w-3 h-3 mr-1" />
            {t('ai.feedback.decisions.accept')}
          </Badge>
        )
      case 'reject':
        return (
          <Badge variant="destructive">
            <ThumbsDownIcon className="w-3 h-3 mr-1" />
            {t('ai.feedback.decisions.reject')}
          </Badge>
        )
      case 'modify':
        return (
          <Badge variant="secondary">
            <EditIcon className="w-3 h-3 mr-1" />
            {t('ai.feedback.decisions.modify')}
          </Badge>
        )
      default:
        return null
    }
  }

  if (!recommendation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareIcon className="w-5 h-5" />
            {t('ai.feedback.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recommendation Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BrainIcon className="w-5 h-5 text-blue-600" />
                {t(`ai.recommendations.types.${recommendation.recommendationType}`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Recommendations */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">{t('ai.feedback.currentRecommendations')}</h4>
                
                {recommendation.recommendations.sessionFrequency && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-gray-600" />
                      <span>{t('ai.recommendations.session.frequency')}</span>
                    </div>
                    <span className="font-medium">
                      {recommendation.recommendations.sessionFrequency.recommended} / 
                      {t(`ai.recommendations.session.${recommendation.recommendations.sessionFrequency.unit}`)}
                    </span>
                  </div>
                )}

                {recommendation.recommendations.sessionDuration && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-gray-600" />
                      <span>{t('ai.recommendations.session.duration')}</span>
                    </div>
                    <span className="font-medium">
                      {recommendation.recommendations.sessionDuration.recommended} 
                      {t(`ai.recommendations.session.${recommendation.recommendations.sessionDuration.unit}`)}
                    </span>
                  </div>
                )}

                {recommendation.recommendations.therapeuticApproaches && (
                  <div className="py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <ActivityIcon className="w-4 h-4 text-gray-600" />
                      <span>{t('ai.recommendations.approaches.title')}</span>
                    </div>
                    <div className="space-y-1">
                      {recommendation.recommendations.therapeuticApproaches.slice(0, 3).map((approach, index) => (
                        <div key={index} className="flex items-center justify-between text-sm bg-white rounded px-2 py-1">
                          <span>{approach.approach}</span>
                          <div className="flex items-center gap-1">
                            <StarIcon className="w-3 h-3 text-yellow-500" />
                            <span>{approach.priority}/10</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confidence Indicator */}
              <div className="flex items-center justify-between text-sm">
                <span>{t('ai.recommendations.explanation.confidence')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${recommendation.confidence * 100}%` }}
                    />
                  </div>
                  <span className="font-medium">{(recommendation.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Decision Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold">{t('ai.feedback.selectDecision')}</h3>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleDecisionChange('accept')}
                className={`p-4 border rounded-lg transition-all ${
                  selectedDecision === 'accept'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <ThumbsUpIcon className={`w-8 h-8 ${
                    selectedDecision === 'accept' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <span className="font-medium">{t('ai.feedback.decisions.accept')}</span>
                  <span className="text-xs text-gray-600 text-center">
                    {t('ai.feedback.descriptions.accept')}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleDecisionChange('modify')}
                className={`p-4 border rounded-lg transition-all ${
                  selectedDecision === 'modify'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <EditIcon className={`w-8 h-8 ${
                    selectedDecision === 'modify' ? 'text-yellow-600' : 'text-gray-400'
                  }`} />
                  <span className="font-medium">{t('ai.feedback.decisions.modify')}</span>
                  <span className="text-xs text-gray-600 text-center">
                    {t('ai.feedback.descriptions.modify')}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleDecisionChange('reject')}
                className={`p-4 border rounded-lg transition-all ${
                  selectedDecision === 'reject'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <ThumbsDownIcon className={`w-8 h-8 ${
                    selectedDecision === 'reject' ? 'text-red-600' : 'text-gray-400'
                  }`} />
                  <span className="font-medium">{t('ai.feedback.decisions.reject')}</span>
                  <span className="text-xs text-gray-600 text-center">
                    {t('ai.feedback.descriptions.reject')}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Modifications Section (only for modify) */}
          {selectedDecision === 'modify' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <EditIcon className="w-5 h-5" />
                  {t('ai.feedback.modifications.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="sessions" className="w-full">
                  <TabsList>
                    <TabsTrigger value="sessions">{t('ai.feedback.modifications.sessions')}</TabsTrigger>
                    <TabsTrigger value="approaches">{t('ai.feedback.modifications.approaches')}</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="sessions" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('ai.recommendations.session.frequency')}</Label>
                        <Select
                          value={sessionFrequency?.toString()}
                          onValueChange={(value) => setSessionFrequency(Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} / {t('ai.recommendations.session.weekly')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>{t('ai.recommendations.session.duration')}</Label>
                        <Select
                          value={sessionDuration?.toString()}
                          onValueChange={(value) => setSessionDuration(Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[30, 45, 60, 75, 90].map(duration => (
                              <SelectItem key={duration} value={duration.toString()}>
                                {duration} {t('ai.recommendations.session.minutes')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="approaches" className="space-y-4">
                    <div>
                      <Label className="mb-3 block">{t('ai.feedback.modifications.selectApproaches')}</Label>
                      <div className="space-y-2">
                        {therapeuticApproaches.map(approach => (
                          <div key={approach} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedApproaches.includes(approach)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedApproaches(prev => [...prev, approach])
                                } else {
                                  setSelectedApproaches(prev => prev.filter(a => a !== approach))
                                }
                              }}
                            />
                            <Label className="text-sm">{approach}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="customApproach">{t('ai.feedback.modifications.customApproach')}</Label>
                      <Input
                        id="customApproach"
                        value={customApproach}
                        onChange={(e) => setCustomApproach(e.target.value)}
                        placeholder={t('ai.feedback.modifications.customApproachPlaceholder')}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Reasoning Section */}
          <div className="space-y-3">
            <Label htmlFor="reasoning">
              {t('ai.feedback.reasoning')} *
              {selectedDecision && (
                <span className="ml-2">
                  {getDecisionBadge(selectedDecision)}
                </span>
              )}
            </Label>
            
            {selectedDecision === 'reject' && (
              <div className="mb-3">
                <Label className="text-sm text-gray-600 mb-2 block">
                  {t('ai.feedback.commonReasons')}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {rejectionReasons.map(reasonKey => (
                    <Button
                      key={reasonKey}
                      variant="outline"
                      size="sm"
                      onClick={() => setReasoning(t(reasonKey))}
                      className="text-xs"
                    >
                      {t(reasonKey)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Textarea
              id="reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder={
                selectedDecision === 'accept'
                  ? t('ai.feedback.reasoningPlaceholders.accept')
                  : selectedDecision === 'modify'
                  ? t('ai.feedback.reasoningPlaceholders.modify')
                  : selectedDecision === 'reject'
                  ? t('ai.feedback.reasoningPlaceholders.reject')
                  : t('ai.feedback.reasoningPlaceholders.default')
              }
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Validation Alert */}
          {selectedDecision && !reasoning.trim() && (
            <Alert>
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                {t('ai.feedback.validation.reasoningRequired')}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={!selectedDecision || !reasoning.trim() || loading}
              className="flex items-center gap-2"
            >
              <SaveIcon className="w-4 h-4" />
              {loading ? t('common.submitting') : t('ai.feedback.submit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}