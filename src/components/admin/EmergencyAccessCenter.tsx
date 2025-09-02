import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Alert, AlertDescription } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { 
  AlertTriangle, 
  Clock, 
  Shield, 
  Eye, 
  CheckCircle,
  XCircle,
  PlayCircle,
  StopCircle,
  Users,
  Bell,
  Activity,
  RefreshCw,
  Plus,
  Phone,
  Mail
} from 'lucide-react'
import { useEmergencyAccess } from '../../hooks/useEmergencyAccess'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../auth/AuthGuard'
import { EmergencyAccessRequest, EmergencyAccessSession } from '../../services/emergency-access-service'

const EmergencyAccessCenter: React.FC = () => {
  const { language, isRTL, t } = useLanguage()
  const { user } = useAuth()
  const {
    emergencyRequests,
    myRequests,
    activeSessions,
    emergencyStats,
    selectedRequest,
    currentSession,
    isLoading,
    isApprovingRequest,
    isDenyingRequest,
    isStartingSession,
    isTerminatingSession,
    approveRequest,
    denyRequest,
    startSession,
    terminateSession,
    setSelectedRequest,
    formatEmergencyType,
    formatAccessLevel,
    getStatusColor,
    getPriorityLevel,
    needsImmediateAttention,
    getTimeRemaining,
    refetchRequests,
    refetchSessions
  } = useEmergencyAccess({ 
    enabled: true, 
    autoRefresh: true, 
    monitorSessions: true 
  })

  const [approvalDialog, setApprovalDialog] = useState(false)
  const [denialDialog, setDenialDialog] = useState(false)
  const [terminationDialog, setTerminationDialog] = useState(false)
  const [denialReason, setDenialReason] = useState('')
  const [terminationReason, setTerminationReason] = useState('MANUAL_TERMINATION')
  const [terminationNotes, setTerminationNotes] = useState('')
  const [approvalConditions, setApprovalConditions] = useState<{
    access_level?: string
    expires_in_hours?: number
    notes?: string
  }>({})

  const handleApproveRequest = async () => {
    if (!selectedRequest || !user?.id) return

    try {
      await approveRequest({
        requestId: selectedRequest.id,
        approverId: user.id,
        conditions: {
          access_level: approvalConditions.access_level || selectedRequest.access_level,
          expires_in_hours: approvalConditions.expires_in_hours || 24,
          additional_notes: approvalConditions.notes
        }
      })
      setApprovalDialog(false)
      setSelectedRequest(null)
      setApprovalConditions({})
    } catch (error) {
      console.error('Error approving request:', error)
    }
  }

  const handleDenyRequest = async () => {
    if (!selectedRequest || !user?.id) return

    try {
      await denyRequest({
        requestId: selectedRequest.id,
        deniedBy: user.id,
        reason: denialReason
      })
      setDenialDialog(false)
      setSelectedRequest(null)
      setDenialReason('')
    } catch (error) {
      console.error('Error denying request:', error)
    }
  }

  const handleStartSession = async (requestId: string) => {
    try {
      await startSession(requestId)
    } catch (error) {
      console.error('Error starting session:', error)
    }
  }

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await terminateSession({
        sessionId,
        reason: terminationReason,
        notes: terminationNotes
      })
      setTerminationDialog(false)
      setTerminationReason('MANUAL_TERMINATION')
      setTerminationNotes('')
    } catch (error) {
      console.error('Error terminating session:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300'
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24)
      return t('time.days_ago', `${diffDays} days ago`)
    } else if (diffHours > 0) {
      return t('time.hours_ago', `${diffHours}h ${diffMinutes}m ago`)
    } else {
      return t('time.minutes_ago', `${diffMinutes}m ago`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
          {t('emergency.loading', 'Loading emergency access center...')}
        </span>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t('emergency.center.title', 'Emergency Access Center')}
          </h1>
          <p className="text-muted-foreground">
            {t('emergency.center.subtitle', 'Manage critical medical access requests and sessions')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={refetchRequests} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* High Priority Alerts */}
      {emergencyRequests.filter(req => needsImmediateAttention(req)).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('emergency.urgent_attention', `${emergencyRequests.filter(req => needsImmediateAttention(req)).length} emergency requests need immediate attention`)}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('emergency.stats.requests_24h', 'Requests (24h)')}
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emergencyStats?.total_requests_24h || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {emergencyStats?.approved_requests_24h || 0} {t('emergency.stats.approved', 'approved')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('emergency.stats.active_sessions', 'Active Sessions')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emergencyStats?.active_sessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('emergency.stats.currently_active', 'Currently active')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('emergency.stats.response_time', 'Avg Response')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(emergencyStats?.average_response_time_minutes || 0)}m
            </div>
            <p className="text-xs text-muted-foreground">
              {t('emergency.stats.minutes', 'minutes')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('emergency.stats.critical_requests', 'Critical Requests')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emergencyStats?.requests_by_type?.LIFE_THREATENING || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('emergency.stats.life_threatening', 'Life threatening')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="requests" className="w-full">
        <TabsList>
          <TabsTrigger value="requests">
            {t('emergency.tabs.requests', 'Requests')} 
            {emergencyRequests.filter(req => req.status === 'PENDING').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {emergencyRequests.filter(req => req.status === 'PENDING').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sessions">
            {t('emergency.tabs.sessions', 'Active Sessions')}
          </TabsTrigger>
          <TabsTrigger value="my-requests">
            {t('emergency.tabs.my_requests', 'My Requests')}
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {t('emergency.requests.title', 'Emergency Access Requests')}
                  </CardTitle>
                  <CardDescription>
                    {t('emergency.requests.description', 'Review and approve emergency medical access requests')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emergencyRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('emergency.no_requests', 'No emergency requests at this time')}
                  </div>
                ) : (
                  emergencyRequests.map((request) => {
                    const priority = getPriorityLevel(request.emergency_type)
                    const timeRemaining = getTimeRemaining(request.expires_at)
                    const isUrgent = needsImmediateAttention(request)
                    
                    return (
                      <div
                        key={request.id}
                        className={`p-4 border rounded-lg ${isUrgent ? 'border-red-300 bg-red-50' : 'hover:bg-muted/50'} cursor-pointer`}
                        onClick={() => setSelectedRequest(request)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`px-2 py-1 rounded text-xs border ${getPriorityColor(priority)}`}>
                              {priority}
                            </div>
                            <Badge variant={getStatusColor(request.status) as any}>
                              {request.status}
                            </Badge>
                            <div>
                              <p className="font-medium">
                                {formatEmergencyType(request.emergency_type)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatTimeAgo(request.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${timeRemaining.expired ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {timeRemaining.text}
                            </span>
                            {request.status === 'PENDING' && (
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedRequest(request)
                                    setApprovalDialog(true)
                                  }}
                                  disabled={isApprovingRequest}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedRequest(request)
                                    setDenialDialog(true)
                                  }}
                                  disabled={isDenyingRequest}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {request.status === 'APPROVED' && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartSession(request.id)
                                }}
                                disabled={isStartingSession}
                              >
                                <PlayCircle className="h-4 w-4 mr-1" />
                                {t('emergency.start_session', 'Start Session')}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm">{request.reason}</p>
                          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                            <span>{formatAccessLevel(request.access_level)}</span>
                            <span>Patient ID: {request.patient_id}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {t('emergency.sessions.title', 'Active Emergency Sessions')}
                  </CardTitle>
                  <CardDescription>
                    {t('emergency.sessions.description', 'Monitor and manage active emergency access sessions')}
                  </CardDescription>
                </div>
                <Button onClick={refetchSessions} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('emergency.no_sessions', 'No active emergency sessions')}
                  </div>
                ) : (
                  activeSessions.map((session) => {
                    const timeRemaining = getTimeRemaining(session.expires_at)
                    
                    return (
                      <div
                        key={session.id}
                        className="p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {formatAccessLevel(session.access_level)} {t('emergency.session.access', 'Access')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t('emergency.session.started', 'Started')}: {formatTimeAgo(session.started_at)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t('emergency.session.patient', 'Patient')}: {session.patient_id}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className={`text-sm ${timeRemaining.expired ? 'text-red-600' : 'text-muted-foreground'}`}>
                                {timeRemaining.expired ? 
                                  t('emergency.expired', 'Expired') : 
                                  t('emergency.expires_in', 'Expires in') + ' ' + timeRemaining.text
                                }
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t('emergency.session.last_activity', 'Last activity')}: {formatTimeAgo(session.last_activity_at)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest({ id: session.id } as any)
                                setTerminationDialog(true)
                              }}
                              disabled={isTerminatingSession}
                            >
                              <StopCircle className="h-4 w-4 mr-1" />
                              {t('emergency.terminate', 'Terminate')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Requests Tab */}
        <TabsContent value="my-requests">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {t('emergency.my_requests.title', 'My Emergency Requests')}
                  </CardTitle>
                  <CardDescription>
                    {t('emergency.my_requests.description', 'View your submitted emergency access requests')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('emergency.no_my_requests', 'You have not submitted any emergency requests')}
                  </div>
                ) : (
                  myRequests.map((request) => {
                    const timeRemaining = getTimeRemaining(request.expires_at)
                    
                    return (
                      <div
                        key={request.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant={getStatusColor(request.status) as any}>
                                {request.status}
                              </Badge>
                              <span className="text-sm font-medium">
                                {formatEmergencyType(request.emergency_type)}
                              </span>
                            </div>
                            <p className="text-sm">{request.reason}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('emergency.submitted', 'Submitted')}: {formatTimeAgo(request.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm ${timeRemaining.expired ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {timeRemaining.text}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatAccessLevel(request.access_level)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('emergency.approve.title', 'Approve Emergency Access Request')}
            </DialogTitle>
            <DialogDescription>
              {t('emergency.approve.description', 'Review and approve this emergency access request')}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{formatEmergencyType(selectedRequest.emergency_type)}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t('emergency.approve.access_level', 'Access Level')}
                </label>
                <Select
                  value={approvalConditions.access_level || selectedRequest.access_level}
                  onValueChange={(value) => setApprovalConditions(prev => ({ ...prev, access_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="READ_ONLY">{formatAccessLevel('READ_ONLY')}</SelectItem>
                    <SelectItem value="LIMITED_EDIT">{formatAccessLevel('LIMITED_EDIT')}</SelectItem>
                    <SelectItem value="FULL_ACCESS">{formatAccessLevel('FULL_ACCESS')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t('emergency.approve.expires_in', 'Expires In (hours)')}
                </label>
                <Select
                  value={(approvalConditions.expires_in_hours || 24).toString()}
                  onValueChange={(value) => setApprovalConditions(prev => ({ ...prev, expires_in_hours: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 {t('emergency.hour', 'hour')}</SelectItem>
                    <SelectItem value="2">2 {t('emergency.hours', 'hours')}</SelectItem>
                    <SelectItem value="6">6 {t('emergency.hours', 'hours')}</SelectItem>
                    <SelectItem value="12">12 {t('emergency.hours', 'hours')}</SelectItem>
                    <SelectItem value="24">24 {t('emergency.hours', 'hours')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t('emergency.approve.notes', 'Approval Notes (Optional)')}
                </label>
                <Textarea
                  value={approvalConditions.notes || ''}
                  onChange={(e) => setApprovalConditions(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('emergency.approve.notes_placeholder', 'Additional conditions or notes...')}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)}>
              {t('emergency.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleApproveRequest} disabled={isApprovingRequest}>
              <CheckCircle className="h-4 w-4 mr-1" />
              {t('emergency.approve.button', 'Approve Request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Denial Dialog */}
      <Dialog open={denialDialog} onOpenChange={setDenialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('emergency.deny.title', 'Deny Emergency Access Request')}
            </DialogTitle>
            <DialogDescription>
              {t('emergency.deny.description', 'Please provide a reason for denying this request')}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">
              {t('emergency.deny.reason', 'Denial Reason')}
            </label>
            <Textarea
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder={t('emergency.deny.reason_placeholder', 'Explain why this request is being denied...')}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenialDialog(false)}>
              {t('emergency.cancel', 'Cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDenyRequest} 
              disabled={isDenyingRequest || !denialReason}
            >
              <XCircle className="h-4 w-4 mr-1" />
              {t('emergency.deny.button', 'Deny Request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Termination Dialog */}
      <Dialog open={terminationDialog} onOpenChange={setTerminationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('emergency.terminate.title', 'Terminate Emergency Session')}
            </DialogTitle>
            <DialogDescription>
              {t('emergency.terminate.description', 'End this emergency access session')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {t('emergency.terminate.reason', 'Termination Reason')}
              </label>
              <Select value={terminationReason} onValueChange={setTerminationReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL_TERMINATION">{t('emergency.terminate.manual', 'Manual Termination')}</SelectItem>
                  <SelectItem value="EMERGENCY_RESOLVED">{t('emergency.terminate.resolved', 'Emergency Resolved')}</SelectItem>
                  <SelectItem value="SECURITY_CONCERN">{t('emergency.terminate.security', 'Security Concern')}</SelectItem>
                  <SelectItem value="POLICY_VIOLATION">{t('emergency.terminate.policy', 'Policy Violation')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">
                {t('emergency.terminate.notes', 'Session Notes (Optional)')}
              </label>
              <Textarea
                value={terminationNotes}
                onChange={(e) => setTerminationNotes(e.target.value)}
                placeholder={t('emergency.terminate.notes_placeholder', 'Any additional notes about this session...')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminationDialog(false)}>
              {t('emergency.cancel', 'Cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedRequest && handleTerminateSession(selectedRequest.id)} 
              disabled={isTerminatingSession}
            >
              <StopCircle className="h-4 w-4 mr-1" />
              {t('emergency.terminate.button', 'Terminate Session')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EmergencyAccessCenter