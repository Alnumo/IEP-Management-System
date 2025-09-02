/**
 * Financial Reporting Center Component
 * Central hub for generating, viewing, and managing financial reports
 * Part of Story 2.3: Financial Management Module - Task 5
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  useVATReport,
  useCurrentQuarterVAT,
  useAuditTrail,
  useParentFinancialStatement,
  useExecutiveSummary,
  useExportReport,
  useBulkExportReports,
  useReportHistory,
  useScheduleReport
} from '../../hooks/useFinancialReporting'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Calendar } from '../ui/calendar'
import { Progress } from '../ui/progress'
import { Alert, AlertDescription } from '../ui/alert'
import { Skeleton } from '../ui/skeleton'
import {
  FileText,
  Download,
  Eye,
  Calendar as CalendarIcon,
  Filter,
  Search,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  FileBarChart,
  Mail,
  Settings,
  RefreshCw,
  Archive,
  Printer
} from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import type { ReportType, ExportFormat } from '../../types/financial-management'

// Report configurations
const REPORT_TYPES: Array<{
  id: ReportType
  label_ar: string
  label_en: string
  description_ar: string
  description_en: string
  icon: React.ElementType
  color: string
}> = [
  {
    id: 'vat_compliance',
    label_ar: 'تقرير ضريبة القيمة المضافة',
    label_en: 'VAT Compliance Report',
    description_ar: 'تقرير مطابقة ضريبة القيمة المضافة للربع الحالي',
    description_en: 'VAT compliance report for current quarter',
    icon: FileBarChart,
    color: 'bg-blue-500'
  },
  {
    id: 'audit_trail',
    label_ar: 'سجل المراجعة',
    label_en: 'Audit Trail',
    description_ar: 'سجل شامل لجميع العمليات المالية',
    description_en: 'Comprehensive log of all financial operations',
    icon: Archive,
    color: 'bg-purple-500'
  },
  {
    id: 'parent_statement',
    label_ar: 'كشف حساب ولي الأمر',
    label_en: 'Parent Financial Statement',
    description_ar: 'كشف مالي مفصل لولي الأمر',
    description_en: 'Detailed financial statement for parent',
    icon: Users,
    color: 'bg-green-500'
  },
  {
    id: 'executive_summary',
    label_ar: 'الملخص التنفيذي',
    label_en: 'Executive Summary',
    description_ar: 'ملخص تنفيذي للأداء المالي',
    description_en: 'Executive summary of financial performance',
    icon: TrendingUp,
    color: 'bg-orange-500'
  }
]

const EXPORT_FORMATS: Array<{
  id: ExportFormat
  label_ar: string
  label_en: string
  extension: string
}> = [
  { id: 'json', label_ar: 'JSON', label_en: 'JSON', extension: '.json' },
  { id: 'csv', label_ar: 'CSV', label_en: 'CSV', extension: '.csv' },
  { id: 'excel', label_ar: 'Excel', label_en: 'Excel', extension: '.xlsx' },
  { id: 'pdf', label_ar: 'PDF', label_en: 'PDF', extension: '.pdf' }
]

interface ReportParameters {
  periodStart?: string
  periodEnd?: string
  parentId?: string
  entityType?: string
  userId?: string
  includeDetails?: boolean
}

export default function FinancialReportingCenter() {
  const { language, isRTL } = useLanguage()
  
  // State management
  const [activeTab, setActiveTab] = useState<ReportType>('vat_compliance')
  const [selectedReports, setSelectedReports] = useState<ReportType[]>([])
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf')
  const [reportParameters, setReportParameters] = useState<ReportParameters>({})
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'quarterly',
    emailRecipients: [] as string[],
    isActive: true
  })

  // Hooks
  const currentQuarterVAT = useCurrentQuarterVAT()
  const auditTrail = useAuditTrail({ limit: 100 })
  const executiveSummary = useExecutiveSummary(
    reportParameters.periodStart || '',
    reportParameters.periodEnd || ''
  )
  const reportHistory = useReportHistory(50)
  const exportReport = useExportReport()
  const bulkExport = useBulkExportReports()
  const scheduleReport = useScheduleReport()

  // Set default date range to current quarter
  useEffect(() => {
    const now = new Date()
    const currentQuarter = Math.floor(now.getMonth() / 3)
    const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
    const quarterEnd = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0)
    
    setDateRange({ start: quarterStart, end: quarterEnd })
    setReportParameters({
      periodStart: quarterStart.toISOString().split('T')[0],
      periodEnd: quarterEnd.toISOString().split('T')[0]
    })
  }, [])

  // Handle date range changes
  const handleDateRangeChange = useCallback((range: { start?: Date; end?: Date }) => {
    setDateRange(range)
    setReportParameters(prev => ({
      ...prev,
      periodStart: range.start?.toISOString().split('T')[0],
      periodEnd: range.end?.toISOString().split('T')[0]
    }))
  }, [])

  // Generate individual report
  const handleGenerateReport = useCallback(async (reportType: ReportType) => {
    setIsGenerating(true)
    try {
      const result = await exportReport.mutateAsync({
        reportType,
        format: exportFormat,
        parameters: reportParameters
      })

      // Create download
      const blob = new Blob([result.data], { type: result.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Report generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [exportReport, exportFormat, reportParameters])

  // Generate multiple reports
  const handleBulkGenerate = useCallback(async () => {
    if (selectedReports.length === 0) return
    
    setIsGenerating(true)
    try {
      const reports = selectedReports.map(reportType => ({
        reportType,
        format: exportFormat,
        parameters: reportParameters
      }))

      const result = await bulkExport.mutateAsync(reports)
      
      // Download successful reports
      result.successful.forEach((report: any) => {
        const blob = new Blob([report.data], { type: report.mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = report.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })

      if (result.failureCount > 0) {
        console.warn(`${result.failureCount} reports failed to generate`)
      }

    } catch (error) {
      console.error('Bulk report generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [selectedReports, bulkExport, exportFormat, reportParameters])

  // Schedule recurring report
  const handleScheduleReport = useCallback(async () => {
    try {
      await scheduleReport.mutateAsync({
        reportType: activeTab,
        format: exportFormat,
        frequency: scheduleConfig.frequency,
        parameters: reportParameters,
        emailRecipients: scheduleConfig.emailRecipients,
        isActive: scheduleConfig.isActive
      })
      setShowScheduleDialog(false)
    } catch (error) {
      console.error('Failed to schedule report:', error)
    }
  }, [scheduleReport, activeTab, exportFormat, scheduleConfig, reportParameters])

  // Render report card
  const renderReportCard = (reportConfig: typeof REPORT_TYPES[0]) => {
    const { id, label_ar, label_en, description_ar, description_en, icon: Icon, color } = reportConfig
    const isSelected = selectedReports.includes(id)
    
    let reportData
    let isLoading = false
    
    switch (id) {
      case 'vat_compliance':
        reportData = currentQuarterVAT.data
        isLoading = currentQuarterVAT.isLoading
        break
      case 'audit_trail':
        reportData = auditTrail.data
        isLoading = auditTrail.isLoading
        break
      case 'executive_summary':
        reportData = executiveSummary.data
        isLoading = executiveSummary.isLoading
        break
      default:
        break
    }

    return (
      <Card 
        key={id}
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? 'ring-2 ring-primary' : ''
        } ${isRTL ? 'text-right' : 'text-left'}`}
        onClick={() => {
          if (isSelected) {
            setSelectedReports(prev => prev.filter(r => r !== id))
          } else {
            setSelectedReports(prev => [...prev, id])
          }
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color} text-white`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? label_ar : label_en}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? description_ar : description_en}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={isSelected}
                onChange={() => {}} // Handled by card click
              />
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              ) : reportData?.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveTab(id)
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                {language === 'ar' ? 'عرض' : 'View'}
              </Button>
              
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleGenerateReport(id)
                }}
                disabled={isGenerating}
              >
                <Download className="h-3 w-3 mr-1" />
                {language === 'ar' ? 'تحميل' : 'Download'}
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {language === 'ar' ? 'آخر تحديث:' : 'Last updated:'} 
              {reportData?.generatedAt ? 
                format(parseISO(reportData.generatedAt), 'MMM dd, HH:mm', {
                  locale: language === 'ar' ? ar : enUS
                }) :
                language === 'ar' ? 'غير متوفر' : 'N/A'
              }
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render VAT report details
  const renderVATReportDetails = () => {
    if (currentQuarterVAT.isLoading) {
      return <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    }

    if (!currentQuarterVAT.data?.success || !currentQuarterVAT.data.report) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {language === 'ar' 
              ? 'فشل في تحميل تقرير ضريبة القيمة المضافة'
              : 'Failed to load VAT compliance report'}
          </AlertDescription>
        </Alert>
      )
    }

    const vat = currentQuarterVAT.data.report
    
    return (
      <div className="space-y-6">
        {/* VAT Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'إجمالي المبلغ الخاضع للضريبة' : 'Total Taxable Amount'}
                  </p>
                  <p className="text-lg font-semibold">
                    {vat.totalTaxableAmount.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                      style: 'currency',
                      currency: 'SAR'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'إجمالي ضريبة القيمة المضافة' : 'Total VAT Amount'}
                  </p>
                  <p className="text-lg font-semibold">
                    {vat.totalVATAmount.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                      style: 'currency',
                      currency: 'SAR'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  vat.complianceStatus === 'compliant' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {vat.complianceStatus === 'compliant' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'حالة المطابقة' : 'Compliance Status'}
                  </p>
                  <p className="text-lg font-semibold">
                    {vat.complianceStatus === 'compliant' ? 
                      (language === 'ar' ? 'متوافق' : 'Compliant') :
                      (language === 'ar' ? 'غير متوافق' : 'Non-compliant')
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VAT Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'ar' ? 'تفصيل ضريبة القيمة المضافة' : 'VAT Breakdown'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vat.transactionBreakdown.map((breakdown, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{breakdown.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {breakdown.transactionCount} {language === 'ar' ? 'معاملة' : 'transactions'}
                    </p>
                  </div>
                  <div className={`text-right ${isRTL ? 'text-left' : ''}`}>
                    <p className="font-semibold">
                      {breakdown.totalAmount.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                        style: 'currency',
                        currency: 'SAR'
                      })}
                    </p>
                    <p className="text-sm text-green-600">
                      +{breakdown.vatAmount.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                        style: 'currency',
                        currency: 'SAR'
                      })} {language === 'ar' ? 'ضريبة' : 'VAT'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filing Information */}
        {vat.nextFilingDate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {language === 'ar' ? 'معلومات التقديم' : 'Filing Information'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'تاريخ التقديم التالي' : 'Next Filing Date'}
                  </p>
                  <p className="font-semibold">
                    {format(parseISO(vat.nextFilingDate), 'MMMM dd, yyyy', {
                      locale: language === 'ar' ? ar : enUS
                    })}
                  </p>
                </div>
                {vat.periodsOverdue > 0 && (
                  <Badge variant="destructive">
                    {vat.periodsOverdue} {language === 'ar' ? 'فترات متأخرة' : 'periods overdue'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Render audit trail details
  const renderAuditTrailDetails = () => {
    if (auditTrail.isLoading) {
      return <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    }

    if (!auditTrail.data?.success || !auditTrail.data.entries) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {language === 'ar' 
              ? 'فشل في تحميل سجل المراجعة'
              : 'Failed to load audit trail'}
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {language === 'ar' ? 'سجل المراجعة المالية' : 'Financial Audit Trail'}
          </h3>
          <Badge variant="secondary">
            {auditTrail.data.entries.length} {language === 'ar' ? 'إدخال' : 'entries'}
          </Badge>
        </div>
        
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {auditTrail.data.entries.map((entry, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          entry.action === 'create' ? 'default' :
                          entry.action === 'update' ? 'secondary' :
                          entry.action === 'delete' ? 'destructive' :
                          'outline'
                        }>
                          {entry.action}
                        </Badge>
                        <span className="text-sm font-medium">{entry.entityType}</span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {entry.details || 'No details available'}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {language === 'ar' ? 'المستخدم:' : 'User:'} {entry.userId}
                        </span>
                        <span>
                          {format(parseISO(entry.timestamp), 'MMM dd, yyyy HH:mm', {
                            locale: language === 'ar' ? ar : enUS
                          })}
                        </span>
                      </div>
                    </div>
                    
                    {entry.amount && (
                      <div className="text-right">
                        <p className="font-semibold">
                          {entry.amount.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                            style: 'currency',
                            currency: 'SAR'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">
            {language === 'ar' ? 'مركز التقارير المالية' : 'Financial Reporting Center'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'إنشاء وإدارة وتصدير التقارير المالية والامتثال'
              : 'Generate, manage, and export financial and compliance reports'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
          
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'جدولة' : 'Schedule'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {language === 'ar' ? 'جدولة تقرير دوري' : 'Schedule Recurring Report'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{language === 'ar' ? 'التكرار' : 'Frequency'}</Label>
                  <Select 
                    value={scheduleConfig.frequency} 
                    onValueChange={(value: any) => 
                      setScheduleConfig(prev => ({ ...prev, frequency: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">
                        {language === 'ar' ? 'يومي' : 'Daily'}
                      </SelectItem>
                      <SelectItem value="weekly">
                        {language === 'ar' ? 'أسبوعي' : 'Weekly'}
                      </SelectItem>
                      <SelectItem value="monthly">
                        {language === 'ar' ? 'شهري' : 'Monthly'}
                      </SelectItem>
                      <SelectItem value="quarterly">
                        {language === 'ar' ? 'ربع سنوي' : 'Quarterly'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleScheduleReport}>
                    {language === 'ar' ? 'جدولة' : 'Schedule'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Label>{language === 'ar' ? 'نطاق التاريخ:' : 'Date Range:'}</Label>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-48">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateRange.start && dateRange.end ? (
                      `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd, yyyy')}`
                    ) : (
                      language === 'ar' ? 'اختر التواريخ' : 'Select dates'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: dateRange.start,
                      to: dateRange.end
                    }}
                    onSelect={(range) => handleDateRangeChange({
                      start: range?.from,
                      end: range?.to
                    })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-center gap-4">
              <Label>{language === 'ar' ? 'تنسيق التصدير:' : 'Export Format:'}</Label>
              <Select value={exportFormat} onValueChange={(value: ExportFormat) => setExportFormat(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_FORMATS.map(format => (
                    <SelectItem key={format.id} value={format.id}>
                      {language === 'ar' ? format.label_ar : format.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORT_TYPES.map(renderReportCard)}
      </div>

      {/* Bulk Actions */}
      {selectedReports.length > 0 && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {selectedReports.length} {language === 'ar' ? 'تقارير محددة' : 'reports selected'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReports([])}
                >
                  {language === 'ar' ? 'إلغاء التحديد' : 'Clear selection'}
                </Button>
              </div>
              
              <Button onClick={handleBulkGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {language === 'ar' ? 'تحميل المحدد' : 'Download Selected'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Details */}
      <Tabs value={activeTab} onValueChange={(value: ReportType) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-4">
          {REPORT_TYPES.map(report => (
            <TabsTrigger key={report.id} value={report.id}>
              <report.icon className="h-4 w-4 mr-2" />
              {language === 'ar' ? report.label_ar : report.label_en}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="vat_compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileBarChart className="h-5 w-5" />
                {language === 'ar' ? 'تقرير ضريبة القيمة المضافة' : 'VAT Compliance Report'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderVATReportDetails()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="audit_trail" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                {language === 'ar' ? 'سجل المراجعة المالية' : 'Financial Audit Trail'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderAuditTrailDetails()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="parent_statement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {language === 'ar' ? 'كشوف حساب أولياء الأمور' : 'Parent Financial Statements'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {language === 'ar' 
                    ? 'حدد ولي أمر لإنشاء كشف الحساب'
                    : 'Select a parent to generate financial statement'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="executive_summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {language === 'ar' ? 'الملخص التنفيذي المالي' : 'Executive Financial Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {language === 'ar' 
                    ? 'الملخص التنفيذي قيد التحميل...'
                    : 'Executive summary loading...'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generation Progress */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                {language === 'ar' ? 'جاري إنشاء التقارير...' : 'Generating reports...'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={33} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">
                {language === 'ar' 
                  ? 'يرجى الانتظار، هذا قد يستغرق بضع ثوان'
                  : 'Please wait, this may take a few seconds'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}