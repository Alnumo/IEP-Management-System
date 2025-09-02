/**
 * IEP Collaboration Hub Component
 * مركز التعاون للبرنامج التعليمي الفردي
 * 
 * @description Real-time collaboration system with conflict resolution, live editing, and presence awareness
 * نظام التعاون في الوقت الفعلي مع حل النزاعات والتحرير المباشر ومعرفة الحضور
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  Users,
  MessageSquare,
  Edit3,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  GitBranch,
  GitMerge,
  History,
  Undo,
  Redo,
  Save,
  Share,
  Lock,
  Unlock,
  UserCheck,
  Activity,
  Zap,
  Bell,
  Settings,
  MoreHorizontal,
  Send,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  FileText,
  Target,
  Calendar,
  User,
  Phone,
  Video,
  MessageCircle,
  Lightbulb,
  Flag,
  Archive
} from 'lucide-react'

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type CollaborationMode = 
  | 'real_time'
  | 'asynchronous'
  | 'hybrid'

export type ConflictType = 
  | 'edit_conflict'
  | 'permission_conflict'
  | 'version_conflict'
  | 'data_conflict'

export type ConflictResolutionStrategy = 
  | 'accept_mine'
  | 'accept_theirs'
  | 'merge_changes'
  | 'create_version'
  | 'manual_review'

export type PresenceStatus = 
  | 'online'
  | 'offline'
  | 'away'
  | 'busy'
  | 'editing'

export type ActivityType = 
  | 'joined'
  | 'left'
  | 'edit_started'
  | 'edit_completed'
  | 'comment_added'
  | 'approval_given'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'version_created'
  | 'document_saved'

export interface CollaborationSession {
  id: string
  iep_id: string
  
  // Session Details
  session_name_ar: string
  session_name_en: string
  collaboration_mode: CollaborationMode
  
  // Session Status
  is_active: boolean
  started_at: string
  ends_at?: string
  last_activity: string
  
  // Participants
  participants: CollaborationParticipant[]
  max_participants: number
  allow_anonymous: boolean
  
  // Permissions
  editing_permissions: {
    simultaneous_editing: boolean
    section_locking: boolean
    approval_required: boolean
    version_control: boolean
  }
  
  // Conflict Resolution
  conflict_resolution: {
    auto_merge: boolean
    manual_review_required: boolean
    preferred_strategy: ConflictResolutionStrategy
  }
  
  // Session Settings
  settings: {
    auto_save_interval: number
    presence_timeout: number
    notification_preferences: string[]
    backup_frequency: number
  }
  
  // Metadata
  created_by: string
  created_at: string
  updated_at: string
}

export interface CollaborationParticipant {
  id: string
  session_id: string
  
  // User Information
  user_id: string
  name_ar: string
  name_en: string
  email: string
  avatar?: string
  role: string
  
  // Presence Information
  presence_status: PresenceStatus
  last_seen: string
  current_section?: string
  cursor_position?: {
    section: string
    position: number
  }
  
  // Permissions
  permissions: {
    can_edit: boolean
    can_comment: boolean
    can_approve: boolean
    can_invite: boolean
    can_resolve_conflicts: boolean
  }
  
  // Activity Tracking
  session_duration: number
  edits_made: number
  comments_added: number
  conflicts_resolved: number
  
  // Connection Information
  connection_id: string
  ip_address: string
  user_agent: string
  
  // Metadata
  joined_at: string
  updated_at: string
}

export interface EditConflict {
  id: string
  session_id: string
  
  // Conflict Information
  conflict_type: ConflictType
  section_id: string
  field_name: string
  
  // Conflicting Changes
  original_value: any
  user_a_value: any
  user_b_value: any
  user_a_id: string
  user_b_id: string
  
  // Resolution
  resolution_strategy?: ConflictResolutionStrategy
  resolved_value?: any
  resolved_by?: string
  resolved_at?: string
  
  // Metadata
  detected_at: string
  status: 'active' | 'resolved' | 'ignored'
}

export interface CollaborationActivity {
  id: string
  session_id: string
  
  // Activity Information
  activity_type: ActivityType
  description_ar: string
  description_en: string
  user_id: string
  user_name_ar: string
  user_name_en: string
  
  // Activity Data
  section_affected?: string
  field_affected?: string
  old_value?: any
  new_value?: any
  
  // Context
  context_data: Record<string, any>
  
  // Metadata
  timestamp: string
  client_timestamp: string
}

export interface LiveComment {
  id: string
  session_id: string
  
  // Comment Details
  content_ar: string
  content_en: string
  section_id: string
  position?: number
  
  // Author Information
  author_id: string
  author_name_ar: string
  author_name_en: string
  author_avatar?: string
  
  // Comment Status
  is_resolved: boolean
  resolved_by?: string
  resolved_at?: string
  
  // Threading
  parent_comment_id?: string
  reply_count: number
  
  // Reactions
  reactions: Array<{
    user_id: string
    emoji: string
    timestamp: string
  }>
  
  // Metadata
  created_at: string
  updated_at: string
  edited_at?: string
}

interface IEPCollaborationHubProps {
  iepId: string
  sessionId?: string
  language: 'ar' | 'en'
  currentUserId: string
  userRole: string
  className?: string
  onSessionUpdate?: (session: CollaborationSession) => void
  onConflictDetected?: (conflict: EditConflict) => void
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getPresenceColor = (status: PresenceStatus): string => {
  switch (status) {
    case 'online':
      return 'bg-green-500'
    case 'editing':
      return 'bg-blue-500'
    case 'busy':
      return 'bg-red-500'
    case 'away':
      return 'bg-yellow-500'
    case 'offline':
    default:
      return 'bg-gray-400'
  }
}

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'joined':
      return <UserCheck className="h-4 w-4 text-green-600" />
    case 'left':
      return <User className="h-4 w-4 text-gray-600" />
    case 'edit_started':
      return <Edit3 className="h-4 w-4 text-blue-600" />
    case 'edit_completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'comment_added':
      return <MessageCircle className="h-4 w-4 text-purple-600" />
    case 'approval_given':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'conflict_detected':
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    case 'conflict_resolved':
      return <GitMerge className="h-4 w-4 text-green-600" />
    case 'version_created':
      return <GitBranch className="h-4 w-4 text-blue-600" />
    case 'document_saved':
      return <Save className="h-4 w-4 text-gray-600" />
    default:
      return <Activity className="h-4 w-4 text-gray-600" />
  }
}

const formatRelativeTime = (timestamp: string, language: 'ar' | 'en'): string => {
  const now = new Date()
  const time = new Date(timestamp)
  const diffSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
  
  if (diffSeconds < 60) {
    return language === 'ar' ? 'الآن' : 'now'
  } else if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60)
    return language === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`
  } else if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600)
    return language === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`
  } else {
    const days = Math.floor(diffSeconds / 86400)
    return language === 'ar' ? `منذ ${days} يوم` : `${days}d ago`
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IEPCollaborationHub: React.FC<IEPCollaborationHubProps> = ({
  iepId,
  sessionId,
  language = 'ar',
  currentUserId,
  userRole,
  className,
  onSessionUpdate,
  onConflictDetected
}) => {
  const isRTL = language === 'ar'
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [currentSection, setCurrentSection] = useState<string>('')
  const [editingMode, setEditingMode] = useState(false)
  const [conflictDialog, setConflictDialog] = useState<EditConflict | null>(null)
  const [inviteDialog, setInviteDialog] = useState(false)
  const [settingsDialog, setSettingsDialog] = useState(false)
  
  // Real-time data
  const [session, setSession] = useState<CollaborationSession>({
    id: sessionId || 'demo_session',
    iep_id: iepId,
    session_name_ar: 'جلسة تعاون البرنامج التعليمي الفردي',
    session_name_en: 'IEP Collaboration Session',
    collaboration_mode: 'real_time',
    is_active: true,
    started_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    participants: [],
    max_participants: 10,
    allow_anonymous: false,
    editing_permissions: {
      simultaneous_editing: true,
      section_locking: true,
      approval_required: false,
      version_control: true
    },
    conflict_resolution: {
      auto_merge: false,
      manual_review_required: true,
      preferred_strategy: 'manual_review'
    },
    settings: {
      auto_save_interval: 30,
      presence_timeout: 300,
      notification_preferences: ['edit_conflicts', 'new_comments', 'user_joins'],
      backup_frequency: 600
    },
    created_by: currentUserId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  const [participants, setParticipants] = useState<CollaborationParticipant[]>([
    {
      id: '1',
      session_id: session.id,
      user_id: currentUserId,
      name_ar: 'د. أحمد محمد',
      name_en: 'Dr. Ahmed Mohammed',
      email: 'ahmed.mohammed@school.edu.sa',
      role: 'IEP Coordinator',
      presence_status: 'online',
      last_seen: new Date().toISOString(),
      current_section: 'goals',
      permissions: {
        can_edit: true,
        can_comment: true,
        can_approve: true,
        can_invite: true,
        can_resolve_conflicts: true
      },
      session_duration: 1800,
      edits_made: 5,
      comments_added: 2,
      conflicts_resolved: 1,
      connection_id: 'conn_1',
      ip_address: '192.168.1.100',
      user_agent: 'Chrome/120.0',
      joined_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      session_id: session.id,
      user_id: 'user_2',
      name_ar: 'أ. فاطمة أحمد',
      name_en: 'Ms. Fatima Ahmed',
      email: 'fatima.ahmed@school.edu.sa',
      role: 'Special Education Teacher',
      presence_status: 'editing',
      last_seen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      current_section: 'services',
      permissions: {
        can_edit: true,
        can_comment: true,
        can_approve: false,
        can_invite: false,
        can_resolve_conflicts: false
      },
      session_duration: 1200,
      edits_made: 3,
      comments_added: 4,
      conflicts_resolved: 0,
      connection_id: 'conn_2',
      ip_address: '192.168.1.101',
      user_agent: 'Safari/17.0',
      joined_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      session_id: session.id,
      user_id: 'user_3',
      name_ar: 'والدة الطالب',
      name_en: 'Student\'s Mother',
      email: 'parent@email.com',
      role: 'Parent/Guardian',
      presence_status: 'away',
      last_seen: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      permissions: {
        can_edit: false,
        can_comment: true,
        can_approve: false,
        can_invite: false,
        can_resolve_conflicts: false
      },
      session_duration: 600,
      edits_made: 0,
      comments_added: 1,
      conflicts_resolved: 0,
      connection_id: 'conn_3',
      ip_address: '192.168.1.102',
      user_agent: 'Mobile Safari',
      joined_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    }
  ])

  const [conflicts, setConflicts] = useState<EditConflict[]>([
    {
      id: '1',
      session_id: session.id,
      conflict_type: 'edit_conflict',
      section_id: 'goal_1',
      field_name: 'short_term_objective',
      original_value: 'Student will improve communication skills',
      user_a_value: 'Student will improve verbal communication skills',
      user_b_value: 'Student will enhance communication abilities',
      user_a_id: currentUserId,
      user_b_id: 'user_2',
      detected_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: 'active'
    }
  ])

  const [activities, setActivities] = useState<CollaborationActivity[]>([
    {
      id: '1',
      session_id: session.id,
      activity_type: 'edit_started',
      description_ar: 'بدأ تحرير أهداف التواصل',
      description_en: 'Started editing communication goals',
      user_id: currentUserId,
      user_name_ar: 'د. أحمد محمد',
      user_name_en: 'Dr. Ahmed Mohammed',
      section_affected: 'goals',
      field_affected: 'communication_goals',
      context_data: {},
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      client_timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      session_id: session.id,
      activity_type: 'comment_added',
      description_ar: 'أضافت تعليقاً على خدمات العلاج',
      description_en: 'Added comment on therapy services',
      user_id: 'user_2',
      user_name_ar: 'أ. فاطمة أحمد',
      user_name_en: 'Ms. Fatima Ahmed',
      section_affected: 'services',
      context_data: {},
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      client_timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      session_id: session.id,
      activity_type: 'conflict_detected',
      description_ar: 'تم اكتشاف تعارض في تحرير الأهداف',
      description_en: 'Conflict detected in goal editing',
      user_id: 'system',
      user_name_ar: 'النظام',
      user_name_en: 'System',
      section_affected: 'goals',
      context_data: { conflict_id: '1' },
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      client_timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    }
  ])

  const [comments, setComments] = useState<LiveComment[]>([
    {
      id: '1',
      session_id: session.id,
      content_ar: 'أعتقد أن هذا الهدف يحتاج إلى مزيد من التحديد',
      content_en: 'I think this goal needs to be more specific',
      section_id: 'goal_1',
      author_id: 'user_2',
      author_name_ar: 'أ. فاطمة أحمد',
      author_name_en: 'Ms. Fatima Ahmed',
      is_resolved: false,
      reply_count: 0,
      reactions: [],
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    }
  ])

  // WebSocket simulation
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Simulate WebSocket connection
    setConnectionStatus('connecting')
    
    setTimeout(() => {
      setConnectionStatus('connected')
      setIsConnected(true)
    }, 1000)

    // Simulate real-time updates
    const interval = setInterval(() => {
      // Update presence status
      setParticipants(prev => 
        prev.map(p => ({
          ...p,
          last_seen: p.user_id === currentUserId ? new Date().toISOString() : p.last_seen
        }))
      )
    }, 10000)

    return () => {
      clearInterval(interval)
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [currentUserId])

  // Event handlers
  const handleStartEditing = (sectionId: string) => {
    setCurrentSection(sectionId)
    setEditingMode(true)
    
    // Broadcast editing status
    const activity: CollaborationActivity = {
      id: `activity_${Date.now()}`,
      session_id: session.id,
      activity_type: 'edit_started',
      description_ar: `بدأ تحرير ${sectionId}`,
      description_en: `Started editing ${sectionId}`,
      user_id: currentUserId,
      user_name_ar: 'المستخدم الحالي',
      user_name_en: 'Current User',
      section_affected: sectionId,
      context_data: {},
      timestamp: new Date().toISOString(),
      client_timestamp: new Date().toISOString()
    }
    
    setActivities(prev => [activity, ...prev])
  }

  const handleStopEditing = () => {
    setEditingMode(false)
    
    if (currentSection) {
      const activity: CollaborationActivity = {
        id: `activity_${Date.now()}`,
        session_id: session.id,
        activity_type: 'edit_completed',
        description_ar: `اكتمل تحرير ${currentSection}`,
        description_en: `Completed editing ${currentSection}`,
        user_id: currentUserId,
        user_name_ar: 'المستخدم الحالي',
        user_name_en: 'Current User',
        section_affected: currentSection,
        context_data: {},
        timestamp: new Date().toISOString(),
        client_timestamp: new Date().toISOString()
      }
      
      setActivities(prev => [activity, ...prev])
    }
    
    setCurrentSection('')
  }

  const handleResolveConflict = (conflict: EditConflict, strategy: ConflictResolutionStrategy) => {
    const resolvedConflict = {
      ...conflict,
      resolution_strategy: strategy,
      resolved_by: currentUserId,
      resolved_at: new Date().toISOString(),
      status: 'resolved' as const
    }
    
    setConflicts(prev => 
      prev.map(c => c.id === conflict.id ? resolvedConflict : c)
    )
    
    const activity: CollaborationActivity = {
      id: `activity_${Date.now()}`,
      session_id: session.id,
      activity_type: 'conflict_resolved',
      description_ar: 'تم حل التعارض في التحرير',
      description_en: 'Edit conflict resolved',
      user_id: currentUserId,
      user_name_ar: 'المستخدم الحالي',
      user_name_en: 'Current User',
      section_affected: conflict.section_id,
      context_data: { 
        conflict_id: conflict.id, 
        strategy: strategy 
      },
      timestamp: new Date().toISOString(),
      client_timestamp: new Date().toISOString()
    }
    
    setActivities(prev => [activity, ...prev])
    setConflictDialog(null)
  }

  const handleAddComment = (sectionId: string, content: string) => {
    const newComment: LiveComment = {
      id: `comment_${Date.now()}`,
      session_id: session.id,
      content_ar: content,
      content_en: content,
      section_id: sectionId,
      author_id: currentUserId,
      author_name_ar: 'المستخدم الحالي',
      author_name_en: 'Current User',
      is_resolved: false,
      reply_count: 0,
      reactions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    setComments(prev => [newComment, ...prev])
    
    const activity: CollaborationActivity = {
      id: `activity_${Date.now()}`,
      session_id: session.id,
      activity_type: 'comment_added',
      description_ar: 'أضاف تعليقاً',
      description_en: 'Added comment',
      user_id: currentUserId,
      user_name_ar: 'المستخدم الحالي',
      user_name_en: 'Current User',
      section_affected: sectionId,
      context_data: { comment_id: newComment.id },
      timestamp: new Date().toISOString(),
      client_timestamp: new Date().toISOString()
    }
    
    setActivities(prev => [activity, ...prev])
  }

  const handleInviteUser = (email: string, permissions: any) => {
    // Implementation for inviting user
    console.log('Inviting user:', email, permissions)
    setInviteDialog(false)
  }

  const activeConflicts = conflicts.filter(c => c.status === 'active')
  const onlineParticipants = participants.filter(p => 
    ['online', 'editing'].includes(p.presence_status)
  )

  return (
    <TooltipProvider>
      <div className={cn("space-y-6", className)}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between",
          isRTL && "flex-row-reverse"
        )}>
          <div>
            <div className={cn(
              "flex items-center gap-3",
              isRTL && "flex-row-reverse"
            )}>
              <h2 className="text-2xl font-bold">
                {isRTL ? 'مركز التعاون المباشر' : 'Real-Time Collaboration'}
              </h2>
              <div className={cn(
                "flex items-center gap-2",
                isRTL && "flex-row-reverse"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500' :
                  'bg-red-500'
                )} />
                <span className="text-sm text-muted-foreground">
                  {connectionStatus === 'connected' ? (isRTL ? 'متصل' : 'Connected') :
                   connectionStatus === 'connecting' ? (isRTL ? 'جاري الاتصال' : 'Connecting') :
                   (isRTL ? 'غير متصل' : 'Disconnected')}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground">
              {isRTL 
                ? 'تعاون مباشر مع حل النزاعات التلقائي وتتبع الحضور'
                : 'Real-time collaboration with conflict resolution and presence awareness'
              }
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-2",
            isRTL && "flex-row-reverse"
          )}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInviteDialog(true)}
            >
              <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? 'دعوة مشارك' : 'Invite'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsDialog(true)}
            >
              <Settings className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? 'الإعدادات' : 'Settings'}
            </Button>
          </div>
        </div>

        {/* Active Conflicts Alert */}
        {activeConflicts.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-red-800">
              {isRTL ? 'تعارضات نشطة في التحرير' : 'Active Edit Conflicts'}
            </AlertTitle>
            <AlertDescription className="text-red-700">
              {isRTL 
                ? `توجد ${activeConflicts.length} تعارضات تحتاج إلى حل`
                : `${activeConflicts.length} conflicts need resolution`
              }
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => setConflictDialog(activeConflicts[0])}
              >
                {isRTL ? 'حل التعارضات' : 'Resolve Conflicts'}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Collaboration Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'المشاركون النشطون' : 'Active Participants'}
                  </p>
                  <p className="text-2xl font-bold">{onlineParticipants.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'التعديلات اليوم' : 'Edits Today'}
                  </p>
                  <p className="text-2xl font-bold">
                    {participants.reduce((sum, p) => sum + p.edits_made, 0)}
                  </p>
                </div>
                <Edit3 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'التعارضات النشطة' : 'Active Conflicts'}
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {activeConflicts.length}
                  </p>
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
                    {isRTL ? 'التعليقات' : 'Comments'}
                  </p>
                  <p className="text-2xl font-bold">{comments.length}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              {isRTL ? 'نظرة عامة' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="participants">
              {isRTL ? 'المشاركون' : 'Participants'}
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {participants.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="conflicts">
              {isRTL ? 'التعارضات' : 'Conflicts'}
              {activeConflicts.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {activeConflicts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity">
              {isRTL ? 'النشاط' : 'Activity'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Live Editing Status */}
            <Card>
              <CardHeader>
                <CardTitle className={cn(
                  "flex items-center gap-2",
                  isRTL && "flex-row-reverse"
                )}>
                  <Edit3 className="h-5 w-5" />
                  {isRTL ? 'حالة التحرير المباشر' : 'Live Editing Status'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['goals', 'services', 'accommodations', 'assessments'].map((section) => {
                    const editingParticipant = participants.find(p => 
                      p.current_section === section && p.presence_status === 'editing'
                    )
                    
                    return (
                      <div
                        key={section}
                        className={cn(
                          "flex items-center justify-between p-3 border rounded-lg",
                          editingParticipant ? 'border-blue-200 bg-blue-50' : ''
                        )}
                      >
                        <div className={cn(
                          "flex items-center gap-3",
                          isRTL && "flex-row-reverse"
                        )}>
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            editingParticipant ? 'bg-blue-500' : 'bg-gray-300'
                          )} />
                          <span className="font-medium">
                            {isRTL 
                              ? section === 'goals' ? 'الأهداف'
                                : section === 'services' ? 'الخدمات'
                                : section === 'accommodations' ? 'التسهيلات'
                                : 'التقييمات'
                              : section.charAt(0).toUpperCase() + section.slice(1)
                            }
                          </span>
                          {editingParticipant && (
                            <Badge variant="outline" className="text-blue-600">
                              {isRTL ? 'قيد التحرير' : 'Being Edited'}
                            </Badge>
                          )}
                        </div>
                        
                        {editingParticipant ? (
                          <div className={cn(
                            "flex items-center gap-2",
                            isRTL && "flex-row-reverse"
                          )}>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {(language === 'ar' ? editingParticipant.name_ar : editingParticipant.name_en)
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .toUpperCase()
                                }
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground">
                              {language === 'ar' ? editingParticipant.name_ar : editingParticipant.name_en}
                            </span>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartEditing(section)}
                            disabled={!isConnected}
                          >
                            <Edit3 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                            {isRTL ? 'بدء التحرير' : 'Start Editing'}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Comments */}
            <Card>
              <CardHeader>
                <CardTitle className={cn(
                  "flex items-center gap-2",
                  isRTL && "flex-row-reverse"
                )}>
                  <MessageCircle className="h-5 w-5" />
                  {isRTL ? 'التعليقات الأخيرة' : 'Recent Comments'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comments.slice(0, 3).map((comment) => (
                    <div key={comment.id} className={cn(
                      "flex items-start gap-3",
                      isRTL && "flex-row-reverse"
                    )}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {(language === 'ar' ? comment.author_name_ar : comment.author_name_en)
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className={cn(
                          "flex items-center gap-2 mb-1",
                          isRTL && "flex-row-reverse"
                        )}>
                          <span className="font-medium text-sm">
                            {language === 'ar' ? comment.author_name_ar : comment.author_name_en}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(comment.created_at, language)}
                          </span>
                        </div>
                        <p className="text-sm">
                          {language === 'ar' ? comment.content_ar : comment.content_en}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {comments.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {isRTL ? 'لا توجد تعليقات بعد' : 'No comments yet'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'المشاركون في الجلسة' : 'Session Participants'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {participants.map((participant) => (
                    <div key={participant.id} className={cn(
                      "flex items-center justify-between p-4 border rounded-lg",
                      isRTL && "flex-row-reverse"
                    )}>
                      <div className={cn(
                        "flex items-center gap-3",
                        isRTL && "flex-row-reverse"
                      )}>
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {(language === 'ar' ? participant.name_ar : participant.name_en)
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                              }
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                            getPresenceColor(participant.presence_status)
                          )} />
                        </div>
                        <div>
                          <p className="font-medium">
                            {language === 'ar' ? participant.name_ar : participant.name_en}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {participant.role}
                          </p>
                          <div className={cn(
                            "flex items-center gap-2 mt-1",
                            isRTL && "flex-row-reverse"
                          )}>
                            <span className="text-xs text-muted-foreground">
                              {isRTL ? 'آخر ظهور:' : 'Last seen:'} {formatRelativeTime(participant.last_seen, language)}
                            </span>
                            {participant.current_section && (
                              <Badge variant="outline" className="text-xs">
                                {isRTL ? 'في:' : 'In:'} {participant.current_section}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className={cn(
                        "flex items-center gap-2",
                        isRTL && "flex-row-reverse"
                      )}>
                        <div className="text-center">
                          <p className="text-sm font-medium">{participant.edits_made}</p>
                          <p className="text-xs text-muted-foreground">
                            {isRTL ? 'تعديلات' : 'Edits'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">{participant.comments_added}</p>
                          <p className="text-xs text-muted-foreground">
                            {isRTL ? 'تعليقات' : 'Comments'}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              {isRTL ? 'إرسال رسالة' : 'Send Message'}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Phone className="h-4 w-4 mr-2" />
                              {isRTL ? 'مكالمة' : 'Call'}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Video className="h-4 w-4 mr-2" />
                              {isRTL ? 'مكالمة فيديو' : 'Video Call'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'تعارضات التحرير' : 'Edit Conflicts'}</CardTitle>
                <CardDescription>
                  {isRTL 
                    ? 'حل التعارضات في التحرير المتزامن'
                    : 'Resolve conflicts from simultaneous editing'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className={cn(
                    "p-4 border rounded-lg mb-4",
                    conflict.status === 'active' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                  )}>
                    <div className={cn(
                      "flex items-center justify-between mb-3",
                      isRTL && "flex-row-reverse"
                    )}>
                      <div className={cn(
                        "flex items-center gap-2",
                        isRTL && "flex-row-reverse"
                      )}>
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-medium">
                          {isRTL ? 'تعارض في' : 'Conflict in'} {conflict.section_id}
                        </span>
                        <Badge className={
                          conflict.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }>
                          {isRTL 
                            ? conflict.status === 'active' ? 'نشط' : 'محلول'
                            : conflict.status === 'active' ? 'Active' : 'Resolved'
                          }
                        </Badge>
                      </div>
                      
                      {conflict.status === 'active' && (
                        <Button
                          size="sm"
                          onClick={() => setConflictDialog(conflict)}
                        >
                          {isRTL ? 'حل التعارض' : 'Resolve Conflict'}
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-50 rounded border">
                          <p className="font-medium text-blue-800 mb-1">
                            {isRTL ? 'النسخة الأولى' : 'Version A'}
                          </p>
                          <p className="text-sm">{String(conflict.user_a_value)}</p>
                        </div>
                        <div className="p-3 bg-orange-50 rounded border">
                          <p className="font-medium text-orange-800 mb-1">
                            {isRTL ? 'النسخة الثانية' : 'Version B'}
                          </p>
                          <p className="text-sm">{String(conflict.user_b_value)}</p>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded border">
                        <p className="font-medium text-gray-800 mb-1">
                          {isRTL ? 'القيمة الأصلية' : 'Original Value'}
                        </p>
                        <p className="text-sm">{String(conflict.original_value)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {conflicts.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <p className="text-muted-foreground">
                      {isRTL ? 'لا توجد تعارضات' : 'No conflicts detected'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'سجل النشاط' : 'Activity Log'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className={cn(
                        "flex items-start gap-3",
                        isRTL && "flex-row-reverse"
                      )}>
                        <div className="mt-1">
                          {getActivityIcon(activity.activity_type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">
                              {language === 'ar' ? activity.user_name_ar : activity.user_name_en}
                            </span>
                            {' '}
                            {language === 'ar' ? activity.description_ar : activity.description_en}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(activity.timestamp, language)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Conflict Resolution Dialog */}
        <Dialog open={!!conflictDialog} onOpenChange={(open) => !open && setConflictDialog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {isRTL ? 'حل تعارض التحرير' : 'Resolve Edit Conflict'}
              </DialogTitle>
              <DialogDescription>
                {isRTL 
                  ? 'اختر كيفية حل التعارض في التحرير'
                  : 'Choose how to resolve this editing conflict'
                }
              </DialogDescription>
            </DialogHeader>
            
            {conflictDialog && (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-red-50">
                  <h3 className="font-medium mb-2">
                    {isRTL ? 'تفاصيل التعارض' : 'Conflict Details'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'الحقل:' : 'Field:'} {conflictDialog.field_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'القسم:' : 'Section:'} {conflictDialog.section_id}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">
                      {isRTL ? 'خيارات الحل' : 'Resolution Options'}
                    </h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleResolveConflict(conflictDialog, 'accept_mine')}
                      >
                        <CheckCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                        {isRTL ? 'قبول نسختي' : 'Accept My Version'}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleResolveConflict(conflictDialog, 'accept_theirs')}
                      >
                        <CheckCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                        {isRTL ? 'قبول نسختهم' : 'Accept Their Version'}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleResolveConflict(conflictDialog, 'merge_changes')}
                      >
                        <GitMerge className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                        {isRTL ? 'دمج التغييرات' : 'Merge Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleResolveConflict(conflictDialog, 'create_version')}
                      >
                        <GitBranch className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                        {isRTL ? 'إنشاء إصدار جديد' : 'Create New Version'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setConflictDialog(null)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invite User Dialog */}
        <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isRTL ? 'دعوة مشارك جديد' : 'Invite New Participant'}</DialogTitle>
              <DialogDescription>
                {isRTL 
                  ? 'أرسل دعوة للانضمام إلى جلسة التعاون'
                  : 'Send an invitation to join the collaboration session'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
                <Input
                  id="invite-email"
                  placeholder={isRTL ? 'أدخل البريد الإلكتروني' : 'Enter email address'}
                />
              </div>
              
              <div>
                <Label>{isRTL ? 'الصلاحيات' : 'Permissions'}</Label>
                <div className="space-y-2">
                  {[
                    { key: 'can_edit', label: isRTL ? 'التحرير' : 'Edit' },
                    { key: 'can_comment', label: isRTL ? 'التعليق' : 'Comment' },
                    { key: 'can_approve', label: isRTL ? 'الموافقة' : 'Approve' }
                  ].map((permission) => (
                    <div key={permission.key} className={cn(
                      "flex items-center space-x-2",
                      isRTL && "flex-row-reverse space-x-reverse"
                    )}>
                      <Checkbox id={permission.key} />
                      <Label htmlFor={permission.key}>{permission.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialog(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={() => handleInviteUser('', {})}>
                <Send className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                {isRTL ? 'إرسال الدعوة' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

export default IEPCollaborationHub