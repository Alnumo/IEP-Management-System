/**
 * IEP Workflow Status Tracker Component
 * مكون تتبع حالة تدفق العمل للبرنامج التعليمي الفردي
 * 
 * @description Real-time workflow status tracking with visual progress indicators
 * تتبع حالة التدفق في الوقت الفعلي مع مؤشرات التقدم المرئية
 */

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  XCircle,
  ArrowRight,
  User,
  Calendar,
  FileText,
  MessageSquare,
  Activity,
  TrendingUp,
  Timer,
  Target,
  Users,
  BarChart3,
  Zap,
  Pause,
  Play,
  FastForward,
  RotateCcw
} from 'lucide-react'

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type WorkflowStatus = 
  | 'not_started'
  | 'in_progress'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'completed'
  | 'cancelled'

export type WorkflowPhase = 
  | 'draft'
  | 'review'
  | 'approval'
  | 'implementation'
  | 'monitoring'
  | 'evaluation'
  | 'archival'

export interface WorkflowStep {
  id: string
  phase: WorkflowPhase
  name_ar: string
  name_en: string
  description_ar?: string
  description_en?: string
  status: WorkflowStatus
  assignee?: {
    id: string
    name_ar: string
    name_en: string
    role: string
    avatar?: string
  }
  start_date?: string
  due_date?: string
  completion_date?: string
  duration_days: number
  dependencies: string[]
  progress_percentage: number
  is_critical_path: boolean
  is_milestone: boolean
  substeps?: WorkflowSubstep[]
}

export interface WorkflowSubstep {
  id: string
  name_ar: string
  name_en: string
  status: 'pending' | 'completed' | 'skipped'
  completed_by?: string
  completed_at?: string
}

export interface WorkflowMetrics {
  total_steps: number
  completed_steps: number
  pending_steps: number
  overdue_steps: number
  average_completion_time: number
  estimated_completion_date: string
  overall_progress: number
  health_status: 'on_track' | 'at_risk' | 'delayed' | 'blocked'
  bottlenecks: Array<{
    step_id: string
    reason_ar: string
    reason_en: string
    impact: 'low' | 'medium' | 'high'
  }>
}

export interface WorkflowTimeline {
  id: string
  event_type: 'step_started' | 'step_completed' | 'status_changed' | 'comment_added' | 'escalation'
  event_date: string
  step_id?: string
  user_id: string
  user_name_ar: string
  user_name_en: string
  description_ar: string
  description_en: string
  metadata?: Record<string, any>
}

interface IEPWorkflowStatusTrackerProps {
  iepId: string
  language: 'ar' | 'en'
  currentUserId: string
  className?: string
  onStepAction?: (stepId: string, action: string) => void
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getStatusColor = (status: WorkflowStatus): string => {
  switch (status) {
    case 'completed':
    case 'approved':
      return 'text-green-600 bg-green-100'
    case 'in_progress':
      return 'text-blue-600 bg-blue-100'
    case 'pending_approval':
      return 'text-yellow-600 bg-yellow-100'
    case 'rejected':
    case 'cancelled':
      return 'text-red-600 bg-red-100'
    case 'on_hold':
      return 'text-orange-600 bg-orange-100'
    case 'not_started':
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

const getStatusIcon = (status: WorkflowStatus) => {
  switch (status) {
    case 'completed':
    case 'approved':
      return <CheckCircle2 className="h-4 w-4" />
    case 'in_progress':
      return <Clock className="h-4 w-4 animate-pulse" />
    case 'pending_approval':
      return <AlertCircle className="h-4 w-4" />
    case 'rejected':
    case 'cancelled':
      return <XCircle className="h-4 w-4" />
    case 'on_hold':
      return <Pause className="h-4 w-4" />
    case 'not_started':
    default:
      return <Circle className="h-4 w-4" />
  }
}

const getPhaseColor = (phase: WorkflowPhase): string => {
  switch (phase) {
    case 'draft':
      return 'bg-gray-500'
    case 'review':
      return 'bg-blue-500'
    case 'approval':
      return 'bg-yellow-500'
    case 'implementation':
      return 'bg-purple-500'
    case 'monitoring':
      return 'bg-indigo-500'
    case 'evaluation':
      return 'bg-green-500'
    case 'archival':
      return 'bg-gray-400'
    default:
      return 'bg-gray-300'
  }
}

const formatDate = (dateString: string, language: 'ar' | 'en'): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const calculateDaysRemaining = (dueDate: string): number => {
  const now = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IEPWorkflowStatusTracker: React.FC<IEPWorkflowStatusTrackerProps> = ({
  iepId,
  language = 'ar',
  currentUserId,
  className,
  onStepAction
}) => {
  const isRTL = language === 'ar'
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null)
  
  // Sample data - would be fetched from API
  const [workflowSteps] = useState<WorkflowStep[]>([
    {
      id: 'step_1',
      phase: 'draft',
      name_ar: 'إنشاء المسودة الأولية',
      name_en: 'Create Initial Draft',
      description_ar: 'إعداد المسودة الأولية للبرنامج التعليمي الفردي',
      description_en: 'Prepare initial draft of the IEP',
      status: 'completed',
      assignee: {
        id: 'user_1',
        name_ar: 'د. سارة أحمد',
        name_en: 'Dr. Sara Ahmed',
        role: 'coordinator'
      },
      start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      completion_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      duration_days: 2,
      dependencies: [],
      progress_percentage: 100,
      is_critical_path: true,
      is_milestone: false,
      substeps: [
        {
          id: 'substep_1_1',
          name_ar: 'جمع البيانات',
          name_en: 'Gather Data',
          status: 'completed',
          completed_by: 'user_1',
          completed_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'substep_1_2',
          name_ar: 'كتابة الأهداف',
          name_en: 'Write Goals',
          status: 'completed',
          completed_by: 'user_1',
          completed_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    },
    {
      id: 'step_2',
      phase: 'review',
      name_ar: 'مراجعة الفريق',
      name_en: 'Team Review',
      description_ar: 'مراجعة المسودة من قبل أعضاء الفريق',
      description_en: 'Review draft by team members',
      status: 'completed',
      assignee: {
        id: 'user_2',
        name_ar: 'أ. محمد علي',
        name_en: 'Mr. Mohammed Ali',
        role: 'therapist'
      },
      start_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      completion_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      duration_days: 3,
      dependencies: ['step_1'],
      progress_percentage: 100,
      is_critical_path: true,
      is_milestone: false
    },
    {
      id: 'step_3',
      phase: 'approval',
      name_ar: 'موافقة الوالدين',
      name_en: 'Parent Approval',
      description_ar: 'الحصول على موافقة أولياء الأمور',
      description_en: 'Obtain parent/guardian approval',
      status: 'in_progress',
      assignee: {
        id: 'user_3',
        name_ar: 'والد الطالب',
        name_en: 'Student Parent',
        role: 'parent'
      },
      start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      duration_days: 7,
      dependencies: ['step_2'],
      progress_percentage: 60,
      is_critical_path: true,
      is_milestone: true,
      substeps: [
        {
          id: 'substep_3_1',
          name_ar: 'إرسال للمراجعة',
          name_en: 'Send for Review',
          status: 'completed',
          completed_by: 'user_1',
          completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'substep_3_2',
          name_ar: 'مناقشة التفاصيل',
          name_en: 'Discuss Details',
          status: 'completed',
          completed_by: 'user_3',
          completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'substep_3_3',
          name_ar: 'التوقيع النهائي',
          name_en: 'Final Signature',
          status: 'pending'
        }
      ]
    },
    {
      id: 'step_4',
      phase: 'implementation',
      name_ar: 'بدء التنفيذ',
      name_en: 'Begin Implementation',
      description_ar: 'البدء في تنفيذ البرنامج',
      description_en: 'Start implementing the program',
      status: 'not_started',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      duration_days: 5,
      dependencies: ['step_3'],
      progress_percentage: 0,
      is_critical_path: true,
      is_milestone: true
    },
    {
      id: 'step_5',
      phase: 'monitoring',
      name_ar: 'المتابعة المستمرة',
      name_en: 'Ongoing Monitoring',
      description_ar: 'متابعة التقدم والتعديلات',
      description_en: 'Monitor progress and adjustments',
      status: 'not_started',
      duration_days: 30,
      dependencies: ['step_4'],
      progress_percentage: 0,
      is_critical_path: false,
      is_milestone: false
    }
  ])

  const [workflowMetrics] = useState<WorkflowMetrics>({
    total_steps: 5,
    completed_steps: 2,
    pending_steps: 2,
    overdue_steps: 0,
    average_completion_time: 3.5,
    estimated_completion_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    overall_progress: 50,
    health_status: 'on_track',
    bottlenecks: []
  })

  const [workflowTimeline] = useState<WorkflowTimeline[]>([
    {
      id: 'event_1',
      event_type: 'step_completed',
      event_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      step_id: 'step_1',
      user_id: 'user_1',
      user_name_ar: 'د. سارة أحمد',
      user_name_en: 'Dr. Sara Ahmed',
      description_ar: 'أكملت المسودة الأولية',
      description_en: 'Completed initial draft'
    },
    {
      id: 'event_2',
      event_type: 'step_completed',
      event_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      step_id: 'step_2',
      user_id: 'user_2',
      user_name_ar: 'أ. محمد علي',
      user_name_en: 'Mr. Mohammed Ali',
      description_ar: 'أكمل مراجعة الفريق',
      description_en: 'Completed team review'
    },
    {
      id: 'event_3',
      event_type: 'step_started',
      event_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      step_id: 'step_3',
      user_id: 'user_3',
      user_name_ar: 'والد الطالب',
      user_name_en: 'Student Parent',
      description_ar: 'بدأ عملية الموافقة',
      description_en: 'Started approval process'
    }
  ])

  // Calculate workflow phases progress
  const phaseProgress = useMemo(() => {
    const phases: WorkflowPhase[] = ['draft', 'review', 'approval', 'implementation', 'monitoring', 'evaluation', 'archival']
    return phases.map(phase => {
      const phaseSteps = workflowSteps.filter(step => step.phase === phase)
      const completedSteps = phaseSteps.filter(step => step.status === 'completed' || step.status === 'approved')
      return {
        phase,
        total: phaseSteps.length,
        completed: completedSteps.length,
        progress: phaseSteps.length > 0 ? (completedSteps.length / phaseSteps.length) * 100 : 0
      }
    })
  }, [workflowSteps])

  // Get critical path steps
  const criticalPathSteps = workflowSteps.filter(step => step.is_critical_path)
  
  // Get milestone steps
  const milestoneSteps = workflowSteps.filter(step => step.is_milestone)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between",
        isRTL && "flex-row-reverse"
      )}>
        <div>
          <h2 className="text-2xl font-bold">
            {isRTL ? 'متتبع حالة تدفق العمل' : 'Workflow Status Tracker'}
          </h2>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'تتبع التقدم في الوقت الفعلي وإدارة خطوات تدفق العمل'
              : 'Real-time progress tracking and workflow step management'
            }
          </p>
        </div>
        <div className={cn(
          "flex items-center gap-2",
          isRTL && "flex-row-reverse"
        )}>
          <Badge variant={workflowMetrics.health_status === 'on_track' ? 'default' : 'destructive'}>
            {workflowMetrics.health_status === 'on_track' 
              ? (isRTL ? 'على المسار الصحيح' : 'On Track')
              : workflowMetrics.health_status === 'at_risk'
              ? (isRTL ? 'في خطر' : 'At Risk')
              : workflowMetrics.health_status === 'delayed'
              ? (isRTL ? 'متأخر' : 'Delayed')
              : (isRTL ? 'محجوب' : 'Blocked')
            }
          </Badge>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'التقدم الإجمالي' : 'Overall Progress'}
                </p>
                <p className="text-2xl font-bold">{workflowMetrics.overall_progress}%</p>
                <Progress value={workflowMetrics.overall_progress} className="mt-2" />
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'الخطوات المكتملة' : 'Completed Steps'}
                </p>
                <p className="text-2xl font-bold">
                  {workflowMetrics.completed_steps}/{workflowMetrics.total_steps}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'الخطوات قيد التنفيذ' : 'In Progress'}
                </p>
                <p className="text-2xl font-bold">{workflowMetrics.pending_steps}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'التاريخ المتوقع للإكمال' : 'Est. Completion'}
                </p>
                <p className="text-sm font-bold">
                  {formatDate(workflowMetrics.estimated_completion_date, language)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Phases Progress */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? 'تقدم مراحل التدفق' : 'Workflow Phases Progress'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {phaseProgress.map((phase) => (
              <div key={phase.phase} className="space-y-2">
                <div className={cn(
                  "flex items-center justify-between",
                  isRTL && "flex-row-reverse"
                )}>
                  <span className="text-sm font-medium capitalize">
                    {phase.phase}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {phase.completed}/{phase.total}
                  </span>
                </div>
                <div className="relative">
                  <Progress value={phase.progress} className="h-2" />
                  <div 
                    className={cn(
                      "absolute top-0 h-2 rounded-full",
                      getPhaseColor(phase.phase as WorkflowPhase)
                    )}
                    style={{ width: `${phase.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{isRTL ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="steps">{isRTL ? 'الخطوات' : 'Steps'}</TabsTrigger>
          <TabsTrigger value="timeline">{isRTL ? 'الجدول الزمني' : 'Timeline'}</TabsTrigger>
          <TabsTrigger value="critical">{isRTL ? 'المسار الحرج' : 'Critical Path'}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Milestone Steps */}
          <Card>
            <CardHeader>
              <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Target className="h-5 w-5" />
                {isRTL ? 'المعالم الرئيسية' : 'Key Milestones'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {milestoneSteps.map((step) => (
                  <div key={step.id} className={cn(
                    "flex items-center justify-between p-3 border rounded-lg",
                    isRTL && "flex-row-reverse"
                  )}>
                    <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                      {getStatusIcon(step.status)}
                      <div>
                        <p className="font-medium">
                          {language === 'ar' ? step.name_ar : step.name_en}
                        </p>
                        {step.due_date && (
                          <p className="text-sm text-muted-foreground">
                            {isRTL ? 'موعد الاستحقاق:' : 'Due:'} {formatDate(step.due_date, language)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(step.status)}>
                      {step.progress_percentage}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Active Steps */}
          <Card>
            <CardHeader>
              <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Activity className="h-5 w-5" />
                {isRTL ? 'الخطوات النشطة' : 'Active Steps'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflowSteps
                  .filter(step => step.status === 'in_progress')
                  .map((step) => (
                    <div key={step.id} className="space-y-3">
                      <div className={cn(
                        "flex items-center justify-between",
                        isRTL && "flex-row-reverse"
                      )}>
                        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {step.assignee?.name_en.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {language === 'ar' ? step.name_ar : step.name_en}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {language === 'ar' ? step.assignee?.name_ar : step.assignee?.name_en}
                            </p>
                          </div>
                        </div>
                        {step.due_date && (
                          <Badge variant={calculateDaysRemaining(step.due_date) < 0 ? 'destructive' : 'default'}>
                            {calculateDaysRemaining(step.due_date)} {isRTL ? 'يوم' : 'days'}
                          </Badge>
                        )}
                      </div>
                      <Progress value={step.progress_percentage} />
                      {step.substeps && (
                        <div className="pl-4 space-y-2">
                          {step.substeps.map((substep) => (
                            <div key={substep.id} className={cn(
                              "flex items-center gap-2 text-sm",
                              isRTL && "flex-row-reverse"
                            )}>
                              {substep.status === 'completed' ? (
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                              ) : (
                                <Circle className="h-3 w-3 text-gray-400" />
                              )}
                              <span className={substep.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                                {language === 'ar' ? substep.name_ar : substep.name_en}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {workflowSteps.map((step, index) => (
                    <div key={step.id}>
                      <div className={cn(
                        "flex items-start gap-4",
                        isRTL && "flex-row-reverse"
                      )}>
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full border-2",
                            step.status === 'completed' || step.status === 'approved'
                              ? 'border-green-600 bg-green-100'
                              : step.status === 'in_progress'
                              ? 'border-blue-600 bg-blue-100'
                              : 'border-gray-300 bg-gray-50'
                          )}>
                            {getStatusIcon(step.status)}
                          </div>
                          {index < workflowSteps.length - 1 && (
                            <div className={cn(
                              "w-0.5 h-16",
                              step.status === 'completed' || step.status === 'approved'
                                ? 'bg-green-600'
                                : 'bg-gray-300'
                            )} />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className={cn(
                            "flex items-center justify-between",
                            isRTL && "flex-row-reverse"
                          )}>
                            <div>
                              <h4 className="font-medium">
                                {language === 'ar' ? step.name_ar : step.name_en}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {language === 'ar' ? step.description_ar : step.description_en}
                              </p>
                            </div>
                            <div className={cn(
                              "flex items-center gap-2",
                              isRTL && "flex-row-reverse"
                            )}>
                              <Badge variant="outline" className={getStatusColor(step.status)}>
                                {step.status}
                              </Badge>
                              {step.is_critical_path && (
                                <div title={isRTL ? 'مسار حرج' : 'Critical Path'}>
                                  <Zap className="h-4 w-4 text-orange-600" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {step.assignee && (
                            <div className={cn(
                              "flex items-center gap-2 text-sm",
                              isRTL && "flex-row-reverse"
                            )}>
                              <User className="h-3 w-3" />
                              <span>{language === 'ar' ? step.assignee.name_ar : step.assignee.name_en}</span>
                              <Badge variant="secondary" className="text-xs">
                                {step.assignee.role}
                              </Badge>
                            </div>
                          )}
                          
                          <div className={cn(
                            "flex items-center gap-4 text-sm text-muted-foreground",
                            isRTL && "flex-row-reverse"
                          )}>
                            {step.start_date && (
                              <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <Play className="h-3 w-3" />
                                {formatDate(step.start_date, language)}
                              </span>
                            )}
                            {step.due_date && (
                              <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <Timer className="h-3 w-3" />
                                {formatDate(step.due_date, language)}
                              </span>
                            )}
                            {step.completion_date && (
                              <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <CheckCircle2 className="h-3 w-3" />
                                {formatDate(step.completion_date, language)}
                              </span>
                            )}
                          </div>
                          
                          {step.progress_percentage > 0 && step.progress_percentage < 100 && (
                            <Progress value={step.progress_percentage} className="h-1" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? 'سجل الأحداث' : 'Event History'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {workflowTimeline.map((event) => (
                    <div key={event.id} className={cn(
                      "flex items-start gap-4 pb-4 border-b last:border-0",
                      isRTL && "flex-row-reverse"
                    )}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {(language === 'ar' ? event.user_name_ar : event.user_name_en)
                            .split(' ')
                            .map(n => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className={cn(
                          "flex items-center justify-between mb-1",
                          isRTL && "flex-row-reverse"
                        )}>
                          <p className="font-medium text-sm">
                            {language === 'ar' ? event.user_name_ar : event.user_name_en}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(event.event_date, language)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? event.description_ar : event.description_en}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="critical" className="space-y-4">
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertTitle>{isRTL ? 'المسار الحرج' : 'Critical Path'}</AlertTitle>
            <AlertDescription>
              {isRTL 
                ? 'هذه الخطوات حاسمة للإكمال في الوقت المحدد. أي تأخير سيؤثر على الجدول الزمني العام.'
                : 'These steps are critical for on-time completion. Any delay will impact the overall timeline.'
              }
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {criticalPathSteps.map((step, index) => (
                  <div key={step.id} className={cn(
                    "flex items-center gap-4 p-4 border rounded-lg",
                    step.status === 'in_progress' && "border-blue-200 bg-blue-50",
                    isRTL && "flex-row-reverse"
                  )}>
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      "border-2 border-orange-600 bg-orange-100"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {language === 'ar' ? step.name_ar : step.name_en}
                      </h4>
                      <div className={cn(
                        "flex items-center gap-4 mt-1 text-sm text-muted-foreground",
                        isRTL && "flex-row-reverse"
                      )}>
                        <span>{step.duration_days} {isRTL ? 'يوم' : 'days'}</span>
                        {step.due_date && (
                          <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                            <Timer className="h-3 w-3" />
                            {formatDate(step.due_date, language)}
                          </span>
                        )}
                        <Badge className={getStatusColor(step.status)}>
                          {step.progress_percentage}%
                        </Badge>
                      </div>
                    </div>
                    {index < criticalPathSteps.length - 1 && (
                      <ArrowRight className={cn(
                        "h-5 w-5 text-orange-600",
                        isRTL && "rotate-180"
                      )} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default IEPWorkflowStatusTracker