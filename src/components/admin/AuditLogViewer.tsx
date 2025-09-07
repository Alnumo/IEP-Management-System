/**
 * Audit Log Viewer Component
 * Story 1.2: Security Compliance & Data Protection - AC: 3
 * Comprehensive audit trail viewer with filtering and compliance reporting
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { ScrollArea } from '../ui/scroll-area'
import { useLanguage } from '../../contexts/LanguageContext'
import { auditService } from '../../services/audit-service'
import type { AuditEvent } from '../../services/audit-service'
import { 
  Search, 
  Download, 
  Filter, 
  AlertTriangle, 
  Shield, 
  Eye, 
  Calendar,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { DateRangePicker } from '../ui/date-range-picker'

interface AuditLogViewerProps {
  className?: string
  compactMode?: boolean
  showFilters?: boolean
  maxHeight?: string
}

interface AuditLogFilters {
  startDate?: string
  endDate?: string
  eventCategory?: string
  riskLevel?: string
  userId?: string
  searchTerm?: string
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  className = '',
  compactMode = false,
  showFilters = true,
  maxHeight = '600px'
}) => {
  const { t, language, isRTL } = useLanguage()

  // State management
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [totalCount, setTotalCount] = useState(0)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  
  // Filters
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Selected log for details modal
  const [selectedLog, setSelectedLog] = useState<any>(null)
  
  // Compliance report generation
  const [generatingReport, setGeneratingReport] = useState(false)

  // Load audit logs
  const loadAuditLogs = async (page = 1, newFilters = filters) => {
    setLoading(true)
    setError('')
    
    try {
      const offset = (page - 1) * pageSize
      
      const auditLogs = await auditService.getAuditLogs({
        startDate: newFilters.startDate,
        endDate: newFilters.endDate,
        eventCategory: newFilters.eventCategory,
        riskLevel: newFilters.riskLevel,
        userId: newFilters.userId,
        limit: pageSize,
        offset
      })
      
      setLogs(auditLogs)
      // Note: We'd need to modify the service to return total count for proper pagination
      setTotalCount(auditLogs.length) // Placeholder
      setCurrentPage(page)
    } catch (err: any) {
      console.error('Error loading audit logs:', err)
      setError(err.message || t('audit.errors.loadFailed', 'Failed to load audit logs'))
      toast.error(t('audit.errors.loadFailed', 'Failed to load audit logs'))
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadAuditLogs()
  }, [])

  // Filter change handler
  const handleFiltersChange = (newFilters: Partial<AuditLogFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    loadAuditLogs(1, updatedFilters)
  }

  // Generate compliance report
  const generateComplianceReport = async () => {
    setGeneratingReport(true)
    
    try {
      const report = await auditService.generateComplianceReport({
        start_date: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: filters.endDate || new Date().toISOString().split('T')[0],
        compliance_framework: 'HIPAA'
      })
      
      // Create downloadable report
      const reportData = JSON.stringify(report, null, 2)
      const blob = new Blob([reportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(t('audit.report.generated', 'Compliance report generated successfully'))
    } catch (err: any) {
      console.error('Error generating report:', err)
      toast.error(t('audit.errors.reportFailed', 'Failed to generate compliance report'))
    } finally {
      setGeneratingReport(false)
    }
  }

  // Risk level color mapping
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Event category icon mapping
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medical_access':
        return <FileText className="w-4 h-4" />
      case 'authentication':
        return <User className="w-4 h-4" />
      case 'security_violation':
        return <AlertTriangle className="w-4 h-4" />
      case 'system_access':
        return <Shield className="w-4 h-4" />
      default:
        return <Eye className="w-4 h-4" />
    }
  }

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss')
    } catch {
      return timestamp
    }
  }

  // Pagination controls
  const totalPages = Math.ceil(totalCount / pageSize)

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`space-y-6 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {t('audit.title', 'Audit Trail Viewer')}
          </h2>
          <p className="text-muted-foreground">
            {t('audit.description', 'View and analyze system audit logs for compliance')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadAuditLogs(currentPage)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </Button>
          <Button
            onClick={generateComplianceReport}
            disabled={generatingReport}
          >
            <Download className="w-4 h-4 mr-2" />
            {generatingReport 
              ? t('audit.report.generating', 'Generating...') 
              : t('audit.report.generate', 'Generate Report')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {t('audit.filters.title', 'Filters')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <Label>{t('audit.filters.dateRange', 'Date Range')}</Label>
                <DateRangePicker
                  onDateChange={(range) => {
                    handleFiltersChange({
                      startDate: range?.from?.toISOString(),
                      endDate: range?.to?.toISOString()
                    })
                  }}
                />
              </div>

              {/* Event Category */}
              <div>
                <Label>{t('audit.filters.category', 'Event Category')}</Label>
                <Select
                  value={filters.eventCategory || ''}
                  onValueChange={(value) => handleFiltersChange({ 
                    eventCategory: value === 'all' ? undefined : value 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('audit.filters.selectCategory', 'Select category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                    <SelectItem value="medical_access">{t('audit.categories.medical', 'Medical Access')}</SelectItem>
                    <SelectItem value="authentication">{t('audit.categories.auth', 'Authentication')}</SelectItem>
                    <SelectItem value="security_violation">{t('audit.categories.security', 'Security Violation')}</SelectItem>
                    <SelectItem value="system_access">{t('audit.categories.system', 'System Access')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Risk Level */}
              <div>
                <Label>{t('audit.filters.riskLevel', 'Risk Level')}</Label>
                <Select
                  value={filters.riskLevel || ''}
                  onValueChange={(value) => handleFiltersChange({ 
                    riskLevel: value === 'all' ? undefined : value 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('audit.filters.selectRisk', 'Select risk level')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                    <SelectItem value="critical">{t('audit.risk.critical', 'Critical')}</SelectItem>
                    <SelectItem value="high">{t('audit.risk.high', 'High')}</SelectItem>
                    <SelectItem value="medium">{t('audit.risk.medium', 'Medium')}</SelectItem>
                    <SelectItem value="low">{t('audit.risk.low', 'Low')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* User ID Search */}
              <div>
                <Label>{t('audit.filters.userId', 'User ID')}</Label>
                <Input
                  placeholder={t('audit.filters.userIdPlaceholder', 'Enter user ID')}
                  value={filters.userId || ''}
                  onChange={(e) => handleFiltersChange({ userId: e.target.value || undefined })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('audit.logs.title', 'Audit Logs')}</CardTitle>
          <CardDescription>
            {t('audit.logs.count', 'Showing {{count}} logs', { count: logs.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea style={{ height: maxHeight }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('audit.table.timestamp', 'Timestamp')}</TableHead>
                  <TableHead>{t('audit.table.category', 'Category')}</TableHead>
                  <TableHead>{t('audit.table.operation', 'Operation')}</TableHead>
                  <TableHead>{t('audit.table.user', 'User')}</TableHead>
                  <TableHead>{t('audit.table.risk', 'Risk Level')}</TableHead>
                  <TableHead>{t('audit.table.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      {t('common.loading', 'Loading...')}
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('audit.logs.empty', 'No audit logs found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(log.event_category)}
                          <span className="capitalize">
                            {t(`audit.categories.${log.event_category}`, log.event_category.replace('_', ' '))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.operation}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-sm">{log.user_id?.slice(0, 8)}...</span>
                          <span className="text-xs text-muted-foreground">{log.user_role}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRiskLevelColor(log.risk_level)}>
                          {t(`audit.risk.${log.risk_level}`, log.risk_level)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                              <Eye className="w-4 h-4 mr-1" />
                              {t('audit.actions.view', 'View')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>{t('audit.details.title', 'Audit Log Details')}</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh]">
                              <div className="space-y-4">
                                {/* Basic Information */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>{t('audit.details.timestamp', 'Timestamp')}</Label>
                                    <div className="font-mono text-sm bg-muted p-2 rounded">
                                      {formatTimestamp(log.timestamp)}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>{t('audit.details.operation', 'Operation')}</Label>
                                    <div className="font-medium p-2 bg-muted rounded">
                                      {log.operation}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>{t('audit.details.table', 'Table')}</Label>
                                    <div className="p-2 bg-muted rounded">
                                      {log.table_name}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>{t('audit.details.recordId', 'Record ID')}</Label>
                                    <div className="font-mono text-sm p-2 bg-muted rounded">
                                      {log.record_id}
                                    </div>
                                  </div>
                                </div>

                                {/* User Information */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>{t('audit.details.userId', 'User ID')}</Label>
                                    <div className="font-mono text-sm p-2 bg-muted rounded">
                                      {log.user_id}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>{t('audit.details.userRole', 'User Role')}</Label>
                                    <div className="p-2 bg-muted rounded">
                                      {log.user_role}
                                    </div>
                                  </div>
                                </div>

                                {/* Network Information */}
                                {(log.ip_address || log.user_agent) && (
                                  <div className="space-y-2">
                                    <Label>{t('audit.details.network', 'Network Information')}</Label>
                                    {log.ip_address && (
                                      <div>
                                        <span className="text-sm font-medium">IP Address: </span>
                                        <span className="font-mono text-sm">{log.ip_address}</span>
                                      </div>
                                    )}
                                    {log.user_agent && (
                                      <div>
                                        <span className="text-sm font-medium">User Agent: </span>
                                        <span className="text-sm text-muted-foreground">{log.user_agent}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Compliance Tags */}
                                {log.compliance_tags && log.compliance_tags.length > 0 && (
                                  <div>
                                    <Label>{t('audit.details.compliance', 'Compliance Tags')}</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {log.compliance_tags.map((tag: string) => (
                                        <Badge key={tag} variant="secondary">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Additional Metadata */}
                                {log.additional_metadata && Object.keys(log.additional_metadata).length > 0 && (
                                  <div>
                                    <Label>{t('audit.details.metadata', 'Additional Metadata')}</Label>
                                    <Textarea
                                      value={JSON.stringify(log.additional_metadata, null, 2)}
                                      readOnly
                                      className="font-mono text-sm h-32 mt-2"
                                    />
                                  </div>
                                )}

                                {/* Data Changes */}
                                {(log.old_data || log.new_data) && (
                                  <div className="space-y-4">
                                    <Label>{t('audit.details.dataChanges', 'Data Changes')}</Label>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      {log.old_data && (
                                        <div>
                                          <Label className="text-sm">{t('audit.details.oldData', 'Previous Data')}</Label>
                                          <Textarea
                                            value={JSON.stringify(log.old_data, null, 2)}
                                            readOnly
                                            className="font-mono text-sm h-32 mt-1"
                                          />
                                        </div>
                                      )}
                                      {log.new_data && (
                                        <div>
                                          <Label className="text-sm">{t('audit.details.newData', 'Current Data')}</Label>
                                          <Textarea
                                            value={JSON.stringify(log.new_data, null, 2)}
                                            readOnly
                                            className="font-mono text-sm h-32 mt-1"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Pagination */}
          {!loading && logs.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {t('audit.pagination.showing', 'Page {{current}} of {{total}}', {
                  current: currentPage,
                  total: totalPages
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadAuditLogs(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('common.previous', 'Previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadAuditLogs(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                >
                  {t('common.next', 'Next')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AuditLogViewer