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
  Settings,
  Plus,
  Upload,
  Pencil,
  Verified
} from 'lucide-react'

import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  iepApprovalService,
  type ApprovalRequest,
  type ApprovalAction,
  type CreateApprovalRequestData,
  type ApprovalActionData,
  type ApprovalStatus,
  type ApprovalType,
  type ApprovalRole
} from '@/services/iep-approval-service'

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type SignatureType = 
  | 'electronic'
  | 'digital'
  | 'wet_signature'
  | 'voice_confirmation'

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
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ApprovalStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ApprovalType>('all')
  const [signatureDialog, setSignatureDialog] = useState<ApprovalRequest | null>(null)
  const [delegationDialog, setDelegationDialog] = useState<ApprovalRequest | null>(null)
  const [auditDialog, setAuditDialog] = useState<ApprovalRequest | null>(null)
  const [createRequestDialog, setCreateRequestDialog] = useState(false)
  const [signatureData, setSignatureData] = useState<string>('')
  const [approvalReason, setApprovalReason] = useState('')
  
  // Fetch approval requests
  const { data: approvalRequests = [], isLoading: requestsLoading, error: requestsError } = useQuery({
    queryKey: ['approval-requests', iepId, statusFilter, typeFilter],
    queryFn: async (): Promise<ApprovalRequest[]> => {
      const result = await iepApprovalService.getApprovalRequests(iepId, {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        includeCompleted: activeTab === 'completed' || activeTab === 'all'
      })
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch approval requests')
      }
      
      return result.data || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  })

  // Fetch approval actions for all requests
  const { data: allApprovalActions = [] } = useQuery({
    queryKey: ['approval-actions', approvalRequests.map(r => r.id)],
    queryFn: async (): Promise<ApprovalAction[]> => {
      const allActions: ApprovalAction[] = []
      
      for (const request of approvalRequests) {
        const result = await iepApprovalService.getApprovalActions(request.id)
        if (result.success && result.data) {
          allActions.push(...result.data)
        }
      }
      
      return allActions
    },
    enabled: approvalRequests.length > 0,
    staleTime: 5 * 60 * 1000
  })

  // Create new approval request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: CreateApprovalRequestData) => {
      const result = await iepApprovalService.createApprovalRequest(data, currentUserId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create approval request')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] })
      setCreateRequestDialog(false)
      toast({
        title: isRTL ? "تم إنشاء الطلب" : "Request Created",
        description: isRTL ? "تم إنشاء طلب الموافقة بنجاح" : "Approval request created successfully"
      })
      onWorkflowUpdated?.()
    },
    onError: (error: Error) => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Submit approval action mutation
  const submitActionMutation = useMutation({
    mutationFn: async (params: {
      requestId: string
      actionData: ApprovalActionData
      userProfile: { name_ar: string; name_en: string; email: string }
    }) => {
      const result = await iepApprovalService.submitApprovalAction(
        params.requestId,
        params.actionData,
        currentUserId,
        userRole,
        params.userProfile
      )
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit approval action')
      }
      
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] })
      queryClient.invalidateQueries({ queryKey: ['approval-actions'] })
      setSignatureDialog(null)
      setDelegationDialog(null)
      setSignatureData('')
      setApprovalReason('')
      
      toast({
        title: isRTL ? "تم الإجراء" : "Action Completed",
        description: isRTL ? "تم تسجيل إجراءك بنجاح" : "Your action has been recorded successfully"
      })
      onWorkflowUpdated?.()
    },
    onError: (error: Error) => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })
  

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
  const handleApproveWithSignature = async () => {
    if (!signatureDialog) return
    
    // Get user profile - in a real app this would come from context/auth
    const userProfile = {
      name_ar: 'المستخدم الحالي', // Would be from user context
      name_en: 'Current User',
      email: 'user@example.com'
    }

    await submitActionMutation.mutateAsync({
      requestId: signatureDialog.id,
      actionData: {
        action_type: 'approved',
        decision_reason_ar: approvalReason,
        decision_reason_en: approvalReason,
        signature_type: 'electronic',
        signature_data: signatureData || `approved_${Date.now()}`
      },
      userProfile
    })
  }

  const handleReject = async (requestId: string, reason: string) => {
    const userProfile = {
      name_ar: 'المستخدم الحالي',
      name_en: 'Current User', 
      email: 'user@example.com'
    }

    await submitActionMutation.mutateAsync({
      requestId,
      actionData: {
        action_type: 'rejected',
        decision_reason_ar: reason,
        decision_reason_en: reason,
        signature_type: 'electronic'
      },
      userProfile
    })
  }

  const handleDelegate = async (requestId: string, delegateToId: string, reason: string) => {
    const userProfile = {
      name_ar: 'المستخدم الحالي',
      name_en: 'Current User',
      email: 'user@example.com'
    }

    await submitActionMutation.mutateAsync({
      requestId,
      actionData: {
        action_type: 'delegated',
        delegated_to: delegateToId,
        delegation_reason_ar: reason,
        delegation_reason_en: reason,
        signature_type: 'electronic'
      },
      userProfile
    })
  }

  const handleRequestChanges = async (requestId: string, changes: string) => {
    const userProfile = {
      name_ar: 'المستخدم الحالي',
      name_en: 'Current User',
      email: 'user@example.com'
    }

    await submitActionMutation.mutateAsync({
      requestId,
      actionData: {
        action_type: 'request_changes',
        suggested_changes_ar: changes,
        suggested_changes_en: changes,
        signature_type: 'electronic'
      },
      userProfile
    })
  }

  const handleRefreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['approval-requests'] })
    queryClient.invalidateQueries({ queryKey: ['approval-actions'] })
  }

  const handleCreateNewRequest = () => {
    setCreateRequestDialog(true)
  }

  const canUserApprove = (request: ApprovalRequest): boolean => {
    return request.required_approvers.includes(userRole) || 
           request.optional_approvers.includes(userRole)
  }

  const hasUserApproved = (request: ApprovalRequest): boolean => {
    return allApprovalActions.some(
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshData}
            disabled={requestsLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2", requestsLoading && "animate-spin")} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
          <Button size="sm" onClick={handleCreateNewRequest}>
            <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
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
                  {allApprovalActions.filter(a => a.signature_data).length}
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
            {requestsLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin opacity-50" />
                <p className="text-muted-foreground">
                  {isRTL ? 'تحميل البيانات...' : 'Loading data...'}
                </p>
              </div>
            ) : filteredRequests.map((request) => {
              const requestActions = allApprovalActions.filter(a => a.approval_request_id === request.id)
              const progress = calculateApprovalProgress(request, requestActions)
              const userCanApprove = canUserApprove(request)
              const userHasApproved = hasUserApproved(request)

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
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
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

              <div className="space-y-4">
                <Label>{isRTL ? 'التوقيع الرقمي' : 'Digital Signature'}</Label>
                {signatureData ? (
                  <div className="border rounded-lg p-4 bg-green-50">
                    <div className={cn(
                      "flex items-center gap-2 text-green-700",
                      isRTL && "flex-row-reverse"
                    )}>
                      <Verified className="h-5 w-5" />
                      <span className="font-medium">
                        {isRTL ? 'تم إضافة التوقيع بنجاح' : 'Signature Added Successfully'}
                      </span>
                    </div>
                    <p className="text-sm text-green-600 mt-2">
                      {isRTL 
                        ? `تم إنشاء التوقيع في ${new Date().toLocaleString('ar-SA')}`
                        : `Signature created at ${new Date().toLocaleString('en-US')}`
                      }
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setSignatureData('')}
                    >
                      <Pencil className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                      {isRTL ? 'تغيير التوقيع' : 'Change Signature'}
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                    <Signature className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      {isRTL ? 'اضغط هنا لإضافة توقيعك الرقمي' : 'Click here to add your digital signature'}
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Simulate signature creation - in real app would open signature pad
                        const timestamp = Date.now()
                        const simulatedSignature = `signature_${currentUserId}_${timestamp}`
                        setSignatureData(simulatedSignature)
                      }}
                    >
                      <Pencil className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                      {isRTL ? 'إضافة التوقيع' : 'Add Signature'}
                    </Button>
                  </div>
                )}
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
            <Button 
              onClick={handleApproveWithSignature}
              disabled={!signatureData || submitActionMutation.isPending}
            >
              {submitActionMutation.isPending && <RefreshCw className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />}
              {!submitActionMutation.isPending && <Signature className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />}
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

      {/* Create New Request Dialog */}
      <Dialog open={createRequestDialog} onOpenChange={setCreateRequestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'إنشاء طلب موافقة جديد' : 'Create New Approval Request'}
            </DialogTitle>
            <DialogDescription>
              {isRTL 
                ? 'أنشئ طلب موافقة جديد للبرنامج التعليمي الفردي'
                : 'Create a new approval request for IEP document or modification'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isRTL ? 'نوع الموافقة' : 'Approval Type'}</Label>
                <Select defaultValue="goal_modification">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial_iep">{getApprovalTypeLabel('initial_iep', language)}</SelectItem>
                    <SelectItem value="annual_review">{getApprovalTypeLabel('annual_review', language)}</SelectItem>
                    <SelectItem value="goal_modification">{getApprovalTypeLabel('goal_modification', language)}</SelectItem>
                    <SelectItem value="service_change">{getApprovalTypeLabel('service_change', language)}</SelectItem>
                    <SelectItem value="placement_change">{getApprovalTypeLabel('placement_change', language)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isRTL ? 'الأولوية' : 'Priority'}</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{isRTL ? 'منخفض' : 'Low'}</SelectItem>
                    <SelectItem value="medium">{isRTL ? 'متوسط' : 'Medium'}</SelectItem>
                    <SelectItem value="high">{isRTL ? 'عالي' : 'High'}</SelectItem>
                    <SelectItem value="urgent">{isRTL ? 'عاجل' : 'Urgent'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title-ar">{isRTL ? 'العنوان بالعربية' : 'Arabic Title'}</Label>
                <Input
                  id="title-ar"
                  placeholder={isRTL ? 'اكتب العنوان بالعربية...' : 'Enter Arabic title...'}
                />
              </div>
              <div>
                <Label htmlFor="title-en">{isRTL ? 'العنوان بالإنجليزية' : 'English Title'}</Label>
                <Input
                  id="title-en"
                  placeholder={isRTL ? 'اكتب العنوان بالإنجليزية...' : 'Enter English title...'}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="desc-ar">{isRTL ? 'الوصف بالعربية' : 'Arabic Description'}</Label>
                <Textarea
                  id="desc-ar"
                  placeholder={isRTL ? 'اكتب الوصف بالعربية...' : 'Enter Arabic description...'}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="desc-en">{isRTL ? 'الوصف بالإنجليزية' : 'English Description'}</Label>
                <Textarea
                  id="desc-en"
                  placeholder={isRTL ? 'اكتب الوصف بالإنجليزية...' : 'Enter English description...'}
                  rows={3}
                />
              </div>
            </div>
            
            <div>
              <Label>{isRTL ? 'الموافقين المطلوبين' : 'Required Approvers'}</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { role: 'coordinator', label_ar: 'المنسق', label_en: 'Coordinator' },
                  { role: 'special_education_teacher', label_ar: 'معلم التعليم الخاص', label_en: 'Special Education Teacher' },
                  { role: 'administrator', label_ar: 'الإدارة', label_en: 'Administrator' },
                  { role: 'parent_guardian', label_ar: 'ولي الأمر', label_en: 'Parent/Guardian' }
                ].map(({ role, label_ar, label_en }) => (
                  <div key={role} className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <input
                      type="checkbox"
                      id={`approver-${role}`}
                      defaultChecked={['coordinator', 'parent_guardian'].includes(role)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={`approver-${role}`} className="text-sm">
                      {language === 'ar' ? label_ar : label_en}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="due-date">{isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
              <Input
                id="due-date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRequestDialog(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={() => {
                // In a real implementation, would collect form data and call createRequestMutation
                const sampleRequestData: CreateApprovalRequestData = {
                  iep_id: iepId,
                  approval_type: 'goal_modification',
                  title_ar: 'طلب تعديل جديد',
                  title_en: 'New Modification Request',
                  description_ar: 'وصف الطلب',
                  description_en: 'Request description',
                  priority: 'medium',
                  required_approvers: ['coordinator', 'parent_guardian'],
                  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                }
                
                createRequestMutation.mutate(sampleRequestData)
              }}
              disabled={createRequestMutation.isPending}
            >
              {createRequestMutation.isPending && <RefreshCw className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />}
              {!createRequestMutation.isPending && <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />}
              {isRTL ? 'إنشاء الطلب' : 'Create Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default IEPApprovalWorkflow