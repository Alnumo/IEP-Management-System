import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Clock, 
  Users, 
  Settings, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Target,
  BarChart3
} from 'lucide-react'
import { useSchedulingEngine, useSchedulingPerformance } from '@/hooks/useSchedulingEngine'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SchedulingRequest, PriorityLevel } from '@/types/scheduling'

/**
 * Automated Scheduling Engine Demo Component
 * Story 3.1: Automated Scheduling Engine - Demonstration Interface
 * 
 * Comprehensive demonstration component showcasing all automated scheduling
 * engine features including generation, optimization, conflict resolution,
 * and performance monitoring with Arabic RTL/English LTR support.
 */

export function AutomatedSchedulingDemo() {
  const { language, isRTL } = useLanguage()
  const {
    generateSchedule,
    detectBatchConflicts,
    executeOptimizationRules,
    executeBulkReschedule,
    scheduleTemplates,
    optimizationRules,
    schedulingMetrics,
    performanceMetrics,
    isGenerating,
    isOptimizing,
    isBulkProcessing,
    activeOperations,
    validateSchedulingRequest
  } = useSchedulingEngine()

  const { performanceData } = useSchedulingPerformance()

  const [demoState, setDemoState] = useState({
    step: 'setup', // setup, generating, optimizing, resolving, complete
    progress: 0,
    generatedSessions: 0,
    detectedConflicts: 0,
    resolvedConflicts: 0,
    optimizationScore: 0,
    processingTime: 0
  })

  const [demoRequest, setDemoRequest] = useState<SchedulingRequest>({
    student_subscription_id: 'demo-student-123',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    total_sessions: 24,
    sessions_per_week: 3,
    session_duration: 60,
    preferred_times: [
      { start_time: '09:00', end_time: '10:00', duration_minutes: 60 },
      { start_time: '14:00', end_time: '15:00', duration_minutes: 60 }
    ],
    avoid_times: [
      { start_time: '12:00', end_time: '13:00', duration_minutes: 60 }
    ],
    preferred_days: [1, 2, 3, 4], // Mon-Thu
    avoid_days: [5, 6], // Fri-Sat
    priority_level: PriorityLevel.HIGH,
    flexibility_score: 80,
    requires_consecutive_sessions: false,
    max_gap_between_sessions: 120,
    allow_rescheduling: true
  })

  const runCompleteDemo = useCallback(async () => {
    const startTime = Date.now()
    
    try {
      // Step 1: Setup and Validation
      setDemoState(prev => ({ ...prev, step: 'setup', progress: 0 }))
      
      const validation = validateSchedulingRequest(demoRequest)
      if (!validation.isValid) {
        console.error('Demo request validation failed:', validation.errors)
        return
      }

      await new Promise(resolve => setTimeout(resolve, 500)) // Demo delay
      setDemoState(prev => ({ ...prev, progress: 10 }))

      // Step 2: Schedule Generation
      setDemoState(prev => ({ ...prev, step: 'generating', progress: 15 }))
      
      const scheduleResult = await generateSchedule(demoRequest)
      
      if (scheduleResult.success) {
        setDemoState(prev => ({
          ...prev,
          progress: 40,
          generatedSessions: scheduleResult.generated_sessions.length,
          optimizationScore: scheduleResult.optimization_score
        }))
      }

      // Step 3: Conflict Detection
      setDemoState(prev => ({ ...prev, step: 'detecting', progress: 50 }))
      
      if (scheduleResult.success && scheduleResult.generated_sessions.length > 0) {
        const conflictMap = await detectBatchConflicts({
          sessions: scheduleResult.generated_sessions,
          options: {
            parallelProcessing: true,
            maxConcurrency: 5,
            includeResources: true
          }
        })

        const totalConflicts = Array.from(conflictMap.values()).reduce(
          (sum, conflicts) => sum + conflicts.length,
          0
        )

        setDemoState(prev => ({
          ...prev,
          progress: 65,
          detectedConflicts: totalConflicts
        }))
      }

      // Step 4: Optimization Rules Execution
      setDemoState(prev => ({ ...prev, step: 'optimizing', progress: 70 }))
      
      if (scheduleResult.success) {
        const optimizationResult = await executeOptimizationRules(
          scheduleResult.generated_sessions,
          demoRequest,
          {
            availability: [],
            existingSessions: []
          }
        )

        setDemoState(prev => ({
          ...prev,
          progress: 85,
          optimizationScore: optimizationResult.optimizationScore,
          resolvedConflicts: prev.detectedConflicts - 2 // Demo: assume some conflicts resolved
        }))
      }

      // Step 5: Complete
      const endTime = Date.now()
      setDemoState(prev => ({
        ...prev,
        step: 'complete',
        progress: 100,
        processingTime: endTime - startTime
      }))

    } catch (error) {
      console.error('Demo execution failed:', error)
      setDemoState(prev => ({ ...prev, step: 'error', progress: 0 }))
    }
  }, [demoRequest, generateSchedule, detectBatchConflicts, executeOptimizationRules, validateSchedulingRequest])

  const resetDemo = useCallback(() => {
    setDemoState({
      step: 'setup',
      progress: 0,
      generatedSessions: 0,
      detectedConflicts: 0,
      resolvedConflicts: 0,
      optimizationScore: 0,
      processingTime: 0
    })
  }, [])

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'setup': return <Settings className="h-5 w-5" />
      case 'generating': return <Calendar className="h-5 w-5" />
      case 'detecting': return <AlertTriangle className="h-5 w-5" />
      case 'optimizing': return <Target className="h-5 w-5" />
      case 'complete': return <CheckCircle className="h-5 w-5" />
      default: return <Activity className="h-5 w-5" />
    }
  }

  const getStepLabel = (step: string) => {
    const labels = {
      setup: language === 'ar' ? 'الإعداد والتحقق' : 'Setup & Validation',
      generating: language === 'ar' ? 'إنشاء الجدول' : 'Schedule Generation',
      detecting: language === 'ar' ? 'كشف التضارب' : 'Conflict Detection',
      optimizing: language === 'ar' ? 'تطبيق التحسين' : 'Optimization',
      complete: language === 'ar' ? 'مكتمل' : 'Complete'
    }
    return labels[step as keyof typeof labels] || step
  }

  return (
    <div className={`w-full max-w-7xl mx-auto space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Zap className="h-8 w-8 text-primary" />
            <div>
              <div>
                {language === 'ar' ? 'محرك الجدولة الآلي المتقدم' : 'Advanced Automated Scheduling Engine'}
              </div>
              <div className="text-sm font-normal text-muted-foreground">
                {language === 'ar' 
                  ? 'نظام ذكي لإنشاء الجداول مع خوارزميات التحسين المتقدمة'
                  : 'Intelligent scheduling system with advanced optimization algorithms'
                }
              </div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Demo Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Demo Control Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Demo Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {language === 'ar' ? 'تقدم العرض التوضيحي' : 'Demo Progress'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {getStepIcon(demoState.step)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {getStepLabel(demoState.step)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {demoState.progress}%
                    </span>
                  </div>
                  <Progress value={demoState.progress} className="w-full" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={runCompleteDemo} 
                  disabled={demoState.step !== 'setup' && demoState.step !== 'complete'}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {language === 'ar' ? 'تشغيل العرض' : 'Run Demo'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={resetDemo}
                  disabled={demoState.step === 'setup'}
                >
                  {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Demo Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {language === 'ar' ? 'نتائج العرض التوضيحي' : 'Demo Results'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {demoState.generatedSessions}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'جلسة مُنشأة' : 'Sessions Generated'}
                  </div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {demoState.detectedConflicts}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'تضارب مكتشف' : 'Conflicts Detected'}
                  </div>
                </div>

                <div className="text-2xl font-bold text-green-600">
                  {Math.round(demoState.optimizationScore)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'درجة التحسين' : 'Optimization Score'}
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {(demoState.processingTime / 1000).toFixed(1)}s
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'وقت المعالجة' : 'Processing Time'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Showcase */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? 'المميزات المعروضة' : 'Featured Capabilities'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="generation" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="generation">
                    {language === 'ar' ? 'الإنشاء' : 'Generation'}
                  </TabsTrigger>
                  <TabsTrigger value="optimization">
                    {language === 'ar' ? 'التحسين' : 'Optimization'}
                  </TabsTrigger>
                  <TabsTrigger value="conflicts">
                    {language === 'ar' ? 'التضارب' : 'Conflicts'}
                  </TabsTrigger>
                  <TabsTrigger value="bulk">
                    {language === 'ar' ? 'المعالجة الجماعية' : 'Bulk Ops'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="generation" className="mt-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">
                      {language === 'ar' ? 'إنشاء الجدول الذكي' : 'Intelligent Schedule Generation'}
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• {language === 'ar' ? 'خوارزميات متعددة المعايير' : 'Multi-criteria algorithms'}</li>
                      <li>• {language === 'ar' ? 'قوالب جدولة قابلة للتخصيص' : 'Customizable scheduling templates'}</li>
                      <li>• {language === 'ar' ? 'إدارة توفر المعالجين' : 'Therapist availability management'}</li>
                      <li>• {language === 'ar' ? 'تحسين استخدام الموارد' : 'Resource utilization optimization'}</li>
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="optimization" className="mt-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">
                      {language === 'ar' ? 'تحسين متقدم' : 'Advanced Optimization'}
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• {language === 'ar' ? 'قواعد التحسين القابلة للتكوين' : 'Configurable optimization rules'}</li>
                      <li>• {language === 'ar' ? 'توازن عبء العمل' : 'Workload balancing'}</li>
                      <li>• {language === 'ar' ? 'تقليل الفجوات الزمنية' : 'Gap minimization'}</li>
                      <li>• {language === 'ar' ? 'مطابقة التفضيلات' : 'Preference matching'}</li>
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="conflicts" className="mt-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">
                      {language === 'ar' ? 'إدارة التضارب الذكية' : 'Intelligent Conflict Management'}
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• {language === 'ar' ? 'كشف التضارب في الوقت الفعلي' : 'Real-time conflict detection'}</li>
                      <li>• {language === 'ar' ? 'حلول بديلة تلقائية' : 'Automated alternative solutions'}</li>
                      <li>• {language === 'ar' ? 'تصنيف درجة الخطورة' : 'Severity classification'}</li>
                      <li>• {language === 'ar' ? 'سجل مراجعة شامل' : 'Comprehensive audit trail'}</li>
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="bulk" className="mt-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">
                      {language === 'ar' ? 'العمليات الجماعية' : 'Bulk Operations'}
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• {language === 'ar' ? 'إعادة جدولة جماعية آمنة' : 'Safe bulk rescheduling'}</li>
                      <li>• {language === 'ar' ? 'معالجة على دفعات' : 'Batch processing'}</li>
                      <li>• {language === 'ar' ? 'إمكانية التراجع' : 'Rollback capabilities'}</li>
                      <li>• {language === 'ar' ? 'تتبع التقدم المتقدم' : 'Advanced progress tracking'}</li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* System Stats Sidebar */}
        <div className="space-y-6">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {language === 'ar' ? 'مقاييس الأداء' : 'Performance Metrics'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    {language === 'ar' ? 'الكفاءة:' : 'Efficiency:'}
                  </span>
                  <Badge variant="outline">
                    {Math.round(performanceData.efficiency)}%
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    {language === 'ar' ? 'الإنتاجية:' : 'Throughput:'}
                  </span>
                  <Badge variant="outline">
                    {performanceData.throughput} {language === 'ar' ? 'جلسة/دقيقة' : 'sessions/min'}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    {language === 'ar' ? 'وقت الاستجابة:' : 'Response Time:'}
                  </span>
                  <Badge variant="outline">
                    {Math.round(performanceData.avgResponseTime)}ms
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    {language === 'ar' ? 'معدل الخطأ:' : 'Error Rate:'}
                  </span>
                  <Badge variant={performanceData.errorRate < 5 ? 'default' : 'destructive'}>
                    {performanceData.errorRate.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {language === 'ar' ? 'حالة النظام' : 'System Status'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    {language === 'ar' ? 'القوالب النشطة:' : 'Active Templates:'}
                  </span>
                  <Badge variant="outline">{scheduleTemplates.length}</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    {language === 'ar' ? 'قواعد التحسين:' : 'Optimization Rules:'}
                  </span>
                  <Badge variant="outline">{optimizationRules.length}</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    {language === 'ar' ? 'العمليات النشطة:' : 'Active Operations:'}
                  </span>
                  <Badge variant={activeOperations.length > 0 ? 'default' : 'outline'}>
                    {activeOperations.length}
                  </Badge>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    {language === 'ar' ? 'حالة المحرك:' : 'Engine Status:'}
                  </span>
                  <Badge variant={isGenerating || isOptimizing || isBulkProcessing ? 'default' : 'outline'}>
                    {isGenerating || isOptimizing || isBulkProcessing
                      ? (language === 'ar' ? 'نشط' : 'Active')
                      : (language === 'ar' ? 'جاهز' : 'Ready')
                    }
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                disabled={isGenerating}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'جدولة سريعة' : 'Quick Schedule'}
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                disabled={isOptimizing}
              >
                <Target className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'تحسين فوري' : 'Instant Optimize'}
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                disabled={isBulkProcessing}
              >
                <Users className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'عملية جماعية' : 'Bulk Operation'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Technical Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'المواصفات التقنية' : 'Technical Specifications'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-3">
                {language === 'ar' ? 'متطلبات الأداء' : 'Performance Requirements'}
              </h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• {language === 'ar' ? 'إنشاء 100+ جلسة < 30 ثانية' : 'Generate 100+ sessions <30s'}</li>
                <li>• {language === 'ar' ? 'كشف التضارب < 200ms' : 'Conflict detection <200ms'}</li>
                <li>• {language === 'ar' ? 'معالجة جماعية 1000+ جلسة' : 'Bulk processing 1000+ sessions'}</li>
                <li>• {language === 'ar' ? 'تحديثات فورية' : 'Real-time updates'}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3">
                {language === 'ar' ? 'خوارزميات التحسين' : 'Optimization Algorithms'}
              </h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• {language === 'ar' ? 'متعددة المعايير' : 'Multi-criteria optimization'}</li>
                <li>• {language === 'ar' ? 'تعلم آلي تنبؤي' : 'Predictive machine learning'}</li>
                <li>• {language === 'ar' ? 'قواعد شرطية' : 'Conditional rule engine'}</li>
                <li>• {language === 'ar' ? 'تحسين الموارد' : 'Resource optimization'}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3">
                {language === 'ar' ? 'المميزات المتقدمة' : 'Advanced Features'}
              </h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• {language === 'ar' ? 'دعم ثنائي اللغة كامل' : 'Full bilingual support'}</li>
                <li>• {language === 'ar' ? 'أمان المعاملات' : 'Transaction safety'}</li>
                <li>• {language === 'ar' ? 'إمكانية التراجع' : 'Rollback capabilities'}</li>
                <li>• {language === 'ar' ? 'مراقبة الأداء' : 'Performance monitoring'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}