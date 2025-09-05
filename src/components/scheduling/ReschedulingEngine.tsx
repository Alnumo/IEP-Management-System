import React, { useState, useCallback } from 'react'
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Zap,
  Settings,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/contexts/LanguageContext'
import { useReschedulingEngine } from '@/hooks/useReschedulingEngine'
import { formatDate, formatTime } from '@/lib/utils'
import type { 
  ReschedulingRequest,
  ReschedulingResult,
  ScheduleConflict,
  TherapySession
} from '@/types/scheduling'

/**
 * Rescheduling Engine UI Component
 * 
 * Provides interface for automated session rescheduling with:
 * - Real-time progress tracking
 * - Conflict resolution workflow
 * - Rollback capabilities
 * - Performance metrics display
 */

interface ReschedulingEngineProps {
  request: ReschedulingRequest
  onComplete?: (result: ReschedulingResult) => void
  onCancel?: () => void
  autoStart?: boolean
}

const getConflictSeverityColor = (severity: 'low' | 'medium' | 'high'): string => {
  switch (severity) {
    case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'high': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function ReschedulingEngine({
  request,
  onComplete,
  onCancel,
  autoStart = false
}: ReschedulingEngineProps) {
  const { language, isRTL, t } = useLanguage()
  const [isDialogOpen, setIsDialogOpen] = useState(autoStart)
  const [showDetails, setShowDetails] = useState(false)
  
  const {
    executeRescheduling,
    isLoading,
    progress,
    currentStep,
    result,
    conflicts,
    isComplete,
    error
  } = useReschedulingEngine()

  const handleStart = useCallback(async () => {
    setIsDialogOpen(true)
    await executeRescheduling(request)
  }, [executeRescheduling, request])

  const handleComplete = useCallback(() => {
    setIsDialogOpen(false)
    if (onComplete && result) {
      onComplete(result)
    }
  }, [onComplete, result])

  const handleCancel = useCallback(() => {
    setIsDialogOpen(false)
    if (onCancel) {
      onCancel()
    }
  }, [onCancel])

  const progressPercentage = progress ? (progress.current / progress.total) * 100 : 0

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={handleStart}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        <Zap className="h-4 w-4" />
        {t('rescheduling.start', 'Start Rescheduling')}
        {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
      </Button>

      {/* Rescheduling Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`max-w-4xl ${isRTL ? 'text-right' : 'text-left'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {t('rescheduling.title', 'Automated Session Rescheduling')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Progress Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('rescheduling.progress', 'Progress')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{currentStep || t('rescheduling.initializing', 'Initializing...')}</span>
                    <span className="text-gray-500">
                      {progress ? `${progress.current}/${progress.total}` : '0/0'}
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isLoading && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      {t('rescheduling.status.processing', 'Processing')}
                    </Badge>
                  )}
                  
                  {isComplete && !error && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t('rescheduling.status.completed', 'Completed')}
                    </Badge>
                  )}
                  
                  {error && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {t('rescheduling.status.failed', 'Failed')}
                    </Badge>
                  )}
                  
                  {conflicts && conflicts.length > 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {conflicts.length} {t('rescheduling.conflicts', 'Conflicts')}
                    </Badge>
                  )}
                </div>

                {/* Execution Time */}
                {result && (
                  <div className="text-sm text-gray-500">
                    {t('rescheduling.execution_time', 'Execution time')}: {result.execution_time_ms}ms
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <Alert className="border-red-300 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  <strong>{t('rescheduling.error', 'Error')}:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Results Summary */}
            {result && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {t('rescheduling.results', 'Results')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetails(!showDetails)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {t('rescheduling.details', 'Details')}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {result.sessions_rescheduled}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('rescheduling.sessions_rescheduled', 'Sessions Rescheduled')}
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">
                        {result.conflicts_detected?.length || 0}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('rescheduling.conflicts_detected', 'Conflicts Detected')}
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-600">
                        {result.new_end_date ? formatDate(result.new_end_date) : '-'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('rescheduling.new_end_date', 'New End Date')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conflicts Detail */}
            {conflicts && conflicts.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-900">
                    <AlertTriangle className="h-4 w-4" />
                    {t('rescheduling.conflicts_title', 'Scheduling Conflicts')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-3">
                      {conflicts.map((conflict, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                          <div className="flex-shrink-0 w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-orange-800">{index + 1}</span>
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={getConflictSeverityColor(conflict.severity)}
                              >
                                {t(`rescheduling.conflict.${conflict.type}`, conflict.type)}
                              </Badge>
                            </div>
                            <p className="text-sm text-orange-800">{conflict.description}</p>
                            {conflict.session_id && (
                              <p className="text-xs text-orange-600">
                                {t('rescheduling.session_id', 'Session ID')}: {conflict.session_id.slice(-8)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Detailed Results */}
            {showDetails && result && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t('rescheduling.detailed_results', 'Detailed Results')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-medium text-gray-700">
                          {t('rescheduling.success_rate', 'Success Rate')}
                        </label>
                        <p className="text-2xl font-bold text-green-600">
                          {result.sessions_rescheduled > 0 
                            ? Math.round((result.sessions_rescheduled / (result.sessions_rescheduled + (result.conflicts_detected?.length || 0))) * 100)
                            : 0
                          }%
                        </p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">
                          {t('rescheduling.performance', 'Performance')}
                        </label>
                        <p className="text-lg">
                          {result.execution_time_ms < 1000 
                            ? t('rescheduling.perf.excellent', 'Excellent')
                            : result.execution_time_ms < 5000 
                            ? t('rescheduling.perf.good', 'Good')
                            : t('rescheduling.perf.slow', 'Slow')
                          }
                        </p>
                      </div>
                    </div>

                    {result.rollback_info && (
                      <div>
                        <Separator className="my-3" />
                        <label className="font-medium text-gray-700">
                          {t('rescheduling.rollback_info', 'Rollback Information')}
                        </label>
                        <p className="text-gray-600 mt-1">
                          {t('rescheduling.rollback_available', 'Rollback data available for recovery if needed')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {isComplete 
                ? t('rescheduling.close', 'Close')
                : t('rescheduling.cancel', 'Cancel')
              }
            </Button>
            
            {isComplete && result?.success && (
              <Button onClick={handleComplete}>
                <ArrowRight className="h-4 w-4 mr-2" />
                {t('rescheduling.continue', 'Continue')}
              </Button>
            )}
            
            {result?.success === false && (
              <Button 
                variant="destructive" 
                onClick={() => executeRescheduling(request)}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('rescheduling.retry', 'Retry')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}