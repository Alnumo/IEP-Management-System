/**
 * Schedule Conflict Resolver Component
 * Story 3.1: Automated Scheduling Engine - Task 4 UI
 * 
 * Comprehensive conflict resolution interface with drag-and-drop capabilities,
 * alternative suggestions, and manual resolution tools
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { ScrollArea } from '../ui/scroll-area'
import { Separator } from '../ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Textarea } from '../ui/textarea'
import { 
  AlertTriangle,
  Clock,
  Users,
  Settings,
  CheckCircle,
  XCircle,
  RotateCcw,
  Zap,
  Target,
  Filter,
  Move,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  User,
  MapPin,
  ArrowRight,
  AlertCircle,
  Lightbulb,
  Activity,
  TrendingUp
} from 'lucide-react'
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core'
import { useI18n } from '../../contexts/I18nContext'
import type {
  ScheduleConflict,
  ScheduledSession,
  AlternativeSuggestion,
  ManualResolutionAction,
  ResolutionWorkflow,
  DragDropOperation
} from '../../types/scheduling'

// =====================================================
// Types and Interfaces
// =====================================================

interface ScheduleConflictResolverProps {
  conflicts: ScheduleConflict[]
  sessions: ScheduledSession[]
  onConflictsResolved?: (resolvedConflicts: string[]) => void
  onSessionsUpdated?: (updatedSessions: ScheduledSession[]) => void
  className?: string
}

interface ConflictResolutionState {
  activeConflict: ScheduleConflict | null
  workflowId: string | null
  resolutionMode: 'automatic' | 'manual' | 'hybrid'
  selectedSuggestions: Map<string, string> // conflict_id -> suggestion_id
  draggedSession: ScheduledSession | null
  previewChanges: ScheduledSession[]
  showPreview: boolean
}

// =====================================================
// Main Component
// =====================================================

export function ScheduleConflictResolver({
  conflicts,
  sessions,
  onConflictsResolved,
  onSessionsUpdated,
  className
}: ScheduleConflictResolverProps) {
  const { t, language, isRTL } = useI18n()

  // State Management
  const [state, setState] = useState<ConflictResolutionState>({
    activeConflict: null,
    workflowId: null,
    resolutionMode: 'hybrid',
    selectedSuggestions: new Map(),
    draggedSession: null,
    previewChanges: [],
    showPreview: false
  })

  const [activeTab, setActiveTab] = useState('overview')
  const [resolutionProgress, setResolutionProgress] = useState(0)
  const [alternativeSuggestions, setAlternativeSuggestions] = useState<Map<string, AlternativeSuggestion[]>>(new Map())
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set())

  // Calculate resolution progress
  useEffect(() => {
    const totalConflicts = conflicts.length
    const resolvedConflicts = conflicts.filter(c => c.suggested_resolution === 'resolved').length
    setResolutionProgress(totalConflicts > 0 ? (resolvedConflicts / totalConflicts) * 100 : 0)
  }, [conflicts])

  // =====================================================
  // Event Handlers
  // =====================================================

  const handleConflictSelect = (conflict: ScheduleConflict) => {
    setState(prev => ({ ...prev, activeConflict: conflict }))
    setActiveTab('details')
  }

  const handleDragStart = (event: any) => {
    const sessionId = event.active.id
    const draggedSession = sessions.find(s => s.id === sessionId)
    if (draggedSession) {
      setState(prev => ({ ...prev, draggedSession }))
    }
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    
    if (!over || !state.draggedSession) {
      setState(prev => ({ ...prev, draggedSession: null }))
      return
    }

    const operation: DragDropOperation = {
      source_session_id: active.id,
      target_slot: {
        date: over.data?.current?.date || state.draggedSession.session_date,
        start_time: over.data?.current?.start_time || state.draggedSession.start_time,
        end_time: over.data?.current?.end_time || state.draggedSession.end_time,
        therapist_id: over.data?.current?.therapist_id || state.draggedSession.therapist_id,
        room_id: over.data?.current?.room_id || state.draggedSession.room_id
      },
      operation_type: 'reschedule'
    }

    await handleManualRescheduling(operation)
    setState(prev => ({ ...prev, draggedSession: null }))
  }

  const handleManualRescheduling = async (operation: DragDropOperation) => {
    try {
      // Simulate processing drag operation
      console.log('Processing drag operation:', operation)
      
      // Update preview
      const updatedSessions = sessions.map(session => 
        session.id === operation.source_session_id 
          ? {
              ...session,
              session_date: operation.target_slot.date,
              start_time: operation.target_slot.start_time,
              end_time: operation.target_slot.end_time,
              therapist_id: operation.target_slot.therapist_id || session.therapist_id,
              room_id: operation.target_slot.room_id || session.room_id,
              updated_at: new Date().toISOString()
            }
          : session
      )
      
      setState(prev => ({ 
        ...prev, 
        previewChanges: updatedSessions,
        showPreview: true 
      }))

    } catch (error) {
      console.error('Manual rescheduling failed:', error)
    }
  }

  const handleApplySuggestion = async (conflictId: string, suggestionId: string) => {
    try {
      setState(prev => ({
        ...prev,
        selectedSuggestions: new Map(prev.selectedSuggestions.set(conflictId, suggestionId))
      }))

      // Mark conflict as being resolved
      console.log(`Applying suggestion ${suggestionId} for conflict ${conflictId}`)
      
    } catch (error) {
      console.error('Failed to apply suggestion:', error)
    }
  }

  const handleBatchResolution = async () => {
    try {
      const selectedConflictArray = Array.from(selectedConflicts)
      console.log('Resolving conflicts:', selectedConflictArray)
      
      // Update resolution progress
      setResolutionProgress(prev => Math.min(prev + 20, 100))
      
      onConflictsResolved?.(selectedConflictArray)
      
    } catch (error) {
      console.error('Batch resolution failed:', error)
    }
  }

  const handlePreviewChanges = () => {
    setState(prev => ({ ...prev, showPreview: !prev.showPreview }))
  }

  const handleApplyChanges = async () => {
    if (state.previewChanges.length > 0) {
      onSessionsUpdated?.(state.previewChanges)
      setState(prev => ({ 
        ...prev, 
        previewChanges: [],
        showPreview: false 
      }))
    }
  }

  const handleResetChanges = () => {
    setState(prev => ({ 
      ...prev, 
      previewChanges: [],
      showPreview: false,
      selectedSuggestions: new Map()
    }))
  }

  // =====================================================
  // Render Methods
  // =====================================================

  const renderConflictOverview = () => (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Resolution Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Activity className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          <CardTitle className="text-lg">
            {t('conflicts.resolution_progress')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('conflicts.resolved')}</span>
              <span>{Math.round(resolutionProgress)}%</span>
            </div>
            <Progress value={resolutionProgress} className="w-full" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-red-600">
                {conflicts.filter(c => c.conflict_severity === 'high').length}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('conflicts.high_priority')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-orange-600">
                {conflicts.filter(c => c.conflict_severity === 'medium').length}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('conflicts.medium_priority')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-yellow-600">
                {conflicts.filter(c => c.conflict_severity === 'low').length}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('conflicts.low_priority')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conflict List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('conflicts.detected_conflicts')}</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedConflicts(new Set(conflicts.map(c => c.id)))}
              >
                {t('common.select_all')}
              </Button>
              <Button
                size="sm"
                onClick={handleBatchResolution}
                disabled={selectedConflicts.size === 0}
              >
                <Zap className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('conflicts.resolve_selected')}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {conflicts.map((conflict, index) => (
                <ConflictCard
                  key={conflict.id}
                  conflict={conflict}
                  isSelected={selectedConflicts.has(conflict.id)}
                  onSelect={() => handleConflictSelect(conflict)}
                  onToggleSelect={(selected) => {
                    setSelectedConflicts(prev => {
                      const newSet = new Set(prev)
                      if (selected) {
                        newSet.add(conflict.id)
                      } else {
                        newSet.delete(conflict.id)
                      }
                      return newSet
                    })
                  }}
                  language={language}
                  isRTL={isRTL}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )

  const renderConflictDetails = () => {
    if (!state.activeConflict) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center space-y-2">
            <AlertCircle className="h-12 w-12 mx-auto" />
            <p>{t('conflicts.select_conflict_to_view_details')}</p>
          </div>
        </div>
      )
    }

    const conflictedSession = sessions.find(s => s.id === state.activeConflict.session_id)

    return (
      <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {/* Conflict Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'} text-red-600`} />
              {t('conflicts.conflict_details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  {t('conflicts.conflict_type')}
                </Label>
                <p className="font-medium">
                  {language === 'ar' 
                    ? state.activeConflict.description_ar 
                    : state.activeConflict.description_en
                  }
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  {t('conflicts.severity')}
                </Label>
                <Badge variant={getSeverityVariant(state.activeConflict.conflict_severity)}>
                  {state.activeConflict.conflict_severity}
                </Badge>
              </div>
            </div>

            {conflictedSession && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{t('conflicts.affected_session')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('common.date')}:</span>
                    <span className="ml-1 font-medium">{conflictedSession.session_date}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('common.time')}:</span>
                    <span className="ml-1 font-medium">
                      {conflictedSession.start_time} - {conflictedSession.end_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('common.therapist')}:</span>
                    <span className="ml-1 font-medium">{conflictedSession.therapist_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('common.room')}:</span>
                    <span className="ml-1 font-medium">{conflictedSession.room_id || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolution Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'} text-yellow-600`} />
              {t('conflicts.resolution_suggestions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alternativeSuggestions.get(state.activeConflict.id)?.slice(0, 3).map((suggestion, index) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isSelected={state.selectedSuggestions.get(state.activeConflict!.id) === suggestion.id}
                  onSelect={() => handleApplySuggestion(state.activeConflict!.id, suggestion.id)}
                  language={language}
                  isRTL={isRTL}
                />
              )) || (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-2" />
                  <p>{t('conflicts.generating_suggestions')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderManualResolution = () => (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {/* Instructions */}
        <Alert>
          <Move className="h-4 w-4" />
          <AlertTitle>{t('conflicts.manual_resolution')}</AlertTitle>
          <AlertDescription>
            {t('conflicts.drag_drop_instructions')}
          </AlertDescription>
        </Alert>

        {/* Interactive Schedule Grid */}
        <Card>
          <CardHeader>
            <CardTitle>{t('conflicts.interactive_schedule')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleGrid
              sessions={state.showPreview ? state.previewChanges : sessions}
              conflicts={conflicts}
              onSessionDrop={handleManualRescheduling}
              language={language}
              isRTL={isRTL}
            />
          </CardContent>
        </Card>

        {/* Preview Panel */}
        {state.showPreview && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-700">
                <Eye className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('conflicts.preview_changes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-blue-600">
                  {t('conflicts.preview_description')}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={handleApplyChanges}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('common.apply_changes')}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleResetChanges}
                  >
                    <RotateCcw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('common.reset')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DragOverlay>
        {state.draggedSession && (
          <SessionCard
            session={state.draggedSession}
            isDragging={true}
            language={language}
            isRTL={isRTL}
          />
        )}
      </DragOverlay>
    </DndContext>
  )

  const renderAnalytics = () => (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Conflict Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('conflicts.conflict_analytics')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ConflictAnalytics
            conflicts={conflicts}
            sessions={sessions}
            language={language}
            isRTL={isRTL}
          />
        </CardContent>
      </Card>

      {/* Resolution History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('conflicts.resolution_history')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResolutionHistory
            language={language}
            isRTL={isRTL}
          />
        </CardContent>
      </Card>
    </div>
  )

  // =====================================================
  // Main Render
  // =====================================================

  return (
    <div className={`space-y-6 ${className} ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('conflicts.schedule_conflict_resolver')}
          </h2>
          <p className="text-muted-foreground">
            {t('conflicts.resolver_description')}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviewChanges}
            disabled={state.previewChanges.length === 0}
          >
            <Eye className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('conflicts.preview')}
          </Button>
          
          <Button
            size="sm"
            onClick={handleBatchResolution}
            disabled={selectedConflicts.size === 0}
          >
            <CheckCircle className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('conflicts.resolve_all')}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <Activity className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('conflicts.overview')}
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center">
            <AlertTriangle className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('conflicts.details')}
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center">
            <Move className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('conflicts.manual_resolution')}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center">
            <TrendingUp className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('conflicts.analytics')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {renderConflictOverview()}
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {renderConflictDetails()}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          {renderManualResolution()}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {renderAnalytics()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =====================================================
// Sub Components
// =====================================================

function ConflictCard({
  conflict,
  isSelected,
  onSelect,
  onToggleSelect,
  language,
  isRTL
}: {
  conflict: ScheduleConflict
  isSelected: boolean
  onSelect: () => void
  onToggleSelect: (selected: boolean) => void
  language: string
  isRTL: boolean
}) {
  return (
    <div 
      className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted ${
        isSelected ? 'border-blue-500 bg-blue-50' : ''
      }`}
      onClick={onSelect}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
      />
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="font-medium">
            {language === 'ar' ? conflict.description_ar : conflict.description_en}
          </p>
          <Badge variant={getSeverityVariant(conflict.conflict_severity)}>
            {conflict.conflict_severity}
          </Badge>
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
          <span>Session ID: {conflict.session_id.substring(0, 8)}</span>
          {conflict.conflicting_session_id && (
            <>
              <ArrowRight className="h-3 w-3 mx-1" />
              <span>Conflicts with: {conflict.conflicting_session_id.substring(0, 8)}</span>
            </>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function SuggestionCard({
  suggestion,
  isSelected,
  onSelect,
  language,
  isRTL
}: {
  suggestion: AlternativeSuggestion
  isSelected: boolean
  onSelect: () => void
  language: string
  isRTL: boolean
}) {
  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer hover:bg-muted ${
        isSelected ? 'border-green-500 bg-green-50' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            Score: {(suggestion.overall_score * 100).toFixed(0)}%
          </Badge>
          <Badge variant="outline">
            {suggestion.implementation_complexity}
          </Badge>
        </div>
        
        {isSelected && (
          <CheckCircle className="h-5 w-5 text-green-600" />
        )}
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-muted-foreground">Date:</span>
            <span className="ml-1 font-medium">{suggestion.alternative_slot.date}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Time:</span>
            <span className="ml-1 font-medium">
              {suggestion.alternative_slot.start_time} - {suggestion.alternative_slot.end_time}
            </span>
          </div>
        </div>
        
        {suggestion.benefits && suggestion.benefits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {suggestion.benefits.slice(0, 2).map((benefit, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                <ThumbsUp className="h-3 w-3 mr-1" />
                {benefit}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ScheduleGrid({
  sessions,
  conflicts,
  onSessionDrop,
  language,
  isRTL
}: {
  sessions: ScheduledSession[]
  conflicts: ScheduleConflict[]
  onSessionDrop: (operation: DragDropOperation) => void
  language: string
  isRTL: boolean
}) {
  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = session.session_date
    if (!acc[date]) acc[date] = []
    acc[date].push(session)
    return acc
  }, {} as Record<string, ScheduledSession[]>)

  const dates = Object.keys(sessionsByDate).sort().slice(0, 7) // Show one week

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-2 min-w-[700px]">
        {dates.map(date => (
          <div key={date} className="space-y-2">
            <div className="text-sm font-medium text-center p-2 bg-muted rounded">
              {new Date(date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
              })}
            </div>
            
            <DropZone date={date}>
              <div className="space-y-1 min-h-[200px]">
                {sessionsByDate[date]?.map(session => {
                  const hasConflict = conflicts.some(c => c.session_id === session.id)
                  return (
                    <DraggableSession
                      key={session.id}
                      session={session}
                      hasConflict={hasConflict}
                      language={language}
                      isRTL={isRTL}
                    />
                  )
                })}
              </div>
            </DropZone>
          </div>
        ))}
      </div>
    </div>
  )
}

function DraggableSession({
  session,
  hasConflict,
  language,
  isRTL
}: {
  session: ScheduledSession
  hasConflict: boolean
  language: string
  isRTL: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: session.id,
    data: session
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-move ${isDragging ? 'opacity-50' : ''}`}
    >
      <SessionCard
        session={session}
        hasConflict={hasConflict}
        isDragging={isDragging}
        language={language}
        isRTL={isRTL}
      />
    </div>
  )
}

function DropZone({ 
  date, 
  children 
}: { 
  date: string
  children: React.ReactNode 
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone-${date}`,
    data: { date }
  })

  return (
    <div
      ref={setNodeRef}
      className={`p-2 border-2 border-dashed rounded-lg transition-colors ${
        isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      {children}
    </div>
  )
}

function SessionCard({
  session,
  hasConflict = false,
  isDragging = false,
  language,
  isRTL
}: {
  session: ScheduledSession
  hasConflict?: boolean
  isDragging?: boolean
  language: string
  isRTL: boolean
}) {
  return (
    <Card 
      className={`text-xs p-2 ${
        hasConflict ? 'border-red-500 bg-red-50' : ''
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {session.start_time} - {session.end_time}
          </span>
          {hasConflict && (
            <AlertTriangle className="h-3 w-3 text-red-500" />
          )}
        </div>
        
        <div className="flex items-center text-muted-foreground">
          <User className="h-3 w-3 mr-1" />
          <span className="truncate">{session.therapist_id.substring(0, 8)}</span>
        </div>
        
        {session.room_id && (
          <div className="flex items-center text-muted-foreground">
            <MapPin className="h-3 w-3 mr-1" />
            <span className="truncate">{session.room_id}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

function ConflictAnalytics({
  conflicts,
  sessions,
  language,
  isRTL
}: {
  conflicts: ScheduleConflict[]
  sessions: ScheduledSession[]
  language: string
  isRTL: boolean
}) {
  // Calculate analytics
  const conflictsByType = conflicts.reduce((acc, conflict) => {
    acc[conflict.conflict_type] = (acc[conflict.conflict_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const mostProblematicTherapist = calculateMostProblematicTherapist(conflicts, sessions)
  const peakConflictHours = calculatePeakConflictHours(conflicts, sessions)

  return (
    <div className="space-y-6">
      {/* Conflict Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(conflictsByType).map(([type, count]) => (
          <div key={type} className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{count}</div>
            <div className="text-sm text-muted-foreground">{type}</div>
          </div>
        ))}
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Problematic Therapist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">{mostProblematicTherapist}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peak Conflict Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {peakConflictHours.map((hour, index) => (
                <div key={index} className="text-sm">{hour}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ResolutionHistory({
  language,
  isRTL
}: {
  language: string
  isRTL: boolean
}) {
  // Mock history data
  const historyItems = [
    {
      id: '1',
      action: 'Rescheduled session',
      timestamp: '2025-01-01 10:30',
      status: 'success'
    },
    {
      id: '2', 
      action: 'Reassigned therapist',
      timestamp: '2025-01-01 10:25',
      status: 'success'
    }
  ]

  return (
    <div className="space-y-3">
      {historyItems.map(item => (
        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>{item.action}</span>
          </div>
          <span className="text-sm text-muted-foreground">{item.timestamp}</span>
        </div>
      ))}
    </div>
  )
}

// =====================================================
// Helper Functions
// =====================================================

function getSeverityVariant(severity: string): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case 'high':
      return 'destructive'
    case 'medium':
      return 'default'
    case 'low':
      return 'secondary'
    default:
      return 'outline'
  }
}

function calculateMostProblematicTherapist(conflicts: ScheduleConflict[], sessions: ScheduledSession[]): string {
  const therapistConflicts = new Map<string, number>()
  
  conflicts.forEach(conflict => {
    const session = sessions.find(s => s.id === conflict.session_id)
    if (session) {
      therapistConflicts.set(
        session.therapist_id,
        (therapistConflicts.get(session.therapist_id) || 0) + 1
      )
    }
  })

  let maxConflicts = 0
  let problematicTherapist = 'None'
  
  therapistConflicts.forEach((count, therapistId) => {
    if (count > maxConflicts) {
      maxConflicts = count
      problematicTherapist = therapistId
    }
  })

  return problematicTherapist
}

function calculatePeakConflictHours(conflicts: ScheduleConflict[], sessions: ScheduledSession[]): string[] {
  const hourConflicts = new Map<string, number>()
  
  conflicts.forEach(conflict => {
    const session = sessions.find(s => s.id === conflict.session_id)
    if (session) {
      const hour = session.start_time.substring(0, 2) + ':00'
      hourConflicts.set(hour, (hourConflicts.get(hour) || 0) + 1)
    }
  })

  return Array.from(hourConflicts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour)
}