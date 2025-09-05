import React, { useState } from 'react'
import { History, Clock, Pause, Play, FileText, User, Download, Filter } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSubscriptionHistory } from '@/hooks/useSubscriptions'
import { formatDate, formatTime } from '@/lib/utils'
import type { 
  SubscriptionFreezeHistory,
  FreezeOperationType
} from '@/types/scheduling'

/**
 * Subscription Timeline Component
 * 
 * Displays comprehensive subscription history including:
 * - Freeze/unfreeze operations with audit trail
 * - Timeline visualization of subscription lifecycle
 * - Filtering and export capabilities
 * - Detailed operation information
 */

interface SubscriptionTimelineProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscriptionId: string
}

const getOperationIcon = (operation: FreezeOperationType) => {
  switch (operation) {
    case 'freeze': return <Pause className="h-4 w-4 text-blue-600" />
    case 'unfreeze': return <Play className="h-4 w-4 text-green-600" />
    case 'extend': return <Clock className="h-4 w-4 text-orange-600" />
    case 'cancel': return <FileText className="h-4 w-4 text-red-600" />
    default: return <Clock className="h-4 w-4 text-gray-600" />
  }
}

const getOperationColor = (operation: FreezeOperationType): string => {
  switch (operation) {
    case 'freeze': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'unfreeze': return 'bg-green-100 text-green-800 border-green-200'
    case 'extend': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'cancel': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const formatDuration = (days: number, t: (key: string, fallback?: string) => string): string => {
  if (days === 1) {
    return t('timeline.one_day', '1 day')
  }
  return t('timeline.days_count', `${days} days`)
}

export function SubscriptionTimeline({
  open,
  onOpenChange,
  subscriptionId
}: SubscriptionTimelineProps) {
  const { language, isRTL, t } = useLanguage()
  const [operationFilter, setOperationFilter] = useState<string>('all')

  // Fetch subscription history
  const { 
    data: history = [], 
    isLoading, 
    error 
  } = useSubscriptionHistory(subscriptionId, { enabled: open })

  // Filter history based on selected operation
  const filteredHistory = history.filter(item => 
    operationFilter === 'all' || item.operation_type === operationFilter
  )

  const handleExport = () => {
    // Export functionality - convert history to CSV
    const csvContent = [
      ['Date', 'Operation', 'Duration', 'Reason', 'Administrator'].join(','),
      ...filteredHistory.map(item => [
        formatDate(item.created_at),
        item.operation_type,
        item.freeze_days?.toString() || '',
        item.reason || '',
        item.created_by_name || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscription-history-${subscriptionId.slice(-8)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[80vh] ${isRTL ? 'text-right' : 'text-left'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('timeline.title', 'Subscription History')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={operationFilter} onValueChange={setOperationFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('timeline.filter_operations', 'Filter operations')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('timeline.all_operations', 'All Operations')}
                  </SelectItem>
                  <SelectItem value="freeze">
                    {t('timeline.freeze_only', 'Freeze Only')}
                  </SelectItem>
                  <SelectItem value="unfreeze">
                    {t('timeline.unfreeze_only', 'Unfreeze Only')}
                  </SelectItem>
                  <SelectItem value="extend">
                    {t('timeline.extend_only', 'Extensions Only')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!filteredHistory.length}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('timeline.export', 'Export')}
            </Button>
          </div>

          <Separator />

          {/* Timeline Content */}
          <ScrollArea className="h-[500px] pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6 text-center">
                  <p className="text-red-600">
                    {t('timeline.error', 'Failed to load subscription history')}
                  </p>
                </CardContent>
              </Card>
            ) : !filteredHistory.length ? (
              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="pt-6 text-center">
                  <History className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600">
                    {operationFilter === 'all' 
                      ? t('timeline.no_history', 'No history available')
                      : t('timeline.no_filtered_history', 'No operations found for selected filter')
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((item, index) => (
                  <Card key={item.id} className="relative">
                    {/* Timeline Connector */}
                    {index < filteredHistory.length - 1 && (
                      <div className={`absolute ${isRTL ? 'right-8' : 'left-8'} top-16 w-px h-6 bg-gray-200`} />
                    )}
                    
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        {/* Operation Icon */}
                        <div className="flex-shrink-0 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                          {getOperationIcon(item.operation_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={getOperationColor(item.operation_type)}
                              >
                                {t(`timeline.operation.${item.operation_type}`, item.operation_type)}
                              </Badge>
                              
                              {item.freeze_days && (
                                <Badge variant="outline" className="text-xs">
                                  {formatDuration(item.freeze_days, t)}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-500">
                              {formatDate(item.created_at)} {formatTime(item.created_at)}
                            </div>
                          </div>

                          {/* Operation Details */}
                          <div className="space-y-2">
                            {item.reason && (
                              <p className="text-sm text-gray-700">
                                <strong>{t('timeline.reason', 'Reason')}:</strong> {item.reason}
                              </p>
                            )}
                            
                            {item.start_date && item.end_date && (
                              <p className="text-sm text-gray-700">
                                <strong>{t('timeline.period', 'Period')}:</strong> {' '}
                                {formatDate(item.start_date)} - {formatDate(item.end_date)}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {item.created_by_name && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {item.created_by_name}
                                </span>
                              )}
                              
                              {item.affected_sessions && (
                                <span>
                                  {t('timeline.affected_sessions', `${item.affected_sessions} sessions affected`)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Additional metadata */}
                          {item.metadata && Object.keys(item.metadata).length > 0 && (
                            <details className="mt-3">
                              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                {t('timeline.additional_details', 'Additional Details')}
                              </summary>
                              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                <pre className="whitespace-pre-wrap text-gray-600">
                                  {JSON.stringify(item.metadata, null, 2)}
                                </pre>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Summary Stats */}
          {filteredHistory.length > 0 && (
            <>
              <Separator />
              <div className="grid grid-cols-4 gap-4 text-center text-sm">
                <div>
                  <p className="font-semibold text-gray-900">
                    {history.filter(h => h.operation_type === 'freeze').length}
                  </p>
                  <p className="text-gray-500">
                    {t('timeline.total_freezes', 'Freezes')}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {history.reduce((sum, h) => sum + (h.freeze_days || 0), 0)}
                  </p>
                  <p className="text-gray-500">
                    {t('timeline.total_days_frozen', 'Days Frozen')}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {history.filter(h => h.operation_type === 'extend').length}
                  </p>
                  <p className="text-gray-500">
                    {t('timeline.extensions', 'Extensions')}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {history.reduce((sum, h) => sum + (h.affected_sessions || 0), 0)}
                  </p>
                  <p className="text-gray-500">
                    {t('timeline.total_affected', 'Sessions Affected')}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}