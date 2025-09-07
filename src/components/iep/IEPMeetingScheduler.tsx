/**
 * IEP Meeting Scheduler Component
 * مكون جدولة اجتماعات البرنامج التعليمي الفردي
 * 
 * @description Complete meeting scheduling system with attendance tracking and automated notifications
 * نظام جدولة الاجتماعات الكامل مع تتبع الحضور والإشعارات التلقائية
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
import { Progress } from '@/components/ui/progress'
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
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  Video,
  Phone,
  Mail,
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Send,
  Copy,
  Download,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  UserX,
  MessageSquare,
  FileText,
  Settings,
  Calendar,
  Eye,
  Share,
  Link2,
  Zap,
  Target
} from 'lucide-react'
import { schedulingIntegration } from '@/services/scheduling-integration-service'
import { useToast } from '@/hooks/use-toast'

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type MeetingType = 
  | 'iep_initial'
  | 'iep_annual_review'
  | 'iep_interim_review'
  | 'evaluation_planning'
  | 'placement_meeting'
  | 'transition_planning'
  | 'emergency_meeting'
  | 'parent_conference'

export type MeetingStatus = 
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'postponed'
  | 'no_show'

export type AttendanceStatus = 
  | 'not_responded'
  | 'attending'
  | 'not_attending'
  | 'tentative'
  | 'no_response'
  | 'present'
  | 'absent'
  | 'late'

export type MeetingFormat = 
  | 'in_person'
  | 'virtual'
  | 'hybrid'
  | 'phone_conference'

export interface IEPMeeting {
  id: string
  iep_id: string
  
  // Meeting Details
  meeting_type: MeetingType
  title_ar: string
  title_en: string
  description_ar?: string
  description_en?: string
  
  // Scheduling Information
  meeting_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  timezone: string
  
  // Location and Format
  meeting_format: MeetingFormat
  location?: string
  virtual_meeting_link?: string
  dial_in_number?: string
  meeting_room?: string
  
  // Status and Progress
  meeting_status: MeetingStatus
  preparation_status: 'not_started' | 'in_progress' | 'completed'
  materials_prepared: boolean
  agenda_finalized: boolean
  
  // Scheduling Details
  scheduled_by: string
  created_date: string
  last_modified_date: string
  confirmation_deadline?: string
  
  // Meeting Requirements
  estimated_attendees: number
  required_materials: string[]
  equipment_needed: string[]
  accessibility_requirements: string[]
  
  // Follow-up Information
  follow_up_required: boolean
  follow_up_deadline?: string
  meeting_notes?: string
  action_items: Array<{
    id: string
    description_ar: string
    description_en: string
    assigned_to: string
    due_date: string
    status: 'pending' | 'in_progress' | 'completed'
  }>

  // Session Management Integration
  session_integration?: {
    related_session_ids: string[]
    therapy_adjustments: Array<{
      session_type: string
      current_frequency: string
      proposed_frequency: string
      reason_ar: string
      reason_en: string
      effective_date: string
      status: 'pending' | 'approved' | 'rejected'
    }>
    scheduling_conflicts: Array<{
      session_id: string
      conflict_type: 'time_overlap' | 'therapist_unavailable' | 'room_conflict'
      description: string
      resolved: boolean
    }>
    follow_up_sessions: Array<{
      session_type: string
      proposed_date: string
      duration: number
      therapist_id: string
      notes: string
    }>
  }
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  updated_by?: string
}

export interface MeetingAttendee {
  id: string
  meeting_id: string
  
  // Attendee Information
  user_id: string
  name_ar: string
  name_en: string
  email: string
  phone?: string
  role: string
  organization?: string
  
  // Attendance Details
  is_required: boolean
  is_organizer: boolean
  can_edit_meeting: boolean
  attendance_status: AttendanceStatus
  response_date?: string
  
  // Notification Preferences
  email_notifications: boolean
  sms_notifications: boolean
  reminder_preferences: {
    day_before: boolean
    hour_before: boolean
    fifteen_minutes_before: boolean
  }
  
  // Meeting Participation
  joined_at?: string
  left_at?: string
  participation_duration?: number
  contribution_notes?: string
  
  // Meeting Materials Access
  can_access_materials: boolean
  materials_downloaded: boolean
  pre_meeting_survey_completed: boolean
  
  // Metadata
  invited_at: string
  updated_at: string
  invited_by: string
}

export interface MeetingReminder {
  id: string
  meeting_id: string
  attendee_id: string
  
  // Reminder Details
  reminder_type: 'email' | 'sms' | 'in_app' | 'phone_call'
  reminder_time: string
  message_ar: string
  message_en: string
  
  // Status
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  sent_at?: string
  delivery_status?: string
  
  // Metadata
  created_at: string
  updated_at: string
}

interface IEPMeetingSchedulerProps {
  iepId: string
  language: 'ar' | 'en'
  currentUserId: string
  userRole: string
  className?: string
  onMeetingCreated?: (meeting: IEPMeeting) => void
  onMeetingUpdated?: (meeting: IEPMeeting) => void
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getMeetingTypeLabel = (type: MeetingType, language: 'ar' | 'en'): string => {
  const labels: Record<MeetingType, { ar: string; en: string }> = {
    iep_initial: { ar: 'اجتماع البرنامج الأولي', en: 'Initial IEP Meeting' },
    iep_annual_review: { ar: 'اجتماع المراجعة السنوية', en: 'Annual Review Meeting' },
    iep_interim_review: { ar: 'اجتماع المراجعة المؤقتة', en: 'Interim Review Meeting' },
    evaluation_planning: { ar: 'اجتماع تخطيط التقييم', en: 'Evaluation Planning Meeting' },
    placement_meeting: { ar: 'اجتماع تحديد المكان', en: 'Placement Meeting' },
    transition_planning: { ar: 'اجتماع تخطيط الانتقال', en: 'Transition Planning Meeting' },
    emergency_meeting: { ar: 'اجتماع طارئ', en: 'Emergency Meeting' },
    parent_conference: { ar: 'مؤتمر ولي الأمر', en: 'Parent Conference' }
  }
  return labels[type][language]
}

const getMeetingStatusColor = (status: MeetingStatus): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'in_progress':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'scheduled':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'cancelled':
    case 'no_show':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'postponed':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getAttendanceStatusColor = (status: AttendanceStatus): string => {
  switch (status) {
    case 'present':
    case 'attending':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'absent':
    case 'not_attending':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'late':
    case 'tentative':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'not_responded':
    case 'no_response':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const formatMeetingDateTime = (date: string, startTime: string, language: 'ar' | 'en'): string => {
  const meetingDate = new Date(`${date}T${startTime}`)
  return meetingDate.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const calculateMeetingDuration = (startTime: string, endTime: string): number => {
  const start = new Date(`2000-01-01T${startTime}:00`)
  const end = new Date(`2000-01-01T${endTime}:00`)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IEPMeetingScheduler: React.FC<IEPMeetingSchedulerProps> = ({
  iepId,
  language = 'ar',
  currentUserId,
  userRole,
  className,
  onMeetingCreated,
  onMeetingUpdated
}) => {
  const isRTL = language === 'ar'
  const { toast } = useToast()
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MeetingStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | MeetingType>('all')
  const [createMeetingDialog, setCreateMeetingDialog] = useState(false)
  const [editMeetingDialog, setEditMeetingDialog] = useState<IEPMeeting | null>(null)
  const [attendeesDialog, setAttendeesDialog] = useState<IEPMeeting | null>(null)
  const [schedulingAssistant, setSchedulingAssistant] = useState(false)
  const [sessionIntegrationDialog, setSessionIntegrationDialog] = useState<IEPMeeting | null>(null)
  const [isSchedulingWithSessions, setIsSchedulingWithSessions] = useState(false)
  
  // Sample data - would be fetched from API
  const [meetings] = useState<IEPMeeting[]>([
    {
      id: '1',
      iep_id: iepId,
      meeting_type: 'iep_annual_review',
      title_ar: 'اجتماع المراجعة السنوية للبرنامج التعليمي الفردي',
      title_en: 'Annual IEP Review Meeting',
      description_ar: 'مراجعة شاملة للبرنامج التعليمي الفردي وتقييم التقدم المحرز',
      description_en: 'Comprehensive review of Individual Education Program and progress evaluation',
      meeting_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '11:30',
      duration_minutes: 90,
      timezone: 'Asia/Riyadh',
      meeting_format: 'hybrid',
      location: 'Conference Room A',
      virtual_meeting_link: 'https://zoom.us/j/123456789',
      meeting_status: 'confirmed',
      preparation_status: 'in_progress',
      materials_prepared: true,
      agenda_finalized: true,
      scheduled_by: 'coord_1',
      created_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      last_modified_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      confirmation_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_attendees: 6,
      required_materials: ['Current IEP', 'Progress Reports', 'Assessment Results'],
      equipment_needed: ['Projector', 'Laptop', 'Video Conference Setup'],
      accessibility_requirements: ['Sign Language Interpreter'],
      follow_up_required: true,
      follow_up_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      action_items: [
        {
          id: 'action_1',
          description_ar: 'تحضير تقرير التقدم المحدث',
          description_en: 'Prepare updated progress report',
          assigned_to: 'teacher_1',
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'in_progress'
        }
      ],
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: 'coord_1'
    },
    {
      id: '2',
      iep_id: iepId,
      meeting_type: 'parent_conference',
      title_ar: 'مؤتمر ولي الأمر الشهري',
      title_en: 'Monthly Parent Conference',
      description_ar: 'مناقشة التقدم الشهري والتحديات مع ولي الأمر',
      description_en: 'Discuss monthly progress and challenges with parent',
      meeting_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      start_time: '14:00',
      end_time: '14:45',
      duration_minutes: 45,
      timezone: 'Asia/Riyadh',
      meeting_format: 'virtual',
      virtual_meeting_link: 'https://teams.microsoft.com/l/meetup-join/19%3a...',
      meeting_status: 'completed',
      preparation_status: 'completed',
      materials_prepared: true,
      agenda_finalized: true,
      scheduled_by: 'teacher_1',
      created_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      last_modified_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_attendees: 3,
      required_materials: ['Monthly Progress Report', 'Goal Tracking Charts'],
      equipment_needed: [],
      accessibility_requirements: [],
      follow_up_required: false,
      meeting_notes: 'Parent expressed satisfaction with progress. Discussed upcoming goals.',
      action_items: [],
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: 'teacher_1'
    }
  ])

  const [attendees] = useState<MeetingAttendee[]>([
    {
      id: '1',
      meeting_id: '1',
      user_id: 'coord_1',
      name_ar: 'د. أحمد محمد',
      name_en: 'Dr. Ahmed Mohammed',
      email: 'ahmed.mohammed@school.edu.sa',
      phone: '+966501234567',
      role: 'IEP Coordinator',
      organization: 'Arkan Growth Center',
      is_required: true,
      is_organizer: true,
      can_edit_meeting: true,
      attendance_status: 'attending',
      response_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      email_notifications: true,
      sms_notifications: true,
      reminder_preferences: {
        day_before: true,
        hour_before: true,
        fifteen_minutes_before: true
      },
      can_access_materials: true,
      materials_downloaded: true,
      pre_meeting_survey_completed: true,
      invited_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      invited_by: 'coord_1'
    },
    {
      id: '2',
      meeting_id: '1',
      user_id: 'parent_1',
      name_ar: 'والدة الطالب',
      name_en: 'Student\'s Mother',
      email: 'parent@email.com',
      phone: '+966509876543',
      role: 'Parent/Guardian',
      is_required: true,
      is_organizer: false,
      can_edit_meeting: false,
      attendance_status: 'tentative',
      email_notifications: true,
      sms_notifications: false,
      reminder_preferences: {
        day_before: true,
        hour_before: true,
        fifteen_minutes_before: false
      },
      can_access_materials: true,
      materials_downloaded: false,
      pre_meeting_survey_completed: false,
      invited_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      invited_by: 'coord_1'
    },
    {
      id: '3',
      meeting_id: '1',
      user_id: 'teacher_1',
      name_ar: 'أ. فاطمة أحمد',
      name_en: 'Ms. Fatima Ahmed',
      email: 'fatima.ahmed@school.edu.sa',
      phone: '+966507654321',
      role: 'Special Education Teacher',
      organization: 'Arkan Growth Center',
      is_required: true,
      is_organizer: false,
      can_edit_meeting: false,
      attendance_status: 'attending',
      response_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      email_notifications: true,
      sms_notifications: true,
      reminder_preferences: {
        day_before: true,
        hour_before: true,
        fifteen_minutes_before: true
      },
      can_access_materials: true,
      materials_downloaded: true,
      pre_meeting_survey_completed: true,
      invited_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      invited_by: 'coord_1'
    }
  ])

  // Filtered meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      const matchesSearch = searchQuery === '' || 
        meeting.title_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.title_en.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || meeting.meeting_status === statusFilter
      const matchesType = typeFilter === 'all' || meeting.meeting_type === typeFilter
      
      const matchesTab = activeTab === 'all' || 
        (activeTab === 'upcoming' && ['scheduled', 'confirmed'].includes(meeting.meeting_status)) ||
        (activeTab === 'completed' && meeting.meeting_status === 'completed') ||
        (activeTab === 'cancelled' && ['cancelled', 'postponed'].includes(meeting.meeting_status))
      
      return matchesSearch && matchesStatus && matchesType && matchesTab
    })
  }, [meetings, searchQuery, statusFilter, typeFilter, activeTab])

  // Event handlers
  const handleCreateMeeting = async (meetingData: Partial<IEPMeeting>) => {
    try {
      setIsSchedulingWithSessions(true)
      
      // If session integration is enabled, validate scheduling conflicts
      if (isSchedulingWithSessions && meetingData.session_integration) {
        const validation = await schedulingIntegration.validateSchedulingRequest({
          meeting_date: meetingData.meeting_date!,
          start_time: meetingData.start_time!,
          end_time: meetingData.end_time!,
          related_sessions: meetingData.session_integration.related_session_ids,
          therapy_adjustments: meetingData.session_integration.therapy_adjustments
        })
        
        if (!validation.isValid) {
          toast({
            title: isRTL ? "تعارض في الجدولة" : "Scheduling Conflict",
            description: validation.conflicts?.join(', ') || (isRTL ? "يوجد تعارض في الجدولة" : "There are scheduling conflicts"),
            variant: "destructive"
          })
          return
        }
      }
      
      console.log('Creating meeting:', meetingData)
      setCreateMeetingDialog(false)
      onMeetingCreated?.(meetingData as IEPMeeting)
      
      toast({
        title: isRTL ? "تم إنشاء الاجتماع" : "Meeting Created",
        description: isRTL ? "تم إنشاء الاجتماع بنجاح" : "Meeting has been created successfully"
      })
    } catch (error) {
      console.error('Error creating meeting:', error)
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "فشل في إنشاء الاجتماع" : "Failed to create meeting",
        variant: "destructive"
      })
    } finally {
      setIsSchedulingWithSessions(false)
    }
  }

  const handleUpdateMeeting = async (meetingId: string, updates: Partial<IEPMeeting>) => {
    try {
      // If session integration updates exist, validate them
      if (updates.session_integration) {
        const validation = await schedulingIntegration.validateSchedulingRequest({
          meeting_date: updates.meeting_date!,
          start_time: updates.start_time!,
          end_time: updates.end_time!,
          related_sessions: updates.session_integration.related_session_ids,
          therapy_adjustments: updates.session_integration.therapy_adjustments
        })
        
        if (!validation.isValid) {
          toast({
            title: isRTL ? "تعارض في الجدولة" : "Scheduling Conflict",
            description: validation.conflicts?.join(', ') || (isRTL ? "يوجد تعارض في الجدولة" : "There are scheduling conflicts"),
            variant: "destructive"
          })
          return
        }
      }
      
      console.log('Updating meeting:', meetingId, updates)
      setEditMeetingDialog(null)
      onMeetingUpdated?.(updates as IEPMeeting)
      
      toast({
        title: isRTL ? "تم تحديث الاجتماع" : "Meeting Updated",
        description: isRTL ? "تم تحديث الاجتماع بنجاح" : "Meeting has been updated successfully"
      })
    } catch (error) {
      console.error('Error updating meeting:', error)
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "فشل في تحديث الاجتماع" : "Failed to update meeting",
        variant: "destructive"
      })
    }
  }

  const handleCancelMeeting = (meetingId: string, reason: string) => {
    // Implementation for cancelling meeting
    console.log('Cancelling meeting:', meetingId, reason)
    
    toast({
      title: isRTL ? "تم إلغاء الاجتماع" : "Meeting Cancelled",
      description: isRTL ? "تم إلغاء الاجتماع بنجاح" : "Meeting has been cancelled"
    })
  }

  const handleAttendanceUpdate = (attendeeId: string, status: AttendanceStatus) => {
    // Implementation for updating attendance
    console.log('Updating attendance:', attendeeId, status)
    
    toast({
      title: isRTL ? "تم تحديث الحضور" : "Attendance Updated",
      description: isRTL ? "تم تحديث حالة الحضور" : "Attendance status has been updated"
    })
  }

  const handleSendReminders = (meetingId: string) => {
    // Implementation for sending reminders
    console.log('Sending reminders for meeting:', meetingId)
    
    toast({
      title: isRTL ? "تم إرسال التذكيرات" : "Reminders Sent",
      description: isRTL ? "تم إرسال التذكيرات للحضور" : "Reminders have been sent to attendees"
    })
  }

  const handleSessionIntegration = async (meeting: IEPMeeting, action: 'view' | 'manage' | 'resolve_conflicts') => {
    try {
      if (action === 'view' || action === 'manage') {
        setSessionIntegrationDialog(meeting)
      } else if (action === 'resolve_conflicts') {
        // Auto-resolve scheduling conflicts
        const conflicts = meeting.session_integration?.scheduling_conflicts || []
        const unresolved = conflicts.filter(c => !c.resolved)
        
        if (unresolved.length > 0) {
          const resolution = await schedulingIntegration.resolveSchedulingConflicts(meeting.id, unresolved)
          
          if (resolution.success) {
            toast({
              title: isRTL ? "تم حل التعارضات" : "Conflicts Resolved",
              description: isRTL ? "تم حل جميع تعارضات الجدولة" : "All scheduling conflicts have been resolved"
            })
          } else {
            toast({
              title: isRTL ? "فشل في حل التعارضات" : "Resolution Failed", 
              description: isRTL ? "لم يتم حل بعض التعارضات" : "Some conflicts could not be resolved",
              variant: "destructive"
            })
          }
        }
      }
    } catch (error) {
      console.error('Error handling session integration:', error)
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "فشل في معالجة تكامل الجلسات" : "Failed to handle session integration",
        variant: "destructive"
      })
    }
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
            {isRTL ? 'جدولة الاجتماعات وتتبع الحضور' : 'Meeting Scheduler & Attendance'}
          </h2>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'إدارة اجتماعات البرنامج التعليمي الفردي مع تتبع الحضور والإشعارات التلقائية'
              : 'Manage IEP meetings with attendance tracking and automated notifications'
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
            onClick={() => setSchedulingAssistant(true)}
          >
            <Calendar className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? 'مساعد الجدولة' : 'Scheduling Assistant'}
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateMeetingDialog(true)}
          >
            <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? 'اجتماع جديد' : 'New Meeting'}
          </Button>
        </div>
      </div>

      {/* Meeting Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'الاجتماعات القادمة' : 'Upcoming Meetings'}
                </p>
                <p className="text-2xl font-bold">
                  {meetings.filter(m => ['scheduled', 'confirmed'].includes(m.meeting_status)).length}
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'الاجتماعات المكتملة' : 'Completed Meetings'}
                </p>
                <p className="text-2xl font-bold">
                  {meetings.filter(m => m.meeting_status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
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
                  {attendees.length > 0 ? Math.round((attendees.filter(a => 
                    ['present', 'attending'].includes(a.attendance_status)
                  ).length / attendees.length) * 100) : 0}%
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'تحتاج تأكيد' : 'Awaiting Confirmation'}
                </p>
                <p className="text-2xl font-bold">
                  {attendees.filter(a => ['not_responded', 'tentative'].includes(a.attendance_status)).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming">
            {isRTL ? 'القادمة' : 'Upcoming'}
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
              {meetings.filter(m => ['scheduled', 'confirmed'].includes(m.meeting_status)).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            {isRTL ? 'المكتملة' : 'Completed'}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            {isRTL ? 'الملغية' : 'Cancelled'}
          </TabsTrigger>
          <TabsTrigger value="all">
            {isRTL ? 'الكل' : 'All'}
          </TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          {/* Filters */}
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
                      placeholder={isRTL ? 'ابحث في الاجتماعات...' : 'Search meetings...'}
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
                      <SelectItem value="scheduled">{isRTL ? 'مجدول' : 'Scheduled'}</SelectItem>
                      <SelectItem value="confirmed">{isRTL ? 'مؤكد' : 'Confirmed'}</SelectItem>
                      <SelectItem value="completed">{isRTL ? 'مكتمل' : 'Completed'}</SelectItem>
                      <SelectItem value="cancelled">{isRTL ? 'ملغي' : 'Cancelled'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{isRTL ? 'نوع الاجتماع' : 'Meeting Type'}</Label>
                  <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                      <SelectItem value="iep_annual_review">{getMeetingTypeLabel('iep_annual_review', language)}</SelectItem>
                      <SelectItem value="parent_conference">{getMeetingTypeLabel('parent_conference', language)}</SelectItem>
                      <SelectItem value="evaluation_planning">{getMeetingTypeLabel('evaluation_planning', language)}</SelectItem>
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

          {/* Meetings List */}
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => {
              const meetingAttendees = attendees.filter(a => a.meeting_id === meeting.id)
              const confirmedAttendees = meetingAttendees.filter(a => 
                ['attending', 'present'].includes(a.attendance_status)
              ).length
              const totalRequired = meetingAttendees.filter(a => a.is_required).length

              return (
                <Card key={meeting.id} className={
                  meeting.meeting_status === 'confirmed' && new Date(meeting.meeting_date) <= new Date(Date.now() + 24 * 60 * 60 * 1000)
                    ? 'border-blue-200 bg-blue-50'
                    : ''
                }>
                  <CardContent className="p-6">
                    <div className={cn(
                      "flex items-start justify-between mb-4",
                      isRTL && "flex-row-reverse"
                    )}>
                      <div className="flex-1">
                        <div className={cn(
                          "flex items-center gap-3 mb-2",
                          isRTL && "flex-row-reverse"
                        )}>
                          <h3 className="text-lg font-semibold">
                            {language === 'ar' ? meeting.title_ar : meeting.title_en}
                          </h3>
                          <Badge className={getMeetingStatusColor(meeting.meeting_status)}>
                            {isRTL 
                              ? meeting.meeting_status === 'scheduled' ? 'مجدول'
                                : meeting.meeting_status === 'confirmed' ? 'مؤكد'
                                : meeting.meeting_status === 'completed' ? 'مكتمل'
                                : meeting.meeting_status === 'cancelled' ? 'ملغي'
                                : meeting.meeting_status === 'in_progress' ? 'جاري'
                                : 'مؤجل'
                              : meeting.meeting_status.replace(/_/g, ' ')
                            }
                          </Badge>
                          <Badge variant="outline">
                            {getMeetingTypeLabel(meeting.meeting_type, language)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {language === 'ar' ? meeting.description_ar : meeting.description_en}
                        </p>
                        
                        <div className={cn(
                          "flex items-center gap-6 text-sm text-muted-foreground",
                          isRTL && "flex-row-reverse"
                        )}>
                          <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                            <CalendarIcon className="h-4 w-4" />
                            {formatMeetingDateTime(meeting.meeting_date, meeting.start_time, language)}
                          </span>
                          <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                            <Clock className="h-4 w-4" />
                            {meeting.duration_minutes} {isRTL ? 'دقيقة' : 'min'}
                          </span>
                          <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                            {meeting.meeting_format === 'virtual' ? <Video className="h-4 w-4" /> :
                             meeting.meeting_format === 'hybrid' ? <Users className="h-4 w-4" /> :
                             <MapPin className="h-4 w-4" />}
                            {meeting.meeting_format === 'virtual' ? (isRTL ? 'افتراضي' : 'Virtual') :
                             meeting.meeting_format === 'hybrid' ? (isRTL ? 'مختلط' : 'Hybrid') :
                             meeting.location || (isRTL ? 'حضوري' : 'In-Person')}
                          </span>
                          <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                            <Users className="h-4 w-4" />
                            {confirmedAttendees}/{totalRequired} {isRTL ? 'مؤكد' : 'confirmed'}
                          </span>
                          {meeting.session_integration && (
                            <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                              <Link2 className="h-4 w-4 text-blue-600" />
                              <span className="text-blue-600">
                                {meeting.session_integration.related_session_ids.length} {isRTL ? 'جلسات مرتبطة' : 'linked sessions'}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

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
                          <DropdownMenuItem onClick={() => console.log('View details')}>
                            <Eye className="h-4 w-4 mr-2" />
                            {isRTL ? 'عرض التفاصيل' : 'View Details'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditMeetingDialog(meeting)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {isRTL ? 'تحرير' : 'Edit'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAttendeesDialog(meeting)}>
                            <Users className="h-4 w-4 mr-2" />
                            {isRTL ? 'إدارة الحضور' : 'Manage Attendees'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendReminders(meeting.id)}>
                            <Bell className="h-4 w-4 mr-2" />
                            {isRTL ? 'إرسال تذكير' : 'Send Reminders'}
                          </DropdownMenuItem>
                          {meeting.meeting_format !== 'in_person' && (
                            <DropdownMenuItem onClick={() => window.open(meeting.virtual_meeting_link)}>
                              <Video className="h-4 w-4 mr-2" />
                              {isRTL ? 'انضم للاجتماع' : 'Join Meeting'}
                            </DropdownMenuItem>
                          )}
                          {meeting.session_integration && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleSessionIntegration(meeting, 'view')}>
                                <Link2 className="h-4 w-4 mr-2" />
                                {isRTL ? 'عرض تكامل الجلسات' : 'View Session Integration'}
                              </DropdownMenuItem>
                              {meeting.session_integration.scheduling_conflicts?.some(c => !c.resolved) && (
                                <DropdownMenuItem onClick={() => handleSessionIntegration(meeting, 'resolve_conflicts')}>
                                  <Zap className="h-4 w-4 mr-2" />
                                  {isRTL ? 'حل تعارضات الجدولة' : 'Resolve Conflicts'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleSessionIntegration(meeting, 'manage')}>
                                <Target className="h-4 w-4 mr-2" />
                                {isRTL ? 'إدارة التعديلات العلاجية' : 'Manage Therapy Adjustments'}
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleCancelMeeting(meeting.id, 'User request')}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {isRTL ? 'إلغاء الاجتماع' : 'Cancel Meeting'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Attendees Summary */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">
                        {isRTL ? 'حالة الحضور' : 'Attendance Status'}
                      </h4>
                      <div className={cn(
                        "flex items-center gap-2",
                        isRTL && "flex-row-reverse"
                      )}>
                        {meetingAttendees.slice(0, 5).map((attendee) => (
                          <div
                            key={attendee.id}
                            className={cn(
                              "flex items-center gap-1",
                              isRTL && "flex-row-reverse"
                            )}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {(language === 'ar' ? attendee.name_ar : attendee.name_en)
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .toUpperCase()
                                }
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              attendee.attendance_status === 'attending' || attendee.attendance_status === 'present'
                                ? 'bg-green-500'
                                : attendee.attendance_status === 'not_attending' || attendee.attendance_status === 'absent'
                                ? 'bg-red-500'
                                : attendee.attendance_status === 'tentative'
                                ? 'bg-yellow-500'
                                : 'bg-gray-400'
                            )} />
                          </div>
                        ))}
                        {meetingAttendees.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            +{meetingAttendees.length - 5} {isRTL ? 'آخرين' : 'more'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Session Integration Summary */}
                    {meeting.session_integration && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">
                          {isRTL ? 'ملخص تكامل الجلسات' : 'Session Integration Summary'}
                        </h4>
                        <div className="space-y-2">
                          {/* Therapy Adjustments */}
                          {meeting.session_integration.therapy_adjustments.length > 0 && (
                            <div className={cn(
                              "flex items-center gap-2 text-sm",
                              isRTL && "flex-row-reverse"
                            )}>
                              <Target className="h-4 w-4 text-blue-600" />
                              <span className="text-muted-foreground">
                                {meeting.session_integration.therapy_adjustments.length} {isRTL ? 'تعديلات علاجية' : 'therapy adjustments'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {meeting.session_integration.therapy_adjustments.filter(a => a.status === 'pending').length} {isRTL ? 'معلقة' : 'pending'}
                              </Badge>
                            </div>
                          )}
                          
                          {/* Scheduling Conflicts */}
                          {meeting.session_integration.scheduling_conflicts.length > 0 && (
                            <div className={cn(
                              "flex items-center gap-2 text-sm",
                              isRTL && "flex-row-reverse"
                            )}>
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <span className="text-muted-foreground">
                                {meeting.session_integration.scheduling_conflicts.filter(c => !c.resolved).length} {isRTL ? 'تعارضات غير محلولة' : 'unresolved conflicts'}
                              </span>
                              {meeting.session_integration.scheduling_conflicts.some(c => !c.resolved) && (
                                <Badge variant="destructive" className="text-xs">
                                  {isRTL ? 'يحتاج حل' : 'needs resolution'}
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {/* Follow-up Sessions */}
                          {meeting.session_integration.follow_up_sessions.length > 0 && (
                            <div className={cn(
                              "flex items-center gap-2 text-sm",
                              isRTL && "flex-row-reverse"
                            )}>
                              <CalendarIcon className="h-4 w-4 text-green-600" />
                              <span className="text-muted-foreground">
                                {meeting.session_integration.follow_up_sessions.length} {isRTL ? 'جلسات متابعة مقترحة' : 'follow-up sessions planned'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Items (if any) */}
                    {meeting.action_items.length > 0 && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">
                          {isRTL ? 'المهام المتابعة' : 'Action Items'}
                        </h4>
                        <div className="space-y-2">
                          {meeting.action_items.map((item) => (
                            <div
                              key={item.id}
                              className={cn(
                                "flex items-center gap-2 text-sm",
                                isRTL && "flex-row-reverse"
                              )}
                            >
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                item.status === 'completed' ? 'bg-green-500' :
                                item.status === 'in_progress' ? 'bg-blue-500' :
                                'bg-gray-400'
                              )} />
                              <span className="text-muted-foreground">
                                {language === 'ar' ? item.description_ar : item.description_en}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {new Date(item.due_date).toLocaleDateString(
                                  language === 'ar' ? 'ar-SA' : 'en-US',
                                  { month: 'short', day: 'numeric' }
                                )}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredMeetings.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{isRTL ? 'لا توجد اجتماعات' : 'No meetings found'}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Tabs>

      {/* Create Meeting Dialog */}
      <Dialog open={createMeetingDialog} onOpenChange={setCreateMeetingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'إنشاء اجتماع جديد' : 'Create New Meeting'}
            </DialogTitle>
            <DialogDescription>
              {isRTL 
                ? 'اختر تفاصيل الاجتماع وادع الأعضاء'
                : 'Set meeting details and invite team members'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>{isRTL ? 'نوع الاجتماع' : 'Meeting Type'}</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'اختر نوع الاجتماع' : 'Select meeting type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iep_annual_review">{getMeetingTypeLabel('iep_annual_review', language)}</SelectItem>
                  <SelectItem value="parent_conference">{getMeetingTypeLabel('parent_conference', language)}</SelectItem>
                  <SelectItem value="evaluation_planning">{getMeetingTypeLabel('evaluation_planning', language)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="meeting-date">{isRTL ? 'تاريخ الاجتماع' : 'Meeting Date'}</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="start-time">{isRTL ? 'وقت البداية' : 'Start Time'}</Label>
                <Input
                  id="start-time"
                  type="time"
                />
              </div>
            </div>
            
            <div>
              <Label>{isRTL ? 'نمط الاجتماع' : 'Meeting Format'}</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'اختر نمط الاجتماع' : 'Select meeting format'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">{isRTL ? 'حضوري' : 'In-Person'}</SelectItem>
                  <SelectItem value="virtual">{isRTL ? 'افتراضي' : 'Virtual'}</SelectItem>
                  <SelectItem value="hybrid">{isRTL ? 'مختلط' : 'Hybrid'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="meeting-description">{isRTL ? 'وصف الاجتماع' : 'Meeting Description'}</Label>
              <Textarea
                id="meeting-description"
                placeholder={isRTL ? 'اكتب وصف الاجتماع...' : 'Enter meeting description...'}
                rows={3}
              />
            </div>

            {/* Session Integration Option */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className={cn(
                "flex items-center gap-2",
                isRTL && "flex-row-reverse"
              )}>
                <Checkbox 
                  id="enable-session-integration"
                  checked={isSchedulingWithSessions}
                  onCheckedChange={setIsSchedulingWithSessions}
                />
                <Label htmlFor="enable-session-integration" className="text-sm font-medium">
                  {isRTL ? 'تفعيل تكامل الجلسات العلاجية' : 'Enable Session Integration'}
                </Label>
                <Link2 className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground">
                {isRTL 
                  ? 'ربط هذا الاجتماع بالجلسات العلاجية الحالية لتحسين التنسيق والمتابعة'
                  : 'Link this meeting with ongoing therapy sessions for better coordination and follow-up'
                }
              </p>
              
              {isSchedulingWithSessions && (
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>
                    {isRTL ? 'تكامل الجلسات مُفعل' : 'Session Integration Enabled'}
                  </AlertTitle>
                  <AlertDescription>
                    {isRTL 
                      ? 'سيتم التحقق من التعارضات في الجدولة وإنشاء التعديلات العلاجية المناسبة تلقائياً.'
                      : 'The system will automatically check for scheduling conflicts and suggest appropriate therapy adjustments.'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateMeetingDialog(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => handleCreateMeeting({})}>
              {isRTL ? 'إنشاء الاجتماع' : 'Create Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendees Management Dialog */}
      <Dialog open={!!attendeesDialog} onOpenChange={(open) => !open && setAttendeesDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'إدارة الحضور' : 'Manage Attendees'}
            </DialogTitle>
            <DialogDescription>
              {attendeesDialog && (
                language === 'ar' ? attendeesDialog.title_ar : attendeesDialog.title_en
              )}
            </DialogDescription>
          </DialogHeader>
          
          {attendeesDialog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isRTL ? "text-right" : ""}>
                        {isRTL ? 'الاسم' : 'Name'}
                      </TableHead>
                      <TableHead className={isRTL ? "text-right" : ""}>
                        {isRTL ? 'الدور' : 'Role'}
                      </TableHead>
                      <TableHead className={isRTL ? "text-right" : ""}>
                        {isRTL ? 'حالة الحضور' : 'Attendance Status'}
                      </TableHead>
                      <TableHead className={isRTL ? "text-right" : ""}>
                        {isRTL ? 'مطلوب' : 'Required'}
                      </TableHead>
                      <TableHead className={isRTL ? "text-right" : ""}>
                        {isRTL ? 'الإجراءات' : 'Actions'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendees
                      .filter(a => a.meeting_id === attendeesDialog.id)
                      .map((attendee) => (
                        <TableRow key={attendee.id}>
                          <TableCell>
                            <div className={cn(
                              "flex items-center gap-3",
                              isRTL && "flex-row-reverse"
                            )}>
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {(language === 'ar' ? attendee.name_ar : attendee.name_en)
                                    .split(' ')
                                    .map(n => n[0])
                                    .join('')
                                    .toUpperCase()
                                  }
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {language === 'ar' ? attendee.name_ar : attendee.name_en}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {attendee.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{attendee.role}</TableCell>
                          <TableCell>
                            <Select
                              value={attendee.attendance_status}
                              onValueChange={(value) => handleAttendanceUpdate(attendee.id, value as AttendanceStatus)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="attending">{isRTL ? 'حاضر' : 'Attending'}</SelectItem>
                                <SelectItem value="not_attending">{isRTL ? 'غائب' : 'Not Attending'}</SelectItem>
                                <SelectItem value="tentative">{isRTL ? 'مؤقت' : 'Tentative'}</SelectItem>
                                <SelectItem value="not_responded">{isRTL ? 'لم يجب' : 'No Response'}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {attendee.is_required ? (
                              <Badge className="bg-red-100 text-red-800">
                                {isRTL ? 'مطلوب' : 'Required'}
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                {isRTL ? 'اختياري' : 'Optional'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => console.log('Send reminder')}>
                                  <Bell className="h-4 w-4 mr-2" />
                                  {isRTL ? 'إرسال تذكير' : 'Send Reminder'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => console.log('Send message')}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  {isRTL ? 'إرسال رسالة' : 'Send Message'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => console.log('Remove attendee')}
                                  className="text-red-600"
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  {isRTL ? 'إزالة' : 'Remove'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendeesDialog(null)}>
              {isRTL ? 'إغلاق' : 'Close'}
            </Button>
            <Button onClick={() => console.log('Add attendee')}>
              <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? 'إضافة حاضر' : 'Add Attendee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Integration Dialog */}
      <Dialog open={!!sessionIntegrationDialog} onOpenChange={(open) => !open && setSessionIntegrationDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'تكامل الجلسات العلاجية' : 'Session Integration Management'}
            </DialogTitle>
            <DialogDescription>
              {sessionIntegrationDialog && (
                language === 'ar' ? sessionIntegrationDialog.title_ar : sessionIntegrationDialog.title_en
              )}
            </DialogDescription>
          </DialogHeader>
          
          {sessionIntegrationDialog?.session_integration && (
            <ScrollArea className="max-h-[60vh]">
              <Tabs defaultValue="adjustments" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="adjustments">
                    {isRTL ? 'التعديلات العلاجية' : 'Therapy Adjustments'}
                  </TabsTrigger>
                  <TabsTrigger value="conflicts">
                    {isRTL ? 'التعارضات' : 'Scheduling Conflicts'}
                  </TabsTrigger>
                  <TabsTrigger value="followup">
                    {isRTL ? 'جلسات المتابعة' : 'Follow-up Sessions'}
                  </TabsTrigger>
                </TabsList>

                {/* Therapy Adjustments Tab */}
                <TabsContent value="adjustments" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {isRTL ? 'التعديلات العلاجية المقترحة' : 'Proposed Therapy Adjustments'}
                      </CardTitle>
                      <CardDescription>
                        {isRTL 
                          ? 'مراجعة وموافقة على التعديلات المقترحة للبرنامج العلاجي'
                          : 'Review and approve proposed changes to the therapy program'
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {sessionIntegrationDialog.session_integration.therapy_adjustments.map((adjustment, index) => (
                          <Card key={index} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                              <div className={cn(
                                "flex items-start justify-between mb-3",
                                isRTL && "flex-row-reverse"
                              )}>
                                <div className="flex-1">
                                  <h4 className="font-medium mb-1">
                                    {adjustment.session_type}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {isRTL ? adjustment.reason_ar : adjustment.reason_en}
                                  </p>
                                </div>
                                <Badge className={
                                  adjustment.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  adjustment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }>
                                  {adjustment.status === 'approved' ? (isRTL ? 'موافق عليه' : 'Approved') :
                                   adjustment.status === 'rejected' ? (isRTL ? 'مرفوض' : 'Rejected') :
                                   (isRTL ? 'معلق' : 'Pending')}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">{isRTL ? 'التكرار الحالي:' : 'Current Frequency:'}</span>
                                  <span className={cn("font-medium", isRTL ? "mr-2" : "ml-2")}>
                                    {adjustment.current_frequency}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">{isRTL ? 'التكرار المقترح:' : 'Proposed Frequency:'}</span>
                                  <span className={cn("font-medium text-blue-600", isRTL ? "mr-2" : "ml-2")}>
                                    {adjustment.proposed_frequency}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">{isRTL ? 'تاريخ التطبيق:' : 'Effective Date:'}</span>
                                  <span className={cn("font-medium", isRTL ? "mr-2" : "ml-2")}>
                                    {new Date(adjustment.effective_date).toLocaleDateString(
                                      language === 'ar' ? 'ar-SA' : 'en-US',
                                      { year: 'numeric', month: 'long', day: 'numeric' }
                                    )}
                                  </span>
                                </div>
                              </div>
                              
                              {adjustment.status === 'pending' && (
                                <div className={cn(
                                  "flex gap-2 mt-4",
                                  isRTL && "flex-row-reverse"
                                )}>
                                  <Button size="sm" variant="default">
                                    <CheckCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                    {isRTL ? 'موافق' : 'Approve'}
                                  </Button>
                                  <Button size="sm" variant="destructive">
                                    <XCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                    {isRTL ? 'رفض' : 'Reject'}
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                        
                        {sessionIntegrationDialog.session_integration.therapy_adjustments.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{isRTL ? 'لا توجد تعديلات علاجية' : 'No therapy adjustments'}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Scheduling Conflicts Tab */}
                <TabsContent value="conflicts" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {isRTL ? 'تعارضات الجدولة' : 'Scheduling Conflicts'}
                      </CardTitle>
                      <CardDescription>
                        {isRTL 
                          ? 'حل التعارضات في جدولة الاجتماع والجلسات العلاجية'
                          : 'Resolve conflicts between meeting and therapy session schedules'
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {sessionIntegrationDialog.session_integration.scheduling_conflicts.map((conflict, index) => (
                          <Alert key={index} className={
                            conflict.resolved ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                          }>
                            <AlertTriangle className={cn(
                              "h-4 w-4",
                              conflict.resolved ? 'text-green-600' : 'text-red-600'
                            )} />
                            <AlertTitle className="flex items-center justify-between">
                              <span>
                                {conflict.conflict_type === 'time_overlap' ? 
                                  (isRTL ? 'تداخل في الأوقات' : 'Time Overlap') :
                                 conflict.conflict_type === 'therapist_unavailable' ? 
                                  (isRTL ? 'المعالج غير متاح' : 'Therapist Unavailable') :
                                  (isRTL ? 'تعارض في الغرفة' : 'Room Conflict')
                                }
                              </span>
                              {conflict.resolved ? (
                                <Badge className="bg-green-100 text-green-800">
                                  {isRTL ? 'محلول' : 'Resolved'}
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  {isRTL ? 'غير محلول' : 'Unresolved'}
                                </Badge>
                              )}
                            </AlertTitle>
                            <AlertDescription>
                              <p className="mb-2">{conflict.description}</p>
                              <div className={cn(
                                "flex items-center gap-2 text-sm text-muted-foreground",
                                isRTL && "flex-row-reverse"
                              )}>
                                <span>{isRTL ? 'معرف الجلسة:' : 'Session ID:'}</span>
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                  {conflict.session_id}
                                </code>
                              </div>
                              
                              {!conflict.resolved && (
                                <div className={cn(
                                  "flex gap-2 mt-3",
                                  isRTL && "flex-row-reverse"
                                )}>
                                  <Button size="sm" variant="default">
                                    <Zap className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                    {isRTL ? 'حل تلقائي' : 'Auto Resolve'}
                                  </Button>
                                  <Button size="sm" variant="outline">
                                    <Edit className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                    {isRTL ? 'حل يدوي' : 'Manual Resolution'}
                                  </Button>
                                </div>
                              )}
                            </AlertDescription>
                          </Alert>
                        ))}
                        
                        {sessionIntegrationDialog.session_integration.scheduling_conflicts.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-600" />
                            <p>{isRTL ? 'لا توجد تعارضات في الجدولة' : 'No scheduling conflicts'}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Follow-up Sessions Tab */}
                <TabsContent value="followup" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {isRTL ? 'جلسات المتابعة المقترحة' : 'Proposed Follow-up Sessions'}
                      </CardTitle>
                      <CardDescription>
                        {isRTL 
                          ? 'جدولة الجلسات العلاجية المقترحة بناء على نتائج الاجتماع'
                          : 'Schedule therapy sessions proposed based on meeting outcomes'
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {sessionIntegrationDialog.session_integration.follow_up_sessions.map((session, index) => (
                          <Card key={index} className="border-l-4 border-l-green-500">
                            <CardContent className="p-4">
                              <div className={cn(
                                "flex items-start justify-between mb-3",
                                isRTL && "flex-row-reverse"
                              )}>
                                <div className="flex-1">
                                  <h4 className="font-medium mb-1">
                                    {session.session_type}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {session.notes}
                                  </p>
                                </div>
                                <Badge variant="outline">
                                  {session.duration} {isRTL ? 'دقيقة' : 'min'}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                <div>
                                  <span className="text-muted-foreground">{isRTL ? 'التاريخ المقترح:' : 'Proposed Date:'}</span>
                                  <span className={cn("font-medium", isRTL ? "mr-2" : "ml-2")}>
                                    {new Date(session.proposed_date).toLocaleDateString(
                                      language === 'ar' ? 'ar-SA' : 'en-US',
                                      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">{isRTL ? 'المعالج:' : 'Therapist:'}</span>
                                  <span className={cn("font-medium", isRTL ? "mr-2" : "ml-2")}>
                                    {session.therapist_id}
                                  </span>
                                </div>
                              </div>
                              
                              <div className={cn(
                                "flex gap-2",
                                isRTL && "flex-row-reverse"
                              )}>
                                <Button size="sm" variant="default">
                                  <CalendarIcon className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                  {isRTL ? 'جدولة الجلسة' : 'Schedule Session'}
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Edit className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                  {isRTL ? 'تعديل' : 'Modify'}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {sessionIntegrationDialog.session_integration.follow_up_sessions.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{isRTL ? 'لا توجد جلسات متابعة مقترحة' : 'No follow-up sessions proposed'}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionIntegrationDialog(null)}>
              {isRTL ? 'إغلاق' : 'Close'}
            </Button>
            <Button onClick={() => console.log('Save session integration changes')}>
              <Settings className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default IEPMeetingScheduler