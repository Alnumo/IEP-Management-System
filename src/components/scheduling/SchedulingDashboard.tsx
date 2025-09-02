import React, { useState, useMemo, useCallback } from 'react'
import { Calendar, Clock, Users, Settings, Filter, Download, RefreshCw, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { CalendarView } from './CalendarView'
import { ScheduleListView } from './ScheduleListView'
import { DragDropScheduleEditor } from './DragDropScheduleEditor'
import { ScheduleConflictResolver } from './ScheduleConflictResolver'
import { ScheduleExportOptions } from './ScheduleExportOptions'
import { QuickActionsPanel } from './QuickActionsPanel'
import { ScheduleStatsOverview } from './ScheduleStatsOverview'
import { useScheduleData } from '@/hooks/useScheduleData'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate } from '@/lib/utils'
import type { 
  ScheduleView, 
  ScheduleFilter, 
  ScheduledSession,
  TherapistAvailability,
  ScheduleStats
} from '@/types/scheduling'

/**
 * Comprehensive Scheduling Dashboard Component
 * 
 * Main interface for schedule management with calendar views,
 * drag-and-drop editing, conflict resolution, and export capabilities.
 * Supports Arabic RTL/English LTR layouts and real-time updates.
 */

interface SchedulingDashboardProps {
  initialView?: ScheduleView
  showConflictResolver?: boolean
  enableDragDrop?: boolean
  readOnly?: boolean
}

const SCHEDULE_VIEWS: ScheduleView[] = ['daily', 'weekly', 'monthly', 'agenda']

export function SchedulingDashboard({
  initialView = 'weekly',
  showConflictResolver = false,
  enableDragDrop = true,
  readOnly = false
}: SchedulingDashboardProps) {
  const { language, isRTL } = useLanguage()
  
  // State management
  const [currentView, setCurrentView] = useState<ScheduleView>(initialView)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [activeFilters, setActiveFilters] = useState<ScheduleFilter>({
    therapist_ids: [],
    student_ids: [],
    session_statuses: ['scheduled', 'confirmed'],
    date_range: {
      start: new Date(),
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  })
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showConflicts, setShowConflicts] = useState(showConflictResolver)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [editMode, setEditMode] = useState(false)

  // Data fetching with real-time updates
  const {
    sessions,
    availability,
    conflicts,
    stats,
    isLoading,
    isError,
    error,
    refetch,
    optimisticUpdate
  } = useScheduleData({
    filters: activeFilters,
    view: currentView,
    selectedDate,
    enableRealTime: autoRefresh,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: autoRefresh ? 30 * 1000 : undefined // 30 seconds
  })

  // Filter management
  const updateFilter = useCallback((key: keyof ScheduleFilter, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setActiveFilters({
      therapist_ids: [],
      student_ids: [],
      session_statuses: ['scheduled', 'confirmed'],
      date_range: {
        start: new Date(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })
  }, [])

  // Session handlers
  const handleSessionUpdate = useCallback(async (sessionId: string, updates: Partial<ScheduledSession>) => {
    if (readOnly) return

    try {
      await optimisticUpdate(sessionId, updates)
    } catch (error) {
      console.error('Failed to update session:', error)
      // Error handling would show toast notification
    }
  }, [optimisticUpdate, readOnly])

  const handleBulkUpdate = useCallback(async (sessionIds: string[], updates: Partial<ScheduledSession>) => {
    if (readOnly) return

    try {
      await Promise.all(sessionIds.map(id => optimisticUpdate(id, updates)))
    } catch (error) {
      console.error('Failed to update sessions:', error)
    }
  }, [optimisticUpdate, readOnly])

  // Navigation helpers
  const navigateDate = useCallback((direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(selectedDate)
    
    switch (direction) {
      case 'prev':
        switch (currentView) {
          case 'daily':
            newDate.setDate(newDate.getDate() - 1)
            break
          case 'weekly':
            newDate.setDate(newDate.getDate() - 7)
            break
          case 'monthly':
            newDate.setMonth(newDate.getMonth() - 1)
            break
          case 'agenda':
            newDate.setDate(newDate.getDate() - 7)
            break
        }
        break
        
      case 'next':
        switch (currentView) {
          case 'daily':
            newDate.setDate(newDate.getDate() + 1)
            break
          case 'weekly':
            newDate.setDate(newDate.getDate() + 7)
            break
          case 'monthly':
            newDate.setMonth(newDate.getMonth() + 1)
            break
          case 'agenda':
            newDate.setDate(newDate.getDate() + 7)
            break
        }
        break
        
      case 'today':
        return setSelectedDate(new Date())
    }
    
    setSelectedDate(newDate)
  }, [selectedDate, currentView])

  // Computed values
  const hasConflicts = useMemo(() => 
    conflicts && conflicts.length > 0, 
    [conflicts]
  )

  const filteredSessions = useMemo(() => 
    sessions?.filter(session => {
      if (activeFilters.therapist_ids.length > 0 && 
          !activeFilters.therapist_ids.includes(session.therapist_id || '')) {
        return false
      }
      
      if (activeFilters.student_ids.length > 0 && 
          !activeFilters.student_ids.includes(session.student_id || '')) {
        return false
      }
      
      if (!activeFilters.session_statuses.includes(session.session_status)) {
        return false
      }
      
      return true
    }) || [],
    [sessions, activeFilters]
  )

  const viewTitle = useMemo(() => {
    const titles = {
      daily: language === 'ar' ? 'العرض اليومي' : 'Daily View',
      weekly: language === 'ar' ? 'العرض الأسبوعي' : 'Weekly View', 
      monthly: language === 'ar' ? 'العرض الشهري' : 'Monthly View',
      agenda: language === 'ar' ? 'عرض الأجندة' : 'Agenda View'
    }
    return titles[currentView]
  }, [currentView, language])

  if (isError) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {language === 'ar' ? 'خطأ في تحميل البيانات' : 'Error Loading Data'}
          </h3>
          <p className="text-muted-foreground text-center mb-4">
            {language === 'ar' 
              ? 'حدث خطأ أثناء تحميل بيانات الجدولة. يرجى المحاولة مرة أخرى.'
              : 'An error occurred while loading scheduling data. Please try again.'
            }
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`w-full space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">
              {language === 'ar' ? 'لوحة إدارة الجدولة' : 'Scheduling Dashboard'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'إدارة وتنظيم جلسات العلاج والمواعيد'
                : 'Manage and organize therapy sessions and appointments'
              }
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {filteredSessions.length}
            </div>
            <div className="text-sm text-muted-foreground">
              {language === 'ar' ? 'الجلسات' : 'Sessions'}
            </div>
          </div>
          
          {hasConflicts && (
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {conflicts?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                {language === 'ar' ? 'تضارب' : 'Conflicts'}
              </div>
            </div>
          )}
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats?.utilization_percentage?.toFixed(0) || 0}%
            </div>
            <div className="text-sm text-muted-foreground">
              {language === 'ar' ? 'الاستخدام' : 'Utilization'}
            </div>
          </div>
        </div>
      </div>

      {/* Controls and Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* View Controls */}
            <div className="flex items-center gap-4">
              <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as ScheduleView)}>
                <TabsList>
                  {SCHEDULE_VIEWS.map((view) => (
                    <TabsTrigger key={view} value={view}>
                      {language === 'ar' ? {
                        daily: 'يومي',
                        weekly: 'أسبوعي',
                        monthly: 'شهري',
                        agenda: 'أجندة'
                      }[view] : {
                        daily: 'Daily',
                        weekly: 'Weekly', 
                        monthly: 'Monthly',
                        agenda: 'Agenda'
                      }[view]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                  {isRTL ? '←' : '→'}
                </Button>
                
                <DatePicker
                  date={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                />
                
                <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                  {isRTL ? '→' : '←'}
                </Button>
                
                <Button variant="outline" size="sm" onClick={() => navigateDate('today')}>
                  {language === 'ar' ? 'اليوم' : 'Today'}
                </Button>
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh" className="text-sm">
                  {language === 'ar' ? 'التحديث التلقائي' : 'Auto Refresh'}
                </Label>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(!editMode)}
                disabled={readOnly}
              >
                <Settings className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'تحرير' : 'Edit'}
              </Button>

              {hasConflicts && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConflicts(!showConflicts)}
                >
                  <AlertCircle className="w-4 h-4 mr-2 text-destructive" />
                  <Badge variant="destructive" className="mr-2">
                    {conflicts?.length}
                  </Badge>
                  {language === 'ar' ? 'التضارب' : 'Conflicts'}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'تصدير' : 'Export'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {language === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">
                {language === 'ar' ? 'الفلاتر:' : 'Filters:'}
              </span>
            </div>

            <Select
              value={activeFilters.session_statuses[0]}
              onValueChange={(value) => updateFilter('session_statuses', [value])}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={language === 'ar' ? 'حالة الجلسة' : 'Session Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="scheduled">{language === 'ar' ? 'مجدولة' : 'Scheduled'}</SelectItem>
                <SelectItem value="confirmed">{language === 'ar' ? 'مؤكدة' : 'Confirmed'}</SelectItem>
                <SelectItem value="completed">{language === 'ar' ? 'مكتملة' : 'Completed'}</SelectItem>
                <SelectItem value="cancelled">{language === 'ar' ? 'ملغية' : 'Cancelled'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Additional filter controls would go here */}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Schedule View - Main Content */}
        <div className="xl:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{viewTitle}</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm text-muted-foreground">
                    {formatDate(selectedDate, language)}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentView === 'agenda' ? (
                <ScheduleListView
                  sessions={filteredSessions}
                  availability={availability}
                  selectedDate={selectedDate}
                  onSessionUpdate={handleSessionUpdate}
                  editMode={editMode}
                  isLoading={isLoading}
                />
              ) : editMode && enableDragDrop ? (
                <DragDropScheduleEditor
                  sessions={filteredSessions}
                  availability={availability}
                  view={currentView}
                  selectedDate={selectedDate}
                  onSessionUpdate={handleSessionUpdate}
                  onBulkUpdate={handleBulkUpdate}
                  conflicts={conflicts}
                  isLoading={isLoading}
                />
              ) : (
                <CalendarView
                  sessions={filteredSessions}
                  availability={availability}
                  view={currentView}
                  selectedDate={selectedDate}
                  onSessionUpdate={handleSessionUpdate}
                  readOnly={readOnly}
                  isLoading={isLoading}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-1 space-y-6">
          {/* Quick Actions */}
          <QuickActionsPanel
            onCreateSession={() => {/* Handle session creation */}}
            onBulkOperations={() => {/* Handle bulk operations */}}
            onOptimizeSchedule={() => {/* Handle schedule optimization */}}
            editMode={editMode}
            readOnly={readOnly}
          />

          {/* Schedule Stats */}
          <ScheduleStatsOverview
            stats={stats}
            isLoading={isLoading}
          />

          {/* Today's Highlights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {language === 'ar' ? 'أبرز أحداث اليوم' : "Today's Highlights"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Upcoming sessions */}
              <div className="text-sm">
                <div className="font-medium mb-1">
                  {language === 'ar' ? 'الجلسات القادمة' : 'Upcoming Sessions'}
                </div>
                <div className="text-muted-foreground">
                  {filteredSessions.filter(s => 
                    new Date(s.session_date).toDateString() === new Date().toDateString() &&
                    new Date(`${s.session_date}T${s.start_time}`) > new Date()
                  ).length} {language === 'ar' ? 'جلسة' : 'sessions'}
                </div>
              </div>

              {hasConflicts && (
                <div className="text-sm">
                  <div className="font-medium mb-1 text-destructive">
                    {language === 'ar' ? 'تضارب يحتاج حل' : 'Conflicts Need Attention'}
                  </div>
                  <div className="text-muted-foreground">
                    {conflicts?.filter(c => c.severity === 'high').length} {language === 'ar' ? 'عالي الأولوية' : 'high priority'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {showConflicts && (
        <ScheduleConflictResolver
          conflicts={conflicts || []}
          sessions={filteredSessions}
          onResolveConflict={handleSessionUpdate}
          onClose={() => setShowConflicts(false)}
          isOpen={showConflicts}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <ScheduleExportOptions
          sessions={filteredSessions}
          dateRange={activeFilters.date_range}
          view={currentView}
          onClose={() => setShowExportDialog(false)}
          isOpen={showExportDialog}
        />
      )}
    </div>
  )
}