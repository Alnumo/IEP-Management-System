// Practice Review Form for Home Practice Media
// Story 1.3: Media-Rich Progress Documentation Workflow

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, MessageSquare, CheckCircle, XCircle, AlertCircle, FileText, Send } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { useCreatePracticeReview, useUpdatePracticeReview } from '@/hooks/useSessionMedia'
import type { 
  SessionMediaWithReviews, 
  PracticeReview, 
  CreatePracticeReviewDto, 
  UpdatePracticeReviewDto,
  ReviewStatus 
} from '@/types/media'

interface PracticeReviewFormProps {
  media: SessionMediaWithReviews
  existingReview?: PracticeReview
  language: 'ar' | 'en'
  onReviewComplete?: (review: PracticeReview) => void
  onCancel?: () => void
  className?: string
}

const REVIEW_STATUS_OPTIONS: { value: ReviewStatus; labelKey: string; color: string; icon: React.ReactNode }[] = [
  { 
    value: 'excellent', 
    labelKey: 'media.reviewStatus.excellent', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle className="h-4 w-4" />
  },
  { 
    value: 'good', 
    labelKey: 'media.reviewStatus.good', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <CheckCircle className="h-4 w-4" />
  },
  { 
    value: 'satisfactory', 
    labelKey: 'media.reviewStatus.satisfactory', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <AlertCircle className="h-4 w-4" />
  },
  { 
    value: 'needs_improvement', 
    labelKey: 'media.reviewStatus.needs_improvement', 
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <AlertCircle className="h-4 w-4" />
  },
  { 
    value: 'incorrect', 
    labelKey: 'media.reviewStatus.incorrect', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="h-4 w-4" />
  }
]

const RATING_OPTIONS = [
  { value: 1, label: '1 - Poor' },
  { value: 2, label: '2 - Below Average' },
  { value: 3, label: '3 - Average' },
  { value: 4, label: '4 - Good' },
  { value: 5, label: '5 - Excellent' }
]

export const PracticeReviewForm: React.FC<PracticeReviewFormProps> = ({
  media,
  existingReview,
  language,
  onReviewComplete,
  onCancel,
  className
}) => {
  const { t } = useTranslation()
  const isRTL = language === 'ar'
  const isEditing = !!existingReview

  // State
  const [formData, setFormData] = useState({
    reviewStatus: existingReview?.review_status || 'satisfactory' as ReviewStatus,
    feedbackAr: existingReview?.feedback_ar || '',
    feedbackEn: existingReview?.feedback_en || '',
    techniqueRating: existingReview?.technique_rating || 3,
    consistencyRating: existingReview?.consistency_rating || 3,
    engagementRating: existingReview?.engagement_rating || 3,
    followUpNeeded: existingReview?.follow_up_needed || false,
    correctiveMediaUrl: existingReview?.corrective_media_url || '',
    nextPracticeSuggestions: existingReview?.next_practice_suggestions || ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  // Hooks
  const createReviewMutation = useCreatePracticeReview()
  const updateReviewMutation = useUpdatePracticeReview()

  // Helper functions
  const getStatusOption = (status: ReviewStatus) => {
    return REVIEW_STATUS_OPTIONS.find(option => option.value === status)
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return isRTL 
      ? date.toLocaleDateString('ar-SA', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
  }

  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return 'text-green-600'
    if (rating >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Event handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(undefined)

    try {
      let review: PracticeReview

      if (isEditing) {
        const updateData: UpdatePracticeReviewDto = {
          review_status: formData.reviewStatus,
          feedback_ar: formData.feedbackAr || undefined,
          feedback_en: formData.feedbackEn || undefined,
          technique_rating: formData.techniqueRating,
          consistency_rating: formData.consistencyRating,
          engagement_rating: formData.engagementRating,
          follow_up_needed: formData.followUpNeeded,
          corrective_media_url: formData.correctiveMediaUrl || undefined,
          next_practice_suggestions: formData.nextPracticeSuggestions || undefined
        }

        review = await updateReviewMutation.mutateAsync({
          id: existingReview!.id,
          data: updateData
        })
      } else {
        const createData: CreatePracticeReviewDto = {
          media_id: media.id,
          review_status: formData.reviewStatus,
          feedback_ar: formData.feedbackAr || undefined,
          feedback_en: formData.feedbackEn || undefined,
          technique_rating: formData.techniqueRating,
          consistency_rating: formData.consistencyRating,
          engagement_rating: formData.engagementRating,
          follow_up_needed: formData.followUpNeeded,
          corrective_media_url: formData.correctiveMediaUrl || undefined,
          next_practice_suggestions: formData.nextPracticeSuggestions || undefined
        }

        review = await createReviewMutation.mutateAsync(createData)
      }

      onReviewComplete?.(review)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('media.review.submitError')
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedStatus = getStatusOption(formData.reviewStatus)

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <MessageSquare className="h-5 w-5" />
            {isEditing ? t('media.review.editReview') : t('media.review.addReview')}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Media Info */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {media.media_type === 'photo' ? (
                      <img
                        src={media.thumbnail_url || media.file_url}
                        alt={media.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                    <h4 className="font-medium">
                      {(isRTL ? media.caption_ar : media.caption_en) || media.file_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t('media.review.uploadedOn')} {formatDate(media.created_at)}
                    </p>
                    <Badge className="mt-1" variant="outline">
                      {t(`media.uploadTypes.${media.upload_type}`)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Review Status */}
            <div>
              <Label className={`text-base font-medium ${isRTL ? 'text-right' : ''}`}>
                {t('media.review.overallRating')} *
              </Label>
              <RadioGroup
                value={formData.reviewStatus}
                onValueChange={(value: ReviewStatus) => setFormData(prev => ({ ...prev, reviewStatus: value }))}
                className="mt-2"
              >
                {REVIEW_STATUS_OPTIONS.map(option => (
                  <div key={option.value} className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label 
                      htmlFor={option.value} 
                      className={`flex items-center gap-2 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <Badge 
                        variant="outline" 
                        className={`${option.color} border ${isRTL ? 'ml-2' : 'mr-2'}`}
                      >
                        {option.icon}
                        {t(option.labelKey)}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Detailed Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className={isRTL ? 'text-right' : ''}>{t('media.review.techniqueRating')}</Label>
                <Select 
                  value={formData.techniqueRating.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, techniqueRating: parseInt(value) }))}
                >
                  <SelectTrigger className={isRTL ? 'text-right' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        <div className={`flex items-center gap-2 ${getRatingColor(option.value)}`}>
                          {Array.from({ length: option.value }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className={isRTL ? 'text-right' : ''}>{t('media.review.consistencyRating')}</Label>
                <Select 
                  value={formData.consistencyRating.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, consistencyRating: parseInt(value) }))}
                >
                  <SelectTrigger className={isRTL ? 'text-right' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        <div className={`flex items-center gap-2 ${getRatingColor(option.value)}`}>
                          {Array.from({ length: option.value }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className={isRTL ? 'text-right' : ''}>{t('media.review.engagementRating')}</Label>
                <Select 
                  value={formData.engagementRating.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, engagementRating: parseInt(value) }))}
                >
                  <SelectTrigger className={isRTL ? 'text-right' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        <div className={`flex items-center gap-2 ${getRatingColor(option.value)}`}>
                          {Array.from({ length: option.value }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Feedback */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className={isRTL ? 'text-right' : ''}>{t('media.review.feedbackArabic')}</Label>
                <Textarea
                  value={formData.feedbackAr}
                  onChange={(e) => setFormData(prev => ({ ...prev, feedbackAr: e.target.value }))}
                  placeholder={t('media.review.feedbackArabicPlaceholder')}
                  className={`${isRTL ? 'text-right' : ''} min-h-[120px]`}
                  dir="rtl"
                />
              </div>
              <div>
                <Label className={isRTL ? 'text-right' : ''}>{t('media.review.feedbackEnglish')}</Label>
                <Textarea
                  value={formData.feedbackEn}
                  onChange={(e) => setFormData(prev => ({ ...prev, feedbackEn: e.target.value }))}
                  placeholder={t('media.review.feedbackEnglishPlaceholder')}
                  className="min-h-[120px]"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Follow-up Options */}
            <div className="space-y-4">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Label htmlFor="follow-up-switch" className={isRTL ? 'text-right' : ''}>
                  {t('media.review.followUpNeeded')}
                </Label>
                <Switch
                  id="follow-up-switch"
                  checked={formData.followUpNeeded}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, followUpNeeded: checked }))}
                />
              </div>

              {formData.followUpNeeded && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div>
                    <Label className={isRTL ? 'text-right' : ''}>{t('media.review.nextPracticeSuggestions')}</Label>
                    <Textarea
                      value={formData.nextPracticeSuggestions}
                      onChange={(e) => setFormData(prev => ({ ...prev, nextPracticeSuggestions: e.target.value }))}
                      placeholder={t('media.review.nextPracticeSuggestionsPlaceholder')}
                      className={isRTL ? 'text-right' : ''}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>

                  <div>
                    <Label className={isRTL ? 'text-right' : ''}>{t('media.review.correctiveMediaUrl')}</Label>
                    <input
                      type="url"
                      value={formData.correctiveMediaUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, correctiveMediaUrl: e.target.value }))}
                      placeholder={t('media.review.correctiveMediaUrlPlaceholder')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {isEditing ? t('media.review.updating') : t('media.review.submitting')}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {isEditing ? t('media.review.updateReview') : t('media.review.submitReview')}
                  </>
                )}
              </Button>
              
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}