import React, { useState, useCallback, useMemo } from 'react'
import { Calendar, AlertTriangle, Clock, Calculator, Pause } from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DatePicker } from '@/components/ui/date-picker'
import { useLanguage } from '@/contexts/LanguageContext'
import { useFreezePreview } from '@/hooks/useSubscriptions'
import { formatDate, addDays, differenceInDays } from '@/lib/utils'
import type { 
  StudentSubscription, 
  FreezeRequest, 
  FreezePreview 
} from '@/types/scheduling'

/**
 * Freeze Subscription Dialog Component
 * 
 * Modal dialog for freezing student subscriptions with:
 * - Date range selection with validation
 * - Real-time preview of affected sessions
 * - Automatic program timeline adjustments
 * - Reason tracking for audit purposes
 */

interface FreezeSubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: StudentSubscription
  onSubmit: (request: FreezeRequest) => void
}

const MIN_FREEZE_DURATION = 1 // Minimum 1 day
const MAX_FREEZE_DURATION = 30 // Maximum 30 days per freeze request

export function FreezeSubscriptionDialog({
  open,
  onOpenChange,
  subscription,
  onSubmit
}: FreezeSubscriptionDialogProps) {
  const { language, isRTL, t } = useLanguage()
  
  // Form state
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate freeze duration
  const freezeDuration = useMemo(() => {
    if (!startDate || !endDate) return 0
    return differenceInDays(endDate, startDate) + 1
  }, [startDate, endDate])

  // Calculate remaining freeze days
  const remainingFreezeDays = subscription.freeze_days_allowed - subscription.freeze_days_used

  // Fetch preview data when dates are selected
  const { data: preview, isLoading: isPreviewLoading } = useFreezePreview(
    subscription.id,
    startDate?.toISOString().split('T')[0] || '',
    endDate?.toISOString().split('T')[0] || '',
    { enabled: !!(startDate && endDate && freezeDuration > 0) }
  )

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = []
    
    if (!startDate) {
      errors.push(t('freeze.error.start_date_required', 'Start date is required'))
    } else if (startDate < new Date()) {
      errors.push(t('freeze.error.start_date_past', 'Start date cannot be in the past'))
    }
    
    if (!endDate) {
      errors.push(t('freeze.error.end_date_required', 'End date is required'))
    } else if (startDate && endDate <= startDate) {
      errors.push(t('freeze.error.end_date_after_start', 'End date must be after start date'))
    }
    
    if (freezeDuration < MIN_FREEZE_DURATION) {
      errors.push(t('freeze.error.min_duration', `Minimum freeze duration is ${MIN_FREEZE_DURATION} day(s)`))
    }
    
    if (freezeDuration > MAX_FREEZE_DURATION) {
      errors.push(t('freeze.error.max_duration', `Maximum freeze duration is ${MAX_FREEZE_DURATION} days per request`))
    }
    
    if (freezeDuration > remainingFreezeDays) {
      errors.push(t('freeze.error.insufficient_days', 'Insufficient freeze days remaining'))
    }
    
    if (!reason.trim()) {
      errors.push(t('freeze.error.reason_required', 'Reason is required'))
    }
    
    return errors
  }, [startDate, endDate, freezeDuration, remainingFreezeDays, reason, t])

  const isValid = validationErrors.length === 0

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!isValid || !startDate || !endDate) return
    
    setIsSubmitting(true)
    
    try {
      const request: FreezeRequest = {
        subscription_id: subscription.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        reason: reason.trim(),
        freeze_days: freezeDuration
      }
      
      await onSubmit(request)
      
      // Reset form
      setStartDate(null)
      setEndDate(null)
      setReason('')
    } catch (error) {
      console.error('Failed to submit freeze request:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [isValid, startDate, endDate, subscription.id, reason, freezeDuration, onSubmit])

  // Handle date changes with auto-calculation
  const handleStartDateChange = useCallback((date: Date | null) => {
    setStartDate(date)
    if (date && !endDate) {
      // Auto-suggest end date (7 days by default)
      setEndDate(addDays(date, 6))
    }
  }, [endDate])

  const handleEndDateChange = useCallback((date: Date | null) => {
    setEndDate(date)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${isRTL ? 'text-right' : 'text-left'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="h-5 w-5" />
            {t('freeze.title', 'Freeze Subscription')}
          </DialogTitle>
          <DialogDescription>
            {t('freeze.description', 'Temporarily pause the subscription and reschedule affected sessions.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Subscription Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-blue-900">
                    {t('freeze.current_period', 'Current Period')}
                  </label>
                  <p className="text-blue-700">
                    {formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-blue-900">
                    {t('freeze.available_days', 'Available Freeze Days')}
                  </label>
                  <p className="text-blue-700">
                    {remainingFreezeDays} / {subscription.freeze_days_allowed}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('freeze.start_date', 'Start Date')}
              </Label>
              <DatePicker
                date={startDate}
                onDateChange={handleStartDateChange}
                placeholder={t('freeze.select_start_date', 'Select start date')}
                disabled={isSubmitting}
                fromDate={new Date()}
                toDate={new Date(subscription.end_date)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('freeze.end_date', 'End Date')}
              </Label>
              <DatePicker
                date={endDate}
                onDateChange={handleEndDateChange}
                placeholder={t('freeze.select_end_date', 'Select end date')}
                disabled={isSubmitting || !startDate}
                fromDate={startDate ? addDays(startDate, 1) : new Date()}
                toDate={new Date(subscription.end_date)}
              />
            </div>
          </div>

          {/* Duration Display */}
          {freezeDuration > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                {t('freeze.duration', 'Freeze Duration')}
              </span>
              <Badge variant="outline" className="text-base">
                {freezeDuration} {t('freeze.days', 'days')}
              </Badge>
            </div>
          )}

          {/* Preview Information */}
          {preview && !isPreviewLoading && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <h4 className="font-medium text-orange-900 mb-3 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  {t('freeze.preview', 'Preview Changes')}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-orange-800">
                      {t('freeze.affected_sessions', 'Sessions to Reschedule')}
                    </label>
                    <p className="text-orange-700">{preview.affected_sessions_count}</p>
                  </div>
                  <div>
                    <label className="font-medium text-orange-800">
                      {t('freeze.new_end_date', 'New End Date')}
                    </label>
                    <p className="text-orange-700">{formatDate(preview.new_end_date)}</p>
                  </div>
                </div>
                {preview.conflicts_count > 0 && (
                  <Alert className="mt-3 border-yellow-300 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-yellow-800">
                      {t('freeze.conflicts_warning', `${preview.conflicts_count} scheduling conflicts detected. These will require manual resolution.`)}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              {t('freeze.reason', 'Reason for Freeze')} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('freeze.reason_placeholder', 'Enter reason for subscription freeze (e.g., medical leave, travel, etc.)')}
              disabled={isSubmitting}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {reason.length}/500 {t('freeze.characters', 'characters')}
            </p>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-red-800">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('freeze.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting 
              ? t('freeze.submitting', 'Processing...') 
              : t('freeze.submit', 'Freeze Subscription')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}