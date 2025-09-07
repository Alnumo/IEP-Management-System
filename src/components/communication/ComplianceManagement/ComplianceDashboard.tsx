/**
 * Compliance Dashboard - Healthcare Communication Compliance Management
 * PDPL and medical privacy compliance monitoring and reporting
 * Arkan Al-Numo Center - Compliance Management System
 */

import React, { useState, useEffect } from 'react'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Lock,
  Eye,
  Download,
  Filter,
  Search,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Phone,
  Files,
  Key,
  Database,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { communicationComplianceService } from '@/services/communication-compliance'
import { messageEncryptionUtils } from '@/services/message-encryption-service'
import type { 
  ComplianceViolation, 
  AuditTrailEntry, 
  ComplianceReport 
} from '@/services/communication-compliance'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'

interface ComplianceMetrics {
  totalMessages: number
  encryptedMessages: number
  violations: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
  }
  auditTrailEntries: number
  dataRetentionCompliance: number
  encryptionCompliance: number
}

interface ComplianceDashboardProps {
  organizationId?: string
  userRole: 'admin' | 'compliance_officer' | 'manager'
  className?: string
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  organizationId,
  userRole,
  className
}) => {
  const { language, isRTL } = useLanguage()
  
  // State
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null)
  const [violations, setViolations] = useState<ComplianceViolation[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditTrailEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDateRange, setSelectedDateRange] = useState<{
    from: Date
    to: Date
  }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [activeReport, setActiveReport] = useState<ComplianceReport | null>(null)

  // Load compliance data
  useEffect(() => {
    loadComplianceData()
  }, [selectedDateRange])

  const loadComplianceData = async () => {
    setLoading(true)
    try {
      // Load compliance metrics
      await Promise.all([
        loadMetrics(),
        loadViolations(),
        loadAuditEntries()
      ])
    } catch (error) {
      console.error('Failed to load compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMetrics = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockMetrics: ComplianceMetrics = {
        totalMessages: 15420,
        encryptedMessages: 14876,
        violations: {
          total: 23,
          critical: 2,
          high: 5,
          medium: 8,
          low: 8
        },
        auditTrailEntries: 45230,
        dataRetentionCompliance: 96.5,
        encryptionCompliance: 96.5
      }
      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Failed to load metrics:', error)
    }
  }

  const loadViolations = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockViolations: ComplianceViolation[] = [
        {
          id: '1',
          rule_id: 'encryption-001',
          resource_type: 'message',
          resource_id: 'msg-123',
          violation_type: 'unencrypted_sensitive_content',
          severity: 'critical',
          description_ar: 'رسالة تحتوي على معلومات طبية حساسة غير مشفرة',
          description_en: 'Message contains unencrypted sensitive medical information',
          user_id: 'user-456',
          detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          metadata: { content_type: 'medical_diagnosis' }
        },
        {
          id: '2',
          rule_id: 'access-002',
          resource_type: 'conversation',
          resource_id: 'conv-789',
          violation_type: 'unauthorized_access_attempt',
          severity: 'high',
          description_ar: 'محاولة وصول غير مصرح بها للمحادثة',
          description_en: 'Unauthorized access attempt to conversation',
          user_id: 'user-789',
          detected_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          metadata: { attempted_actions: ['read_messages', 'download_files'] }
        }
      ]
      setViolations(mockViolations)
    } catch (error) {
      console.error('Failed to load violations:', error)
    }
  }

  const loadAuditEntries = async () => {
    try {
      // Mock data - replace with actual API calls  
      const mockAuditEntries: AuditTrailEntry[] = [
        {
          id: '1',
          action_type: 'message_encrypted',
          resource_type: 'message',
          resource_id: 'msg-001',
          user_id: 'user-123',
          user_role: 'therapist',
          details: { encryption_algorithm: 'AES-256-GCM', key_id: 'key-001' },
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          compliance_flags: ['encryption', 'medical_data']
        },
        {
          id: '2',
          action_type: 'conversation_accessed',
          resource_type: 'conversation',
          resource_id: 'conv-002',
          user_id: 'user-456',
          user_role: 'parent',
          details: { access_method: 'web_portal', session_duration: 1200 },
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          compliance_flags: ['access_control', 'session_tracking']
        }
      ]
      setAuditEntries(mockAuditEntries)
    } catch (error) {
      console.error('Failed to load audit entries:', error)
    }
  }

  // Generate compliance report
  const generateReport = async (type: ComplianceReport['report_type']) => {
    try {
      const report = await communicationComplianceService.generateComplianceReport(
        type,
        selectedDateRange.from,
        selectedDateRange.to
      )
      setActiveReport(report)
    } catch (error) {
      console.error('Failed to generate report:', error)
    }
  }

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get compliance status color
  const getComplianceColor = (percentage: number) => {
    if (percentage >= 95) return 'text-green-600'
    if (percentage >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language === 'ar' ? ar : enUS
    })
  }

  // Filter violations
  const filteredViolations = violations.filter(violation => {
    const matchesSearch = searchQuery === '' ||
      violation.description_ar.includes(searchQuery) ||
      violation.description_en.includes(searchQuery) ||
      violation.violation_type.includes(searchQuery)
    
    const matchesSeverity = filterSeverity === 'all' || violation.severity === filterSeverity
    
    return matchesSearch && matchesSeverity
  })

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">
            {language === 'ar' ? 'جاري تحميل بيانات الامتثال...' : 'Loading compliance data...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'لوحة الامتثال' : 'Compliance Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'ar' ? 
              'مراقبة وإدارة امتثال نظام التواصل للوائح الطبية' : 
              'Monitor and manage communication system compliance with medical regulations'
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DatePickerWithRange
            date={selectedDateRange}
            onDateChange={setSelectedDateRange}
          />
          
          <Button onClick={() => loadComplianceData()} variant="outline">
            <Database className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {language === 'ar' ? 'امتثال التشفير' : 'Encryption Compliance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">
                {metrics.encryptionCompliance}%
              </div>
              <Lock className={cn("w-5 h-5", getComplianceColor(metrics.encryptionCompliance))} />
            </div>
            <Progress value={metrics.encryptionCompliance} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {metrics.encryptedMessages.toLocaleString()} {language === 'ar' ? 'من' : 'of'} {metrics.totalMessages.toLocaleString()} {language === 'ar' ? 'رسالة مشفرة' : 'messages encrypted'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {language === 'ar' ? 'المخالفات النشطة' : 'Active Violations'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">
                {metrics.violations.total}
              </div>
              <AlertTriangle className={cn(
                "w-5 h-5",
                metrics.violations.critical > 0 ? 'text-red-500' : 
                metrics.violations.high > 0 ? 'text-orange-500' : 'text-gray-400'
              )} />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Badge variant="destructive" className="text-xs px-1">
                {metrics.violations.critical} {language === 'ar' ? 'حرج' : 'Critical'}
              </Badge>
              <Badge variant="secondary" className="text-xs px-1">
                {metrics.violations.high} {language === 'ar' ? 'عالي' : 'High'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {language === 'ar' ? 'امتثال الاحتفاظ بالبيانات' : 'Data Retention Compliance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">
                {metrics.dataRetentionCompliance}%
              </div>
              <Clock className={cn("w-5 h-5", getComplianceColor(metrics.dataRetentionCompliance))} />
            </div>
            <Progress value={metrics.dataRetentionCompliance} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {language === 'ar' ? 'متوافق مع سياسات الاحتفاظ' : 'Compliant with retention policies'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {language === 'ar' ? 'مدخلات التدقيق' : 'Audit Trail Entries'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">
                {metrics.auditTrailEntries.toLocaleString()}
              </div>
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500">
              {language === 'ar' ? 
                `${auditEntries.length} آخر الإدخالات` : 
                `${auditEntries.length} recent entries`
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="violations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="violations">
            {language === 'ar' ? 'المخالفات' : 'Violations'}
          </TabsTrigger>
          <TabsTrigger value="audit-trail">
            {language === 'ar' ? 'سجل التدقيق' : 'Audit Trail'}
          </TabsTrigger>
          <TabsTrigger value="reports">
            {language === 'ar' ? 'التقارير' : 'Reports'}
          </TabsTrigger>
          <TabsTrigger value="settings">
            {language === 'ar' ? 'الإعدادات' : 'Settings'}
          </TabsTrigger>
        </TabsList>

        {/* Violations Tab */}
        <TabsContent value="violations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {language === 'ar' ? 'مخالفات الامتثال' : 'Compliance Violations'}
              </CardTitle>
              
              {/* Search and Filter */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'ar' ? 'البحث في المخالفات...' : 'Search violations...'}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === 'ar' ? 'جميع المستويات' : 'All Levels'}
                    </SelectItem>
                    <SelectItem value="critical">
                      {language === 'ar' ? 'حرج' : 'Critical'}
                    </SelectItem>
                    <SelectItem value="high">
                      {language === 'ar' ? 'عالي' : 'High'}
                    </SelectItem>
                    <SelectItem value="medium">
                      {language === 'ar' ? 'متوسط' : 'Medium'}
                    </SelectItem>
                    <SelectItem value="low">
                      {language === 'ar' ? 'منخفض' : 'Low'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredViolations.map((violation) => (
                    <div
                      key={violation.id}
                      className={cn(
                        "p-4 rounded-lg border",
                        getSeverityColor(violation.severity)
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {violation.severity}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {violation.resource_type}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(violation.detected_at)}
                        </span>
                      </div>
                      
                      <h4 className="font-medium mb-1">
                        {language === 'ar' ? violation.description_ar : violation.description_en}
                      </h4>
                      
                      <p className="text-sm text-gray-600">
                        {language === 'ar' ? 'نوع المخالفة' : 'Violation type'}: {violation.violation_type}
                      </p>
                      
                      {!violation.resolved_at && (
                        <div className="mt-2 flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            {language === 'ar' ? 'تحقق' : 'Investigate'}
                          </Button>
                          <Button size="sm">
                            {language === 'ar' ? 'حل' : 'Resolve'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredViolations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                      <p>
                        {language === 'ar' ? 
                          'لا توجد مخالفات تطابق المعايير المحددة' : 
                          'No violations match the specified criteria'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit-trail" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {language === 'ar' ? 'سجل التدقيق' : 'Audit Trail'}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'الوقت' : 'Time'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الإجراء' : 'Action'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المستخدم' : 'User'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المورد' : 'Resource'}</TableHead>
                    <TableHead>{language === 'ar' ? 'التفاصيل' : 'Details'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">
                        {formatTimeAgo(entry.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {entry.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {entry.user_id}
                        <div className="text-gray-500">({entry.user_role})</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {entry.resource_type}
                        <div className="text-gray-500">{entry.resource_id}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap gap-1">
                          {entry.compliance_flags.map((flag) => (
                            <Badge key={flag} variant="secondary" className="text-xs px-1">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {language === 'ar' ? 'تقارير الامتثال' : 'Compliance Reports'}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => generateReport('audit_summary')}
                  className="h-20 flex-col"
                  variant="outline"
                >
                  <BarChart3 className="w-6 h-6 mb-2" />
                  {language === 'ar' ? 'ملخص التدقيق' : 'Audit Summary'}
                </Button>

                <Button
                  onClick={() => generateReport('violation_report')}
                  className="h-20 flex-col"
                  variant="outline"
                >
                  <AlertTriangle className="w-6 h-6 mb-2" />
                  {language === 'ar' ? 'تقرير المخالفات' : 'Violation Report'}
                </Button>

                <Button
                  onClick={() => generateReport('retention_status')}
                  className="h-20 flex-col"
                  variant="outline"
                >
                  <Clock className="w-6 h-6 mb-2" />
                  {language === 'ar' ? 'حالة الاحتفاظ' : 'Retention Status'}
                </Button>

                <Button
                  onClick={() => generateReport('encryption_status')}
                  className="h-20 flex-col"
                  variant="outline"
                >
                  <Lock className="w-6 h-6 mb-2" />
                  {language === 'ar' ? 'حالة التشفير' : 'Encryption Status'}
                </Button>
              </div>

              {activeReport && (
                <Alert>
                  <FileText className="w-4 h-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      {language === 'ar' ? 
                        `تم إنشاء تقرير: ${activeReport.report_type}` :
                        `Report generated: ${activeReport.report_type}`
                      }
                    </span>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'تحميل' : 'Download'}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {language === 'ar' ? 'إعدادات الامتثال' : 'Compliance Settings'}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Shield className="w-4 h-4" />
                  <AlertDescription>
                    {language === 'ar' ? 
                      'إعدادات الامتثال تتطلب صلاحيات إدارية. يرجى الاتصال بمدير النظام لإجراء تغييرات.' :
                      'Compliance settings require administrative privileges. Please contact your system administrator to make changes.'
                    }
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">
                      {language === 'ar' ? 'التشفير التلقائي' : 'Automatic Encryption'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {language === 'ar' ? 
                        'تشفير تلقائي للرسائل التي تحتوي على محتوى طبي حساس' :
                        'Automatically encrypt messages containing sensitive medical content'
                      }
                    </p>
                    <Badge variant="secondary">
                      {language === 'ar' ? 'مفعل' : 'Enabled'}
                    </Badge>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">
                      {language === 'ar' ? 'الاحتفاظ بالبيانات' : 'Data Retention'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {language === 'ar' ? 
                        'سياسات الاحتفاظ بالبيانات وفقاً للوائح الطبية' :
                        'Data retention policies according to medical regulations'
                      }
                    </p>
                    <Badge variant="secondary">
                      {language === 'ar' ? '7 سنوات' : '7 Years'}
                    </Badge>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">
                      {language === 'ar' ? 'سجل التدقيق' : 'Audit Logging'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {language === 'ar' ? 
                        'تسجيل شامل لجميع الأنشطة لأغراض المراجعة' :
                        'Comprehensive logging of all activities for audit purposes'
                      }
                    </p>
                    <Badge variant="secondary">
                      {language === 'ar' ? 'مفعل' : 'Enabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}