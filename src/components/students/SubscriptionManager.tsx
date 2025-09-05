import React, { useState, useCallback } from 'react'
import { Calendar, Clock, Pause, Play, AlertTriangle, MoreVertical, History, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { FreezeSubscriptionDialog } from './FreezeSubscriptionDialog'
import { SubscriptionTimeline } from './SubscriptionTimeline'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { formatDate } from '@/lib/utils'
import type { 
  StudentSubscription, 
  SubscriptionStatus,
  FreezeRequest
} from '@/types/scheduling'

/**
 * Subscription Manager Component
 * 
 * Displays and manages student subscription information including:
 * - Subscription status and timeline
 * - Freeze management with day tracking
 * - History and audit trail
 * - Quick actions for subscription operations
 */

interface SubscriptionManagerProps {
  studentId: string
  onSubscriptionUpdate?: (subscription: StudentSubscription) => void
  readOnly?: boolean
}

const getStatusColor = (status: SubscriptionStatus): string => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200'
    case 'frozen': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'suspended': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusIcon = (status: SubscriptionStatus) => {
  switch (status) {
    case 'active': return <Play className="h-3 w-3" />
    case 'frozen': return <Pause className="h-3 w-3" />
    case 'suspended': return <AlertTriangle className="h-3 w-3" />
    case 'completed': return <Clock className="h-3 w-3" />
    case 'cancelled': return <AlertTriangle className="h-3 w-3" />
    default: return <Clock className="h-3 w-3" />
  }
}

export function SubscriptionManager({ 
  studentId, 
  onSubscriptionUpdate,
  readOnly = false 
}: SubscriptionManagerProps) {
  const { language, isRTL, t } = useLanguage()
  const [showFreezeDialog, setShowFreezeDialog] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)

  // Fetch subscription data
  const { 
    data: subscriptions = [], 
    isLoading, 
    error,
    refetch 
  } = useSubscriptions(studentId)

  const handleFreezeRequest = useCallback(async (request: FreezeRequest) => {
    try {
      // Handle freeze request logic will be implemented in the hook
      console.log('Freeze request:', request)
      setShowFreezeDialog(false)
      await refetch()
      
      if (onSubscriptionUpdate && subscriptions[0]) {
        onSubscriptionUpdate(subscriptions[0])
      }
    } catch (error) {
      console.error('Failed to freeze subscription:', error)
    }
  }, [subscriptions, refetch, onSubscriptionUpdate])

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              {t('subscription.error', 'Failed to load subscription data')}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!subscriptions.length) {
    return (
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">
              {t('subscription.no_active', 'No active subscriptions found')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const activeSubscription = subscriptions[0] // Most recent subscription

  const freezeDaysUsedPercentage = (activeSubscription.freeze_days_used / activeSubscription.freeze_days_allowed) * 100
  const remainingFreezeDays = activeSubscription.freeze_days_allowed - activeSubscription.freeze_days_used

  return (
    <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Main Subscription Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('subscription.title', 'Subscription Management')}
            </CardTitle>
            
            {!readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? "start" : "end"}>
                  <DropdownMenuItem 
                    onClick={() => setShowFreezeDialog(true)}
                    disabled={activeSubscription.status !== 'active' || remainingFreezeDays <= 0}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    {t('subscription.freeze', 'Freeze Subscription')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowTimeline(true)}>
                    <History className="h-4 w-4 mr-2" />
                    {t('subscription.history', 'View History')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    {t('subscription.settings', 'Settings')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge 
              variant="secondary" 
              className={`${getStatusColor(activeSubscription.status)} flex items-center gap-1`}
            >
              {getStatusIcon(activeSubscription.status)}
              {t(`subscription.status.${activeSubscription.status}`, activeSubscription.status)}
            </Badge>
            
            <span className="text-sm text-gray-500">
              {t('subscription.id', 'ID')}: {activeSubscription.id.slice(-8)}
            </span>
          </div>

          <Separator />

          {/* Subscription Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="font-medium text-gray-700">
                {t('subscription.start_date', 'Start Date')}
              </label>
              <p className="mt-1">{formatDate(activeSubscription.start_date)}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">
                {t('subscription.end_date', 'End Date')}
              </label>
              <p className="mt-1">{formatDate(activeSubscription.end_date)}</p>
            </div>
          </div>

          {/* Freeze Days Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <label className="font-medium text-gray-700">
                {t('subscription.freeze_days', 'Freeze Days')}
              </label>
              <span className="text-gray-500">
                {activeSubscription.freeze_days_used} / {activeSubscription.freeze_days_allowed}
                {t('subscription.days_used', ' days used')}
              </span>
            </div>
            
            <Progress 
              value={freezeDaysUsedPercentage} 
              className="h-2"
              indicatorClassName={remainingFreezeDays <= 3 ? 'bg-red-500' : 'bg-blue-500'}
            />
            
            <p className="text-xs text-gray-500">
              {remainingFreezeDays > 0 
                ? t('subscription.remaining_days', `${remainingFreezeDays} days remaining`)
                : t('subscription.no_freeze_days', 'No freeze days remaining')
              }
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                {activeSubscription.sessions_total || 0}
              </p>
              <p className="text-xs text-gray-500">
                {t('subscription.total_sessions', 'Total Sessions')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                {activeSubscription.sessions_completed || 0}
              </p>
              <p className="text-xs text-gray-500">
                {t('subscription.completed', 'Completed')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                {(activeSubscription.sessions_total || 0) - (activeSubscription.sessions_completed || 0)}
              </p>
              <p className="text-xs text-gray-500">
                {t('subscription.remaining', 'Remaining')}
              </p>
            </div>
          </div>

          {/* Actions */}
          {!readOnly && (
            <div className="flex gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTimeline(true)}
                className="flex-1"
              >
                <History className="h-4 w-4 mr-2" />
                {t('subscription.view_history', 'View History')}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFreezeDialog(true)}
                disabled={activeSubscription.status !== 'active' || remainingFreezeDays <= 0}
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-2" />
                {t('subscription.freeze', 'Freeze')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Freeze Dialog */}
      <FreezeSubscriptionDialog
        open={showFreezeDialog}
        onOpenChange={setShowFreezeDialog}
        subscription={activeSubscription}
        onSubmit={handleFreezeRequest}
      />

      {/* Timeline Dialog */}
      <SubscriptionTimeline
        open={showTimeline}
        onOpenChange={setShowTimeline}
        subscriptionId={activeSubscription.id}
      />
    </div>
  )
}