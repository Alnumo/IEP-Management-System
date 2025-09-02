/**
 * Export Options Component
 * Provides export functionality for analytics data in various formats
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useLanguage } from '@/contexts/LanguageContext'
import { analyticsService } from '@/services/analytics-service'
import {
  Download,
  FileText,
  Table,
  BarChart3,
  Image,
  Mail,
  Settings,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface ExportOptionsProps {
  data: any
  filename?: string
  formats?: ('pdf' | 'excel' | 'csv' | 'json' | 'image')[]
  includeCharts?: boolean
  onExportComplete?: (format: string, success: boolean) => void
}

interface ExportSettings {
  format: string
  includeData: boolean
  includeCharts: boolean
  includeMetadata: boolean
  dateRange: string
  language: 'ar' | 'en' | 'both'
  deliveryMethod: 'download' | 'email'
  emailRecipients?: string[]
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  data,
  filename = 'analytics-report',
  formats = ['pdf', 'excel', 'csv'],
  includeCharts = true,
  onExportComplete
}) => {
  const { language } = useLanguage()
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'pdf',
    includeData: true,
    includeCharts: includeCharts,
    includeMetadata: true,
    dateRange: 'current',
    language: language,
    deliveryMethod: 'download'
  })

  const formatLabels = {
    pdf: { ar: 'PDF', en: 'PDF', icon: FileText },
    excel: { ar: 'Excel', en: 'Excel', icon: Table },
    csv: { ar: 'CSV', en: 'CSV', icon: Table },
    json: { ar: 'JSON', en: 'JSON', icon: BarChart3 },
    image: { ar: 'صورة', en: 'Image', icon: Image }
  }

  const handleQuickExport = async (format: string) => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Simulate export progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Generate export based on format
      let exportResult
      switch (format) {
        case 'pdf':
          exportResult = await generatePDFExport(data, exportSettings)
          break
        case 'excel':
          exportResult = await generateExcelExport(data, exportSettings)
          break
        case 'csv':
          exportResult = await generateCSVExport(data, exportSettings)
          break
        case 'json':
          exportResult = await generateJSONExport(data, exportSettings)
          break
        case 'image':
          exportResult = await generateImageExport(data, exportSettings)
          break
        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      clearInterval(progressInterval)
      setExportProgress(100)

      // Trigger download
      if (exportResult.blob) {
        const url = URL.createObjectURL(exportResult.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}-${Date.now()}.${format === 'excel' ? 'xlsx' : format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(0)
        onExportComplete?.(format, true)
      }, 1000)

    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
      setExportProgress(0)
      onExportComplete?.(format, false)
    }
  }

  const handleAdvancedExport = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      const options = {
        format: exportSettings.format,
        template: 'detailed',
        language: exportSettings.language,
        include_charts: exportSettings.includeCharts,
        include_raw_data: exportSettings.includeData,
        delivery_method: exportSettings.deliveryMethod,
        recipients: exportSettings.emailRecipients
      }

      // Use analytics service for advanced export
      const report = await analyticsService.generateProgressReport('student_123', 'monthly', options)
      
      setExportProgress(100)
      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(0)
        setShowAdvancedOptions(false)
        onExportComplete?.(exportSettings.format, true)
      }, 1000)

    } catch (error) {
      console.error('Advanced export failed:', error)
      setIsExporting(false)
      setExportProgress(0)
      onExportComplete?.(exportSettings.format, false)
    }
  }

  return (
    <>
      {/* Quick Export Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {language === 'ar' ? 'تصدير' : 'Export'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            {language === 'ar' ? 'تصدير سريع' : 'Quick Export'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {formats.map((format) => {
            const formatInfo = formatLabels[format]
            const IconComponent = formatInfo.icon
            return (
              <DropdownMenuItem
                key={format}
                onClick={() => handleQuickExport(format)}
                disabled={isExporting}
              >
                <IconComponent className="h-4 w-4 mr-2" />
                {formatInfo[language]}
              </DropdownMenuItem>
            )
          })}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowAdvancedOptions(true)}>
            <Settings className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'خيارات متقدمة' : 'Advanced Options'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Export Progress */}
      {isExporting && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="w-80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'جاري التصدير...' : 'Exporting...'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {exportProgress}%
                </span>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Advanced Export Dialog */}
      <Dialog open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'خيارات التصدير المتقدمة' : 'Advanced Export Options'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Format Selection */}
            <div>
              <label className="text-sm font-medium">
                {language === 'ar' ? 'تنسيق التصدير:' : 'Export Format:'}
              </label>
              <Select 
                value={exportSettings.format} 
                onValueChange={(value) => setExportSettings({...exportSettings, format: value})}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formats.map((format) => {
                    const formatInfo = formatLabels[format]
                    return (
                      <SelectItem key={format} value={format}>
                        {formatInfo[language]}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Language Selection */}
            <div>
              <label className="text-sm font-medium">
                {language === 'ar' ? 'اللغة:' : 'Language:'}
              </label>
              <Select 
                value={exportSettings.language} 
                onValueChange={(value: 'ar' | 'en' | 'both') => setExportSettings({...exportSettings, language: value})}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">
                    {language === 'ar' ? 'العربية' : 'Arabic'}
                  </SelectItem>
                  <SelectItem value="en">
                    {language === 'ar' ? 'الإنجليزية' : 'English'}
                  </SelectItem>
                  <SelectItem value="both">
                    {language === 'ar' ? 'ثنائي اللغة' : 'Bilingual'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {language === 'ar' ? 'المحتوى المضمن:' : 'Include Content:'}
              </label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-data"
                    checked={exportSettings.includeData}
                    onCheckedChange={(checked) => 
                      setExportSettings({...exportSettings, includeData: !!checked})
                    }
                  />
                  <label htmlFor="include-data" className="text-sm">
                    {language === 'ar' ? 'البيانات الأولية' : 'Raw Data'}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-charts"
                    checked={exportSettings.includeCharts}
                    onCheckedChange={(checked) => 
                      setExportSettings({...exportSettings, includeCharts: !!checked})
                    }
                  />
                  <label htmlFor="include-charts" className="text-sm">
                    {language === 'ar' ? 'الرسوم البيانية' : 'Charts & Visualizations'}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-metadata"
                    checked={exportSettings.includeMetadata}
                    onCheckedChange={(checked) => 
                      setExportSettings({...exportSettings, includeMetadata: !!checked})
                    }
                  />
                  <label htmlFor="include-metadata" className="text-sm">
                    {language === 'ar' ? 'البيانات الوصفية' : 'Metadata & Timestamps'}
                  </label>
                </div>
              </div>
            </div>

            {/* Delivery Method */}
            <div>
              <label className="text-sm font-medium">
                {language === 'ar' ? 'طريقة التسليم:' : 'Delivery Method:'}
              </label>
              <Select 
                value={exportSettings.deliveryMethod} 
                onValueChange={(value: 'download' | 'email') => 
                  setExportSettings({...exportSettings, deliveryMethod: value})
                }
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="download">
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'تحميل مباشر' : 'Direct Download'}
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إرسال بالبريد الإلكتروني' : 'Email Delivery'}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAdvancedOptions(false)}
                disabled={isExporting}
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleAdvancedExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {language === 'ar' ? 'تصدير' : 'Export'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper functions for different export formats
const generatePDFExport = async (data: any, settings: ExportSettings) => {
  // In a real implementation, this would use libraries like jsPDF or Puppeteer
  const mockContent = JSON.stringify(data, null, 2)
  const blob = new Blob([mockContent], { type: 'application/pdf' })
  return { blob }
}

const generateExcelExport = async (data: any, settings: ExportSettings) => {
  // In a real implementation, this would use libraries like xlsx or exceljs
  const mockContent = JSON.stringify(data, null, 2)
  const blob = new Blob([mockContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  return { blob }
}

const generateCSVExport = async (data: any, settings: ExportSettings) => {
  // Convert data to CSV format
  const csvContent = convertToCSV(data)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  return { blob }
}

const generateJSONExport = async (data: any, settings: ExportSettings) => {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  return { blob }
}

const generateImageExport = async (data: any, settings: ExportSettings) => {
  // In a real implementation, this would capture charts as images
  const mockContent = JSON.stringify(data, null, 2)
  const blob = new Blob([mockContent], { type: 'image/png' })
  return { blob }
}

const convertToCSV = (data: any) => {
  if (!data) return ''
  
  // Simple CSV conversion - in real implementation, handle complex nested data
  if (Array.isArray(data)) {
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(item => 
      Object.values(item).map(value => 
        typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      ).join(',')
    ).join('\n')
    
    return `${headers}\n${rows}`
  }
  
  return Object.entries(data).map(([key, value]) => `${key},${value}`).join('\n')
}

export default ExportOptions