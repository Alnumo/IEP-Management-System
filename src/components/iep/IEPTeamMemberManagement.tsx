/**
 * IEP Team Member Management Component
 * مكون إدارة أعضاء فريق البرنامج التعليمي الفردي
 * 
 * @description Comprehensive team member management with roles, permissions, and approval workflows
 * إدارة شاملة لأعضاء الفريق مع الأدوار والصلاحيات وتدفقات الموافقة
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
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  Users,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  Settings,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  UserCheck,
  AlertTriangle,
  Calendar,
  FileText,
  Bell,
  MessageCircle,
  Send,
  Star,
  Activity,
  Search,
  Filter,
  Download
} from 'lucide-react'

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type TeamMemberRole = 
  | 'coordinator' 
  | 'case_manager'
  | 'special_education_teacher'
  | 'general_education_teacher'
  | 'speech_therapist'
  | 'occupational_therapist'
  | 'physical_therapist'
  | 'behavioral_therapist'
  | 'psychologist'
  | 'social_worker'
  | 'parent_guardian'
  | 'student'
  | 'administrator'
  | 'consultant'
  | 'observer'

export type MembershipStatus = 
  | 'active'
  | 'pending'
  | 'inactive'
  | 'suspended'

export type PermissionLevel = 
  | 'view_only'
  | 'comment_only'
  | 'edit_limited'
  | 'edit_full'
  | 'approve'
  | 'admin'

export interface IEPTeamMember {
  id: string
  iep_id: string
  user_id: string
  
  // Basic Information
  name_ar: string
  name_en: string
  email: string
  phone?: string
  title_ar?: string
  title_en?: string
  organization?: string
  department?: string
  
  // Team Role Information
  team_role: TeamMemberRole
  membership_status: MembershipStatus
  permission_level: PermissionLevel
  is_required_member: boolean
  can_approve_iep: boolean
  
  // Specific Permissions
  permissions: {
    view_iep: boolean
    edit_goals: boolean
    edit_services: boolean
    edit_accommodations: boolean
    approve_changes: boolean
    add_comments: boolean
    schedule_meetings: boolean
    invite_members: boolean
    generate_reports: boolean
    access_confidential_data: boolean
  }
  
  // Contact and Availability
  preferred_contact_method: 'email' | 'phone' | 'sms' | 'in_app'
  availability: {
    days_available: number[] // 0=Sunday, 1=Monday, etc.
    hours_available: {
      start: string
      end: string
    }
    timezone: string
  }
  notification_preferences: {
    meeting_reminders: boolean
    deadline_alerts: boolean
    approval_requests: boolean
    progress_updates: boolean
    emergency_notifications: boolean
  }
  
  // Workflow Status
  last_active_date?: string
  pending_approvals: number
  completed_tasks: number
  meeting_attendance_rate: number
  response_time_hours: number
  
  // Assignment Details
  assigned_date: string
  assigned_by: string
  role_description_ar?: string
  role_description_en?: string
  responsibilities: string[]
  
  // Collaboration Notes
  notes_ar?: string
  notes_en?: string
  collaboration_style?: string
  preferred_meeting_format: 'in_person' | 'virtual' | 'hybrid' | 'no_preference'
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  updated_by?: string
}

export interface TeamCollaborationActivity {
  id: string
  iep_id: string
  team_member_id: string
  activity_type: 'comment' | 'approval' | 'edit' | 'meeting' | 'task_completion' | 'status_change'
  description_ar: string
  description_en: string
  activity_data: Record<string, any>
  timestamp: string
}

interface IEPTeamMemberManagementProps {
  iepId: string
  language: 'ar' | 'en'
  currentUserId: string
  userRole: TeamMemberRole
  className?: string
  onTeamUpdated?: () => void
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getRoleLabel = (role: TeamMemberRole, language: 'ar' | 'en'): string => {
  const labels: Record<TeamMemberRole, { ar: string; en: string }> = {
    coordinator: { ar: 'منسق البرنامج', en: 'IEP Coordinator' },
    case_manager: { ar: 'مدير الحالة', en: 'Case Manager' },
    special_education_teacher: { ar: 'معلم تربية خاصة', en: 'Special Education Teacher' },
    general_education_teacher: { ar: 'معلم تعليم عام', en: 'General Education Teacher' },
    speech_therapist: { ar: 'أخصائي تخاطب', en: 'Speech Therapist' },
    occupational_therapist: { ar: 'أخصائي علاج وظيفي', en: 'Occupational Therapist' },
    physical_therapist: { ar: 'أخصائي علاج طبيعي', en: 'Physical Therapist' },
    behavioral_therapist: { ar: 'أخصائي سلوكي', en: 'Behavioral Therapist' },
    psychologist: { ar: 'أخصائي نفسي', en: 'Psychologist' },
    social_worker: { ar: 'أخصائي اجتماعي', en: 'Social Worker' },
    parent_guardian: { ar: 'ولي الأمر', en: 'Parent/Guardian' },
    student: { ar: 'الطالب', en: 'Student' },
    administrator: { ar: 'إداري', en: 'Administrator' },
    consultant: { ar: 'استشاري', en: 'Consultant' },
    observer: { ar: 'مراقب', en: 'Observer' }
  }
  return labels[role][language]
}

const getPermissionLevelColor = (level: PermissionLevel): string => {
  switch (level) {
    case 'admin':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'approve':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'edit_full':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'edit_limited':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'comment_only':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'view_only':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusColor = (status: MembershipStatus): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'inactive':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'suspended':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const formatLastActive = (dateString?: string, language: 'ar' | 'en'): string => {
  if (!dateString) return language === 'ar' ? 'لم يسجل دخول' : 'Never active'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  
  if (diffHours < 1) {
    return language === 'ar' ? 'نشط الآن' : 'Active now'
  } else if (diffHours < 24) {
    return language === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`
  } else {
    const diffDays = Math.floor(diffHours / 24)
    return language === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IEPTeamMemberManagement: React.FC<IEPTeamMemberManagementProps> = ({
  iepId,
  language = 'ar',
  currentUserId,
  userRole,
  className,
  onTeamUpdated
}) => {
  const isRTL = language === 'ar'
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('members')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MembershipStatus>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | TeamMemberRole>('all')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [addMemberDialog, setAddMemberDialog] = useState(false)
  const [editMemberDialog, setEditMemberDialog] = useState<IEPTeamMember | null>(null)
  const [inviteDialog, setInviteDialog] = useState(false)
  
  // Sample data - would be fetched from API
  const [teamMembers] = useState<IEPTeamMember[]>([
    {
      id: '1',
      iep_id: iepId,
      user_id: 'user_1',
      name_ar: 'د. أحمد محمد',
      name_en: 'Dr. Ahmed Mohammed',
      email: 'ahmed.mohammed@school.edu.sa',
      phone: '+966501234567',
      title_ar: 'منسق البرنامج التعليمي الفردي',
      title_en: 'IEP Coordinator',
      organization: 'مركز أركان للنمو',
      department: 'قسم التربية الخاصة',
      team_role: 'coordinator',
      membership_status: 'active',
      permission_level: 'admin',
      is_required_member: true,
      can_approve_iep: true,
      permissions: {
        view_iep: true,
        edit_goals: true,
        edit_services: true,
        edit_accommodations: true,
        approve_changes: true,
        add_comments: true,
        schedule_meetings: true,
        invite_members: true,
        generate_reports: true,
        access_confidential_data: true
      },
      preferred_contact_method: 'email',
      availability: {
        days_available: [1, 2, 3, 4, 5],
        hours_available: { start: '08:00', end: '16:00' },
        timezone: 'Asia/Riyadh'
      },
      notification_preferences: {
        meeting_reminders: true,
        deadline_alerts: true,
        approval_requests: true,
        progress_updates: true,
        emergency_notifications: true
      },
      last_active_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      pending_approvals: 3,
      completed_tasks: 12,
      meeting_attendance_rate: 95,
      response_time_hours: 2,
      assigned_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      assigned_by: 'admin_user',
      role_description_ar: 'مسؤول عن تنسيق وإدارة البرنامج التعليمي الفردي',
      role_description_en: 'Responsible for coordinating and managing the Individual Education Program',
      responsibilities: [
        'Coordinate IEP meetings',
        'Monitor goal progress',
        'Ensure compliance',
        'Communicate with team members'
      ],
      preferred_meeting_format: 'hybrid',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'admin_user'
    },
    {
      id: '2',
      iep_id: iepId,
      user_id: 'user_2',
      name_ar: 'أ. فاطمة أحمد',
      name_en: 'Ms. Fatima Ahmed',
      email: 'fatima.ahmed@school.edu.sa',
      phone: '+966507654321',
      title_ar: 'معلمة تربية خاصة',
      title_en: 'Special Education Teacher',
      organization: 'مركز أركان للنمو',
      department: 'قسم التربية الخاصة',
      team_role: 'special_education_teacher',
      membership_status: 'active',
      permission_level: 'edit_full',
      is_required_member: true,
      can_approve_iep: false,
      permissions: {
        view_iep: true,
        edit_goals: true,
        edit_services: true,
        edit_accommodations: true,
        approve_changes: false,
        add_comments: true,
        schedule_meetings: false,
        invite_members: false,
        generate_reports: true,
        access_confidential_data: true
      },
      preferred_contact_method: 'email',
      availability: {
        days_available: [1, 2, 3, 4, 5],
        hours_available: { start: '07:30', end: '15:30' },
        timezone: 'Asia/Riyadh'
      },
      notification_preferences: {
        meeting_reminders: true,
        deadline_alerts: true,
        approval_requests: false,
        progress_updates: true,
        emergency_notifications: true
      },
      last_active_date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      pending_approvals: 0,
      completed_tasks: 8,
      meeting_attendance_rate: 90,
      response_time_hours: 4,
      assigned_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      assigned_by: 'coordinator_user',
      role_description_ar: 'معلمة متخصصة في تعليم ذوي الاحتياجات الخاصة',
      role_description_en: 'Specialized teacher for students with special needs',
      responsibilities: [
        'Implement IEP goals',
        'Track student progress',
        'Adapt teaching methods',
        'Document observations'
      ],
      preferred_meeting_format: 'in_person',
      created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: 'coordinator_user'
    },
    {
      id: '3',
      iep_id: iepId,
      user_id: 'user_3',
      name_ar: 'والدة الطالب',
      name_en: 'Student\'s Mother',
      email: 'parent@email.com',
      phone: '+966509876543',
      title_ar: 'ولية الأمر',
      title_en: 'Parent/Guardian',
      team_role: 'parent_guardian',
      membership_status: 'active',
      permission_level: 'view_only',
      is_required_member: true,
      can_approve_iep: false,
      permissions: {
        view_iep: true,
        edit_goals: false,
        edit_services: false,
        edit_accommodations: false,
        approve_changes: false,
        add_comments: true,
        schedule_meetings: false,
        invite_members: false,
        generate_reports: false,
        access_confidential_data: false
      },
      preferred_contact_method: 'phone',
      availability: {
        days_available: [0, 1, 2, 3, 4, 5, 6],
        hours_available: { start: '18:00', end: '21:00' },
        timezone: 'Asia/Riyadh'
      },
      notification_preferences: {
        meeting_reminders: true,
        deadline_alerts: false,
        approval_requests: false,
        progress_updates: true,
        emergency_notifications: true
      },
      last_active_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      pending_approvals: 0,
      completed_tasks: 2,
      meeting_attendance_rate: 85,
      response_time_hours: 24,
      assigned_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      assigned_by: 'coordinator_user',
      role_description_ar: 'ولي أمر الطالب وعضو مهم في الفريق',
      role_description_en: 'Student\'s parent and important team member',
      responsibilities: [
        'Provide input on goals',
        'Share home observations',
        'Support implementation',
        'Attend meetings'
      ],
      preferred_meeting_format: 'virtual',
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: 'coordinator_user'
    }
  ])
  
  const [recentActivity] = useState<TeamCollaborationActivity[]>([
    {
      id: '1',
      iep_id: iepId,
      team_member_id: '1',
      activity_type: 'approval',
      description_ar: 'تمت الموافقة على تحديث أهداف التواصل',
      description_en: 'Approved communication goals update',
      activity_data: { goal_id: 'goal_1', action: 'approved' },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      iep_id: iepId,
      team_member_id: '2',
      activity_type: 'comment',
      description_ar: 'أضافت تعليقاً على تقدم الطالب في المهارات الحركية',
      description_en: 'Added comment on student progress in motor skills',
      activity_data: { section: 'motor_skills', comment_id: 'comment_1' },
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      iep_id: iepId,
      team_member_id: '3',
      activity_type: 'meeting',
      description_ar: 'حضرت اجتماع مراجعة البرنامج الشهري',
      description_en: 'Attended monthly program review meeting',
      activity_data: { meeting_id: 'meeting_1', attendance: 'present' },
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }
  ])

  // Filtered and searched team members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter(member => {
      const matchesSearch = searchQuery === '' || 
        member.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || member.membership_status === statusFilter
      const matchesRole = roleFilter === 'all' || member.team_role === roleFilter
      
      return matchesSearch && matchesStatus && matchesRole
    })
  }, [teamMembers, searchQuery, statusFilter, roleFilter])

  // Event handlers
  const handleMemberSelect = (memberId: string, selected: boolean) => {
    if (selected) {
      setSelectedMembers(prev => [...prev, memberId])
    } else {
      setSelectedMembers(prev => prev.filter(id => id !== memberId))
    }
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedMembers(filteredMembers.map(m => m.id))
    } else {
      setSelectedMembers([])
    }
  }

  const handleInviteMember = (email: string, role: TeamMemberRole) => {
    // Implementation for inviting new member
    console.log('Inviting member:', email, role)
    setInviteDialog(false)
    onTeamUpdated?.()
  }

  const handleUpdatePermissions = (memberId: string, permissions: Partial<IEPTeamMember['permissions']>) => {
    // Implementation for updating member permissions
    console.log('Updating permissions for member:', memberId, permissions)
    onTeamUpdated?.()
  }

  const handleRemoveMember = (memberId: string) => {
    // Implementation for removing member
    console.log('Removing member:', memberId)
    onTeamUpdated?.()
  }

  // Check if current user can perform admin actions
  const canManageTeam = ['coordinator', 'administrator'].includes(userRole)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between",
        isRTL && "flex-row-reverse"
      )}>
        <div>
          <h2 className="text-2xl font-bold">
            {isRTL ? 'إدارة أعضاء الفريق' : 'Team Member Management'}
          </h2>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'إدارة أعضاء فريق البرنامج التعليمي الفردي والصلاحيات'
              : 'Manage IEP team members, roles, and permissions'
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
            disabled={!canManageTeam}
          >
            <UserPlus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? 'دعوة عضو' : 'Invite Member'}
          </Button>
          <Button
            size="sm"
            onClick={() => setAddMemberDialog(true)}
            disabled={!canManageTeam}
          >
            <Users className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? 'إضافة عضو' : 'Add Member'}
          </Button>
        </div>
      </div>

      {/* Team Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'إجمالي الأعضاء' : 'Total Members'}
                </p>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'الأعضاء النشطون' : 'Active Members'}
                </p>
                <p className="text-2xl font-bold">
                  {teamMembers.filter(m => m.membership_status === 'active').length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'الموافقات المعلقة' : 'Pending Approvals'}
                </p>
                <p className="text-2xl font-bold">
                  {teamMembers.reduce((sum, m) => sum + m.pending_approvals, 0)}
                </p>
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
                  {isRTL ? 'معدل الحضور' : 'Attendance Rate'}
                </p>
                <p className="text-2xl font-bold">
                  {Math.round(teamMembers.reduce((sum, m) => sum + m.meeting_attendance_rate, 0) / teamMembers.length)}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">
            {isRTL ? 'الأعضاء' : 'Members'}
          </TabsTrigger>
          <TabsTrigger value="permissions">
            {isRTL ? 'الصلاحيات' : 'Permissions'}
          </TabsTrigger>
          <TabsTrigger value="activity">
            {isRTL ? 'النشاط' : 'Activity'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">{isRTL ? 'البحث' : 'Search'}</Label>
                  <div className="relative">
                    <Search className={cn(
                      "absolute top-3 h-4 w-4 text-muted-foreground",
                      isRTL ? "right-3" : "left-3"
                    )} />
                    <Input
                      id="search"
                      placeholder={isRTL ? 'ابحث في الأعضاء...' : 'Search members...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(isRTL ? "pr-9" : "pl-9")}
                    />
                  </div>
                </div>

                <div>
                  <Label>{isRTL ? 'الحالة' : 'Status'}</Label>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                      <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
                      <SelectItem value="pending">{isRTL ? 'معلق' : 'Pending'}</SelectItem>
                      <SelectItem value="inactive">{isRTL ? 'غير نشط' : 'Inactive'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{isRTL ? 'الدور' : 'Role'}</Label>
                  <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'جميع الأدوار' : 'All Roles'}</SelectItem>
                      <SelectItem value="coordinator">{getRoleLabel('coordinator', language)}</SelectItem>
                      <SelectItem value="special_education_teacher">{getRoleLabel('special_education_teacher', language)}</SelectItem>
                      <SelectItem value="parent_guardian">{getRoleLabel('parent_guardian', language)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                    {isRTL ? 'تصدير' : 'Export'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members Table */}
          <Card>
            <CardHeader>
              <CardTitle className={cn(
                "flex items-center justify-between",
                isRTL && "flex-row-reverse"
              )}>
                <span>{isRTL ? 'أعضاء الفريق' : 'Team Members'}</span>
                {selectedMembers.length > 0 && (
                  <Badge variant="secondary">
                    {selectedMembers.length} {isRTL ? 'محدد' : 'selected'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedMembers.length === filteredMembers.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : ""}>
                      {isRTL ? 'العضو' : 'Member'}
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : ""}>
                      {isRTL ? 'الدور' : 'Role'}
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : ""}>
                      {isRTL ? 'مستوى الصلاحية' : 'Permission Level'}
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : ""}>
                      {isRTL ? 'الحالة' : 'Status'}
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : ""}>
                      {isRTL ? 'آخر نشاط' : 'Last Active'}
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : ""}>
                      {isRTL ? 'الإجراءات' : 'Actions'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={(checked) => handleMemberSelect(member.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "flex items-center gap-3",
                          isRTL && "flex-row-reverse"
                        )}>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`/api/avatar/${member.user_id}`} />
                            <AvatarFallback>
                              {(language === 'ar' ? member.name_ar : member.name_en)
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                              }
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {language === 'ar' ? member.name_ar : member.name_en}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.email}
                            </p>
                            {member.title_ar && member.title_en && (
                              <p className="text-xs text-muted-foreground">
                                {language === 'ar' ? member.title_ar : member.title_en}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {getRoleLabel(member.team_role, language)}
                          </Badge>
                          {member.is_required_member && (
                            <Star className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getPermissionLevelColor(member.permission_level)}
                        >
                          {isRTL 
                            ? member.permission_level === 'admin' ? 'مدير'
                              : member.permission_level === 'approve' ? 'موافقة'
                              : member.permission_level === 'edit_full' ? 'تحرير كامل'
                              : member.permission_level === 'edit_limited' ? 'تحرير محدود'
                              : member.permission_level === 'comment_only' ? 'تعليق فقط'
                              : 'مشاهدة فقط'
                            : member.permission_level
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getStatusColor(member.membership_status)}
                        >
                          {isRTL 
                            ? member.membership_status === 'active' ? 'نشط'
                              : member.membership_status === 'pending' ? 'معلق'
                              : member.membership_status === 'inactive' ? 'غير نشط'
                              : 'موقوف'
                            : member.membership_status
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastActive(member.last_active_date, language)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>
                              {isRTL ? 'الإجراءات' : 'Actions'}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditMemberDialog(member)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {isRTL ? 'عرض التفاصيل' : 'View Details'}
                            </DropdownMenuItem>
                            {canManageTeam && (
                              <>
                                <DropdownMenuItem onClick={() => setEditMemberDialog(member)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {isRTL ? 'تحرير' : 'Edit'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => console.log('Send message')}>
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  {isRTL ? 'إرسال رسالة' : 'Send Message'}
                                </DropdownMenuItem>
                                {!member.is_required_member && (
                                  <DropdownMenuItem 
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {isRTL ? 'إزالة' : 'Remove'}
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? 'مصفوفة الصلاحيات' : 'Permission Matrix'}</CardTitle>
              <CardDescription>
                {isRTL 
                  ? 'إدارة صلاحيات أعضاء الفريق للوصول إلى مكونات البرنامج المختلفة'
                  : 'Manage team member permissions for accessing different IEP components'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className={cn(
                        "flex items-center justify-between mb-4",
                        isRTL && "flex-row-reverse"
                      )}>
                        <div className={cn(
                          "flex items-center gap-3",
                          isRTL && "flex-row-reverse"
                        )}>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {(language === 'ar' ? member.name_ar : member.name_en)
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                              }
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {language === 'ar' ? member.name_ar : member.name_en}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getRoleLabel(member.team_role, language)}
                            </p>
                          </div>
                        </div>
                        <Badge className={getPermissionLevelColor(member.permission_level)}>
                          {member.permission_level}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(member.permissions).map(([permission, allowed]) => (
                          <div key={permission} className={cn(
                            "flex items-center gap-2",
                            isRTL && "flex-row-reverse"
                          )}>
                            <Checkbox
                              id={`${member.id}-${permission}`}
                              checked={allowed}
                              onCheckedChange={(checked) => {
                                if (canManageTeam) {
                                  handleUpdatePermissions(member.id, {
                                    [permission]: checked
                                  })
                                }
                              }}
                              disabled={!canManageTeam}
                            />
                            <Label 
                              htmlFor={`${member.id}-${permission}`}
                              className="text-sm cursor-pointer"
                            >
                              {isRTL 
                                ? permission === 'view_iep' ? 'مشاهدة البرنامج'
                                  : permission === 'edit_goals' ? 'تحرير الأهداف'
                                  : permission === 'edit_services' ? 'تحرير الخدمات'
                                  : permission === 'edit_accommodations' ? 'تحرير التسهيلات'
                                  : permission === 'approve_changes' ? 'الموافقة على التغييرات'
                                  : permission === 'add_comments' ? 'إضافة تعليقات'
                                  : permission === 'schedule_meetings' ? 'جدولة اجتماعات'
                                  : permission === 'invite_members' ? 'دعوة أعضاء'
                                  : permission === 'generate_reports' ? 'إنشاء تقارير'
                                  : 'الوصول للبيانات السرية'
                                : permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                              }
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? 'النشاط الحديث' : 'Recent Activity'}</CardTitle>
              <CardDescription>
                {isRTL 
                  ? 'آخر الأنشطة والإجراءات من أعضاء الفريق'
                  : 'Latest activities and actions from team members'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const member = teamMembers.find(m => m.id === activity.team_member_id)
                  return (
                    <div key={activity.id} className={cn(
                      "flex items-start gap-4",
                      isRTL && "flex-row-reverse"
                    )}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {member ? (language === 'ar' ? member.name_ar : member.name_en)
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase() : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">
                            {member ? (language === 'ar' ? member.name_ar : member.name_en) : 'Unknown'}
                          </span>
                          {' '}
                          {language === 'ar' ? activity.description_ar : activity.description_en}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString(
                            language === 'ar' ? 'ar-SA' : 'en-US',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }
                          )}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {activity.activity_type === 'approval' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {activity.activity_type === 'comment' && (
                          <MessageCircle className="h-4 w-4 text-blue-600" />
                        )}
                        {activity.activity_type === 'meeting' && (
                          <Calendar className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Member Dialog */}
      <Dialog open={!!editMemberDialog} onOpenChange={(open) => !open && setEditMemberDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'تفاصيل العضو' : 'Member Details'}
            </DialogTitle>
            <DialogDescription>
              {isRTL 
                ? 'عرض وتحرير معلومات عضو الفريق'
                : 'View and edit team member information'
              }
            </DialogDescription>
          </DialogHeader>
          
          {editMemberDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{isRTL ? 'الاسم بالعربية' : 'Name (Arabic)'}</Label>
                  <Input 
                    value={editMemberDialog.name_ar} 
                    readOnly={!canManageTeam}
                  />
                </div>
                <div>
                  <Label>{isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'}</Label>
                  <Input 
                    value={editMemberDialog.name_en} 
                    readOnly={!canManageTeam}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
                  <Input 
                    value={editMemberDialog.email} 
                    readOnly={!canManageTeam}
                  />
                </div>
                <div>
                  <Label>{isRTL ? 'الهاتف' : 'Phone'}</Label>
                  <Input 
                    value={editMemberDialog.phone || ''} 
                    readOnly={!canManageTeam}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{isRTL ? 'الدور' : 'Role'}</Label>
                  <Select 
                    value={editMemberDialog.team_role} 
                    disabled={!canManageTeam}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coordinator">{getRoleLabel('coordinator', language)}</SelectItem>
                      <SelectItem value="special_education_teacher">{getRoleLabel('special_education_teacher', language)}</SelectItem>
                      <SelectItem value="parent_guardian">{getRoleLabel('parent_guardian', language)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{isRTL ? 'مستوى الصلاحية' : 'Permission Level'}</Label>
                  <Select 
                    value={editMemberDialog.permission_level} 
                    disabled={!canManageTeam}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{isRTL ? 'مدير' : 'Admin'}</SelectItem>
                      <SelectItem value="approve">{isRTL ? 'موافقة' : 'Approve'}</SelectItem>
                      <SelectItem value="edit_full">{isRTL ? 'تحرير كامل' : 'Full Edit'}</SelectItem>
                      <SelectItem value="edit_limited">{isRTL ? 'تحرير محدود' : 'Limited Edit'}</SelectItem>
                      <SelectItem value="comment_only">{isRTL ? 'تعليق فقط' : 'Comment Only'}</SelectItem>
                      <SelectItem value="view_only">{isRTL ? 'مشاهدة فقط' : 'View Only'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{isRTL ? 'المسؤوليات' : 'Responsibilities'}</Label>
                <Textarea 
                  value={editMemberDialog.responsibilities.join('\n')}
                  readOnly={!canManageTeam}
                  rows={4}
                />
              </div>
            </div>
          )}

          {canManageTeam && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditMemberDialog(null)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={() => {
                // Save changes
                setEditMemberDialog(null)
                onTeamUpdated?.()
              }}>
                {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'دعوة عضو جديد' : 'Invite New Member'}</DialogTitle>
            <DialogDescription>
              {isRTL 
                ? 'أرسل دعوة إلى عضو جديد للانضمام إلى فريق البرنامج'
                : 'Send an invitation to a new member to join the IEP team'
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
              <Label>{isRTL ? 'الدور' : 'Role'}</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'اختر الدور' : 'Select role'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="special_education_teacher">{getRoleLabel('special_education_teacher', language)}</SelectItem>
                  <SelectItem value="speech_therapist">{getRoleLabel('speech_therapist', language)}</SelectItem>
                  <SelectItem value="occupational_therapist">{getRoleLabel('occupational_therapist', language)}</SelectItem>
                  <SelectItem value="psychologist">{getRoleLabel('psychologist', language)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="invite-message">{isRTL ? 'رسالة شخصية (اختيارية)' : 'Personal Message (Optional)'}</Label>
              <Textarea
                id="invite-message"
                placeholder={isRTL ? 'اكتب رسالة ترحيبية...' : 'Write a welcome message...'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => handleInviteMember('example@email.com', 'special_education_teacher')}>
              <Send className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? 'إرسال الدعوة' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default IEPTeamMemberManagement