import React, { useState } from 'react'
import { 
  Calendar, 
  Clock, 
  Pause, 
  Play, 
  Trophy, 
  Target,
  ChevronRight,
  ChevronDown,
  Download,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from '@/components/ui/collapsible'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { useProgramTimeline } from '@/hooks/useProgramTimeline'
import { formatDate, formatTime } from '@/lib/utils'
import type { ProgramTimeline, TimelineEvent } from '@/types/scheduling'

/**
 * Program Timeline Visualization Component
 * 
 * Provides interactive timeline view of student program progress:
 * - Visual timeline with key events and milestones
 * - Progress tracking with completion percentages
 * - Freeze period visualization
 * - Export capabilities for reports
 */

interface ProgramTimelineVisualizationProps {
  subscriptionId: string
  compact?: boolean
  showControls?: boolean
}

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'subscription_start': return <Play className="h-3 w-3 text-green-600" />
    case 'subscription_end': return <Target className="h-3 w-3 text-blue-600" />
    case 'freeze_start': return <Pause className="h-3 w-3 text-orange-600" />
    case 'freeze_end': return <Play className="h-3 w-3 text-green-600" />
    case 'milestone': return <Trophy className="h-3 w-3 text-yellow-600" />
    default: return <Clock className="h-3 w-3 text-gray-600" />
  }
}

const getEventColor = (eventType: string, status: 'completed' | 'upcoming' | 'current'): string => {
  const baseColors = {
    subscription_start: 'green',
    subscription_end: 'blue',
    freeze_start: 'orange',
    freeze_end: 'green',
    milestone: 'yellow'
  }
  
  const color = baseColors[eventType as keyof typeof baseColors] || 'gray'
  
  switch (status) {
    case 'completed': return `bg-${color}-100 border-${color}-300 text-${color}-800`
    case 'upcoming': return `bg-${color}-50 border-${color}-200 text-${color}-600 opacity-70`
    case 'current': return `bg-${color}-200 border-${color}-400 text-${color}-900 ring-2 ring-${color}-300`
    default: return 'bg-gray-100 border-gray-300 text-gray-800'
  }
}

export function ProgramTimelineVisualization({
  subscriptionId,
  compact = false,
  showControls = true
}: ProgramTimelineVisualizationProps) {
  const { language, isRTL, t } = useLanguage()
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<'all' | 'past' | 'future'>('all')

  const {
    data: timeline,
    isLoading,
    error,
    refetch
  } = useProgramTimeline(subscriptionId)

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  const filteredEvents = timeline?.events.filter(event => {
    // Apply event type filter
    if (eventFilter !== 'all' && event.type !== eventFilter) {
      return false
    }

    // Apply time range filter
    const eventDate = new Date(event.date)
    const now = new Date()
    
    switch (timeRange) {
      case 'past':
        return eventDate < now
      case 'future':
        return eventDate >= now
      default:
        return true
    }
  }) || []

  const handleExportTimeline = () => {
    if (!timeline) return

    const csvContent = [
      ['Date', 'Type', 'Title', 'Description', 'Status'].join(','),
      ...filteredEvents.map(event => [
        formatDate(event.date),
        event.type,
        event.title,
        event.description,
        event.status
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timeline-${timeline.student_name}-${subscriptionId.slice(-8)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error || !timeline) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 text-center">
          <p className="text-red-600">
            {t('timeline.error', 'Failed to load program timeline')}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-2">
            {t('timeline.retry', 'Retry')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('timeline.title', 'Program Timeline')}
            </CardTitle>
            
            {showControls && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportTimeline}
                  disabled={!filteredEvents.length}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('timeline.export', 'Export')}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Program Overview */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <label className="font-medium text-gray-700">
                {t('timeline.student', 'Student')}
              </label>
              <p className="mt-1">{timeline.student_name}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">
                {t('timeline.program', 'Program')}
              </label>
              <p className="mt-1">{timeline.program_name}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">
                {t('timeline.duration', 'Duration')}
              </label>
              <p className="mt-1">
                {formatDate(timeline.start_date)} - {formatDate(timeline.end_date)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <label className="font-medium text-gray-700">
                {t('timeline.progress', 'Progress')}
              </label>
              <span className="text-gray-500">
                {timeline.completion_percentage}% {t('timeline.completed', 'Completed')}
              </span>
            </div>
            <Progress value={timeline.completion_percentage} className="h-3" />
          </div>

          {/* Freeze Summary */}
          {timeline.total_freeze_days > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Pause className="h-4 w-4" />
                <span className="font-medium">
                  {timeline.total_freeze_days} {t('timeline.freeze_days', 'freeze days used')}
                </span>
              </div>
              {timeline.original_end_date !== timeline.end_date && (
                <p className="text-sm text-blue-600 mt-1">
                  {t('timeline.extended_to', 'Program extended to')} {formatDate(timeline.end_date)}
                </p>
              )}
            </div>
          )}

          {/* Filters */}
          {showControls && !compact && (
            <div className="flex items-center gap-3 pt-3 border-t">
              <Filter className="h-4 w-4 text-gray-500" />
              
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('timeline.filter_events', 'Filter events')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('timeline.all_events', 'All Events')}</SelectItem>
                  <SelectItem value="milestone">{t('timeline.milestones', 'Milestones')}</SelectItem>
                  <SelectItem value="freeze_start">{t('timeline.freeze_events', 'Freeze Events')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeRange} onValueChange={setTimeRange as (value: string) => void}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('timeline.all_time', 'All Time')}</SelectItem>
                  <SelectItem value="past">{t('timeline.past', 'Past')}</SelectItem>
                  <SelectItem value="future">{t('timeline.future', 'Future')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Events */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            {/* Timeline Line */}
            <div className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-0 bottom-0 w-px bg-gray-200`} />

            <div className="space-y-6">
              {filteredEvents.map((event, index) => {
                const isExpanded = expandedEvents.has(`${event.type}-${event.date}`)
                const eventKey = `${event.type}-${event.date}-${index}`

                return (
                  <div key={eventKey} className="relative flex items-start gap-4">
                    {/* Timeline Dot */}
                    <div className="flex-shrink-0 w-8 h-8 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center z-10">
                      {getEventIcon(event.type)}
                    </div>

                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      <Collapsible open={isExpanded} onOpenChange={() => toggleEventExpansion(eventKey)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-start p-0 h-auto">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-3">
                                <Badge 
                                  variant="secondary" 
                                  className={getEventColor(event.type, event.status)}
                                >
                                  {event.title}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {formatDate(event.date)}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                          </Button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="mt-3 pl-3 border-l-2 border-gray-100">
                            <p className="text-sm text-gray-700 mb-2">
                              {event.description}
                            </p>

                            {/* Event Details */}
                            <div className="space-y-2 text-xs text-gray-500">
                              <div className="flex items-center gap-4">
                                <span>
                                  <strong>{t('timeline.status', 'Status')}:</strong> {' '}
                                  {t(`timeline.status.${event.status}`, event.status)}
                                </span>
                                {event.duration && (
                                  <span>
                                    <strong>{t('timeline.duration', 'Duration')}:</strong> {' '}
                                    {event.duration} {t('timeline.days', 'days')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">
                {t('timeline.no_events', 'No events found for the selected filters')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}