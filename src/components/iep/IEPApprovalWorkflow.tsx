/**
 * IEP Approval Workflow Component
 * مكون تدفق موافقة البرنامج التعليمي الفردي
 * 
 * @description Comprehensive approval workflow with digital signatures, role-based approvals, and audit trail
 * تدفق موافقة شامل مع التوقيعات الرقمية والموافقات القائمة على الأدوار ومسار المراجعة
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
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  Send,
  Eye,
  Edit,
  MoreHorizontal,
  AlertTriangle,
  Calendar,
  Shield,
  Signature,
  History,
  MessageSquare,
  Download,
  Share,
  RefreshCw,
  Filter,
  Search,
  CheckCheck,
  X,
  ArrowRight,
  UserCheck,
  FileCheck,
  AlertCircle,
  Timer,
  Settings
} from 'lucide-react'

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type ApprovalStatus = 
  | 'draft'
  | 'pending_review'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'requires_changes'
  | 'expired'
  | 'withdrawn'

export type ApprovalType = 
  | 'initial_iep'
  | 'annual_review'
  | 'interim_review'
  | 'goal_modification'
  | 'service_change'
  | 'placement_change'
  | 'evaluation_consent'
  | 'meeting_minutes'

export type SignatureType = 
  | 'electronic'
  | 'digital'
  | 'wet_signature'
  | 'voice_confirmation'

export type ApprovalRole = 
  | 'coordinator'
  | 'special_education_teacher'
  | 'administrator'
  | 'parent_guardian'
  | 'student'
  | 'related_service_provider'
  | 'general_education_teacher'
  | 'evaluator'

export interface ApprovalRequest {
  id: string
  iep_id: string
  document_id?: string
  
  // Request Details
  approval_type: ApprovalType
  title_ar: string
  title_en: string
  description_ar?: string
  description_en?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  
  // Approval Configuration
  required_approvers: ApprovalRole[]
  optional_approvers: ApprovalRole[]
  approval_threshold: number // Percentage of required approvers needed
  allow_sequential_approval: boolean
  allow_parallel_approval: boolean
  
  // Status and Timeline
  request_status: ApprovalStatus
  requested_date: string
  due_date?: string
  completed_date?: string
  
  // Content and Attachments
  content_summary_ar?: string
  content_summary_en?: string
  changes_made: Array<{
    section: string
    change_type: 'added' | 'modified' | 'removed'
    description_ar: string
    description_en: string
    timestamp: string
    made_by: string
  }>
  attachments: Array<{
    id: string
    filename: string
    file_type: string
    file_size: number
    uploaded_at: string
    uploaded_by: string
  }>
  
  // Workflow Configuration
  workflow_steps: Array<{
    step_number: number
    step_name_ar: string
    step_name_en: string
    required_roles: ApprovalRole[]
    is_parallel: boolean
    estimated_days: number
    status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  }>
  
  // Metadata
  created_by: string
  created_at: string
  updated_at: string
}

export interface ApprovalAction {
  id: string
  approval_request_id: string
  
  // Approver Details
  approver_id: string
  approver_role: ApprovalRole
  approver_name_ar: string
  approver_name_en: string
  
  // Action Details
  action_type: 'approved' | 'rejected' | 'request_changes' | 'delegated' | 'comment_added'
  action_status: 'completed' | 'pending' | 'expired'
  
  // Decision Information
  decision_reason_ar?: string
  decision_reason_en?: string
  suggested_changes_ar?: string
  suggested_changes_en?: string
  conditions_ar?: string
  conditions_en?: string
  
  // Signature Information
  signature_type: SignatureType
  signature_data?: string // Base64 signature image or digital signature hash
  signature_timestamp?: string
  signature_ip_address?: string
  signature_device_info?: string
  
  // Delegation (if applicable)
  delegated_to?: string
  delegation_reason_ar?: string
  delegation_reason_en?: string
  delegation_expires_at?: string
  
  // Timing
  responded_date?: string
  expires_at?: string
  
  // Metadata
  created_at: string
  updated_at: string
}

export interface DigitalSignature {
  id: string
  approval_action_id: string
  
  // Signature Details
  signature_method: SignatureType
  signature_image?: string // Base64 encoded signature
  signature_hash: string // Cryptographic hash for verification
  certificate_data?: string // Digital certificate information
  
  // Signer Information
  signer_id: string
  signer_name: string
  signer_email: string
  signer_role: ApprovalRole
  
  // Verification Data
  verification_status: 'verified' | 'unverified' | 'failed' | 'expired'
  verification_timestamp?: string
  verification_method?: string
  
  // Security Information
  signing_timestamp: string
  signing_ip_address: string
  signing_device: string
  signing_location?: string
  
  // Legal Information
  consent_statement_ar: string
  consent_statement_en: string
  legal_disclaimer_ar?: string
  legal_disclaimer_en?: string
  
  // Audit Trail
  created_at: string
  updated_at: string
}

interface IEPApprovalWorkflowProps {
  iepId: string
  language: 'ar' | 'en'
  currentUserId: string
  userRole: ApprovalRole
  className?: string
  onWorkflowUpdated?: () => void
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getApprovalTypeLabel = (type: ApprovalType, language: 'ar' | 'en'): string => {
  const labels: Record<ApprovalType, { ar: string; en: string }> = {
    initial_iep: { ar: 'البرنامج الأولي', en: 'Initial IEP' },
    annual_review: { ar: 'المراجعة السنوية', en: 'Annual Review' },
    interim_review: { ar: 'المراجعة المؤقتة', en: 'Interim Review' },
    goal_modification: { ar: 'تعديل الأهداف', en: 'Goal Modification' },
    service_change: { ar: 'تغيير الخدمات', en: 'Service Change' },
    placement_change: { ar: 'تغيير المكان', en: 'Placement Change' },
    evaluation_consent: { ar: 'موافقة التقييم', en: 'Evaluation Consent' },
    meeting_minutes: { ar: 'محضر الاجتماع', en: 'Meeting Minutes' }
  }
  return labels[type][language]
}

const getStatusColor = (status: ApprovalStatus): string => {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'pending_review':
    case 'under_review':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'requires_changes':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'draft':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'expired':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'withdrawn':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const calculateApprovalProgress = (request: ApprovalRequest, actions: ApprovalAction[]): number => {
  const requiredApprovals = request.required_approvers.length
  const completedApprovals = actions.filter(
    action => action.action_type === 'approved' && action.action_status === 'completed'
  ).length
  
  return requiredApprovals > 0 ? Math.round((completedApprovals / requiredApprovals) * 100) : 0
}

const formatDate = (dateString: string, language: 'ar' | 'en'): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IEPApprovalWorkflow: React.FC<IEPApprovalWorkflowProps> = ({
  iepId,
  language = 'ar',
  currentUserId,
  userRole,
  className,
  onWorkflowUpdated
}) => {
  const isRTL = language === 'ar'
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ApprovalStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ApprovalType>('all')
  const [signatureDialog, setSignatureDialog] = useState<ApprovalRequest | null>(null)
  const [delegationDialog, setDelegationDialog] = useState<ApprovalRequest | null>(null)
  const [auditDialog, setAuditDialog] = useState<ApprovalRequest | null>(null)
  
  // Sample data - would be fetched from API
  const [approvalRequests] = useState<ApprovalRequest[]>([
    {
      id: '1',
      iep_id: iepId,
      document_id: 'doc_1',
      approval_type: 'goal_modification',
      title_ar: 'تعديل أهداف التواصل والنطق',
      title_en: 'Communication and Speech Goals Modification',
      description_ar: 'تحديث أهداف التواصل بناءً على التقييم الحديث',
      description_en: 'Update communication goals based on recent assessment',
      priority: 'high',
      required_approvers: ['coordinator', 'parent_guardian', 'special_education_teacher'],
      optional_approvers: ['administrator'],
      approval_threshold: 100,
      allow_sequential_approval: false,
      allow_parallel_approval: true,
      request_status: 'under_review',
      requested_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      content_summary_ar: 'تم تعديل 3 أهداف رئيسية في مجال التواصل',
      content_summary_en: '3 main communication goals have been modified',
      changes_made: [
        {
          section: 'communication_goals',
          change_type: 'modified',
          description_ar: 'تحديث هدف التعبير الشفهي',
          description_en: 'Updated verbal expression goal',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          made_by: 'teacher_1'
        }
      ],
      attachments: [
        {
          id: 'att_1',
          filename: 'assessment_report.pdf',
          file_type: 'application/pdf',
          file_size: 245760,
          uploaded_at: new Date().toISOString(),
          uploaded_by: 'teacher_1'
        }
      ],
      workflow_steps: [
        {
          step_number: 1,
          step_name_ar: 'مراجعة المنسق',
          step_name_en: 'Coordinator Review',
          required_roles: ['coordinator'],
          is_parallel: false,
          estimated_days: 2,
          status: 'completed'
        },
        {
          step_number: 2,
          step_name_ar: 'موافقة ولي الأمر والمعلم',
          step_name_en: 'Parent and Teacher Approval',
          required_roles: ['parent_guardian', 'special_education_teacher'],
          is_parallel: true,
          estimated_days: 3,
          status: 'in_progress'
        }
      ],
      created_by: 'coordinator_1',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      iep_id: iepId,
      approval_type: 'annual_review',
      title_ar: 'المراجعة السنوية للبرنامج',
      title_en: 'Annual IEP Review',
      description_ar: 'مراجعة شاملة للبرنامج التعليمي الفردي السنوي',
      description_en: 'Comprehensive annual review of Individual Education Program',
      priority: 'medium',
      required_approvers: ['coordinator', 'parent_guardian', 'special_education_teacher', 'administrator'],
      optional_approvers: ['related_service_provider'],
      approval_threshold: 100,
      allow_sequential_approval: true,
      allow_parallel_approval: false,
      request_status: 'approved',
      requested_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      completed_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      content_summary_ar: 'مراجعة كاملة لجميع أهداف البرنامج والخدمات',
      content_summary_en: 'Complete review of all program goals and services',
      changes_made: [],
      attachments: [
        {
          id: 'att_2',
          filename: 'annual_review_complete.pdf',
          file_type: 'application/pdf',
          file_size: 512000,
          uploaded_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          uploaded_by: 'coordinator_1'
        }
      ],
      workflow_steps: [
        {
          step_number: 1,
          step_name_ar: 'مراجعة المنسق',
          step_name_en: 'Coordinator Review',
          required_roles: ['coordinator'],
          is_parallel: false,
          estimated_days: 3,
          status: 'completed'
        },
        {
          step_number: 2,
          step_name_ar: 'موافقة الإدارة',
          step_name_en: 'Administrative Approval',
          required_roles: ['administrator'],
          is_parallel: false,
          estimated_days: 2,
          status: 'completed'
        }
      ],
      created_by: 'coordinator_1',
      created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ])
  
  const [approvalActions] = useState<ApprovalAction[]>([
    {
      id: '1',
      approval_request_id: '1',
      approver_id: 'coord_1',
      approver_role: 'coordinator',
      approver_name_ar: 'د. أحمد محمد',
      approver_name_en: 'Dr. Ahmed Mohammed',
      action_type: 'approved',
      action_status: 'completed',
      decision_reason_ar: 'التعديلات مناسبة ومبررة',
      decision_reason_en: 'Modifications are appropriate and justified',
      signature_type: 'electronic',
      signature_data: 'signature_hash_123',
      signature_timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      signature_ip_address: '192.168.1.100',
      signature_device_info: 'Chrome/Windows',
      responded_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      approval_request_id: '2',
      approver_id: 'parent_1',
      approver_role: 'parent_guardian',
      approver_name_ar: 'والدة الطالب',
      approver_name_en: 'Student\'s Mother',
      action_type: 'approved',
      action_status: 'completed',
      decision_reason_ar: 'أوافق على جميع التوصيات',
      decision_reason_en: 'I approve all recommendations',
      signature_type: 'digital',
      signature_data: 'digital_signature_456',
      signature_timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      responded_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ])

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return approvalRequests.filter(request => {
      const matchesSearch = searchQuery === '' || 
        request.title_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.title_en.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || request.request_status === statusFilter
      const matchesType = typeFilter === 'all' || request.approval_type === typeFilter
      
      const matchesTab = activeTab === 'all' || 
        (activeTab === 'pending' && ['pending_review', 'under_review'].includes(request.request_status)) ||
        (activeTab === 'completed' && ['approved', 'rejected'].includes(request.request_status)) ||
        (activeTab === 'my_actions' && request.required_approvers.includes(userRole))
      
      return matchesSearch && matchesStatus && matchesType && matchesTab
    })
  }, [approvalRequests, searchQuery, statusFilter, typeFilter, activeTab, userRole])

  // Event handlers
  const handleApprove = async (requestId: string, signature?: string) => {
    // Implementation for approving request
    console.log('Approving request:', requestId, 'with signature:', signature)
    onWorkflowUpdated?.()
  }

  const handleReject = async (requestId: string, reason: string) => {
    // Implementation for rejecting request
    console.log('Rejecting request:', requestId, 'reason:', reason)
    onWorkflowUpdated?.()
  }

  const handleDelegate = async (requestId: string, delegateToId: string, reason: string) => {
    // Implementation for delegating approval
    console.log('Delegating request:', requestId, 'to:', delegateToId, 'reason:', reason)
    setDelegationDialog(null)
    onWorkflowUpdated?.()
  }

  const handleRequestChanges = async (requestId: string, changes: string) => {
    // Implementation for requesting changes
    console.log('Requesting changes for:', requestId, 'changes:', changes)
    onWorkflowUpdated?.()
  }

  const canUserApprove = (request: ApprovalRequest): boolean => {
    return request.required_approvers.includes(userRole) || 
           request.optional_approvers.includes(userRole)
  }

  const hasUserApproved = (request: ApprovalRequest): boolean => {
    return approvalActions.some(
      action => action.approval_request_id === request.id && 
               action.approver_id === currentUserId && 
               action.action_type === 'approved' && 
               action.action_status === 'completed'
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
            {isRTL ? 'تدفق الموافقات والتوقيعات' : 'Approval Workflow & Signatures'}
          </h2>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'إدارة طلبات الموافقة والتوقيعات الرقمية للبرنامج التعليمي الفردي'
              : 'Manage approval requests and digital signatures for IEP documents'
            }
          </p>
        </div>
        <div className={cn(
          "flex items-center gap-2",
          isRTL && "flex-row-reverse"
        )}>
          <Button variant="outline" size="sm" onClick={() => console.log('Refresh')}>
            <RefreshCw className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
          <Button size="sm" onClick={() => console.log('New request')}>
            <Send className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? 'طلب جديد' : 'New Request'}
          </Button>
        </div>
      </div>

      {/* Workflow Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'في انتظار الموافقة' : 'Pending Approval'}
                </p>
                <p className="text-2xl font-bold">
                  {approvalRequests.filter(r => ['pending_review', 'under_review'].includes(r.request_status)).length}
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
                  {isRTL ? 'تمت الموافقة عليها' : 'Approved'}
                </p>
                <p className="text-2xl font-bold">
                  {approvalRequests.filter(r => r.request_status === 'approved').length}
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
                  {isRTL ? 'تحتاج إجراء مني' : 'Require My Action'}
                </p>
                <p className="text-2xl font-bold">
                  {approvalRequests.filter(r => 
                    canUserApprove(r) && !hasUserApproved(r) && 
                    ['pending_review', 'under_review'].includes(r.request_status)
                  ).length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'التوقيعات الرقمية' : 'Digital Signatures'}
                </p>
                <p className="text-2xl font-bold">
                  {approvalActions.filter(a => a.signature_data).length}
                </p>
              </div>
              <Signature className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            {isRTL ? 'قيد المراجعة' : 'Pending'}
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
              {approvalRequests.filter(r => ['pending_review', 'under_review'].includes(r.request_status)).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="my_actions">
            {isRTL ? 'إجراءاتي' : 'My Actions'}
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
              {approvalRequests.filter(r => 
                canUserApprove(r) && !hasUserApproved(r) && 
                ['pending_review', 'under_review'].includes(r.request_status)
              ).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            {isRTL ? 'مكتملة' : 'Completed'}
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
                      placeholder={isRTL ? 'ابحث في الطلبات...' : 'Search requests...'}
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
                      <SelectItem value="pending_review">{isRTL ? 'في انتظار المراجعة' : 'Pending Review'}</SelectItem>
                      <SelectItem value="under_review">{isRTL ? 'قيد المراجعة' : 'Under Review'}</SelectItem>
                      <SelectItem value="approved">{isRTL ? 'موافق عليه' : 'Approved'}</SelectItem>
                      <SelectItem value="rejected">{isRTL ? 'مرفوض' : 'Rejected'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{isRTL ? 'نوع الطلب' : 'Request Type'}</Label>
                  <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                      <SelectItem value="goal_modification">{getApprovalTypeLabel('goal_modification', language)}</SelectItem>
                      <SelectItem value="annual_review">{getApprovalTypeLabel('annual_review', language)}</SelectItem>
                      <SelectItem value="service_change">{getApprovalTypeLabel('service_change', language)}</SelectItem>
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

          {/* Approval Requests List */}
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const progress = calculateApprovalProgress(request, approvalActions.filter(a => a.approval_request_id === request.id))
              const userCanApprove = canUserApprove(request)
              const userHasApproved = hasUserApproved(request)
              const requestActions = approvalActions.filter(a => a.approval_request_id === request.id)

              return (
                <Card key={request.id} className={
                  userCanApprove && !userHasApproved && ['pending_review', 'under_review'].includes(request.request_status)
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
                            {language === 'ar' ? request.title_ar : request.title_en}
                          </h3>
                          <Badge className={getStatusColor(request.request_status)}>
                            {isRTL 
                              ? request.request_status === 'approved' ? 'موافق عليه'
                                : request.request_status === 'rejected' ? 'مرفوض'
                                : request.request_status === 'pending_review' ? 'في انتظار المراجعة'
                                : request.request_status === 'under_review' ? 'قيد المراجعة'
                                : request.request_status === 'requires_changes' ? 'يحتاج تغييرات'
                                : 'مسودة'
                              : request.request_status.replace(/_/g, ' ')
                            }
                          </Badge>
                          <Badge className={getPriorityColor(request.priority)}>
                            {isRTL 
                              ? request.priority === 'urgent' ? 'عاجل'
                                : request.priority === 'high' ? 'عالي'
                                : request.priority === 'medium' ? 'متوسط'
                                : 'منخفض'
                              : request.priority
                            }
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {language === 'ar' ? request.description_ar : request.description_en}
                        </p>
                        
                        <div className={cn(
                          "flex items-center gap-4 text-sm text-muted-foreground",
                          isRTL && "flex-row-reverse"
                        )}>
                          <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                            <Calendar className="h-4 w-4" />
                            {formatDate(request.requested_date, language)}
                          </span>
                          {request.due_date && (
                            <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                              <Timer className="h-4 w-4" />
                              {isRTL ? 'مطلوب بحلول:' : 'Due:'} {formatDate(request.due_date, language)}
                            </span>
                          )}
                          <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                            <FileText className="h-4 w-4" />
                            {getApprovalTypeLabel(request.approval_type, language)}
                          </span>
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
                          <DropdownMenuItem onClick={() => setAuditDialog(request)}>
                            <History className="h-4 w-4 mr-2" />
                            {isRTL ? 'سجل المراجعة' : 'Audit Trail'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Share')}>
                            <Share className="h-4 w-4 mr-2" />
                            {isRTL ? 'مشاركة' : 'Share'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Approval Progress */}
                    <div className="mb-4">
                      <div className={cn(
                        "flex items-center justify-between mb-2",
                        isRTL && "flex-row-reverse"
                      )}>
                        <span className="text-sm font-medium">
                          {isRTL ? 'تقدم الموافقة' : 'Approval Progress'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {requestActions.filter(a => a.action_type === 'approved').length}/{request.required_approvers.length}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Workflow Steps */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">
                        {isRTL ? 'خطوات التدفق' : 'Workflow Steps'}
                      </h4>
                      <div className={cn(
                        "flex items-center gap-2",
                        isRTL && "flex-row-reverse"
                      )}>
                        {request.workflow_steps.map((step, index) => (
                          <React.Fragment key={step.step_number}>
                            <div className={cn(
                              "flex items-center gap-2 px-3 py-1 rounded-full text-xs",
                              step.status === 'completed' ? 'bg-green-100 text-green-800' :
                              step.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            )}>
                              {step.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                              {step.status === 'in_progress' && <Clock className="h-3 w-3" />}
                              {step.status === 'pending' && <AlertCircle className="h-3 w-3" />}
                              {language === 'ar' ? step.step_name_ar : step.step_name_en}
                            </div>
                            {index < request.workflow_steps.length - 1 && (
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {userCanApprove && !userHasApproved && ['pending_review', 'under_review'].includes(request.request_status) && (
                      <div className={cn(
                        "flex items-center gap-2 pt-4 border-t",
                        isRTL && "flex-row-reverse"
                      )}>
                        <Button 
                          size="sm" 
                          onClick={() => setSignatureDialog(request)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCheck className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                          {isRTL ? 'موافقة ووقع' : 'Approve & Sign'}
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleReject(request.id, 'User rejection')}
                        >
                          <X className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                          {isRTL ? 'رفض' : 'Reject'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRequestChanges(request.id, 'Requested changes')}
                        >
                          <Edit className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                          {isRTL ? 'طلب تعديلات' : 'Request Changes'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setDelegationDialog(request)}
                        >
                          <User className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                          {isRTL ? 'تفويض' : 'Delegate'}
                        </Button>
                      </div>
                    )}

                    {/* Show if user has already approved */}
                    {userHasApproved && (
                      <div className={cn(
                        "flex items-center gap-2 pt-4 border-t text-green-600",
                        isRTL && "flex-row-reverse"
                      )}>
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {isRTL ? 'لقد وافقت على هذا الطلب' : 'You have approved this request'}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredRequests.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{isRTL ? 'لا توجد طلبات موافقة' : 'No approval requests found'}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Tabs>

      {/* Digital Signature Dialog */}
      <Dialog open={!!signatureDialog} onOpenChange={(open) => !open && setSignatureDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'الموافقة والتوقيع الرقمي' : 'Approval & Digital Signature'}
            </DialogTitle>
            <DialogDescription>
              {isRTL 
                ? 'أضف توقيعك الرقمي لإتمام الموافقة على هذا الطلب'
                : 'Add your digital signature to complete approval of this request'
              }
            </DialogDescription>
          </DialogHeader>
          
          {signatureDialog && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">
                  {language === 'ar' ? signatureDialog.title_ar : signatureDialog.title_en}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? signatureDialog.description_ar : signatureDialog.description_en}
                </p>
              </div>

              <Separator />

              <div>
                <Label htmlFor="approval-reason">{isRTL ? 'سبب الموافقة (اختياري)' : 'Approval Reason (Optional)'}</Label>
                <Textarea
                  id="approval-reason"
                  placeholder={isRTL ? 'اكتب سبب الموافقة...' : 'Write approval reason...'}
                  rows={3}
                />
              </div>

              <div>
                <Label>{isRTL ? 'نوع التوقيع' : 'Signature Type'}</Label>
                <Select defaultValue="electronic">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronic">{isRTL ? 'توقيع إلكتروني' : 'Electronic Signature'}</SelectItem>
                    <SelectItem value="digital">{isRTL ? 'توقيع رقمي' : 'Digital Signature'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <Signature className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {isRTL ? 'اضغط هنا لإضافة توقيعك' : 'Click here to add your signature'}
                </p>
                <Button variant="outline">
                  <Signature className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  {isRTL ? 'إضافة التوقيع' : 'Add Signature'}
                </Button>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>{isRTL ? 'إقرار قانوني' : 'Legal Disclaimer'}</AlertTitle>
                <AlertDescription>
                  {isRTL 
                    ? 'بالتوقيع أدناه، أؤكد موافقتي على محتويات هذا الطلب وأن جميع المعلومات صحيحة ودقيقة.'
                    : 'By signing below, I confirm my approval of the contents of this request and that all information is true and accurate.'
                  }
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSignatureDialog(null)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => {
              if (signatureDialog) {
                handleApprove(signatureDialog.id, 'signature_data')
                setSignatureDialog(null)
              }
            }}>
              <Signature className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? 'موافقة ووقع' : 'Approve & Sign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delegation Dialog */}
      <Dialog open={!!delegationDialog} onOpenChange={(open) => !open && setDelegationDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'تفويض الموافقة' : 'Delegate Approval'}</DialogTitle>
            <DialogDescription>
              {isRTL 
                ? 'فوض صلاحية الموافقة إلى عضو آخر في الفريق'
                : 'Delegate approval authority to another team member'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>{isRTL ? 'تفويض إلى' : 'Delegate To'}</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'اختر عضو الفريق' : 'Select team member'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member1">Dr. Sara Ahmed</SelectItem>
                  <SelectItem value="member2">Mr. Ali Mohammed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="delegation-reason">{isRTL ? 'سبب التفويض' : 'Delegation Reason'}</Label>
              <Textarea
                id="delegation-reason"
                placeholder={isRTL ? 'اكتب سبب التفويض...' : 'Write delegation reason...'}
                rows={3}
              />
            </div>
            
            <div>
              <Label>{isRTL ? 'مدة التفويض' : 'Delegation Duration'}</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'اختر المدة' : 'Select duration'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1day">{isRTL ? 'يوم واحد' : '1 Day'}</SelectItem>
                  <SelectItem value="3days">{isRTL ? '3 أيام' : '3 Days'}</SelectItem>
                  <SelectItem value="1week">{isRTL ? 'أسبوع واحد' : '1 Week'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDelegationDialog(null)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => {
              if (delegationDialog) {
                handleDelegate(delegationDialog.id, 'member1', 'Delegation reason')
              }
            }}>
              <User className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? 'تفويض' : 'Delegate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={!!auditDialog} onOpenChange={(open) => !open && setAuditDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'سجل المراجعة' : 'Audit Trail'}</DialogTitle>
            <DialogDescription>
              {isRTL 
                ? 'سجل كامل لجميع الإجراءات والتغييرات على هذا الطلب'
                : 'Complete log of all actions and changes on this request'
              }
            </DialogDescription>
          </DialogHeader>
          
          {auditDialog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {approvalActions
                  .filter(action => action.approval_request_id === auditDialog.id)
                  .map((action, index) => (
                    <div key={action.id} className={cn(
                      "flex items-start gap-4 p-4 border rounded-lg",
                      isRTL && "flex-row-reverse"
                    )}>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {(language === 'ar' ? action.approver_name_ar : action.approver_name_en)
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className={cn(
                          "flex items-center justify-between",
                          isRTL && "flex-row-reverse"
                        )}>
                          <div>
                            <p className="font-medium">
                              {language === 'ar' ? action.approver_name_ar : action.approver_name_en}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {action.approver_role}
                            </p>
                          </div>
                          <div className={cn(
                            "flex items-center gap-2",
                            isRTL && "flex-row-reverse"
                          )}>
                            <Badge className={
                              action.action_type === 'approved' ? 'bg-green-100 text-green-800' :
                              action.action_type === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {isRTL 
                                ? action.action_type === 'approved' ? 'موافق'
                                  : action.action_type === 'rejected' ? 'مرفوض'
                                  : 'طلب تغييرات'
                                : action.action_type
                              }
                            </Badge>
                            {action.signature_data && (
                              <Badge variant="outline" className="text-purple-600">
                                <Signature className="h-3 w-3 mr-1" />
                                {isRTL ? 'موقع' : 'Signed'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm mt-2">
                          {language === 'ar' ? action.decision_reason_ar : action.decision_reason_en}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {action.responded_date && formatDate(action.responded_date, language)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditDialog(null)}>
              {isRTL ? 'إغلاق' : 'Close'}
            </Button>
            <Button onClick={() => console.log('Export audit')}>
              <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? 'تصدير السجل' : 'Export Log'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default IEPApprovalWorkflow