import React, { useState, useMemo, useCallback } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, 
         isSameDay, isSameMonth, isToday, addDays, startOfDay, endOfDay } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { Clock, User, MapPin, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SessionDetailsPopover } from './SessionDetailsPopover'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import type { 
  ScheduledSession, 
  TherapistAvailability, 
  ScheduleView 
} from '@/types/scheduling'

/**
 * Calendar View Component
 * 
 * Renders scheduling data in various calendar formats (daily, weekly, monthly)
 * with support for Arabic RTL/English LTR layouts and interactive session management.
 */

interface CalendarViewProps {
  sessions: ScheduledSession[]
  availability: TherapistAvailability[]
  view: ScheduleView
  selectedDate: Date
  onSessionUpdate?: (sessionId: string, updates: Partial<ScheduledSession>) => void
  readOnly?: boolean
  isLoading?: boolean
}

const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const hour = 8 + i // Start from 8 AM
  return {
    time: `${hour.toString().padStart(2, '0')}:00`,
    label: format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')
  }
})

export function CalendarView({
  sessions,
  availability,
  view,
  selectedDate,
  onSessionUpdate,
  readOnly = false,
  isLoading = false
}: CalendarViewProps) {
  const { language, isRTL } = useLanguage()
  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null)
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<string | null>(null)

  const locale = language === 'ar' ? ar : enUS

  // Generate date range based on view
  const dateRange = useMemo(() => {
    switch (view) {
      case 'daily':
        return [selectedDate]
      case 'weekly':
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday start
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
        return eachDayOfInterval({ start: weekStart, end: weekEnd })
      case 'monthly':
        const monthStart = startOfMonth(selectedDate)
        const monthEnd = endOfMonth(selectedDate)
        return eachDayOfInterval({ start: monthStart, end: monthEnd })
      default:
        return [selectedDate]
    }
  }, [view, selectedDate])

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped = new Map<string, ScheduledSession[]>()
    
    sessions.forEach(session => {
      const dateKey = format(new Date(session.session_date), 'yyyy-MM-dd')
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)!.push(session)
    })
    
    // Sort sessions within each date by start time
    grouped.forEach(sessionsForDate => {
      sessionsForDate.sort((a, b) => a.start_time.localeCompare(b.start_time))
    })
    
    return grouped
  }, [sessions])

  // Get availability for a specific date and time
  const getAvailability = useCallback((date: Date, timeSlot: string) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return availability.filter(avail => 
      avail.available_date === dateStr &&
      avail.start_time <= timeSlot &&
      avail.end_time > timeSlot &&
      avail.is_available
    )
  }, [availability])

  // Handle session click
  const handleSessionClick = useCallback((session: ScheduledSession) => {
    if (readOnly) {
      setSelectedSession(session)
    } else {
      setSelectedSession(session)
    }
  }, [readOnly])

  // Render session card
  const renderSessionCard = useCallback((session: ScheduledSession, compact: boolean = false) => {
    const statusColors = {
      scheduled: 'bg-blue-100 border-blue-300 text-blue-800',
      confirmed: 'bg-green-100 border-green-300 text-green-800',
      completed: 'bg-gray-100 border-gray-300 text-gray-800',
      cancelled: 'bg-red-100 border-red-300 text-red-800',
      rescheduled: 'bg-yellow-100 border-yellow-300 text-yellow-800'
    }

    const statusIcons = {
      scheduled: Clock,
      confirmed: CheckCircle,
      completed: CheckCircle,
      cancelled: XCircle,
      rescheduled: AlertCircle
    }

    const StatusIcon = statusIcons[session.session_status]

    return (
      <TooltipProvider key={session.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card 
              className={cn(
                'cursor-pointer hover:shadow-md transition-all duration-200',
                statusColors[session.session_status],
                compact ? 'p-2' : 'p-3',
                'border-l-4'
              )}
              onClick={() => handleSessionClick(session)}
            >
              <CardContent className={cn('p-0', compact ? 'space-y-1' : 'space-y-2')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className="w-4 h-4" />
                    <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
                      {session.start_time} - {session.end_time}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {session.session_category}
                  </Badge>
                </div>

                {!compact && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4" />
                      <span>{session.student?.name_ar || session.student?.name_en}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span>{session.room?.name_ar || session.room?.name_en}</span>
                    </div>

                    {session.therapist && (
                      <div className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'المعالج:' : 'Therapist:'} {session.therapist.name_ar || session.therapist.name_en}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div className="font-medium">
                {session.student?.name_ar || session.student?.name_en}
              </div>
              <div className="text-sm">
                {session.start_time} - {session.end_time}
              </div>
              <div className="text-sm">
                {session.room?.name_ar || session.room?.name_en}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }, [handleSessionClick, language])

  // Render daily view
  const renderDailyView = () => {
    const date = dateRange[0]
    const dateKey = format(date, 'yyyy-MM-dd')
    const todaySessions = sessionsByDate.get(dateKey) || []

    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">
            {format(date, 'EEEE, MMMM d, yyyy', { locale })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {todaySessions.length} {language === 'ar' ? 'جلسة' : 'sessions'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Time column */}
          <div className="lg:col-span-2 space-y-4">
            {TIME_SLOTS.map(slot => (
              <div key={slot.time} className="h-20 flex items-center justify-center text-sm font-medium">
                {slot.label}
              </div>
            ))}
          </div>

          {/* Sessions column */}
          <div className="lg:col-span-10 space-y-4">
            {TIME_SLOTS.map(slot => {
              const slotSessions = todaySessions.filter(session =>
                session.start_time <= slot.time && session.end_time > slot.time
              )
              const availability = getAvailability(date, slot.time)

              return (
                <div 
                  key={slot.time}
                  className={cn(
                    'h-20 border rounded-lg p-2',
                    availability.length > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200',
                    slotSessions.length > 0 && 'bg-blue-50 border-blue-200'
                  )}
                  onMouseEnter={() => setHoveredTimeSlot(slot.time)}
                  onMouseLeave={() => setHoveredTimeSlot(null)}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 h-full">
                    {slotSessions.map(session => (
                      renderSessionCard(session, true)
                    ))}
                  </div>

                  {slotSessions.length === 0 && availability.length > 0 && hoveredTimeSlot === slot.time && (
                    <div className="text-xs text-green-600 text-center">
                      {availability.length} {language === 'ar' ? 'معالج متاح' : 'therapists available'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Render weekly view
  const renderWeeklyView = () => {
    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-8 gap-1 min-w-[800px]">
          {/* Time column header */}
          <div className="text-center font-medium py-2 bg-gray-50">
            {language === 'ar' ? 'الوقت' : 'Time'}
          </div>

          {/* Day headers */}
          {dateRange.map(date => (
            <div key={date.toISOString()} className="text-center font-medium py-2 bg-gray-50">
              <div>{format(date, 'EEE', { locale })}</div>
              <div className={cn(
                'text-lg',
                isToday(date) && 'font-bold text-primary',
                !isSameMonth(date, selectedDate) && 'text-muted-foreground'
              )}>
                {format(date, 'd')}
              </div>
            </div>
          ))}

          {/* Time slots and sessions */}
          {TIME_SLOTS.map(slot => (
            <React.Fragment key={slot.time}>
              {/* Time label */}
              <div className="text-sm text-center py-2 border-r">
                {slot.label}
              </div>

              {/* Day columns */}
              {dateRange.map(date => {
                const dateKey = format(date, 'yyyy-MM-dd')
                const daySessions = sessionsByDate.get(dateKey) || []
                const slotSessions = daySessions.filter(session =>
                  session.start_time <= slot.time && session.end_time > slot.time
                )
                const availability = getAvailability(date, slot.time)

                return (
                  <div 
                    key={`${date.toISOString()}-${slot.time}`}
                    className={cn(
                      'min-h-[60px] border p-1',
                      availability.length > 0 ? 'bg-green-50' : 'bg-gray-50',
                      slotSessions.length > 0 && 'bg-blue-50',
                      isToday(date) && 'border-primary'
                    )}
                  >
                    <div className="space-y-1">
                      {slotSessions.map(session => 
                        renderSessionCard(session, true)
                      )}
                    </div>
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    )
  }

  // Render monthly view
  const renderMonthlyView = () => {
    const monthStart = startOfMonth(selectedDate)
    const monthEnd = endOfMonth(selectedDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    // Group calendar days into weeks
    const weeks = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7))
    }

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            {format(selectedDate, 'MMMM yyyy', { locale })}
          </h3>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center font-medium py-2 bg-gray-50">
              {language === 'ar' ? {
                Mon: 'الإثنين',
                Tue: 'الثلاثاء', 
                Wed: 'الأربعاء',
                Thu: 'الخميس',
                Fri: 'الجمعة',
                Sat: 'السبت',
                Sun: 'الأحد'
              }[day] : day}
            </div>
          ))}

          {/* Calendar grid */}
          {weeks.map((week, weekIndex) => (
            week.map((day, dayIndex) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const daySessions = sessionsByDate.get(dateKey) || []
              const isCurrentMonth = isSameMonth(day, selectedDate)
              const isCurrentDay = isToday(day)

              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={cn(
                    'min-h-[120px] border p-1',
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                    isCurrentDay && 'border-primary bg-primary/5',
                    !isCurrentMonth && 'text-muted-foreground'
                  )}
                >
                  <div className={cn(
                    'text-sm font-medium mb-1',
                    isCurrentDay && 'text-primary'
                  )}>
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1">
                    {daySessions.slice(0, 3).map(session => (
                      <div
                        key={session.id}
                        className={cn(
                          'text-xs p-1 rounded cursor-pointer',
                          {
                            scheduled: 'bg-blue-100 text-blue-800',
                            confirmed: 'bg-green-100 text-green-800',
                            completed: 'bg-gray-100 text-gray-800',
                            cancelled: 'bg-red-100 text-red-800',
                            rescheduled: 'bg-yellow-100 text-yellow-800'
                          }[session.session_status]
                        )}
                        onClick={() => handleSessionClick(session)}
                      >
                        {session.start_time} - {session.student?.name_ar || session.student?.name_en}
                      </div>
                    ))}

                    {daySessions.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{daySessions.length - 3} {language === 'ar' ? 'أكثر' : 'more'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ))}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto"></div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {view === 'daily' && renderDailyView()}
      {view === 'weekly' && renderWeeklyView()}
      {view === 'monthly' && renderMonthlyView()}

      {/* Session Details Modal */}
      {selectedSession && (
        <SessionDetailsPopover
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onUpdate={onSessionUpdate}
          readOnly={readOnly}
          isOpen={!!selectedSession}
        />
      )}
    </div>
  )
}