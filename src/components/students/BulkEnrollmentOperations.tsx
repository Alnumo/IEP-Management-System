// Story 6.1: Bulk enrollment operations component for managing multiple student enrollments

import React, { useState, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  Download, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  X,
  FileSpreadsheet,
  Calendar,
  Clock,
  Target,
  PlayCircle
} from 'lucide-react'
import type { IndividualizedEnrollment, CustomSchedule } from '@/types/individualized-enrollment'
import type { ProgramTemplate } from '@/types/program-templates'

interface BulkStudent {
  id: string
  name_ar: string
  name_en: string
  age?: number
  needs?: string[]
  current_programs?: string[]
  selected: boolean
  program_template_id?: string
  assigned_therapist_id?: string
  individual_start_date?: string
  individual_end_date?: string
  custom_schedule?: Partial<CustomSchedule>
  notes?: string
  validation_errors: string[]
}

interface BulkTherapist {
  id: string
  name_ar: string
  name_en: string
  specializations: string[]
  current_capacity: number
  max_capacity: number
  available_days: string[]
}

interface BulkEnrollmentOperationsProps {
  students: Array<{
    id: string
    name_ar: string
    name_en: string
    age?: number
    needs?: string[]
    current_programs?: string[]
  }>
  therapists: BulkTherapist[]
  programTemplates: ProgramTemplate[]
  onBulkEnroll?: (enrollments: Omit<IndividualizedEnrollment, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>
  onExportTemplate?: () => void
  onImportData?: (file: File) => Promise<void>
  className?: string
}

interface BulkOperationProgress {
  total: number
  completed: number
  failed: number
  current?: string
  errors: Array<{ studentId: string; error: string }>
}

export function BulkEnrollmentOperations({
  students: initialStudents,
  therapists,
  programTemplates,
  onBulkEnroll,
  onExportTemplate,
  onImportData,
  className = ''
}: BulkEnrollmentOperationsProps) {
  const { language, isRTL } = useLanguage()
  const [bulkStudents, setBulkStudents] = useState<BulkStudent[]>(() =>
    initialStudents.map(student => ({
      ...student,
      selected: false,
      validation_errors: []
    }))
  )
  const [globalSettings, setGlobalSettings] = useState({
    program_template_id: '',
    assigned_therapist_id: '',
    individual_start_date: '',
    individual_end_date: '',
    sessions_per_week: 2,
    session_duration_minutes: 60,
    apply_to_all: false
  })
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)

  const texts = {
    title: {
      ar: 'عمليات التسجيل المجمع',
      en: 'Bulk Enrollment Operations'
    },
    studentSelection: {
      ar: 'اختيار الطلاب',
      en: 'Student Selection'
    },
    globalSettings: {
      ar: 'الإعدادات العامة',
      en: 'Global Settings'
    },
    individualCustomization: {
      ar: 'التخصيص الفردي',
      en: 'Individual Customization'
    },
    importExport: {
      ar: 'الاستيراد والتصدير',
      en: 'Import/Export'
    },
    selectAll: {
      ar: 'اختيار الكل',
      en: 'Select All'
    },
    deselectAll: {
      ar: 'إلغاء اختيار الكل',
      en: 'Deselect All'
    },
    selectedStudents: {
      ar: 'الطلاب المختارون',
      en: 'Selected Students'
    },
    programTemplate: {
      ar: 'قالب البرنامج',
      en: 'Program Template'
    },
    assignedTherapist: {
      ar: 'المعالج المعين',
      en: 'Assigned Therapist'
    },
    startDate: {
      ar: 'تاريخ البداية',
      en: 'Start Date'
    },
    endDate: {
      ar: 'تاريخ النهاية',
      en: 'End Date'
    },
    sessionsPerWeek: {
      ar: 'الجلسات أسبوعياً',
      en: 'Sessions Per Week'
    },
    sessionDuration: {
      ar: 'مدة الجلسة (دقيقة)',
      en: 'Session Duration (minutes)'
    },
    applyToAll: {
      ar: 'تطبيق على الجميع',
      en: 'Apply to All'
    },
    validate: {
      ar: 'التحقق من الصحة',
      en: 'Validate'
    },
    startEnrollment: {
      ar: 'بدء التسجيل',
      en: 'Start Enrollment'
    },
    exportTemplate: {
      ar: 'تصدير القالب',
      en: 'Export Template'
    },
    importData: {
      ar: 'استيراد البيانات',
      en: 'Import Data'
    },
    uploadFile: {
      ar: 'رفع ملف',
      en: 'Upload File'
    },
    processing: {
      ar: 'جاري المعالجة...',
      en: 'Processing...'
    },
    completed: {
      ar: 'مكتمل',
      en: 'Completed'
    },
    failed: {
      ar: 'فشل',
      en: 'Failed'
    },
    validationErrors: {
      ar: 'أخطاء التحقق',
      en: 'Validation Errors'
    },
    noStudentsSelected: {
      ar: 'لم يتم اختيار أي طلاب',
      en: 'No students selected'
    },
    missingRequired: {
      ar: 'مطلوب: قالب البرنامج والمعالج وتواريخ البداية والنهاية',
      en: 'Required: Program template, therapist, and start/end dates'
    },
    invalidDateRange: {
      ar: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
      en: 'End date must be after start date'
    },
    therapistOvercapacity: {
      ar: 'المعالج يتجاوز السعة القصوى',
      en: 'Therapist exceeds maximum capacity'
    },
    age: {
      ar: 'العمر',
      en: 'Age'
    },
    years: {
      ar: 'سنة',
      en: 'years'
    },
    capacity: {
      ar: 'السعة',
      en: 'Capacity'
    },
    specializations: {
      ar: 'التخصصات',
      en: 'Specializations'
    },
    currentPrograms: {
      ar: 'البرامج الحالية',
      en: 'Current Programs'
    },
    notes: {
      ar: 'ملاحظات',
      en: 'Notes'
    },
    autoAssign: {
      ar: 'التعيين التلقائي',
      en: 'Auto Assign'
    },
    byCapacity: {
      ar: 'حسب السعة المتاحة',
      en: 'By Available Capacity'
    },
    bySpecialization: {
      ar: 'حسب التخصص',
      en: 'By Specialization'
    }
  }

  const handleSelectAll = useCallback(() => {
    setBulkStudents(prev => prev.map(student => ({ ...student, selected: true })))
  }, [])

  const handleDeselectAll = useCallback(() => {
    setBulkStudents(prev => prev.map(student => ({ ...student, selected: false })))
  }, [])

  const handleStudentSelect = useCallback((studentId: string, selected: boolean) => {
    setBulkStudents(prev => prev.map(student => 
      student.id === studentId ? { ...student, selected } : student
    ))
  }, [])

  const handleGlobalSettingChange = useCallback((field: string, value: any) => {
    setGlobalSettings(prev => ({ ...prev, [field]: value }))
    
    // Apply to all selected students if apply_to_all is enabled
    if (globalSettings.apply_to_all) {
      setBulkStudents(prev => prev.map(student => 
        student.selected ? { ...student, [field]: value } : student
      ))
    }
  }, [globalSettings.apply_to_all])

  const handleIndividualSettingChange = useCallback((studentId: string, field: string, value: any) => {
    setBulkStudents(prev => prev.map(student => 
      student.id === studentId ? { ...student, [field]: value } : student
    ))
  }, [])

  const autoAssignTherapists = useCallback((method: 'capacity' | 'specialization') => {
    setBulkStudents(prev => prev.map(student => {
      if (!student.selected) return student

      let bestTherapist = therapists[0]
      
      if (method === 'capacity') {
        // Find therapist with lowest current capacity
        bestTherapist = therapists.reduce((best, therapist) => 
          therapist.current_capacity < best.current_capacity ? therapist : best
        )
      } else if (method === 'specialization') {
        // Find therapist with matching specializations (basic matching)
        const matchingTherapist = therapists.find(therapist => 
          student.needs?.some(need => 
            therapist.specializations.some(spec => 
              spec.toLowerCase().includes(need.toLowerCase())
            )
          )
        )
        bestTherapist = matchingTherapist || therapists[0]
      }

      return {
        ...student,
        assigned_therapist_id: bestTherapist.id
      }
    }))
  }, [therapists])

  const validateEnrollments = useCallback(() => {
    setBulkStudents(prev => prev.map(student => {
      const errors: string[] = []

      if (student.selected) {
        // Check required fields
        if (!student.program_template_id && !globalSettings.program_template_id) {
          errors.push(texts.missingRequired[language])
        }
        if (!student.assigned_therapist_id && !globalSettings.assigned_therapist_id) {
          errors.push(texts.missingRequired[language])
        }
        
        const startDate = student.individual_start_date || globalSettings.individual_start_date
        const endDate = student.individual_end_date || globalSettings.individual_end_date
        
        if (!startDate || !endDate) {
          errors.push(texts.missingRequired[language])
        } else if (new Date(endDate) <= new Date(startDate)) {
          errors.push(texts.invalidDateRange[language])
        }

        // Check therapist capacity
        const therapistId = student.assigned_therapist_id || globalSettings.assigned_therapist_id
        const therapist = therapists.find(t => t.id === therapistId)
        if (therapist && therapist.current_capacity >= therapist.max_capacity) {
          errors.push(texts.therapistOvercapacity[language])
        }
      }

      return { ...student, validation_errors: errors }
    }))
  }, [globalSettings, therapists, language, texts])

  const handleBulkEnroll = useCallback(async () => {
    const selectedStudents = bulkStudents.filter(s => s.selected)
    
    if (selectedStudents.length === 0) {
      alert(texts.noStudentsSelected[language])
      return
    }

    // Validate first
    validateEnrollments()
    const hasErrors = bulkStudents.some(s => s.selected && s.validation_errors.length > 0)
    if (hasErrors) {
      alert(texts.validationErrors[language])
      return
    }

    setProgress({
      total: selectedStudents.length,
      completed: 0,
      failed: 0,
      errors: []
    })

    try {
      const enrollments = selectedStudents.map(student => ({
        student_id: student.id,
        program_template_id: student.program_template_id || globalSettings.program_template_id,
        assigned_therapist_id: student.assigned_therapist_id || globalSettings.assigned_therapist_id,
        individual_start_date: student.individual_start_date || globalSettings.individual_start_date,
        individual_end_date: student.individual_end_date || globalSettings.individual_end_date,
        custom_schedule: {
          sessions_per_week: globalSettings.sessions_per_week,
          session_duration_minutes: globalSettings.session_duration_minutes,
          preferred_days: [],
          preferred_times: [],
          ...student.custom_schedule
        },
        program_modifications: {},
        enrollment_status: 'active' as const,
        notes: student.notes || ''
      }))

      if (onBulkEnroll) {
        await onBulkEnroll(enrollments)
      }

      setProgress(prev => prev ? { 
        ...prev, 
        completed: prev.total, 
        current: texts.completed[language] 
      } : null)

    } catch (error) {
      console.error('Bulk enrollment failed:', error)
      setProgress(prev => prev ? { 
        ...prev, 
        failed: prev.total - prev.completed,
        errors: [{ studentId: 'all', error: String(error) }]
      } : null)
    }
  }, [bulkStudents, globalSettings, onBulkEnroll, validateEnrollments, language, texts])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onImportData) {
      setImportFile(file)
      try {
        await onImportData(file)
      } catch (error) {
        console.error('Import failed:', error)
        alert(`Import failed: ${error}`)
      }
    }
  }, [onImportData])

  const selectedCount = bulkStudents.filter(s => s.selected).length

  return (
    <div className={`space-y-6 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <h2 className="text-2xl font-bold">{texts.title[language]}</h2>
        <div className="flex gap-2">
          {onExportTemplate && (
            <Button onClick={onExportTemplate} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {texts.exportTemplate[language]}
            </Button>
          )}
          <Button onClick={validateEnrollments} variant="outline">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {texts.validate[language]}
          </Button>
        </div>
      </div>

      {/* Progress Display */}
      {progress && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {progress.current || texts.processing[language]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {progress.completed}/{progress.total} {texts.completed[language]}
                  {progress.failed > 0 && ` • ${progress.failed} ${texts.failed[language]}`}
                </span>
              </div>
              <Progress value={(progress.completed / progress.total) * 100} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="selection" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="selection">{texts.studentSelection[language]}</TabsTrigger>
          <TabsTrigger value="global">{texts.globalSettings[language]}</TabsTrigger>
          <TabsTrigger value="individual">{texts.individualCustomization[language]}</TabsTrigger>
          <TabsTrigger value="import">{texts.importExport[language]}</TabsTrigger>
        </TabsList>

        {/* Student Selection Tab */}
        <TabsContent value="selection" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={handleSelectAll} variant="outline" size="sm">
                {texts.selectAll[language]}
              </Button>
              <Button onClick={handleDeselectAll} variant="outline" size="sm">
                {texts.deselectAll[language]}
              </Button>
            </div>
            <Badge variant="secondary">
              {selectedCount} {texts.selectedStudents[language]}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bulkStudents.map((student) => (
              <Card 
                key={student.id}
                className={`cursor-pointer transition-all ${
                  student.selected ? 'ring-2 ring-primary' : ''
                } ${
                  student.validation_errors.length > 0 ? 'border-destructive' : ''
                }`}
                onClick={() => handleStudentSelect(student.id, !student.selected)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={student.selected}
                        onCheckedChange={(checked) => 
                          handleStudentSelect(student.id, checked as boolean)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {language === 'ar' ? student.name_ar : student.name_en}
                        </h4>
                        {student.age && (
                          <p className="text-sm text-muted-foreground">
                            {student.age} {texts.years[language]}
                          </p>
                        )}
                      </div>
                    </div>

                    {student.needs && student.needs.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {student.needs.slice(0, 3).map((need, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {need}
                          </Badge>
                        ))}
                        {student.needs.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{student.needs.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {student.current_programs && student.current_programs.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {texts.currentPrograms[language]}:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {student.current_programs.slice(0, 2).map((program, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {program}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {student.validation_errors.length > 0 && (
                      <Alert className="py-2">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          {student.validation_errors[0]}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Global Settings Tab */}
        <TabsContent value="global" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{texts.globalSettings[language]}</CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="apply-to-all"
                  checked={globalSettings.apply_to_all}
                  onCheckedChange={(checked) => 
                    setGlobalSettings(prev => ({ ...prev, apply_to_all: checked as boolean }))
                  }
                />
                <Label htmlFor="apply-to-all" className="text-sm">
                  {texts.applyToAll[language]}
                </Label>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{texts.programTemplate[language]}</Label>
                  <Select
                    value={globalSettings.program_template_id}
                    onValueChange={(value) => handleGlobalSettingChange('program_template_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={texts.programTemplate[language]} />
                    </SelectTrigger>
                    <SelectContent>
                      {programTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {language === 'ar' ? template.program_name_ar : template.program_name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>{texts.assignedTherapist[language]}</Label>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => autoAssignTherapists('capacity')}
                      >
                        {texts.byCapacity[language]}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => autoAssignTherapists('specialization')}
                      >
                        {texts.bySpecialization[language]}
                      </Button>
                    </div>
                  </div>
                  <Select
                    value={globalSettings.assigned_therapist_id}
                    onValueChange={(value) => handleGlobalSettingChange('assigned_therapist_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={texts.assignedTherapist[language]} />
                    </SelectTrigger>
                    <SelectContent>
                      {therapists.map((therapist) => (
                        <SelectItem key={therapist.id} value={therapist.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>
                              {language === 'ar' ? therapist.name_ar : therapist.name_en}
                            </span>
                            <Badge variant="secondary" className="ml-2">
                              {therapist.current_capacity}/{therapist.max_capacity}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{texts.startDate[language]}</Label>
                  <Input
                    type="date"
                    value={globalSettings.individual_start_date}
                    onChange={(e) => handleGlobalSettingChange('individual_start_date', e.target.value)}
                  />
                </div>

                <div>
                  <Label>{texts.endDate[language]}</Label>
                  <Input
                    type="date"
                    value={globalSettings.individual_end_date}
                    onChange={(e) => handleGlobalSettingChange('individual_end_date', e.target.value)}
                  />
                </div>

                <div>
                  <Label>{texts.sessionsPerWeek[language]}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="7"
                    value={globalSettings.sessions_per_week}
                    onChange={(e) => handleGlobalSettingChange('sessions_per_week', parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label>{texts.sessionDuration[language]}</Label>
                  <Input
                    type="number"
                    min="30"
                    max="120"
                    step="15"
                    value={globalSettings.session_duration_minutes}
                    onChange={(e) => handleGlobalSettingChange('session_duration_minutes', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Customization Tab */}
        <TabsContent value="individual" className="space-y-4">
          <div className="space-y-4">
            {bulkStudents.filter(s => s.selected).map((student) => (
              <Card key={student.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === 'ar' ? student.name_ar : student.name_en}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>{texts.programTemplate[language]}</Label>
                      <Select
                        value={student.program_template_id || ''}
                        onValueChange={(value) => 
                          handleIndividualSettingChange(student.id, 'program_template_id', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Use global setting" />
                        </SelectTrigger>
                        <SelectContent>
                          {programTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {language === 'ar' ? template.program_name_ar : template.program_name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{texts.assignedTherapist[language]}</Label>
                      <Select
                        value={student.assigned_therapist_id || ''}
                        onValueChange={(value) => 
                          handleIndividualSettingChange(student.id, 'assigned_therapist_id', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Use global setting" />
                        </SelectTrigger>
                        <SelectContent>
                          {therapists.map((therapist) => (
                            <SelectItem key={therapist.id} value={therapist.id}>
                              {language === 'ar' ? therapist.name_ar : therapist.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{texts.notes[language]}</Label>
                      <Input
                        value={student.notes || ''}
                        onChange={(e) => 
                          handleIndividualSettingChange(student.id, 'notes', e.target.value)
                        }
                        placeholder="Individual notes..."
                      />
                    </div>
                  </div>

                  {student.validation_errors.length > 0 && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {student.validation_errors.map((error, index) => (
                            <li key={index} className="text-sm">{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}

            {selectedCount === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{texts.noStudentsSelected[language]}</AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        {/* Import/Export Tab */}
        <TabsContent value="import" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  {texts.importData[language]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="import-file">{texts.uploadFile[language]}</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                  />
                  {importFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {importFile.name}
                    </p>
                  )}
                </div>
                <Alert>
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Supported formats: Excel (.xlsx, .xls) and CSV files
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  {texts.exportTemplate[language]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Download a template file with the correct format for bulk import.
                </p>
                {onExportTemplate && (
                  <Button onClick={onExportTemplate} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    {texts.exportTemplate[language]}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <Button
          onClick={handleBulkEnroll}
          disabled={selectedCount === 0 || !!progress}
          className="flex-1"
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          {texts.startEnrollment[language]} ({selectedCount})
        </Button>
      </div>
    </div>
  )
}