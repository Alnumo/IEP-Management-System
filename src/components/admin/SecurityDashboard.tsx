import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Alert, AlertDescription } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  Clock, 
  Ban,
  Settings,
  Eye,
  X,
  Plus,
  RefreshCw
} from 'lucide-react'
import { useAPISecurity } from '../../hooks/useAPISecurity'
import { useLanguage } from '../../contexts/LanguageContext'
import { RateLimitRule, SecurityEvent } from '../../services/api-security-service'

const SecurityDashboard: React.FC = () => {
  const { language, isRTL, t } = useLanguage()
  const {
    securityDashboard,
    securityEvents,
    rateLimitRules,
    activeSessions,
    securityAlerts,
    sessionWarnings,
    isLoading,
    getSecurityStatus,
    getSecurityRecommendations,
    formatSecurityEvent,
    createRateLimit,
    terminateSession,
    cleanupSessions,
    refetchDashboard,
    refetchSecurityEvents,
    refetchSessions
  } = useAPISececurity({ 
    enabled: true, 
    monitorSessions: true, 
    autoRefresh: true 
  })

  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [newRuleDialog, setNewRuleDialog] = useState(false)
  const [newRule, setNewRule] = useState<Partial<RateLimitRule>>({
    endpoint_pattern: '',
    max_requests: 100,
    time_window_seconds: 3600,
    user_role: null,
    enabled: true
  })

  const handleCreateRule = async () => {
    try {
      await createRateLimit(newRule as Omit<RateLimitRule, 'id' | 'created_at' | 'updated_at'>)
      setNewRuleDialog(false)
      setNewRule({
        endpoint_pattern: '',
        max_requests: 100,
        time_window_seconds: 3600,
        user_role: null,
        enabled: true
      })
    } catch (error) {
      console.error('Error creating rate limit rule:', error)
    }
  }

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await terminateSession({ sessionId, reason: 'MANUAL_ADMIN_TERMINATION' })
    } catch (error) {
      console.error('Error terminating session:', error)
    }
  }

  const handleCleanupSessions = async () => {
    try {
      await cleanupSessions()
    } catch (error) {
      console.error('Error cleaning up sessions:', error)
    }
  }

  const getSeverityColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'default'
      case 'LOW': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MEDIUM': return 'text-yellow-600'
      case 'LOW': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const recommendations = getSecurityRecommendations()
  const securityStatus = getSecurityStatus()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
          {t('security.dashboard.loading', 'Loading security dashboard...')}
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
            {t('security.dashboard.title', 'Security Dashboard')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.dashboard.subtitle', 'Monitor and manage API security')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(securityStatus)}>
            <Shield className="h-4 w-4 mr-1" />
            {t(`security.status.${securityStatus.toLowerCase()}`, securityStatus)}
          </Badge>
          <Button onClick={refetchDashboard} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Security Alerts */}
      {securityAlerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('security.alerts.recent', `${securityAlerts.length} recent security events require attention`)}
          </AlertDescription>
        </Alert>
      )}

      {/* Session Warnings */}
      {sessionWarnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {sessionWarnings.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.cards.rate_violations', 'Rate Limit Violations')}
            </CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityDashboard?.rate_limit_violations_24h || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('security.cards.last_24h', 'Last 24 hours')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.cards.active_sessions', 'Active Sessions')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityDashboard?.active_sessions_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('security.cards.current', 'Currently active')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.cards.blocked_requests', 'Blocked Requests')}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityDashboard?.blocked_requests_24h || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('security.cards.last_24h', 'Last 24 hours')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.cards.threat_score', 'Threat Score')}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityDashboard?.suspicious_activity_score || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('security.cards.out_of_100', 'Out of 100')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('security.recommendations.title', 'Security Recommendations')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <AlertTriangle className={`h-4 w-4 text-yellow-500 ${isRTL ? 'ml-2' : 'mr-2'} mt-0.5`} />
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed views */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">
            {t('security.tabs.events', 'Security Events')}
          </TabsTrigger>
          <TabsTrigger value="sessions">
            {t('security.tabs.sessions', 'Active Sessions')}
          </TabsTrigger>
          <TabsTrigger value="rate-limits">
            {t('security.tabs.rate_limits', 'Rate Limits')}
          </TabsTrigger>
        </TabsList>

        {/* Security Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {t('security.events.title', 'Recent Security Events')}
                  </CardTitle>
                  <CardDescription>
                    {t('security.events.description', 'Monitor security violations and threats')}
                  </CardDescription>
                </div>
                <Button onClick={refetchSecurityEvents} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityEvents.slice(0, 20).map((event) => {
                  const formattedEvent = formatSecurityEvent(event)
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-center space-x-4">
                        <Badge variant={getSeverityColor(event.severity)}>
                          {event.severity}
                        </Badge>
                        <div>
                          <p className="font-medium">{formattedEvent.displayName}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.endpoint} • {formattedEvent.timeAgo}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {event.blocked && (
                          <Badge variant="destructive" className="mr-2">
                            {t('security.events.blocked', 'Blocked')}
                          </Badge>
                        )}
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )
                })}
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
                    {t('security.sessions.title', 'Active Sessions')}
                  </CardTitle>
                  <CardDescription>
                    {t('security.sessions.description', 'Monitor and manage user sessions')}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleCleanupSessions} variant="outline" size="sm">
                    <Clock className="h-4 w-4 mr-1" />
                    {t('security.sessions.cleanup', 'Cleanup')}
                  </Button>
                  <Button onClick={refetchSessions} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeSessions.slice(0, 20).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{session.user_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.ip_address} • {new Date(session.last_activity_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleTerminateSession(session.id)}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t('security.sessions.terminate', 'Terminate')}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rate Limits Tab */}
        <TabsContent value="rate-limits">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {t('security.rate_limits.title', 'Rate Limit Rules')}
                  </CardTitle>
                  <CardDescription>
                    {t('security.rate_limits.description', 'Configure API rate limiting')}
                  </CardDescription>
                </div>
                <Dialog open={newRuleDialog} onOpenChange={setNewRuleDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('security.rate_limits.add', 'Add Rule')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {t('security.rate_limits.new_rule', 'New Rate Limit Rule')}
                      </DialogTitle>
                      <DialogDescription>
                        {t('security.rate_limits.new_rule_desc', 'Create a new rate limiting rule')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="endpoint-pattern">
                          {t('security.rate_limits.endpoint_pattern', 'Endpoint Pattern')}
                        </Label>
                        <Input
                          id="endpoint-pattern"
                          value={newRule.endpoint_pattern}
                          onChange={(e) => setNewRule(prev => ({ ...prev, endpoint_pattern: e.target.value }))}
                          placeholder="^/api/.*"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-requests">
                          {t('security.rate_limits.max_requests', 'Max Requests')}
                        </Label>
                        <Input
                          id="max-requests"
                          type="number"
                          value={newRule.max_requests}
                          onChange={(e) => setNewRule(prev => ({ ...prev, max_requests: parseInt(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="time-window">
                          {t('security.rate_limits.time_window', 'Time Window (seconds)')}
                        </Label>
                        <Input
                          id="time-window"
                          type="number"
                          value={newRule.time_window_seconds}
                          onChange={(e) => setNewRule(prev => ({ ...prev, time_window_seconds: parseInt(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-role">
                          {t('security.rate_limits.user_role', 'User Role')}
                        </Label>
                        <Select
                          value={newRule.user_role || ''}
                          onValueChange={(value) => setNewRule(prev => ({ ...prev, user_role: value || null }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('security.rate_limits.all_roles', 'All Roles')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{t('security.rate_limits.all_roles', 'All Roles')}</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="therapist">Therapist</SelectItem>
                            <SelectItem value="receptionist">Receptionist</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateRule}>
                        {t('security.rate_limits.create', 'Create Rule')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rateLimitRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{rule.endpoint_pattern}</p>
                      <p className="text-sm text-muted-foreground">
                        {rule.max_requests} requests per {rule.time_window_seconds}s
                        {rule.user_role && ` • ${rule.user_role}`}
                      </p>
                    </div>
                    <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                      {rule.enabled ? t('security.enabled', 'Enabled') : t('security.disabled', 'Disabled')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t('security.event_details.title', 'Security Event Details')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('security.event_details.type', 'Event Type')}</Label>
                <p>{formatSecurityEvent(selectedEvent).displayName}</p>
              </div>
              <div>
                <Label>{t('security.event_details.severity', 'Severity')}</Label>
                <Badge variant={getSeverityColor(selectedEvent.severity)}>
                  {selectedEvent.severity}
                </Badge>
              </div>
              <div>
                <Label>{t('security.event_details.endpoint', 'Endpoint')}</Label>
                <p>{selectedEvent.endpoint}</p>
              </div>
              <div>
                <Label>{t('security.event_details.ip', 'IP Address')}</Label>
                <p>{selectedEvent.ip_address}</p>
              </div>
              <div>
                <Label>{t('security.event_details.time', 'Time')}</Label>
                <p>{new Date(selectedEvent.created_at).toLocaleString()}</p>
              </div>
              {selectedEvent.request_details && Object.keys(selectedEvent.request_details).length > 0 && (
                <div>
                  <Label>{t('security.event_details.details', 'Details')}</Label>
                  <pre className="text-xs bg-muted p-2 rounded">
                    {JSON.stringify(selectedEvent.request_details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default SecurityDashboard