/**
 * IEP PDF Export Dialog with Cultural Settings
 * مربع حوار تصدير PDF للبرنامج التعليمي الفردي مع الإعدادات الثقافية
 * 
 * @description Culturally appropriate PDF export dialog for IEPs
 * Story 1.3 - Task 4: Arabic PDF export with cultural appropriateness
 */

import React, { useState } from 'react'
import { Download, FileText, Globe, Heart, Settings, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useI18n } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/use-toast'
import { generateIEPPDF } from '@/services/iep-pdf-export-service'
import type { IEPPDFOptions, IEPPDFData } from '@/services/iep-pdf-export-service'
import type { IEP } from '@/types/iep'

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface IEPPDFExportDialogProps {
  iepData: IEP & {
    student: any
    goals: any[]
  }
  trigger?: React.ReactNode
  onExportComplete?: (success: boolean) => void
}

interface CulturalPreset {
  name_ar: string
  name_en: string
  settings: IEPPDFOptions['culturalSettings']
  options: Partial<IEPPDFOptions>
}

// =============================================================================
// CULTURAL PRESETS
// =============================================================================

const CULTURAL_PRESETS: CulturalPreset[] = [
  {
    name_ar: 'الإعدادات الثقافية السعودية',
    name_en: 'Saudi Cultural Settings',
    settings: {
      respectPrivacy: true,
      includeGenderConsiderations: true,
      includeFamilyDynamicsNotes: true,
      useConservativeLanguage: true
    },
    options: {
      includeCulturalNotes: true,
      includeIslamicCalendar: true,
      includeArabicCalendar: true
    }
  },
  {
    name_ar: 'الإعدادات الدولية',
    name_en: 'International Settings',
    settings: {
      respectPrivacy: true,
      includeGenderConsiderations: false,
      includeFamilyDynamicsNotes: false,
      useConservativeLanguage: false
    },
    options: {
      includeCulturalNotes: false,
      includeIslamicCalendar: false,
      includeArabicCalendar: false
    }
  },
  {
    name_ar: 'إعدادات مخصصة',
    name_en: 'Custom Settings',
    settings: {
      respectPrivacy: true,
      includeGenderConsiderations: false,
      includeFamilyDynamicsNotes: false,
      useConservativeLanguage: false
    },
    options: {
      includeCulturalNotes: false,
      includeIslamicCalendar: false,
      includeArabicCalendar: false
    }
  }
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IEPPDFExportDialog: React.FC<IEPPDFExportDialogProps> = ({
  iepData,
  trigger,
  onExportComplete
}) => {
  const { language, isRTL } = useI18n()
  const { toast } = useToast()
  
  // State management
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<CulturalPreset>(CULTURAL_PRESETS[0])
  
  // PDF options state
  const [pdfOptions, setPdfOptions] = useState<IEPPDFOptions>({
    language: language,
    includeArabicCalendar: true,
    includeCulturalNotes: true,
    includeIslamicCalendar: true,
    watermark: '',
    companyInfo: {
      name_ar: 'مركز أركان للنمو',
      name_en: 'Arkan Growth Center',
      address_ar: 'الرياض، المملكة العربية السعودية',
      address_en: 'Riyadh, Saudi Arabia',
      phone: '+966-11-xxx-xxxx',
      email: 'info@arkangrowth.sa',
      license_number: 'LIC-2024-001'
    },
    culturalSettings: {
      respectPrivacy: true,
      includeGenderConsiderations: true,
      includeFamilyDynamicsNotes: true,
      useConservativeLanguage: true
    }
  })

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  const handlePresetChange = (presetIndex: number) => {
    const preset = CULTURAL_PRESETS[presetIndex]
    setSelectedPreset(preset)
    
    setPdfOptions(prev => ({
      ...prev,
      ...preset.options,
      culturalSettings: { ...preset.settings }
    }))
  }

  const handleCulturalSettingChange = (setting: keyof IEPPDFOptions['culturalSettings'], value: boolean) => {
    setPdfOptions(prev => ({
      ...prev,
      culturalSettings: {
        ...prev.culturalSettings,
        [setting]: value
      }
    }))
  }

  const handleOptionChange = (option: keyof IEPPDFOptions, value: any) => {
    setPdfOptions(prev => ({
      ...prev,
      [option]: value
    }))
  }

  const handleCompanyInfoChange = (field: string, value: string) => {
    setPdfOptions(prev => ({
      ...prev,
      companyInfo: {
        ...prev.companyInfo,
        [field]: value
      }
    }))
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Prepare IEP data for export
      const exportData: IEPPDFData = {
        ...iepData,
        student: {
          ...iepData.student,
          cultural_background: 'saudi',
          family_preferences: {
            language_preference: language,
            cultural_considerations: [
              language === 'ar' 
                ? 'مراعاة الخصوصية الثقافية'
                : 'Respect cultural privacy',
              language === 'ar'
                ? 'الاعتبارات الدينية في التعليم'
                : 'Religious considerations in education'
            ],
            religious_considerations: [
              language === 'ar'
                ? 'مراعاة أوقات الصلاة'
                : 'Prayer time considerations',
              language === 'ar'
                ? 'الاعتبارات الغذائية الحلال'
                : 'Halal dietary considerations'
            ]
          }
        }
      }

      // Generate PDF
      const pdfBlob = await generateIEPPDF(exportData, pdfOptions)
      
      clearInterval(progressInterval)
      setExportProgress(100)

      // Create download link
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      
      const studentName = language === 'ar' 
        ? iepData.student.name_ar || 'طالب_غير_محدد'
        : iepData.student.name_en || 'student_not_specified'
      
      const fileName = `IEP_${studentName.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`
      link.download = fileName
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Success notification
      toast({
        title: language === 'ar' ? 'تم التصدير بنجاح' : 'Export Successful',
        description: language === 'ar' 
          ? 'تم تصدير البرنامج التعليمي الفردي بصيغة PDF'
          : 'IEP has been exported as PDF successfully',
      })

      setIsOpen(false)
      onExportComplete?.(true)

    } catch (error) {
      console.error('PDF export failed:', error)
      
      toast({
        title: language === 'ar' ? 'فشل في التصدير' : 'Export Failed',
        description: language === 'ar'
          ? 'حدث خطأ أثناء تصدير البرنامج التعليمي الفردي'
          : 'An error occurred while exporting the IEP',
        variant: 'destructive'
      })

      onExportComplete?.(false)
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  // =============================================================================
  // RENDER FUNCTIONS
  // =============================================================================

  const renderCulturalPresets = () => (
    <div className="space-y-4">
      <Label className="text-sm font-medium">
        {language === 'ar' ? 'الإعدادات المسبقة' : 'Cultural Presets'}
      </Label>
      
      <div className="grid grid-cols-1 gap-3">
        {CULTURAL_PRESETS.map((preset, index) => (
          <Card 
            key={index}
            className={`cursor-pointer transition-all ${
              selectedPreset === preset 
                ? 'ring-2 ring-primary border-primary' 
                : 'hover:border-gray-300'
            }`}
            onClick={() => handlePresetChange(index)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedPreset === preset 
                    ? 'border-primary bg-primary' 
                    : 'border-gray-300'
                }`}>
                  {selectedPreset === preset && (
                    <Check className="w-2 h-2 text-white" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium">
                    {language === 'ar' ? preset.name_ar : preset.name_en}
                  </h4>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderCulturalSettings = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Heart className="h-4 w-4" />
        {language === 'ar' ? 'الإعدادات الثقافية' : 'Cultural Settings'}
      </h3>

      <div className="space-y-3">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Checkbox
            id="respectPrivacy"
            checked={pdfOptions.culturalSettings.respectPrivacy}
            onCheckedChange={(checked) => 
              handleCulturalSettingChange('respectPrivacy', checked as boolean)
            }
          />
          <Label htmlFor="respectPrivacy" className="text-sm">
            {language === 'ar' ? 'احترام الخصوصية الثقافية' : 'Respect cultural privacy'}
          </Label>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Checkbox
            id="genderConsiderations"
            checked={pdfOptions.culturalSettings.includeGenderConsiderations}
            onCheckedChange={(checked) => 
              handleCulturalSettingChange('includeGenderConsiderations', checked as boolean)
            }
          />
          <Label htmlFor="genderConsiderations" className="text-sm">
            {language === 'ar' ? 'مراعاة الاعتبارات الجندرية' : 'Include gender considerations'}
          </Label>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Checkbox
            id="familyDynamics"
            checked={pdfOptions.culturalSettings.includeFamilyDynamicsNotes}
            onCheckedChange={(checked) => 
              handleCulturalSettingChange('includeFamilyDynamicsNotes', checked as boolean)
            }
          />
          <Label htmlFor="familyDynamics" className="text-sm">
            {language === 'ar' ? 'ملاحظات ديناميكيات الأسرة' : 'Family dynamics notes'}
          </Label>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Checkbox
            id="conservativeLanguage"
            checked={pdfOptions.culturalSettings.useConservativeLanguage}
            onCheckedChange={(checked) => 
              handleCulturalSettingChange('useConservativeLanguage', checked as boolean)
            }
          />
          <Label htmlFor="conservativeLanguage" className="text-sm">
            {language === 'ar' ? 'استخدام لغة محافظة ومهذبة' : 'Use conservative language'}
          </Label>
        </div>
      </div>
    </div>
  )

  const renderFormatOptions = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Settings className="h-4 w-4" />
        {language === 'ar' ? 'خيارات التنسيق' : 'Format Options'}
      </h3>

      <div className="space-y-3">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Checkbox
            id="islamicCalendar"
            checked={pdfOptions.includeIslamicCalendar}
            onCheckedChange={(checked) => 
              handleOptionChange('includeIslamicCalendar', checked)
            }
          />
          <Label htmlFor="islamicCalendar" className="text-sm">
            {language === 'ar' ? 'إضافة التاريخ الهجري' : 'Include Islamic calendar'}
          </Label>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Checkbox
            id="culturalNotes"
            checked={pdfOptions.includeCulturalNotes}
            onCheckedChange={(checked) => 
              handleOptionChange('includeCulturalNotes', checked)
            }
          />
          <Label htmlFor="culturalNotes" className="text-sm">
            {language === 'ar' ? 'إضافة الملاحظات الثقافية' : 'Include cultural notes'}
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="watermark" className="text-sm">
            {language === 'ar' ? 'علامة مائية (اختيارية)' : 'Watermark (optional)'}
          </Label>
          <Input
            id="watermark"
            placeholder={language === 'ar' ? 'نص العلامة المائية' : 'Watermark text'}
            value={pdfOptions.watermark}
            onChange={(e) => handleOptionChange('watermark', e.target.value)}
            className="text-sm"
          />
        </div>
      </div>
    </div>
  )

  const renderCompanyInfo = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">
        {language === 'ar' ? 'معلومات المؤسسة' : 'Company Information'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="companyNameAr" className="text-sm">
            {language === 'ar' ? 'اسم المؤسسة (عربي)' : 'Company Name (Arabic)'}
          </Label>
          <Input
            id="companyNameAr"
            value={pdfOptions.companyInfo.name_ar}
            onChange={(e) => handleCompanyInfoChange('name_ar', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="companyNameEn" className="text-sm">
            {language === 'ar' ? 'اسم المؤسسة (إنجليزي)' : 'Company Name (English)'}
          </Label>
          <Input
            id="companyNameEn"
            value={pdfOptions.companyInfo.name_en}
            onChange={(e) => handleCompanyInfoChange('name_en', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm">
            {language === 'ar' ? 'الهاتف' : 'Phone'}
          </Label>
          <Input
            id="phone"
            value={pdfOptions.companyInfo.phone}
            onChange={(e) => handleCompanyInfoChange('phone', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="license" className="text-sm">
            {language === 'ar' ? 'رقم الترخيص' : 'License Number'}
          </Label>
          <Input
            id="license"
            value={pdfOptions.companyInfo.license_number}
            onChange={(e) => handleCompanyInfoChange('license_number', e.target.value)}
          />
        </div>
      </div>
    </div>
  )

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'ar' 
              ? 'تصدير البرنامج التعليمي الفردي كـ PDF'
              : 'Export IEP as PDF'
            }
          </DialogTitle>
        </DialogHeader>

        {/* Cultural Information Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {language === 'ar' ? 'ملاحظة ثقافية مهمة' : 'Important Cultural Note'}
          </AlertTitle>
          <AlertDescription>
            {language === 'ar'
              ? 'يتم تطبيق الاعتبارات الثقافية والدينية المناسبة للمجتمع السعودي في هذا التصدير'
              : 'Appropriate cultural and religious considerations for Saudi society are applied in this export'
            }
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="presets">
              {language === 'ar' ? 'الإعدادات المسبقة' : 'Presets'}
            </TabsTrigger>
            <TabsTrigger value="cultural">
              {language === 'ar' ? 'الثقافية' : 'Cultural'}
            </TabsTrigger>
            <TabsTrigger value="format">
              {language === 'ar' ? 'التنسيق' : 'Format'}
            </TabsTrigger>
            <TabsTrigger value="company">
              {language === 'ar' ? 'المؤسسة' : 'Company'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4">
            {renderCulturalPresets()}
          </TabsContent>

          <TabsContent value="cultural" className="space-y-4">
            {renderCulturalSettings()}
          </TabsContent>

          <TabsContent value="format" className="space-y-4">
            {renderFormatOptions()}
          </TabsContent>

          <TabsContent value="company" className="space-y-4">
            {renderCompanyInfo()}
          </TabsContent>
        </Tabs>

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                {language === 'ar' ? 'جاري التصدير...' : 'Exporting...'}
              </span>
              <span>{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} className="w-full" />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting 
              ? (language === 'ar' ? 'جاري التصدير...' : 'Exporting...')
              : (language === 'ar' ? 'تصدير PDF' : 'Export PDF')
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default IEPPDFExportDialog