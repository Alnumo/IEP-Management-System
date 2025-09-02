import React, { useState, useCallback, useRef, useMemo } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { isTouchDevice } from '@/lib/device-utils'
import { format, addMinutes, differenceInMinutes } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { 
  Clock, User, MapPin, AlertCircle, CheckCircle, XCircle, 
  Move, RotateCcw, Save, X 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import type { 
  ScheduledSession, 
  TherapistAvailability, 
  ScheduleView,
  ReschedulingConflict
} from '@/types/scheduling'

/**
 * Drag and Drop Schedule Editor Component
 * 
 * Provides interactive drag-and-drop editing of scheduled sessions
 * with real-time conflict detection and validation.
 */

interface DragDropScheduleEditorProps {
  sessions: ScheduledSession[]
  availability: TherapistAvailability[]
  view: ScheduleView
  selectedDate: Date
  onSessionUpdate: (sessionId: string, updates: Partial<ScheduledSession>) => void
  onBulkUpdate?: (sessionIds: string[], updates: Partial<ScheduledSession>) => void
  conflicts?: ReschedulingConflict[]
  isLoading?: boolean
}

interface DragItem {
  type: string
  id: string
  session: ScheduledSession
  originalPosition: { date: string; time: string }
}

interface DropResult {
  targetDate: string
  targetTime: string
  targetTherapist?: string
  targetRoom?: string
}

const DRAG_TYPE = 'session'
const TIME_SLOT_HEIGHT = 60 // pixels
const TIME_SLOT_DURATION = 30 // minutes

export function DragDropScheduleEditor({
  sessions,
  availability,
  view,
  selectedDate,
  onSessionUpdate,
  onBulkUpdate,
  conflicts = [],
  isLoading = false
}: DragDropScheduleEditorProps) {
  const { language, isRTL } = useLanguage()
  const locale = language === 'ar' ? ar : enUS
  
  const [draggedSession, setDraggedSession] = useState<ScheduledSession | null>(null)
  const [dropPreview, setDropPreview] = useState<{ date: string; time: string } | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<ScheduledSession>>>(new Map())
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())

  // Determine backend based on device
  const dndBackend = isTouchDevice() ? TouchBackend : HTML5Backend

  // Generate time slots for the grid
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 8; hour < 20; hour++) { // 8 AM to 8 PM
      for (let minutes = 0; minutes < 60; minutes += TIME_SLOT_DURATION) {
        const time = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        slots.push({
          time,
          label: format(new Date().setHours(hour, minutes, 0, 0), 'h:mm a')
        })
      }
    }
    return slots
  }, [])

  // Get date range based on view
  const dateRange = useMemo(() => {
    if (view === 'daily') return [selectedDate]
    if (view === 'weekly') {
      const days = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(selectedDate)
        date.setDate(selectedDate.getDate() - selectedDate.getDay() + i + 1) // Start from Monday
        days.push(date)
      }
      return days
    }
    return [selectedDate]
  }, [view, selectedDate])

  // Validate drop target
  const validateDrop = useCallback((targetDate: string, targetTime: string, session: ScheduledSession) => {
    const errors: string[] = []

    // Check therapist availability
    const therapistAvailable = availability.some(avail =>
      avail.available_date === targetDate &&
      avail.therapist_id === session.therapist_id &&
      avail.start_time <= targetTime &&
      avail.end_time > targetTime &&
      avail.is_available
    )

    if (!therapistAvailable) {
      errors.push(
        language === 'ar' 
          ? 'المعالج غير متاح في هذا الوقت'
          : 'Therapist not available at this time'
      )
    }

    // Check for session conflicts
    const conflictingSessions = sessions.filter(s =>
      s.id !== session.id &&
      s.session_date === targetDate &&
      s.therapist_id === session.therapist_id &&
      ((s.start_time <= targetTime && s.end_time > targetTime) ||
       (s.start_time < session.end_time && s.end_time > targetTime))
    )

    if (conflictingSessions.length > 0) {
      errors.push(
        language === 'ar'
          ? 'يوجد تضارب مع جلسة أخرى'
          : 'Conflicts with another session'
      )
    }

    return errors
  }, [availability, sessions, language])

  // Handle session selection
  const toggleSessionSelection = useCallback((sessionId: string) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId)
      } else {
        newSet.add(sessionId)
      }
      return newSet
    })
  }, [])

  // Apply pending changes
  const applyChanges = useCallback(async () => {
    try {
      const updates = Array.from(pendingChanges.entries())
      await Promise.all(
        updates.map(([sessionId, changes]) => onSessionUpdate(sessionId, changes))
      )
      
      setPendingChanges(new Map())
      setValidationErrors([])
    } catch (error) {
      console.error('Failed to apply changes:', error)
    }
  }, [pendingChanges, onSessionUpdate])

  // Discard pending changes
  const discardChanges = useCallback(() => {
    setPendingChanges(new Map())
    setValidationErrors([])
    setDropPreview(null)
  }, [])

  // Bulk move selected sessions
  const bulkMoveSelected = useCallback(async (targetDate: string, targetTime: string) => {
    if (!onBulkUpdate || selectedSessions.size === 0) return

    const updates = { session_date: targetDate, start_time: targetTime }
    await onBulkUpdate(Array.from(selectedSessions), updates)
    setSelectedSessions(new Set())
  }, [onBulkUpdate, selectedSessions])

  return (
    <DndProvider backend={dndBackend}>
      <div className={`w-full ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Control Bar */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {language === 'ar' ? 'وضع التحرير' : 'Edit Mode'}
                  </span>
                </div>

                {selectedSessions.size > 0 && (
                  <Badge variant="secondary">
                    {selectedSessions.size} {language === 'ar' ? 'محدد' : 'selected'}
                  </Badge>
                )}

                {pendingChanges.size > 0 && (
                  <Badge variant="outline" className="text-orange-600">
                    {pendingChanges.size} {language === 'ar' ? 'تغيير معلق' : 'pending changes'}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {pendingChanges.size > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={discardChanges}>
                      <X className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button size="sm" onClick={applyChanges}>
                      <Save className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'حفظ' : 'Save'}
                    </Button>
                  </>
                )}

                {selectedSessions.size > 1 && (
                  <Button variant="outline" size="sm">
                    <Move className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'نقل المحدد' : 'Move Selected'}
                  </Button>
                )}
              </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Schedule Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {view === 'daily' ? (
                format(selectedDate, 'EEEE, MMMM d, yyyy', { locale })
              ) : (
                language === 'ar' ? 'العرض الأسبوعي' : 'Weekly View'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <ScheduleGrid
                sessions={sessions}
                availability={availability}
                timeSlots={timeSlots}
                dateRange={dateRange}
                onSessionDrop={(sessionId, targetDate, targetTime) => {
                  const session = sessions.find(s => s.id === sessionId)
                  if (!session) return

                  const errors = validateDrop(targetDate, targetTime, session)
                  if (errors.length > 0) {
                    setValidationErrors(errors)
                    return
                  }

                  // Add to pending changes
                  setPendingChanges(prev => new Map(prev).set(sessionId, {
                    session_date: targetDate,
                    start_time: targetTime
                  }))
                  setValidationErrors([])
                }}
                onSessionSelect={toggleSessionSelection}
                selectedSessions={selectedSessions}
                pendingChanges={pendingChanges}
                draggedSession={draggedSession}
                onDragStart={setDraggedSession}
                onDragEnd={() => {
                  setDraggedSession(null)
                  setDropPreview(null)
                }}
                onDropPreview={setDropPreview}
                dropPreview={dropPreview}
                isLoading={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">
                {language === 'ar' ? 'تعليمات:' : 'Instructions:'}
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  {language === 'ar' 
                    ? 'اسحب الجلسات لإعادة جدولتها في أوقات أو أيام مختلفة'
                    : 'Drag sessions to reschedule them to different times or days'
                  }
                </li>
                <li>
                  {language === 'ar'
                    ? 'انقر على عدة جلسات لتحديدها ونقلها معاً'
                    : 'Click multiple sessions to select and move them together'
                  }
                </li>
                <li>
                  {language === 'ar'
                    ? 'ستظهر التضارب في الوقت الفعلي'
                    : 'Conflicts will be shown in real-time'
                  }
                </li>
                <li>
                  {language === 'ar'
                    ? 'احفظ التغييرات عند الانتهاء'
                    : 'Save changes when you are finished'
                  }
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DndProvider>
  )
}

// Schedule Grid Component
interface ScheduleGridProps {
  sessions: ScheduledSession[]
  availability: TherapistAvailability[]
  timeSlots: { time: string; label: string }[]
  dateRange: Date[]
  onSessionDrop: (sessionId: string, targetDate: string, targetTime: string) => void
  onSessionSelect: (sessionId: string) => void
  selectedSessions: Set<string>
  pendingChanges: Map<string, Partial<ScheduledSession>>
  draggedSession: ScheduledSession | null
  onDragStart: (session: ScheduledSession) => void
  onDragEnd: () => void
  onDropPreview: (preview: { date: string; time: string } | null) => void
  dropPreview: { date: string; time: string } | null
  isLoading: boolean
}

function ScheduleGrid({
  sessions,
  availability,
  timeSlots,
  dateRange,
  onSessionDrop,
  onSessionSelect,
  selectedSessions,
  pendingChanges,
  draggedSession,
  onDragStart,
  onDragEnd,
  onDropPreview,
  dropPreview,
  isLoading
}: ScheduleGridProps) {
  const { language } = useLanguage()

  // Group sessions by date and time
  const sessionGrid = useMemo(() => {
    const grid = new Map<string, Map<string, ScheduledSession[]>>()
    
    sessions.forEach(session => {
      const dateKey = format(new Date(session.session_date), 'yyyy-MM-dd')
      
      if (!grid.has(dateKey)) {
        grid.set(dateKey, new Map())
      }
      
      const timeKey = session.start_time
      const dateMap = grid.get(dateKey)!
      
      if (!dateMap.has(timeKey)) {
        dateMap.set(timeKey, [])
      }
      
      dateMap.get(timeKey)!.push(session)
    })
    
    return grid
  }, [sessions])

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 8 * 24 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-8 gap-1 min-w-[800px]">
      {/* Time column header */}
      <div className="text-center font-medium py-2 bg-gray-50 border">
        {language === 'ar' ? 'الوقت' : 'Time'}
      </div>

      {/* Date headers */}
      {dateRange.map(date => (
        <div key={date.toISOString()} className="text-center font-medium py-2 bg-gray-50 border">
          <div className="text-sm">{format(date, 'EEE', { locale: language === 'ar' ? ar : enUS })}</div>
          <div className="text-lg">{format(date, 'd')}</div>
        </div>
      ))}

      {/* Time slots grid */}
      {timeSlots.map(slot => (
        <React.Fragment key={slot.time}>
          {/* Time label */}
          <div className="text-xs text-center py-2 border bg-gray-50 flex items-center justify-center">
            {slot.label}
          </div>

          {/* Date columns */}
          {dateRange.map(date => {
            const dateKey = format(date, 'yyyy-MM-dd')
            const slotSessions = sessionGrid.get(dateKey)?.get(slot.time) || []
            
            return (
              <DropZone
                key={`${dateKey}-${slot.time}`}
                date={dateKey}
                time={slot.time}
                onDrop={onSessionDrop}
                onDropPreview={onDropPreview}
                isHighlighted={dropPreview?.date === dateKey && dropPreview?.time === slot.time}
                availability={availability.filter(avail =>
                  avail.available_date === dateKey &&
                  avail.start_time <= slot.time &&
                  avail.end_time > slot.time &&
                  avail.is_available
                )}
              >
                <div className="space-y-1 p-1">
                  {slotSessions.map(session => (
                    <DraggableSession
                      key={session.id}
                      session={session}
                      isSelected={selectedSessions.has(session.id)}
                      isPending={pendingChanges.has(session.id)}
                      onClick={() => onSessionSelect(session.id)}
                      onDragStart={() => onDragStart(session)}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                </div>
              </DropZone>
            )
          })}
        </React.Fragment>
      ))}
    </div>
  )
}

// Draggable Session Component
interface DraggableSessionProps {
  session: ScheduledSession
  isSelected: boolean
  isPending: boolean
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

function DraggableSession({ 
  session, 
  isSelected, 
  isPending, 
  onClick, 
  onDragStart,
  onDragEnd 
}: DraggableSessionProps) {
  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPE,
    item: (): DragItem => ({
      type: DRAG_TYPE,
      id: session.id,
      session,
      originalPosition: {
        date: session.session_date,
        time: session.start_time
      }
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    begin: onDragStart,
    end: onDragEnd
  })

  const statusColors = {
    scheduled: 'bg-blue-100 border-blue-300 text-blue-800',
    confirmed: 'bg-green-100 border-green-300 text-green-800',
    completed: 'bg-gray-100 border-gray-300 text-gray-800',
    cancelled: 'bg-red-100 border-red-300 text-red-800',
    rescheduled: 'bg-yellow-100 border-yellow-300 text-yellow-800'
  }

  return (
    <div
      ref={drag}
      className={cn(
        'text-xs p-2 rounded cursor-move border transition-all duration-200',
        statusColors[session.session_status],
        isSelected && 'ring-2 ring-primary ring-offset-1',
        isPending && 'ring-2 ring-orange-500 ring-offset-1',
        isDragging && 'opacity-50 scale-95',
        'hover:shadow-md'
      )}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <div className="font-medium truncate">
        {session.student?.name_ar || session.student?.name_en}
      </div>
      <div className="text-xs opacity-75">
        {session.start_time} - {session.end_time}
      </div>
    </div>
  )
}

// Drop Zone Component
interface DropZoneProps {
  date: string
  time: string
  onDrop: (sessionId: string, targetDate: string, targetTime: string) => void
  onDropPreview: (preview: { date: string; time: string } | null) => void
  isHighlighted: boolean
  availability: TherapistAvailability[]
  children: React.ReactNode
}

function DropZone({ 
  date, 
  time, 
  onDrop, 
  onDropPreview,
  isHighlighted,
  availability,
  children 
}: DropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: DRAG_TYPE,
    drop: (item: DragItem) => {
      onDrop(item.id, date, time)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    }),
    hover: (item) => {
      onDropPreview({ date, time })
    }
  })

  const hasAvailability = availability.length > 0
  const isDropTarget = isOver && canDrop

  return (
    <div
      ref={drop}
      className={cn(
        'min-h-[60px] border transition-all duration-200',
        hasAvailability ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200',
        isHighlighted && 'bg-blue-100 border-blue-400',
        isDropTarget && 'bg-primary/20 border-primary',
        !canDrop && isOver && 'bg-red-100 border-red-400'
      )}
    >
      {children}
    </div>
  )
}