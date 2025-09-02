import React, { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { 
  Clock, User, MapPin, Phone, Mail, Calendar,
  CheckCircle, XCircle, AlertCircle, MoreVertical
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import type { ScheduledSession, TherapistAvailability } from '@/types/scheduling'

/**
 * Schedule List View Component
 * 
 * Displays sessions in a detailed list format (agenda view)
 * with comprehensive session information and quick actions.
 */

interface ScheduleListViewProps {
  sessions: ScheduledSession[]
  availability: TherapistAvailability[]
  selectedDate: Date
  onSessionUpdate?: (sessionId: string, updates: Partial<ScheduledSession>) => void
  editMode?: boolean
  isLoading?: boolean
}

export function ScheduleListView({
  sessions,
  availability,
  selectedDate,
  onSessionUpdate,
  editMode = false,
  isLoading = false
}: ScheduleListViewProps) {
  const { language, isRTL } = useLanguage()
  const locale = language === 'ar' ? ar : enUS

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

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

  // Get sorted dates
  const sortedDates = useMemo(() => {
    return Array.from(sessionsByDate.keys()).sort()
  }, [sessionsByDate])

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId)
      } else {
        newSet.add(sessionId)
      }
      return newSet
    })
  }

  const handleSessionAction = async (sessionId: string, action: string) => {
    if (!onSessionUpdate) return

    switch (action) {
      case 'confirm':
        await onSessionUpdate(sessionId, { session_status: 'confirmed' })
        break
      case 'complete':
        await onSessionUpdate(sessionId, { session_status: 'completed' })
        break
      case 'cancel':
        await onSessionUpdate(sessionId, { session_status: 'cancelled' })
        break
      case 'reschedule':
        // This would open a reschedule dialog
        break
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (sortedDates.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {language === 'ar' ? 'لا توجد جلسات' : 'No Sessions'}
          </h3>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'لا توجد جلسات مجدولة في هذا التاريخ'
              : 'No sessions scheduled for this date range'
            }
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {sortedDates.map(dateKey => {
        const date = new Date(dateKey)
        const dateSessions = sessionsByDate.get(dateKey) || []

        return (
          <div key={dateKey} className="space-y-4">
            {/* Date Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {format(date, 'EEEE, MMMM d, yyyy', { locale })}
                <Badge variant="outline">
                  {dateSessions.length} {language === 'ar' ? 'جلسة' : 'sessions'}
                </Badge>
              </h3>
            </div>

            {/* Sessions for this date */}
            <div className="space-y-3">
              {dateSessions.map((session, index) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isExpanded={expandedSessions.has(session.id)}
                  onToggleExpansion={() => toggleSessionExpansion(session.id)}
                  onActionSelect={(action) => handleSessionAction(session.id, action)}
                  editMode={editMode}
                  isFirst={index === 0}
                  isLast={index === dateSessions.length - 1}
                />
              ))}
            </div>

            {dateKey !== sortedDates[sortedDates.length - 1] && (
              <Separator className="my-6" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Session Card Component
interface SessionCardProps {
  session: ScheduledSession
  isExpanded: boolean
  onToggleExpansion: () => void
  onActionSelect: (action: string) => void
  editMode: boolean
  isFirst: boolean
  isLast: boolean
}

function SessionCard({
  session,
  isExpanded,
  onToggleExpansion,
  onActionSelect,
  editMode,
  isFirst,
  isLast
}: SessionCardProps) {
  const { language } = useLanguage()

  const statusConfig = {
    scheduled: {
      color: 'bg-blue-100 border-blue-300 text-blue-800',
      icon: Clock,
      label_ar: 'مجدولة',
      label_en: 'Scheduled'
    },
    confirmed: {
      color: 'bg-green-100 border-green-300 text-green-800',
      icon: CheckCircle,
      label_ar: 'مؤكدة',
      label_en: 'Confirmed'
    },
    completed: {
      color: 'bg-gray-100 border-gray-300 text-gray-800',
      icon: CheckCircle,
      label_ar: 'مكتملة',
      label_en: 'Completed'
    },
    cancelled: {
      color: 'bg-red-100 border-red-300 text-red-800',
      icon: XCircle,
      label_ar: 'ملغية',
      label_en: 'Cancelled'
    },
    rescheduled: {
      color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      icon: AlertCircle,
      label_ar: 'معاد جدولتها',
      label_en: 'Rescheduled'
    }
  }

  const config = statusConfig[session.session_status]
  const StatusIcon = config.icon

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      config.color,
      'border-l-4'
    )}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Main Session Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Time */}
              <div className="text-center">
                <div className="text-lg font-bold">
                  {session.start_time}
                </div>
                <div className="text-xs text-muted-foreground">
                  {session.end_time}
                </div>
              </div>

              <Separator orientation="vertical" className="h-10" />

              {/* Student Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={session.student?.avatar_url} />
                  <AvatarFallback>
                    {(session.student?.name_ar || session.student?.name_en || '').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <div className="font-medium">
                    {session.student?.name_ar || session.student?.name_en}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {session.session_category}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status Badge */}
              <Badge className={config.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {language === 'ar' ? config.label_ar : config.label_en}
              </Badge>

              {/* Actions Menu */}
              {editMode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {session.session_status === 'scheduled' && (
                      <DropdownMenuItem onClick={() => onActionSelect('confirm')}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {language === 'ar' ? 'تأكيد' : 'Confirm'}
                      </DropdownMenuItem>
                    )}
                    
                    {session.session_status === 'confirmed' && (
                      <DropdownMenuItem onClick={() => onActionSelect('complete')}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {language === 'ar' ? 'اكتمال' : 'Complete'}
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem onClick={() => onActionSelect('reschedule')}>
                      <Clock className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'إعادة جدولة' : 'Reschedule'}
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem 
                      onClick={() => onActionSelect('cancel')}
                      className="text-destructive"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Expand/Collapse */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpansion}
              >
                {isExpanded ? '−' : '+'}
              </Button>
            </div>
          </div>

          {/* Quick Info Row */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{session.therapist?.name_ar || session.therapist?.name_en}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{session.room?.name_ar || session.room?.name_en}</span>
            </div>
            
            {session.duration_minutes && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{session.duration_minutes} {language === 'ar' ? 'دقيقة' : 'min'}</span>
              </div>
            )}
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="space-y-4 pt-4 border-t">
              {/* Detailed Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    {language === 'ar' ? 'معلومات الطالب' : 'Student Information'}
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>
                      <strong>{language === 'ar' ? 'العمر:' : 'Age:'}</strong> {session.student?.age}
                    </div>
                    <div>
                      <strong>{language === 'ar' ? 'الحالة:' : 'Condition:'}</strong> {session.student?.condition}
                    </div>
                    {session.student?.parent_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        <span>{session.student.parent_phone}</span>
                      </div>
                    )}
                    {session.student?.parent_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        <span>{session.student.parent_email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    {language === 'ar' ? 'تفاصيل الجلسة' : 'Session Details'}
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>
                      <strong>{language === 'ar' ? 'النوع:' : 'Type:'}</strong> {session.session_type}
                    </div>
                    <div>
                      <strong>{language === 'ar' ? 'الأهداف:' : 'Goals:'}</strong> {session.session_goals?.join(', ')}
                    </div>
                    {session.special_requirements && (
                      <div>
                        <strong>{language === 'ar' ? 'متطلبات خاصة:' : 'Special Requirements:'}</strong>
                        <span className="ml-2">{session.special_requirements}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Session Notes */}
              {session.session_notes && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    {language === 'ar' ? 'ملاحظات الجلسة' : 'Session Notes'}
                  </h4>
                  <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    {session.session_notes}
                  </div>
                </div>
              )}

              {/* Equipment & Resources */}
              {session.required_equipment && session.required_equipment.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    {language === 'ar' ? 'الأدوات المطلوبة' : 'Required Equipment'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {session.required_equipment.map((equipment, index) => (
                      <Badge key={index} variant="outline">
                        {equipment}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}