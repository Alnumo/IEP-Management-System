/**
 * Auto Schedule Engine Component
 * Story 3.1: Automated Scheduling Engine - Task 3 UI
 * 
 * Main interface for automated schedule generation with advanced configuration,
 * real-time optimization, and bilingual support (Arabic RTL/English LTR)
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { ScrollArea } from '../ui/scroll-area'
import { Separator } from '../ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { 
  Calendar,
  Clock,
  Users,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Download,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  Filter
} from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { 
  useGenerateSchedule, 
  useOptimizeSchedule, 
  useSchedulePatterns, 
  useValidateScheduleRequest,
  useScheduleConflictAnalysis,
  useExportSchedule,
  useScheduleGenerationProgress
} from '../../hooks/useScheduleGeneration'
import type {
  ScheduleGenerationRequest,
  OptimizationConfig,
  ScheduledSession,
  SchedulePattern,
  SchedulingMetrics
} from '../../types/scheduling'

// =====================================================
// Types and Interfaces
// =====================================================

interface AutoScheduleEngineProps {
  onScheduleGenerated?: (sessions: ScheduledSession[]) => void
  onScheduleOptimized?: (sessions: ScheduledSession[]) => void
  initialConfig?: Partial<ScheduleGenerationRequest>
  className?: string
}

interface GenerationConfig extends ScheduleGenerationRequest {
  optimization_enabled: boolean
  export_format: 'pdf' | 'csv' | 'ical' | 'xlsx'
  notification_preferences: {
    on_completion: boolean
    on_conflicts: boolean
    on_optimization: boolean
  }
}

// =====================================================
// Main Component
// =====================================================

export function AutoScheduleEngine({
  onScheduleGenerated,
  onScheduleOptimized,
  initialConfig,
  className
}: AutoScheduleEngineProps) {
  const { t, language, isRTL } = useI18n()

  // State Management
  const [config, setConfig] = useState<GenerationConfig>({
    start_date: '',
    end_date: '',
    program_ids: [],
    student_ids: [],
    therapist_ids: [],
    rule_set_id: undefined,
    optimization_rules: [],
    optimization_enabled: true,
    export_format: 'pdf',
    notification_preferences: {
      on_completion: true,
      on_conflicts: true,
      on_optimization: false
    },
    ...initialConfig
  })

  const [activeTab, setActiveTab] = useState('configuration')
  const [generatedSessions, setGeneratedSessions] = useState<ScheduledSession[]>([])
  const [optimizedSessions, setOptimizedSessions] = useState<ScheduledSession[]>([])
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState<string>('')

  // Hooks
  const generateMutation = useGenerateSchedule()
  const optimizeMutation = useOptimizeSchedule()
  const exportMutation = useExportSchedule()
  const { data: patterns } = useSchedulePatterns()
  const { data: validation } = useValidateScheduleRequest(config)
  const { data: conflictAnalysis } = useScheduleConflictAnalysis(
    optimizedSessions.length > 0 ? optimizedSessions : generatedSessions
  )

  // =====================================================
  // Event Handlers
  // =====================================================

  const handleConfigChange = <K extends keyof GenerationConfig>(
    key: K,
    value: GenerationConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleArrayChange = <K extends keyof GenerationConfig>(
    key: K,
    value: string,
    checked: boolean
  ) => {
    setConfig(prev => ({
      ...prev,
      [key]: checked
        ? [...(prev[key] as string[]), value]
        : (prev[key] as string[]).filter(item => item !== value)
    }))
  }

  const handleGenerateSchedule = async () => {
    if (!validation?.isValid) {
      return
    }

    try {
      setCurrentStage(t('schedule.generating'))
      setGenerationProgress(0)

      // Simulate progress for demo
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await generateMutation.mutateAsync(config)
      
      clearInterval(progressInterval)
      setGenerationProgress(100)

      if (result.success) {
        setGeneratedSessions(result.data.generated_sessions)
        setActiveTab('results')
        onScheduleGenerated?.(result.data.generated_sessions)

        // Auto-optimize if enabled
        if (config.optimization_enabled) {
          handleOptimizeSchedule(result.data.generated_sessions)
        }
      }

    } catch (error) {
      setGenerationProgress(0)
      console.error('Schedule generation failed:', error)
    }
  }

  const handleOptimizeSchedule = async (sessions: ScheduledSession[] = generatedSessions) => {
    if (sessions.length === 0) return

    try {
      setCurrentStage(t('schedule.optimizing'))

      const optimizationConfig: OptimizationConfig = {
        optimize_resource_utilization: true,
        balance_therapist_workload: true,
        minimize_gaps: true,
        group_related_sessions: true,
        custom_rules: config.optimization_rules
      }

      const result = await optimizeMutation.mutateAsync({
        sessions,
        config: optimizationConfig
      })

      if (result.success) {
        setOptimizedSessions(result.data.optimized_sessions)
        onScheduleOptimized?.(result.data.optimized_sessions)
        setActiveTab('optimization')
      }

    } catch (error) {
      console.error('Schedule optimization failed:', error)
    }
  }

  const handleExportSchedule = async (format: 'pdf' | 'csv' | 'ical' | 'xlsx') => {
    const sessionsToExport = optimizedSessions.length > 0 ? optimizedSessions : generatedSessions
    
    if (sessionsToExport.length === 0) return

    try {
      const blob = await exportMutation.mutateAsync({
        sessions: sessionsToExport,
        format,
        options: { language }
      })

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `schedule_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const resetConfiguration = () => {
    setConfig({
      start_date: '',
      end_date: '',
      program_ids: [],
      student_ids: [],
      therapist_ids: [],
      rule_set_id: undefined,
      optimization_rules: [],
      optimization_enabled: true,
      export_format: 'pdf',
      notification_preferences: {
        on_completion: true,
        on_conflicts: true,
        on_optimization: false
      }
    })
    setGeneratedSessions([])
    setOptimizedSessions([])
    setGenerationProgress(0)
    setActiveTab('configuration')
  }

  // =====================================================
  // Render Methods
  // =====================================================

  const renderConfigurationTab = () => (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Date Range Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Calendar className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          <CardTitle className="text-lg">
            {t('schedule.date_range')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">{t('schedule.start_date')}</Label>
              <Input
                id="start-date"
                type="date"
                value={config.start_date}
                onChange={(e) => handleConfigChange('start_date', e.target.value)}
                className={isRTL ? 'text-right' : 'text-left'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">{t('schedule.end_date')}</Label>
              <Input
                id="end-date"
                type="date"
                value={config.end_date}
                onChange={(e) => handleConfigChange('end_date', e.target.value)}
                className={isRTL ? 'text-right' : 'text-left'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Programs and Participants */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Users className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          <CardTitle className="text-lg">
            {t('schedule.participants')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('schedule.therapy_programs')}</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder={t('schedule.select_programs')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="speech">
                  {language === 'ar' ? 'علاج النطق' : 'Speech Therapy'}
                </SelectItem>
                <SelectItem value="occupational">
                  {language === 'ar' ? 'العلاج الوظيفي' : 'Occupational Therapy'}
                </SelectItem>
                <SelectItem value="physical">
                  {language === 'ar' ? 'العلاج الطبيعي' : 'Physical Therapy'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('schedule.schedule_pattern')}</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder={t('schedule.select_pattern')} />
              </SelectTrigger>
              <SelectContent>
                {patterns?.map(pattern => (
                  <SelectItem key={pattern.pattern_name_en} value={pattern.pattern_name_en}>
                    {language === 'ar' ? pattern.pattern_name_ar : pattern.pattern_name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Options */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Zap className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          <CardTitle className="text-lg">
            {t('schedule.optimization')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-optimization"
              checked={config.optimization_enabled}
              onCheckedChange={(checked) => 
                handleConfigChange('optimization_enabled', !!checked)
              }
            />
            <Label htmlFor="enable-optimization" className="text-sm font-medium">
              {t('schedule.enable_auto_optimization')}
            </Label>
          </div>

          {config.optimization_enabled && (
            <div className="space-y-3 pl-6 border-l-2 border-blue-200">
              <div className="flex items-center space-x-2">
                <Checkbox id="minimize-gaps" defaultChecked />
                <Label htmlFor="minimize-gaps" className="text-sm">
                  {t('schedule.minimize_gaps')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="balance-workload" defaultChecked />
                <Label htmlFor="balance-workload" className="text-sm">
                  {t('schedule.balance_therapist_workload')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="group-sessions" defaultChecked />
                <Label htmlFor="group-sessions" className="text-sm">
                  {t('schedule.group_related_sessions')}
                </Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              <CardTitle className="text-lg">
                {t('schedule.advanced_options')}
              </CardTitle>
            </div>
            <Filter className={`h-4 w-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
          </div>
        </CardHeader>
        {showAdvancedOptions && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('schedule.export_format')}</Label>
                <Select
                  value={config.export_format}
                  onValueChange={(value: any) => handleConfigChange('export_format', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                    <SelectItem value="ical">Calendar (iCal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>{t('schedule.notifications')}</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={config.notification_preferences.on_completion}
                      onCheckedChange={(checked) =>
                        handleConfigChange('notification_preferences', {
                          ...config.notification_preferences,
                          on_completion: !!checked
                        })
                      }
                    />
                    <Label className="text-sm">{t('schedule.notify_completion')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={config.notification_preferences.on_conflicts}
                      onCheckedChange={(checked) =>
                        handleConfigChange('notification_preferences', {
                          ...config.notification_preferences,
                          on_conflicts: !!checked
                        })
                      }
                    />
                    <Label className="text-sm">{t('schedule.notify_conflicts')}</Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Validation Results */}
      {validation && !validation.isValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('schedule.validation_errors')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )

  const renderProgressTab = () => (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('schedule.generation_progress')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{currentStage}</span>
              <span>{generationProgress}%</span>
            </div>
            <Progress value={generationProgress} className="w-full" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">
                {generatedSessions.length}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('schedule.sessions_generated')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {generateMutation.data?.data.generation_time_ms || 0}ms
              </div>
              <div className="text-sm text-muted-foreground">
                {t('schedule.generation_time')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {generateMutation.isPending && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span>{t('schedule.generating_schedule')}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderResultsTab = () => (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'} text-green-600`} />
            {t('schedule.generation_complete')}
          </CardTitle>
          <CardDescription>
            {t('schedule.generation_summary', { count: generatedSessions.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">
                {generatedSessions.length}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('schedule.total_sessions')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(generatedSessions.map(s => s.therapist_id)).size}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('schedule.therapists_involved')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-orange-600">
                {new Set(generatedSessions.map(s => s.student_id)).size}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('schedule.students_scheduled')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-red-600">
                {conflictAnalysis?.conflicts.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('schedule.conflicts_detected')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conflict Analysis */}
      {conflictAnalysis && conflictAnalysis.conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'} text-red-600`} />
              {t('schedule.conflicts_found')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conflictAnalysis.conflicts.slice(0, 5).map((conflict, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">
                      {language === 'ar' ? conflict.description_ar : conflict.description_en}
                    </p>
                    <Badge variant="destructive" className="text-xs">
                      {conflict.conflict_severity}
                    </Badge>
                  </div>
                </div>
              ))}
              {conflictAnalysis.conflicts.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  {t('schedule.more_conflicts', { 
                    count: conflictAnalysis.conflicts.length - 5 
                  })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('schedule.generated_sessions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {generatedSessions.slice(0, 20).map((session, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {session.session_date} - {session.start_time}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session.duration_minutes} {t('common.minutes')}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {session.session_type}
                  </Badge>
                </div>
              ))}
              {generatedSessions.length > 20 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {t('schedule.more_sessions', { 
                    count: generatedSessions.length - 20 
                  })}
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )

  const renderOptimizationTab = () => (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Optimization Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'} text-green-600`} />
            {t('schedule.optimization_complete')}
          </CardTitle>
          <CardDescription>
            {optimizeMutation.data?.data.improvement_percentage && (
              <>
                {t('schedule.optimization_improvement', { 
                  percentage: optimizeMutation.data.data.improvement_percentage.toFixed(1) 
                })}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">
                {optimizeMutation.data?.data.final_metrics.overall_score.toFixed(0) || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('schedule.optimization_score')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {optimizeMutation.data?.data.final_metrics.therapist_utilization.average_utilization.toFixed(0) || 0}%
              </div>
              <div className="text-sm text-muted-foreground">
                {t('schedule.avg_utilization')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-600">
                {optimizeMutation.data?.data.optimization_time_ms || 0}ms
              </div>
              <div className="text-sm text-muted-foreground">
                {t('schedule.optimization_time')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Before/After Comparison */}
      {optimizeMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>{t('schedule.before_after_comparison')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-muted-foreground">
                  {t('schedule.before_optimization')}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('schedule.efficiency_score')}</span>
                    <Badge variant="secondary">
                      {optimizeMutation.data.data.initial_metrics.overall_score.toFixed(0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('schedule.gaps_count')}</span>
                    <Badge variant="secondary">
                      {optimizeMutation.data.data.initial_metrics.gap_metrics.gap_count}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-green-600">
                  {t('schedule.after_optimization')}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('schedule.efficiency_score')}</span>
                    <Badge variant="default">
                      {optimizeMutation.data.data.final_metrics.overall_score.toFixed(0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('schedule.gaps_count')}</span>
                    <Badge variant="default">
                      {optimizeMutation.data.data.final_metrics.gap_metrics.gap_count}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
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
            {t('schedule.auto_schedule_engine')}
          </h2>
          <p className="text-muted-foreground">
            {t('schedule.auto_schedule_description')}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetConfiguration}
            className={`${isRTL ? 'ml-2' : 'mr-2'}`}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('common.export')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('schedule.export_schedule')}</DialogTitle>
                <DialogDescription>
                  {t('schedule.choose_export_format')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                {(['pdf', 'csv', 'xlsx', 'ical'] as const).map(format => (
                  <Button
                    key={format}
                    variant="outline"
                    onClick={() => handleExportSchedule(format)}
                    disabled={exportMutation.isPending}
                  >
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configuration" className="flex items-center">
            <Settings className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('schedule.configuration')}
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center">
            <Clock className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('schedule.progress')}
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center">
            <BarChart3 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('schedule.results')}
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center">
            <Target className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('schedule.optimization')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-4">
          {renderConfigurationTab()}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {renderProgressTab()}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {renderResultsTab()}
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          {renderOptimizationTab()}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div className="flex items-center space-x-2">
          {validation?.isValid && (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              {t('schedule.configuration_valid')}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={handleGenerateSchedule}
            disabled={!validation?.isValid || generateMutation.isPending}
            size="lg"
          >
            <Play className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {generateMutation.isPending ? t('schedule.generating') : t('schedule.generate')}
          </Button>

          {generatedSessions.length > 0 && (
            <Button
              variant="outline"
              onClick={() => handleOptimizeSchedule()}
              disabled={optimizeMutation.isPending}
              size="lg"
            >
              <Zap className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {optimizeMutation.isPending ? t('schedule.optimizing') : t('schedule.optimize')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}