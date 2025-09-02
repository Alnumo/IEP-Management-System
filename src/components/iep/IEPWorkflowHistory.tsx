/**
 * IEP Workflow History Component
 * مكون تاريخ تدفق العمل للبرنامج التعليمي الفردي
 * 
 * @description Comprehensive workflow history tracking with audit trail and version control
 * تتبع شامل لتاريخ تدفق العمل مع مسار المراجعة والتحكم في النسخ
 */

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  History,
  Clock,
  User,
  FileText,
  Edit,
  Eye,
  Download,
  GitBranch,
  GitCommit,
  Activity,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Calendar,
  Filter,
  Search,
  RotateCcw,
  Diff,
  Archive,
  Star,
  BookOpen,
  Shield,
  FileCheck,
  Users,
  Zap
} from 'lucide-react'

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type HistoryEventType = 
  | 'workflow_started'
  | 'step_started'
  | 'step_completed'
  | 'step_paused'
  | 'step_resumed'
  | 'status_changed'
  | 'assignee_changed'
  | 'due_date_changed'
  | 'comment_added'
  | 'document_attached'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_rejected'
  | 'escalation_triggered'
  | 'milestone_reached'
  | 'workflow_completed'
  | 'workflow_cancelled'

export type HistoryEntityType = 'workflow' | 'step' | 'approval' | 'document' | 'comment'

export interface WorkflowHistoryEvent {
  id: string
  event_type: HistoryEventType
  entity_type: HistoryEntityType
  entity_id?: string
  
  // Event details
  title_ar: string
  title_en: string
  description_ar: string
  description_en: string
  
  // User information
  user_id: string
  user_name_ar: string
  user_name_en: string
  user_role: string
  user_avatar?: string
  
  // Timing
  event_timestamp: string
  event_date: string
  duration?: number // in minutes
  
  // Change tracking
  before_value?: any
  after_value?: any
  changes: Array<{
    field: string
    field_name_ar: string
    field_name_en: string
    old_value: any
    new_value: any
    change_type: 'added' | 'modified' | 'removed'
  }>
  
  // Context
  workflow_step_id?: string
  approval_id?: string
  document_id?: string
  comment_id?: string
  
  // Metadata
  ip_address?: string
  user_agent?: string
  location?: string
  device_info?: string
  
  // Audit trail
  is_system_event: boolean
  is_critical_event: boolean
  requires_notification: boolean
  notification_sent: boolean
  
  // Version control
  version_number?: number
  previous_version_id?: string
  
  // Tags and categorization
  tags: string[]
  category: 'workflow' | 'approval' | 'collaboration' | 'system' | 'security'
  
  // Attachments
  attachments: Array<{
    id: string
    filename: string
    file_type: string
    file_size: number
    download_url: string
  }>
  
  // Related events
  related_event_ids: string[]
}

export interface HistoryFilters {
  event_types: HistoryEventType[]
  user_ids: string[]
  date_range: { start: Date; end: Date }
  entity_types: HistoryEntityType[]
  categories: string[]
  is_critical_only: boolean
  search_query: string
}

export interface HistoryStats {
  total_events: number
  events_today: number
  events_this_week: number
  events_this_month: number
  most_active_user: {
    id: string
    name_ar: string
    name_en: string
    event_count: number
  }
  most_common_event_type: HistoryEventType
  average_events_per_day: number
  critical_events_count: number
}

interface IEPWorkflowHistoryProps {
  iepId: string
  workflowId?: string
  language: 'ar' | 'en'
  currentUserId: string
  className?: string
  onEventSelected?: (event: WorkflowHistoryEvent) => void
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getEventTypeIcon = (eventType: HistoryEventType) => {
  switch (eventType) {
    case 'workflow_started':
    case 'workflow_completed':
      return <GitBranch className="h-4 w-4" />
    case 'step_started':
    case 'step_completed':
      return <GitCommit className="h-4 w-4" />
    case 'status_changed':
      return <Activity className="h-4 w-4" />
    case 'assignee_changed':
      return <User className="h-4 w-4" />
    case 'comment_added':
      return <MessageSquare className="h-4 w-4" />
    case 'approval_granted':
      return <CheckCircle2 className="h-4 w-4" />
    case 'approval_rejected':
      return <XCircle className="h-4 w-4" />
    case 'milestone_reached':
      return <Star className="h-4 w-4" />
    case 'escalation_triggered':
      return <AlertTriangle className="h-4 w-4" />
    case 'document_attached':
      return <FileText className="h-4 w-4" />
    default:
      return <History className="h-4 w-4" />
  }
}

const getEventTypeColor = (eventType: HistoryEventType): string => {
  switch (eventType) {
    case 'approval_granted':
    case 'step_completed':
    case 'workflow_completed':
    case 'milestone_reached':
      return 'text-green-600 bg-green-100'
    case 'approval_rejected':
    case 'workflow_cancelled':
    case 'escalation_triggered':
      return 'text-red-600 bg-red-100'
    case 'step_started':
    case 'workflow_started':
      return 'text-blue-600 bg-blue-100'
    case 'status_changed':
    case 'assignee_changed':
      return 'text-yellow-600 bg-yellow-100'
    case 'step_paused':
      return 'text-orange-600 bg-orange-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'workflow':
      return 'bg-blue-500'
    case 'approval':
      return 'bg-green-500'
    case 'collaboration':
      return 'bg-purple-500'
    case 'system':
      return 'bg-gray-500'
    case 'security':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

const formatDateTime = (dateString: string, language: 'ar' | 'en'): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (minutes: number, language: 'ar' | 'en'): string => {
  if (minutes < 60) {
    return `${minutes} ${language === 'ar' ? 'دقيقة' : 'min'}`
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    return `${hours} ${language === 'ar' ? 'ساعة' : 'hr'}`
  } else {
    const days = Math.floor(minutes / 1440)
    return `${days} ${language === 'ar' ? 'يوم' : 'day'}${days > 1 ? 's' : ''}`
  }
}

const getEventTypeLabel = (eventType: HistoryEventType, language: 'ar' | 'en'): string => {
  const labels: Record<HistoryEventType, { ar: string; en: string }> = {
    workflow_started: { ar: 'بدء التدفق', en: 'Workflow Started' },
    step_started: { ar: 'بدء الخطوة', en: 'Step Started' },
    step_completed: { ar: 'إكمال الخطوة', en: 'Step Completed' },
    step_paused: { ar: 'إيقاف الخطوة', en: 'Step Paused' },
    step_resumed: { ar: 'استئناف الخطوة', en: 'Step Resumed' },
    status_changed: { ar: 'تغيير الحالة', en: 'Status Changed' },
    assignee_changed: { ar: 'تغيير المكلف', en: 'Assignee Changed' },
    due_date_changed: { ar: 'تغيير موعد الاستحقاق', en: 'Due Date Changed' },
    comment_added: { ar: 'إضافة تعليق', en: 'Comment Added' },
    document_attached: { ar: 'إرفاق مستند', en: 'Document Attached' },
    approval_requested: { ar: 'طلب موافقة', en: 'Approval Requested' },
    approval_granted: { ar: 'منح الموافقة', en: 'Approval Granted' },
    approval_rejected: { ar: 'رفض الموافقة', en: 'Approval Rejected' },
    escalation_triggered: { ar: 'تصعيد مُثار', en: 'Escalation Triggered' },
    milestone_reached: { ar: 'وصول معلم', en: 'Milestone Reached' },
    workflow_completed: { ar: 'إكمال التدفق', en: 'Workflow Completed' },
    workflow_cancelled: { ar: 'إلغاء التدفق', en: 'Workflow Cancelled' }
  }
  return labels[eventType][language]
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IEPWorkflowHistory: React.FC<IEPWorkflowHistoryProps> = ({
  iepId,
  workflowId,
  language = 'ar',
  currentUserId,
  className,
  onEventSelected
}) => {
  const isRTL = language === 'ar'
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('timeline')
  const [filters, setFilters] = useState<Partial<HistoryFilters>>({
    search_query: '',
    is_critical_only: false,
    event_types: [],
    categories: []
  })
  const [selectedEvent, setSelectedEvent] = useState<WorkflowHistoryEvent | null>(null)
  const [compareEvents, setCompareEvents] = useState<WorkflowHistoryEvent[]>([])
  
  // Sample data - would be fetched from API
  const [historyEvents] = useState<WorkflowHistoryEvent[]>([
    {
      id: 'event_1',
      event_type: 'workflow_started',
      entity_type: 'workflow',
      entity_id: 'workflow_1',
      title_ar: 'بدء تدفق العمل',
      title_en: 'Workflow Started',
      description_ar: 'تم بدء تدفق العمل للبرنامج التعليمي الفردي',
      description_en: 'IEP workflow has been initiated',
      user_id: 'user_1',
      user_name_ar: 'د. سارة أحمد',
      user_name_en: 'Dr. Sara Ahmed',
      user_role: 'coordinator',
      event_timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      event_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toDateString(),
      changes: [],
      is_system_event: false,
      is_critical_event: true,
      requires_notification: true,
      notification_sent: true,
      tags: ['workflow', 'start'],
      category: 'workflow',
      attachments: [],
      related_event_ids: []
    },
    {
      id: 'event_2',
      event_type: 'step_started',
      entity_type: 'step',
      entity_id: 'step_1',
      workflow_step_id: 'step_1',
      title_ar: 'بدء خطوة المسودة',
      title_en: 'Draft Step Started',
      description_ar: 'تم بدء خطوة إنشاء المسودة الأولية',
      description_en: 'Initial draft creation step has started',
      user_id: 'user_1',
      user_name_ar: 'د. سارة أحمد',
      user_name_en: 'Dr. Sara Ahmed',
      user_role: 'coordinator',
      event_timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      event_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toDateString(),
      duration: 120,
      changes: [
        {
          field: 'status',
          field_name_ar: 'الحالة',
          field_name_en: 'Status',
          old_value: 'not_started',
          new_value: 'in_progress',
          change_type: 'modified'
        }
      ],
      is_system_event: false,
      is_critical_event: false,
      requires_notification: false,
      notification_sent: false,
      tags: ['step', 'draft'],
      category: 'workflow',
      attachments: [],
      related_event_ids: ['event_1']
    },
    {
      id: 'event_3',
      event_type: 'comment_added',
      entity_type: 'comment',
      entity_id: 'comment_1',
      workflow_step_id: 'step_1',
      title_ar: 'إضافة تعليق',
      title_en: 'Comment Added',
      description_ar: 'تم إضافة تعليق على خطوة المسودة',
      description_en: 'Comment added to draft step',
      user_id: 'user_2',
      user_name_ar: 'أ. محمد علي',
      user_name_en: 'Mr. Mohammed Ali',
      user_role: 'therapist',
      event_timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      event_date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toDateString(),
      changes: [],
      is_system_event: false,
      is_critical_event: false,
      requires_notification: true,
      notification_sent: true,
      tags: ['comment', 'collaboration'],
      category: 'collaboration',
      attachments: [],
      related_event_ids: ['event_2']
    },
    {
      id: 'event_4',
      event_type: 'step_completed',
      entity_type: 'step',
      entity_id: 'step_1',
      workflow_step_id: 'step_1',
      title_ar: 'إكمال خطوة المسودة',
      title_en: 'Draft Step Completed',
      description_ar: 'تم إكمال خطوة إنشاء المسودة الأولية بنجاح',
      description_en: 'Initial draft creation step completed successfully',
      user_id: 'user_1',
      user_name_ar: 'د. سارة أحمد',
      user_name_en: 'Dr. Sara Ahmed',
      user_role: 'coordinator',
      event_timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      event_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toDateString(),
      duration: 2880, // 48 hours
      changes: [
        {
          field: 'status',
          field_name_ar: 'الحالة',
          field_name_en: 'Status',
          old_value: 'in_progress',
          new_value: 'completed',
          change_type: 'modified'
        },
        {
          field: 'progress_percentage',
          field_name_ar: 'نسبة التقدم',
          field_name_en: 'Progress Percentage',
          old_value: 75,
          new_value: 100,
          change_type: 'modified'
        }
      ],
      is_system_event: false,
      is_critical_event: false,
      requires_notification: true,
      notification_sent: true,
      version_number: 1,
      tags: ['step', 'completed'],
      category: 'workflow',
      attachments: [
        {
          id: 'att_1',
          filename: 'draft_v1.pdf',
          file_type: 'application/pdf',
          file_size: 245760,
          download_url: '/api/files/att_1/download'
        }
      ],
      related_event_ids: ['event_2']
    },
    {
      id: 'event_5',
      event_type: 'approval_requested',
      entity_type: 'approval',
      entity_id: 'approval_1',
      approval_id: 'approval_1',
      title_ar: 'طلب موافقة الوالدين',
      title_en: 'Parent Approval Requested',
      description_ar: 'تم طلب موافقة أولياء الأمور على البرنامج',
      description_en: 'Parent approval requested for the program',
      user_id: 'user_1',
      user_name_ar: 'د. سارة أحمد',
      user_name_en: 'Dr. Sara Ahmed',
      user_role: 'coordinator',
      event_timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      event_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toDateString(),
      changes: [],
      is_system_event: false,
      is_critical_event: true,
      requires_notification: true,
      notification_sent: true,
      tags: ['approval', 'parent'],
      category: 'approval',
      attachments: [],
      related_event_ids: ['event_4']
    },
    {
      id: 'event_6',
      event_type: 'milestone_reached',
      entity_type: 'workflow',
      entity_id: 'workflow_1',
      title_ar: 'وصول معلم مهم',
      title_en: 'Important Milestone Reached',
      description_ar: 'تم الوصول إلى معلم مهم في تدفق العمل',
      description_en: 'An important milestone in the workflow has been reached',
      user_id: 'system',
      user_name_ar: 'النظام',
      user_name_en: 'System',
      user_role: 'system',
      event_timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      event_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toDateString(),
      changes: [],
      is_system_event: true,
      is_critical_event: true,
      requires_notification: true,
      notification_sent: true,
      tags: ['milestone', 'system'],
      category: 'system',
      attachments: [],
      related_event_ids: ['event_5']
    }
  ])

  const [historyStats] = useState<HistoryStats>({
    total_events: historyEvents.length,
    events_today: 0,
    events_this_week: 3,
    events_this_month: historyEvents.length,
    most_active_user: {
      id: 'user_1',
      name_ar: 'د. سارة أحمد',
      name_en: 'Dr. Sara Ahmed',
      event_count: 4
    },
    most_common_event_type: 'step_started',
    average_events_per_day: 0.5,
    critical_events_count: 3
  })

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    return historyEvents.filter(event => {
      const matchesSearch = !filters.search_query || 
        event.title_ar.toLowerCase().includes(filters.search_query.toLowerCase()) ||
        event.title_en.toLowerCase().includes(filters.search_query.toLowerCase()) ||
        event.description_ar.toLowerCase().includes(filters.search_query.toLowerCase()) ||
        event.description_en.toLowerCase().includes(filters.search_query.toLowerCase())

      const matchesCritical = !filters.is_critical_only || event.is_critical_event

      const matchesEventTypes = !filters.event_types?.length || 
        filters.event_types.includes(event.event_type)

      const matchesCategories = !filters.categories?.length || 
        filters.categories.includes(event.category)

      return matchesSearch && matchesCritical && matchesEventTypes && matchesCategories
    }).sort((a, b) => new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime())
  }, [historyEvents, filters])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, WorkflowHistoryEvent[]> = {}
    filteredEvents.forEach(event => {
      const date = event.event_date
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(event)
    })
    return grouped
  }, [filteredEvents])

  const handleEventClick = (event: WorkflowHistoryEvent) => {
    setSelectedEvent(event)
    onEventSelected?.(event)
  }

  const handleCompareToggle = (event: WorkflowHistoryEvent) => {
    setCompareEvents(prev => 
      prev.find(e => e.id === event.id)
        ? prev.filter(e => e.id !== event.id)
        : [...prev, event].slice(-2) // Max 2 events for comparison
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between",
        isRTL && "flex-row-reverse"
      )}>
        <div>
          <h2 className="text-2xl font-bold">
            {isRTL ? 'تاريخ تدفق العمل' : 'Workflow History'}
          </h2>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'سجل شامل لجميع أحداث وتغييرات تدفق العمل'
              : 'Complete audit trail of workflow events and changes'
            }
          </p>
        </div>
        <div className={cn(
          "flex items-center gap-2",
          isRTL && "flex-row-reverse"
        )}>
          {compareEvents.length > 0 && (
            <Badge variant="outline">
              <Diff className="h-3 w-3 mr-1" />
              {compareEvents.length} {isRTL ? 'للمقارنة' : 'to compare'}
            </Badge>
          )}
          <Button variant="outline" size="sm">
            <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? 'تصدير' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'إجمالي الأحداث' : 'Total Events'}
                </p>
                <p className="text-2xl font-bold">{historyStats.total_events}</p>
              </div>
              <History className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'أحداث هذا الأسبوع' : 'This Week'}
                </p>
                <p className="text-2xl font-bold">{historyStats.events_this_week}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'أحداث حرجة' : 'Critical Events'}
                </p>
                <p className="text-2xl font-bold">{historyStats.critical_events_count}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'المستخدم الأكثر نشاطاً' : 'Most Active'}
                </p>
                <p className="text-sm font-bold">
                  {language === 'ar' ? historyStats.most_active_user.name_ar : historyStats.most_active_user.name_en}
                </p>
                <p className="text-xs text-muted-foreground">
                  {historyStats.most_active_user.event_count} {isRTL ? 'حدث' : 'events'}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">{isRTL ? 'الجدول الزمني' : 'Timeline'}</TabsTrigger>
          <TabsTrigger value="changes">{isRTL ? 'التغييرات' : 'Changes'}</TabsTrigger>
          <TabsTrigger value="versions">{isRTL ? 'النسخ' : 'Versions'}</TabsTrigger>
          <TabsTrigger value="analytics">{isRTL ? 'التحليلات' : 'Analytics'}</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">{isRTL ? 'البحث' : 'Search'}</Label>
                <div className="relative">
                  <Search className={cn(
                    "absolute top-3 h-4 w-4 text-muted-foreground",
                    isRTL ? "right-3" : "left-3"
                  )} />
                  <Input
                    id="search"
                    placeholder={isRTL ? 'ابحث في الأحداث...' : 'Search events...'}
                    value={filters.search_query || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search_query: e.target.value }))}
                    className={cn(isRTL ? "pr-9" : "pl-9")}
                  />
                </div>
              </div>

              <div>
                <Label>{isRTL ? 'نوع الحدث' : 'Event Type'}</Label>
                <Select 
                  value={filters.event_types?.[0] || 'all'} 
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    event_types: value === 'all' ? [] : [value as HistoryEventType] 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? 'جميع الأنواع' : 'All Types'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                    <SelectItem value="workflow_started">{getEventTypeLabel('workflow_started', language)}</SelectItem>
                    <SelectItem value="step_completed">{getEventTypeLabel('step_completed', language)}</SelectItem>
                    <SelectItem value="approval_granted">{getEventTypeLabel('approval_granted', language)}</SelectItem>
                    <SelectItem value="comment_added">{getEventTypeLabel('comment_added', language)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{isRTL ? 'الفئة' : 'Category'}</Label>
                <Select 
                  value={filters.categories?.[0] || 'all'} 
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    categories: value === 'all' ? [] : [value] 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? 'جميع الفئات' : 'All Categories'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'جميع الفئات' : 'All Categories'}</SelectItem>
                    <SelectItem value="workflow">{isRTL ? 'تدفق العمل' : 'Workflow'}</SelectItem>
                    <SelectItem value="approval">{isRTL ? 'الموافقات' : 'Approval'}</SelectItem>
                    <SelectItem value="collaboration">{isRTL ? 'التعاون' : 'Collaboration'}</SelectItem>
                    <SelectItem value="system">{isRTL ? 'النظام' : 'System'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant={filters.is_critical_only ? 'default' : 'outline'}
                  size="sm" 
                  className="w-full"
                  onClick={() => setFilters(prev => ({ ...prev, is_critical_only: !prev.is_critical_only }))}
                >
                  <Shield className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  {isRTL ? 'حرجة فقط' : 'Critical Only'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="timeline" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-6">
              {Object.entries(eventsByDate).map(([date, events]) => (
                <div key={date} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium bg-muted px-2 py-1 rounded">
                      {formatDateTime(events[0].event_timestamp, language).split(',')[0]}
                    </div>
                    <Separator className="flex-1" />
                  </div>

                  <div className="space-y-3">
                    {events.map((event, index) => (
                      <div key={event.id} className={cn(
                        "flex items-start gap-4 p-4 border rounded-lg transition-colors",
                        "hover:bg-muted/50 cursor-pointer",
                        selectedEvent?.id === event.id && "border-blue-200 bg-blue-50",
                        event.is_critical_event && "border-red-200 bg-red-50",
                        isRTL && "flex-row-reverse"
                      )} onClick={() => handleEventClick(event)}>
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full border-2",
                          getEventTypeColor(event.event_type)
                        )}>
                          {getEventTypeIcon(event.event_type)}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className={cn(
                            "flex items-start justify-between",
                            isRTL && "flex-row-reverse"
                          )}>
                            <div>
                              <h4 className="font-medium">
                                {language === 'ar' ? event.title_ar : event.title_en}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {language === 'ar' ? event.description_ar : event.description_en}
                              </p>
                            </div>
                            <div className={cn(
                              "flex items-center gap-2",
                              isRTL && "flex-row-reverse"
                            )}>
                              <Badge variant="outline" className={getCategoryColor(event.category)}>
                                {event.category}
                              </Badge>
                              {event.is_critical_event && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {isRTL ? 'حرج' : 'Critical'}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className={cn(
                            "flex items-center gap-4 text-sm text-muted-foreground",
                            isRTL && "flex-row-reverse"
                          )}>
                            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {(language === 'ar' ? event.user_name_ar : event.user_name_en)
                                    .split(' ')
                                    .map(n => n[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span>{language === 'ar' ? event.user_name_ar : event.user_name_en}</span>
                            </div>

                            <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                              <Clock className="h-3 w-3" />
                              {formatDateTime(event.event_timestamp, language)}
                            </span>

                            {event.duration && (
                              <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <Timer className="h-3 w-3" />
                                {formatDuration(event.duration, language)}
                              </span>
                            )}

                            {event.attachments.length > 0 && (
                              <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <FileText className="h-3 w-3" />
                                {event.attachments.length} {isRTL ? 'مرفق' : 'attachments'}
                              </span>
                            )}
                          </div>

                          {event.changes.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">{isRTL ? 'التغييرات:' : 'Changes:'}</span>
                              {' '}
                              {event.changes.map(change => 
                                `${language === 'ar' ? change.field_name_ar : change.field_name_en}`
                              ).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? 'سجل التغييرات' : 'Change Log'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isRTL ? "text-right" : ""}>{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead className={isRTL ? "text-right" : ""}>{isRTL ? 'المستخدم' : 'User'}</TableHead>
                    <TableHead className={isRTL ? "text-right" : ""}>{isRTL ? 'الحقل' : 'Field'}</TableHead>
                    <TableHead className={isRTL ? "text-right" : ""}>{isRTL ? 'القيمة السابقة' : 'Before'}</TableHead>
                    <TableHead className={isRTL ? "text-right" : ""}>{isRTL ? 'القيمة الجديدة' : 'After'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents
                    .filter(event => event.changes.length > 0)
                    .flatMap(event => 
                      event.changes.map(change => ({
                        ...change,
                        event_timestamp: event.event_timestamp,
                        user_name_ar: event.user_name_ar,
                        user_name_en: event.user_name_en
                      }))
                    )
                    .map((change, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">
                          {formatDateTime(change.event_timestamp, language)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {language === 'ar' ? change.user_name_ar : change.user_name_en}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {language === 'ar' ? change.field_name_ar : change.field_name_en}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {String(change.old_value)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {String(change.new_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{isRTL ? 'إدارة النسخ قيد التطوير' : 'Version management coming soon'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{isRTL ? 'تحليلات تدفق العمل قيد التطوير' : 'Workflow analytics coming soon'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent && (language === 'ar' ? selectedEvent.title_ar : selectedEvent.title_en)}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && (language === 'ar' ? selectedEvent.description_ar : selectedEvent.description_en)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Event metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>{isRTL ? 'المستخدم:' : 'User:'}</strong> {' '}
                    {language === 'ar' ? selectedEvent.user_name_ar : selectedEvent.user_name_en}
                  </div>
                  <div>
                    <strong>{isRTL ? 'التاريخ:' : 'Date:'}</strong> {' '}
                    {formatDateTime(selectedEvent.event_timestamp, language)}
                  </div>
                  <div>
                    <strong>{isRTL ? 'النوع:' : 'Type:'}</strong> {' '}
                    {getEventTypeLabel(selectedEvent.event_type, language)}
                  </div>
                  <div>
                    <strong>{isRTL ? 'الفئة:' : 'Category:'}</strong> {' '}
                    <Badge variant="outline" className={getCategoryColor(selectedEvent.category)}>
                      {selectedEvent.category}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Changes */}
                {selectedEvent.changes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">{isRTL ? 'التغييرات' : 'Changes'}</h4>
                    <div className="space-y-2">
                      {selectedEvent.changes.map((change, index) => (
                        <div key={index} className="text-sm p-2 border rounded">
                          <div className="font-medium">
                            {language === 'ar' ? change.field_name_ar : change.field_name_en}
                          </div>
                          <div className="text-muted-foreground">
                            {String(change.old_value)} → {String(change.new_value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {selectedEvent.attachments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">{isRTL ? 'المرفقات' : 'Attachments'}</h4>
                    <div className="space-y-2">
                      {selectedEvent.attachments.map((attachment) => (
                        <div key={attachment.id} className={cn(
                          "flex items-center justify-between p-2 border rounded",
                          isRTL && "flex-row-reverse"
                        )}>
                          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{attachment.filename}</span>
                          </div>
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              {isRTL ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default IEPWorkflowHistory