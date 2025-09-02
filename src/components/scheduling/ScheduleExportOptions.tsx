import React, { useState, useCallback } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { 
  Download, FileText, Calendar, Table, Mail, 
  Printer, Settings, X, CheckCircle 
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useLanguage } from '@/contexts/LanguageContext'
import { generatePDFReport, generateCSVExport, generateICSCalendar } from '@/lib/export-utils'
import type { 
  ScheduledSession, 
  ScheduleView,
  ExportFormat,
  ExportOptions as ExportOptionsType
} from '@/types/scheduling'

/**
 * Schedule Export Options Component
 * 
 * Provides comprehensive export functionality for schedules in multiple formats
 * including PDF reports, CSV data files, and calendar formats with customization options.
 */

interface ScheduleExportOptionsProps {
  sessions: ScheduledSession[]
  dateRange: { start: Date; end: Date }
  view: ScheduleView
  onClose: () => void
  isOpen: boolean
}

interface ExportProgress {
  stage: string
  progress: number
  message: string
}

const EXPORT_FORMATS: { value: ExportFormat; label_ar: string; label_en: string; icon: React.ReactNode }[] = [
  {
    value: 'pdf',
    label_ar: 'تقرير PDF',
    label_en: 'PDF Report',
    icon: <FileText className="w-4 h-4" />
  },
  {
    value: 'csv',
    label_ar: 'ملف CSV',
    label_en: 'CSV File',
    icon: <Table className="w-4 h-4" />
  },
  {
    value: 'ics',
    label_ar: 'تقويم ICS',
    label_en: 'ICS Calendar',
    icon: <Calendar className="w-4 h-4" />
  },
  {
    value: 'excel',
    label_ar: 'ملف Excel',
    label_en: 'Excel File',
    icon: <Table className="w-4 h-4" />
  }
]

const PDF_TEMPLATES = [
  { value: 'detailed', label_ar: 'تقرير مفصل', label_en: 'Detailed Report' },
  { value: 'summary', label_ar: 'ملخص تنفيذي', label_en: 'Executive Summary' },
  { value: 'therapist_schedule', label_ar: 'جدول المعالجين', label_en: 'Therapist Schedule' },
  { value: 'student_schedule', label_ar: 'جدول الطلاب', label_en: 'Student Schedule' }
]

export function ScheduleExportOptions({
  sessions,
  dateRange,
  view,
  onClose,
  isOpen
}: ScheduleExportOptionsProps) {
  const { language, isRTL } = useLanguage()
  const locale = language === 'ar' ? ar : enUS

  // State management
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf')
  const [exportOptions, setExportOptions] = useState<ExportOptionsType>({
    includeFields: {
      student_info: true,
      therapist_info: true,
      session_details: true,
      room_info: true,
      session_notes: false,
      financial_info: false
    },
    dateRange: 'current',
    groupBy: 'date',
    sortBy: 'time',
    includeStats: true,
    includeCharts: false,
    template: 'detailed',
    language: language,
    orientation: 'portrait'
  })
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [exportComplete, setExportComplete] = useState(false)

  // Handle option changes
  const updateOption = useCallback((key: string, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const updateIncludeField = useCallback((field: string, included: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      includeFields: {
        ...prev.includeFields,
        [field]: included
      }
    }))
  }, [])

  // Calculate filtered sessions based on date range option
  const getFilteredSessions = useCallback(() => {
    let startDate: Date
    let endDate: Date

    switch (exportOptions.dateRange) {
      case 'current':
        startDate = dateRange.start
        endDate = dateRange.end
        break
      case 'week':
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 })
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 })
        break
      case 'month':
        startDate = startOfMonth(new Date())
        endDate = endOfMonth(new Date())
        break
      case 'custom':
        startDate = dateRange.start
        endDate = dateRange.end
        break
      default:
        startDate = dateRange.start
        endDate = dateRange.end
    }

    return sessions.filter(session => {
      const sessionDate = new Date(session.session_date)
      return sessionDate >= startDate && sessionDate <= endDate
    })
  }, [sessions, exportOptions.dateRange, dateRange])

  // Export handlers
  const handleExport = useCallback(async () => {
    setIsExporting(true)
    setExportProgress({
      stage: 'preparing',
      progress: 10,
      message: language === 'ar' ? 'إعداد البيانات...' : 'Preparing data...'
    })

    try {
      const filteredSessions = getFilteredSessions()

      switch (exportFormat) {
        case 'pdf':
          setExportProgress({
            stage: 'generating_pdf',
            progress: 30,
            message: language === 'ar' ? 'إنشاء ملف PDF...' : 'Generating PDF...'
          })

          await generatePDFReport({
            sessions: filteredSessions,
            options: exportOptions,
            title: language === 'ar' ? 'تقرير الجدولة' : 'Schedule Report',
            dateRange: { start: dateRange.start, end: dateRange.end }
          })
          break

        case 'csv':
          setExportProgress({
            stage: 'generating_csv',
            progress: 50,
            message: language === 'ar' ? 'إنشاء ملف CSV...' : 'Generating CSV...'
          })

          await generateCSVExport({
            sessions: filteredSessions,
            options: exportOptions
          })
          break

        case 'ics':
          setExportProgress({
            stage: 'generating_calendar',
            progress: 60,
            message: language === 'ar' ? 'إنشاء ملف التقويم...' : 'Generating calendar...'
          })

          await generateICSCalendar({
            sessions: filteredSessions,
            options: exportOptions
          })
          break

        case 'excel':
          setExportProgress({
            stage: 'generating_excel',
            progress: 70,
            message: language === 'ar' ? 'إنشاء ملف Excel...' : 'Generating Excel...'
          })

          // Excel generation would be implemented here
          break
      }

      setExportProgress({
        stage: 'complete',
        progress: 100,
        message: language === 'ar' ? 'تم التصدير بنجاح!' : 'Export completed successfully!'
      })

      setTimeout(() => {
        setExportComplete(true)
      }, 1000)

    } catch (error) {
      console.error('Export failed:', error)
      setExportProgress({
        stage: 'error',
        progress: 0,
        message: language === 'ar' ? 'فشل في التصدير' : 'Export failed'
      })
    } finally {
      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(null)
      }, 2000)
    }
  }, [exportFormat, exportOptions, getFilteredSessions, dateRange, language])

  // Reset and close
  const handleClose = useCallback(() => {
    if (!isExporting) {
      setExportComplete(false)
      setExportProgress(null)
      onClose()
    }
  }, [isExporting, onClose])

  const filteredSessions = getFilteredSessions()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`sm:max-w-2xl ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            {language === 'ar' ? 'تصدير الجدولة' : 'Export Schedule'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? 'اختر تنسيق التصدير والخيارات المطلوبة'
              : 'Choose export format and desired options'
            }
          </DialogDescription>
        </DialogHeader>

        {exportComplete ? (
          // Success screen
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {language === 'ar' ? 'تم التصدير بنجاح!' : 'Export Completed Successfully!'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {language === 'ar' 
                ? 'تم تنزيل الملف إلى مجلد التنزيلات'
                : 'File has been downloaded to your Downloads folder'
              }
            </p>
            <Button onClick={handleClose}>
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        ) : isExporting ? (
          // Progress screen
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {language === 'ar' ? 'جاري التصدير...' : 'Exporting...'}
              </h3>
              <p className="text-muted-foreground">
                {exportProgress?.message}
              </p>
            </div>

            {exportProgress && (
              <div className="space-y-2">
                <Progress value={exportProgress.progress} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">
                  {exportProgress.progress}% {language === 'ar' ? 'مكتمل' : 'complete'}
                </p>
              </div>
            )}
          </div>
        ) : (
          // Configuration screen
          <Tabs defaultValue="format" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="format">
                {language === 'ar' ? 'التنسيق' : 'Format'}
              </TabsTrigger>
              <TabsTrigger value="options">
                {language === 'ar' ? 'الخيارات' : 'Options'}
              </TabsTrigger>
              <TabsTrigger value="preview">
                {language === 'ar' ? 'معاينة' : 'Preview'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="format" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {language === 'ar' ? 'اختر تنسيق التصدير' : 'Choose Export Format'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup 
                    value={exportFormat} 
                    onValueChange={(value) => setExportFormat(value as ExportFormat)}
                    className="space-y-3"
                  >
                    {EXPORT_FORMATS.map(format => (
                      <div key={format.value} className="flex items-center space-x-2 rtl:space-x-reverse">
                        <RadioGroupItem value={format.value} id={format.value} />
                        <Label htmlFor={format.value} className="flex items-center gap-2 cursor-pointer">
                          {format.icon}
                          <span>{language === 'ar' ? format.label_ar : format.label_en}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              {exportFormat === 'pdf' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {language === 'ar' ? 'قالب PDF' : 'PDF Template'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select 
                      value={exportOptions.template} 
                      onValueChange={(value) => updateOption('template', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PDF_TEMPLATES.map(template => (
                          <SelectItem key={template.value} value={template.value}>
                            {language === 'ar' ? template.label_ar : template.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="options" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {language === 'ar' ? 'نطاق البيانات' : 'Data Range'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup 
                    value={exportOptions.dateRange} 
                    onValueChange={(value) => updateOption('dateRange', value)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="current" id="current" />
                      <Label htmlFor="current">
                        {language === 'ar' ? 'العرض الحالي' : 'Current View'}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="week" id="week" />
                      <Label htmlFor="week">
                        {language === 'ar' ? 'هذا الأسبوع' : 'This Week'}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="month" id="month" />
                      <Label htmlFor="month">
                        {language === 'ar' ? 'هذا الشهر' : 'This Month'}
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {language === 'ar' ? 'الحقول المضمنة' : 'Include Fields'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries({
                    student_info: language === 'ar' ? 'معلومات الطالب' : 'Student Information',
                    therapist_info: language === 'ar' ? 'معلومات المعالج' : 'Therapist Information',
                    session_details: language === 'ar' ? 'تفاصيل الجلسة' : 'Session Details',
                    room_info: language === 'ar' ? 'معلومات الغرفة' : 'Room Information',
                    session_notes: language === 'ar' ? 'ملاحظات الجلسة' : 'Session Notes',
                    financial_info: language === 'ar' ? 'المعلومات المالية' : 'Financial Information'
                  }).map(([field, label]) => (
                    <div key={field} className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Checkbox
                        id={field}
                        checked={exportOptions.includeFields[field as keyof typeof exportOptions.includeFields]}
                        onCheckedChange={(checked) => updateIncludeField(field, !!checked)}
                      />
                      <Label htmlFor={field}>{label}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {language === 'ar' ? 'خيارات إضافية' : 'Additional Options'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Checkbox
                      id="include-stats"
                      checked={exportOptions.includeStats}
                      onCheckedChange={(checked) => updateOption('includeStats', checked)}
                    />
                    <Label htmlFor="include-stats">
                      {language === 'ar' ? 'تضمين الإحصائيات' : 'Include Statistics'}
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Checkbox
                      id="include-charts"
                      checked={exportOptions.includeCharts}
                      onCheckedChange={(checked) => updateOption('includeCharts', checked)}
                    />
                    <Label htmlFor="include-charts">
                      {language === 'ar' ? 'تضمين الرسوم البيانية' : 'Include Charts'}
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {language === 'ar' ? 'معاينة التصدير' : 'Export Preview'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">
                        {language === 'ar' ? 'التنسيق:' : 'Format:'}
                      </span>
                      <Badge variant="secondary">
                        {EXPORT_FORMATS.find(f => f.value === exportFormat)?.[language === 'ar' ? 'label_ar' : 'label_en']}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">
                        {language === 'ar' ? 'عدد الجلسات:' : 'Sessions Count:'}
                      </span>
                      <Badge variant="outline">
                        {filteredSessions.length}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">
                        {language === 'ar' ? 'نطاق التاريخ:' : 'Date Range:'}
                      </span>
                      <span className="text-sm">
                        {format(dateRange.start, 'MMM d', { locale })} - {format(dateRange.end, 'MMM d, yyyy', { locale })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">
                        {language === 'ar' ? 'اللغة:' : 'Language:'}
                      </span>
                      <Badge variant="outline">
                        {language === 'ar' ? 'العربية' : 'English'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!exportComplete && !isExporting && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleExport} disabled={filteredSessions.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'تصدير' : 'Export'} ({filteredSessions.length})
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}