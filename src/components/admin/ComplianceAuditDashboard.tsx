/**
 * Compliance Audit Dashboard Component
 * Provides comprehensive audit trail visualization and compliance reporting
 * Story 1.2: Task 3 - Compliance reporting dashboard implementation
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { Download, Shield, AlertTriangle, Eye, Calendar, Filter, RefreshCw } from 'lucide-react'

interface AuditLog {
  id: string
  table_name: string
  operation: string
  user_id: string
  user_role: string
  timestamp: string
  ip_address: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  event_category: 'data_change' | 'authentication' | 'authorization' | 'security_violation' | 'system_access' | 'medical_access' | 'emergency_access' | 'encryption' | 'backup'
  compliance_tags: string[]
  additional_metadata: Record<string, any>
}

interface ComplianceReport {
  report_metadata: {
    compliance_framework: string
    start_date: string
    end_date: string
    generated_by: string
    generation_timestamp: string
  }
  summary_statistics: {
    total_events: number
    security_violations: number
    medical_access_events: number
    authentication_events: number
  }
  compliance_status: {
    audit_trail_complete: boolean
    security_monitoring_active: boolean
    medical_access_tracked: boolean
    authentication_logged: boolean
  }
}

interface FilterOptions {
  startDate: string
  endDate: string
  eventCategory: string
  riskLevel: string
  complianceFramework: string
  userId: string
}

export function ComplianceAuditDashboard() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    eventCategory: 'all',
    riskLevel: 'all',
    complianceFramework: 'HIPAA',
    userId: ''
  })

  // Load audit logs with filters
  const loadAuditLogs = async () => {
    setLoading(true)
    setError(null)
    
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          id,
          table_name,
          operation,
          user_id,
          user_role,
          timestamp,
          ip_address,
          risk_level,
          event_category,
          compliance_tags,
          additional_metadata
        `)
        .gte('timestamp', filters.startDate + 'T00:00:00Z')
        .lte('timestamp', filters.endDate + 'T23:59:59Z')
        .order('timestamp', { ascending: false })
        .limit(500)

      if (filters.eventCategory !== 'all') {
        query = query.eq('event_category', filters.eventCategory)
      }

      if (filters.riskLevel !== 'all') {
        query = query.eq('risk_level', filters.riskLevel)
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.complianceFramework !== 'all') {
        query = query.contains('compliance_tags', [filters.complianceFramework])
      }

      const { data, error: queryError } = await query

      if (queryError) {
        throw queryError
      }

      setAuditLogs(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في تحميل سجلات المراجعة')
      console.error('Error loading audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  // Generate compliance report
  const generateComplianceReport = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: rpcError } = await supabase.rpc('generate_compliance_report', {
        start_date: filters.startDate,
        end_date: filters.endDate,
        compliance_framework: filters.complianceFramework
      })

      if (rpcError) {
        throw rpcError
      }

      setComplianceReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في إنشاء تقرير الامتثال')
      console.error('Error generating compliance report:', err)
    } finally {
      setLoading(false)
    }
  }

  // Export audit data
  const exportAuditData = async (format: 'json' | 'csv') => {
    try {
      const exportData = format === 'json' 
        ? JSON.stringify(auditLogs, null, 2)
        : convertToCSV(auditLogs)
      
      const blob = new Blob([exportData], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${filters.startDate}-to-${filters.endDate}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('خطأ في تصدير البيانات')
      console.error('Error exporting data:', err)
    }
  }

  // Convert audit logs to CSV format
  const convertToCSV = (data: AuditLog[]): string => {
    const headers = [
      'التاريخ والوقت',
      'الجدول',
      'العملية', 
      'مستوى المخاطر',
      'فئة الحدث',
      'المستخدم',
      'الدور',
      'عنوان IP',
      'علامات الامتثال'
    ]
    
    const rows = data.map(log => [
      new Date(log.timestamp).toLocaleString('ar-SA'),
      log.table_name,
      log.operation,
      log.risk_level,
      log.event_category,
      log.user_id || 'غير معروف',
      log.user_role || 'غير محدد',
      log.ip_address || 'غير متاح',
      log.compliance_tags.join('; ')
    ])
    
    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n')
  }

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-black'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Get event category icon
  const getEventIcon = (category: string) => {
    switch (category) {
      case 'security_violation': return <AlertTriangle className="h-4 w-4" />
      case 'authentication': return <Shield className="h-4 w-4" />
      case 'medical_access': return <Eye className="h-4 w-4" />
      default: return null
    }
  }

  useEffect(() => {
    loadAuditLogs()
  }, [filters])

  return (
    <div className="p-6 space-y-6 rtl:text-right ltr:text-left">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">لوحة تحكم مراجعة الامتثال</h1>
          <p className="text-muted-foreground">مراقبة وتحليل سجلات المراجعة للامتثال التنظيمي</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => loadAuditLogs()} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            تحديث
          </Button>
          <Button onClick={generateComplianceReport} variant="outline" disabled={loading}>
            <Calendar className="h-4 w-4 mr-2" />
            إنشاء تقرير
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="audit-logs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="audit-logs">سجلات المراجعة</TabsTrigger>
          <TabsTrigger value="compliance-report">تقرير الامتثال</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        <TabsContent value="audit-logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                خيارات الفلترة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <Label htmlFor="start-date">تاريخ البداية</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">تاريخ النهاية</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="event-category">فئة الحدث</Label>
                  <Select
                    value={filters.eventCategory}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, eventCategory: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الفئات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الفئات</SelectItem>
                      <SelectItem value="medical_access">الوصول الطبي</SelectItem>
                      <SelectItem value="authentication">المصادقة</SelectItem>
                      <SelectItem value="security_violation">انتهاك الأمان</SelectItem>
                      <SelectItem value="data_change">تغيير البيانات</SelectItem>
                      <SelectItem value="system_access">وصول النظام</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="risk-level">مستوى المخاطر</Label>
                  <Select
                    value={filters.riskLevel}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, riskLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع المستويات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستويات</SelectItem>
                      <SelectItem value="critical">حرج</SelectItem>
                      <SelectItem value="high">عالي</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="low">منخفض</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="compliance-framework">إطار الامتثال</Label>
                  <Select
                    value={filters.complianceFramework}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, complianceFramework: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الأطر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأطر</SelectItem>
                      <SelectItem value="HIPAA">HIPAA</SelectItem>
                      <SelectItem value="PDPL">PDPL</SelectItem>
                      <SelectItem value="Medical">طبي</SelectItem>
                      <SelectItem value="Security">أمني</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={exportAuditData.bind(null, 'csv')} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                  <Button onClick={exportAuditData.bind(null, 'json')} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>سجلات المراجعة ({auditLogs.length})</CardTitle>
              <CardDescription>
                عرض تفصيلي لجميع أنشطة النظام والوصول للبيانات
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        {getEventIcon(log.event_category)}
                        <div>
                          <div className="font-medium">
                            {log.operation} على {log.table_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.user_role} • {new Date(log.timestamp).toLocaleString('ar-SA')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskLevelColor(log.risk_level)}>
                          {log.risk_level}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {log.compliance_tags.slice(0, 2).join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground">
                      لا توجد سجلات مراجعة للفترة المحددة
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance-report" className="space-y-4">
          {complianceReport ? (
            <div className="space-y-4">
              {/* Report Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">إجمالي الأحداث</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {complianceReport.summary_statistics.total_events.toLocaleString('ar-SA')}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">انتهاكات الأمان</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {complianceReport.summary_statistics.security_violations.toLocaleString('ar-SA')}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">الوصول الطبي</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {complianceReport.summary_statistics.medical_access_events.toLocaleString('ar-SA')}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">أحداث المصادقة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {complianceReport.summary_statistics.authentication_events.toLocaleString('ar-SA')}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Compliance Status */}
              <Card>
                <CardHeader>
                  <CardTitle>حالة الامتثال</CardTitle>
                  <CardDescription>
                    تقييم شامل لحالة الامتثال لـ {complianceReport.report_metadata.compliance_framework}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>مسار المراجعة مكتمل</span>
                      <Badge variant={complianceReport.compliance_status.audit_trail_complete ? "default" : "destructive"}>
                        {complianceReport.compliance_status.audit_trail_complete ? "مكتمل" : "غير مكتمل"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>مراقبة الأمان نشطة</span>
                      <Badge variant={complianceReport.compliance_status.security_monitoring_active ? "default" : "destructive"}>
                        {complianceReport.compliance_status.security_monitoring_active ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>الوصول الطبي متتبع</span>
                      <Badge variant={complianceReport.compliance_status.medical_access_tracked ? "default" : "destructive"}>
                        {complianceReport.compliance_status.medical_access_tracked ? "متتبع" : "غير متتبع"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span>المصادقة مسجلة</span>
                      <Badge variant={complianceReport.compliance_status.authentication_logged ? "default" : "destructive"}>
                        {complianceReport.compliance_status.authentication_logged ? "مسجل" : "غير مسجل"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">لا يوجد تقرير امتثال</h3>
                <p className="text-muted-foreground mb-4">قم بإنشاء تقرير امتثال للفترة المحددة</p>
                <Button onClick={generateComplianceReport} disabled={loading}>
                  إنشاء تقرير الامتثال
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardContent className="text-center py-8">
              <h3 className="text-lg font-medium">التحليلات المتقدمة</h3>
              <p className="text-muted-foreground">ستكون متاحة في التحديث القادم</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}