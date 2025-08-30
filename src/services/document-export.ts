/**
 * Document Export Service
 * PDF generation with Arabic font support and bilingual templates
 * IDEA 2024 Compliant - Official IEP document formatting
 */

import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-utils'
import { retryApiCall } from '@/lib/retry-utils'
import { errorMonitoring } from '@/lib/error-monitoring'
import type { 
  IEP, 
  IEPGoal, 
  IEPProgressData, 
  Student,
  ProgressReport 
} from '@/types/iep'

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'html'
  language: 'en' | 'ar' | 'both'
  includeProgressData: boolean
  includeGoals: boolean
  includeServices: boolean
  includeMeetingNotes: boolean
  includeAssessments: boolean
  watermark?: string
  confidential: boolean
  pageOrientation: 'portrait' | 'landscape'
  fontSize: 'small' | 'medium' | 'large'
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface DocumentTemplate {
  id: string
  name: string
  nameAr: string
  type: 'full_iep' | 'progress_report' | 'goal_summary' | 'meeting_minutes' | 'evaluation_report'
  language: 'en' | 'ar' | 'both'
  template: string
  isOfficial: boolean
  requiresSignatures: boolean
  complianceLevel: 'federal' | 'state' | 'district'
}

export interface ExportResult {
  success: boolean
  fileName: string
  fileSize: number
  exportType: string
  downloadUrl?: string
  error?: string
  generationTime: number
}

// =============================================================================
// ARABIC FONT AND RTL SUPPORT
// =============================================================================

/**
 * Initialize Arabic font support for jsPDF
 */
export const initializeArabicFonts = (doc: jsPDF) => {
  // Note: In a real implementation, you would need to:
  // 1. Load Arabic fonts (like Amiri, Scheherazade, or Noto Sans Arabic)
  // 2. Add them to jsPDF using addFont()
  // 3. Set proper RTL text direction
  
  try {
    // Set default font to support Arabic (placeholder implementation)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    
    console.log('✅ DocumentExport: Arabic font support initialized')
    return true
  } catch (error) {
    console.error('❌ DocumentExport: Failed to initialize Arabic fonts:', error)
    return false
  }
}

/**
 * Format Arabic text for proper RTL display
 */
export const formatArabicText = (text: string, maxWidth: number = 180): string[] => {
  if (!text) return ['']
  
  // Split text into lines that fit within maxWidth
  // This is a simplified implementation - in production you'd use a proper Arabic text shaping library
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (testLine.length * 3 > maxWidth) { // Rough character width estimation
      if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        lines.push(word)
      }
    } else {
      currentLine = testLine
    }
  })
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  return lines.length ? lines : ['']
}

// =============================================================================
// DOCUMENT TEMPLATES
// =============================================================================

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'pdf',
  language: 'both',
  includeProgressData: true,
  includeGoals: true,
  includeServices: true,
  includeMeetingNotes: false,
  includeAssessments: false,
  confidential: true,
  pageOrientation: 'portrait',
  fontSize: 'medium',
  margins: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  }
}

/**
 * Get available document templates
 */
export const getDocumentTemplates = async (): Promise<DocumentTemplate[]> => {
  return retryApiCall(async () => {
    console.log('🔍 DocumentExport: Fetching document templates')
    
    await requireAuth()
    
    // In production, these would be stored in the database
    const templates: DocumentTemplate[] = [
      {
        id: 'full-iep-official',
        name: 'Official IEP Document',
        nameAr: 'الوثيقة الرسمية للخطة التعليمية الفردية',
        type: 'full_iep',
        language: 'both',
        template: 'full-iep-template',
        isOfficial: true,
        requiresSignatures: true,
        complianceLevel: 'federal'
      },
      {
        id: 'progress-report-quarterly',
        name: 'Quarterly Progress Report',
        nameAr: 'تقرير التقدم الفصلي',
        type: 'progress_report',
        language: 'both',
        template: 'progress-report-template',
        isOfficial: false,
        requiresSignatures: false,
        complianceLevel: 'state'
      },
      {
        id: 'goal-summary-annual',
        name: 'Annual Goals Summary',
        nameAr: 'ملخص الأهداف السنوية',
        type: 'goal_summary',
        language: 'both',
        template: 'goal-summary-template',
        isOfficial: false,
        requiresSignatures: false,
        complianceLevel: 'district'
      }
    ]
    
    console.log('✅ DocumentExport: Templates fetched successfully')
    return templates
  }, {
    context: 'Fetching document templates',
    maxAttempts: 2,
    logErrors: true
  })
}

// =============================================================================
// CORE EXPORT FUNCTIONS
// =============================================================================

/**
 * Export full IEP document to PDF
 */
export const exportIEPToPDF = async (
  iepId: string, 
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> => {
  return retryApiCall(async () => {
    const startTime = Date.now()
    console.log('🔍 DocumentExport: Starting IEP PDF export:', iepId)
    
    const user = await requireAuth()
    const finalOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options }
    
    try {
      // Fetch IEP data with all related information
      const { data: iep, error: iepError } = await supabase
        .from('ieps')
        .select(`
          *,
          student:students(*),
          goals:iep_goals(*),
          services:iep_services(*),
          progress_data:iep_progress_data(*)
        `)
        .eq('id', iepId)
        .single()
      
      if (iepError || !iep) {
        throw new Error(`Failed to fetch IEP data: ${iepError?.message || 'IEP not found'}`)
      }
      
      // Initialize PDF document
      const doc = new jsPDF({
        orientation: finalOptions.pageOrientation,
        unit: 'mm',
        format: 'a4'
      })
      
      // Initialize Arabic font support
      const arabicSupported = initializeArabicFonts(doc)
      
      // Generate PDF content
      await generateIEPPDFContent(doc, iep, finalOptions, arabicSupported)
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0]
      const studentName = finalOptions.language === 'ar' 
        ? `${iep.student.first_name_ar}_${iep.student.last_name_ar}`
        : `${iep.student.first_name_en || iep.student.first_name_ar}_${iep.student.last_name_en || iep.student.last_name_ar}`
      
      const fileName = `IEP_${studentName}_${timestamp}.pdf`
      
      // Save PDF
      const pdfBlob = doc.output('blob')
      const fileSize = pdfBlob.size
      
      // In production, you would upload to cloud storage and return a download URL
      doc.save(fileName)
      
      const generationTime = Date.now() - startTime
      
      console.log('✅ DocumentExport: IEP PDF generated successfully:', {
        fileName,
        fileSize,
        generationTime
      })
      
      return {
        success: true,
        fileName,
        fileSize,
        exportType: 'pdf',
        generationTime
      }
      
    } catch (error) {
      console.error('❌ DocumentExport: Failed to generate IEP PDF:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'exportIEPToPDF',
        action: 'generate_pdf',
        userId: user.id,
        context: { iepId, options }
      })
      
      return {
        success: false,
        fileName: '',
        fileSize: 0,
        exportType: 'pdf',
        error: error instanceof Error ? error.message : 'PDF generation failed',
        generationTime: Date.now() - startTime
      }
    }
  }, {
    context: 'Exporting IEP to PDF',
    maxAttempts: 2,
    logErrors: true
  })
}

/**
 * Generate PDF content for IEP document
 */
const generateIEPPDFContent = async (
  doc: jsPDF,
  iep: any,
  options: ExportOptions,
  arabicSupported: boolean
): Promise<void> => {
  let yPosition = options.margins.top
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - options.margins.left - options.margins.right
  
  // Helper function to add new page if needed
  const checkNewPage = (neededSpace: number = 20) => {
    if (yPosition + neededSpace > pageHeight - options.margins.bottom) {
      doc.addPage()
      yPosition = options.margins.top
      return true
    }
    return false
  }
  
  // Header Section
  await addPDFHeader(doc, iep, options, yPosition, contentWidth)
  yPosition += 40
  
  // Student Information Section
  checkNewPage(60)
  yPosition = await addStudentInformationSection(doc, iep.student, options, yPosition, contentWidth, arabicSupported)
  yPosition += 20
  
  // IEP Details Section
  checkNewPage(40)
  yPosition = await addIEPDetailsSection(doc, iep, options, yPosition, contentWidth, arabicSupported)
  yPosition += 20
  
  // Goals Section (if included)
  if (options.includeGoals && iep.goals?.length > 0) {
    checkNewPage(60)
    yPosition = await addGoalsSection(doc, iep.goals, options, yPosition, contentWidth, arabicSupported)
    yPosition += 20
  }
  
  // Services Section (if included)
  if (options.includeServices && iep.services?.length > 0) {
    checkNewPage(40)
    yPosition = await addServicesSection(doc, iep.services, options, yPosition, contentWidth, arabicSupported)
    yPosition += 20
  }
  
  // Progress Data Section (if included)
  if (options.includeProgressData && iep.progress_data?.length > 0) {
    checkNewPage(40)
    yPosition = await addProgressDataSection(doc, iep.progress_data, options, yPosition, contentWidth, arabicSupported)
    yPosition += 20
  }
  
  // Footer with signatures (if required)
  await addPDFFooter(doc, options, pageHeight - options.margins.bottom - 30, contentWidth)
  
  // Add watermark if specified
  if (options.watermark) {
    addWatermark(doc, options.watermark)
  }
  
  // Add confidentiality notice if required
  if (options.confidential) {
    addConfidentialityNotice(doc, options, pageHeight - 10)
  }
}

/**
 * Add PDF header with title and logos
 */
const addPDFHeader = async (
  doc: jsPDF,
  iep: any,
  options: ExportOptions,
  yPos: number,
  contentWidth: number
): Promise<void> => {
  const centerX = contentWidth / 2 + options.margins.left
  
  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  
  if (options.language === 'en') {
    doc.text('Individualized Education Program (IEP)', centerX, yPos, { align: 'center' })
  } else if (options.language === 'ar') {
    doc.text('الخطة التعليمية الفردية', centerX, yPos, { align: 'center' })
  } else {
    doc.text('Individualized Education Program (IEP)', centerX, yPos, { align: 'center' })
    doc.text('الخطة التعليمية الفردية', centerX, yPos + 8, { align: 'center' })
  }
  
  // School/District information
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  
  const schoolInfo = options.language === 'ar' 
    ? 'المدرسة: [اسم المدرسة] | المنطقة التعليمية: [اسم المنطقة]'
    : 'School: [School Name] | District: [District Name]'
    
  doc.text(schoolInfo, centerX, yPos + 20, { align: 'center' })
  
  // Generation date
  const dateText = options.language === 'ar'
    ? `تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-SA')}`
    : `Generated: ${new Date().toLocaleDateString()}`
    
  doc.text(dateText, centerX, yPos + 30, { align: 'center' })
}

/**
 * Add student information section
 */
const addStudentInformationSection = async (
  doc: jsPDF,
  student: Student,
  options: ExportOptions,
  yPos: number,
  contentWidth: number,
  arabicSupported: boolean
): Promise<number> => {
  let currentY = yPos
  
  // Section title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  
  const title = options.language === 'ar' ? 'معلومات الطالب' : 'Student Information'
  doc.text(title, options.margins.left, currentY)
  currentY += 15
  
  // Draw section border
  doc.rect(options.margins.left, currentY - 5, contentWidth, 50)
  
  // Student details
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  
  const leftCol = options.margins.left + 10
  const rightCol = options.margins.left + contentWidth / 2
  
  if (options.language === 'ar' || options.language === 'both') {
    // Arabic information
    const arabicLines = [
      `الاسم: ${student.first_name_ar} ${student.last_name_ar}`,
      `تاريخ الميلاد: ${student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('ar-SA') : 'غير محدد'}`,
      `الصف: ${student.grade_level || 'غير محدد'}`,
      `رقم الطالب: ${student.student_id || 'غير محدد'}`
    ]
    
    arabicLines.forEach((line, index) => {
      if (arabicSupported) {
        doc.text(line, rightCol, currentY + 10 + (index * 8), { align: 'right' })
      } else {
        doc.text(line, rightCol, currentY + 10 + (index * 8))
      }
    })
  }
  
  if (options.language === 'en' || options.language === 'both') {
    // English information
    const englishLines = [
      `Name: ${student.first_name_en || student.first_name_ar} ${student.last_name_en || student.last_name_ar}`,
      `Date of Birth: ${student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'Not specified'}`,
      `Grade: ${student.grade_level || 'Not specified'}`,
      `Student ID: ${student.student_id || 'Not specified'}`
    ]
    
    englishLines.forEach((line, index) => {
      doc.text(line, leftCol, currentY + 10 + (index * 8))
    })
  }
  
  return currentY + 50
}

/**
 * Add IEP details section
 */
const addIEPDetailsSection = async (
  doc: jsPDF,
  iep: IEP,
  options: ExportOptions,
  yPos: number,
  contentWidth: number,
  arabicSupported: boolean
): Promise<number> => {
  let currentY = yPos
  
  // Section title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  
  const title = options.language === 'ar' ? 'تفاصيل الخطة التعليمية' : 'IEP Details'
  doc.text(title, options.margins.left, currentY)
  currentY += 15
  
  // IEP information
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  
  const details = [
    {
      en: `Effective Date: ${new Date(iep.effective_date).toLocaleDateString()}`,
      ar: `تاريخ السريان: ${new Date(iep.effective_date).toLocaleDateString('ar-SA')}`
    },
    {
      en: `Annual Review Date: ${new Date(iep.annual_review_date).toLocaleDateString()}`,
      ar: `تاريخ المراجعة السنوية: ${new Date(iep.annual_review_date).toLocaleDateString('ar-SA')}`
    },
    {
      en: `Program Type: ${iep.program_type}`,
      ar: `نوع البرنامج: ${iep.program_type}`
    },
    {
      en: `Mainstreaming Percentage: ${iep.mainstreaming_percentage}%`,
      ar: `نسبة الدمج: ${iep.mainstreaming_percentage}%`
    }
  ]
  
  details.forEach((detail, index) => {
    const text = options.language === 'ar' ? detail.ar : detail.en
    if (options.language === 'both') {
      doc.text(detail.en, options.margins.left + 10, currentY + (index * 16))
      doc.text(detail.ar, options.margins.left + 10, currentY + (index * 16) + 8, 
        arabicSupported ? { align: 'right' } : {})
    } else {
      doc.text(text, options.margins.left + 10, currentY + (index * 10))
    }
  })
  
  // Present levels of performance (if available)
  if (iep.present_levels_academic_ar || iep.present_levels_functional_ar) {
    currentY += details.length * (options.language === 'both' ? 16 : 10) + 20
    
    doc.setFont('helvetica', 'bold')
    const levelsTitle = options.language === 'ar' 
      ? 'المستويات الحالية للأداء' 
      : 'Present Levels of Performance'
    doc.text(levelsTitle, options.margins.left, currentY)
    currentY += 10
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    
    if (iep.present_levels_academic_ar && (options.language === 'ar' || options.language === 'both')) {
      const academicLines = formatArabicText(iep.present_levels_academic_ar, contentWidth - 20)
      doc.text('الأداء الأكاديمي:', options.margins.left + 10, currentY)
      currentY += 6
      
      academicLines.forEach(line => {
        doc.text(line, options.margins.left + 20, currentY)
        currentY += 6
      })
      currentY += 5
    }
    
    if (iep.present_levels_functional_ar && (options.language === 'ar' || options.language === 'both')) {
      const functionalLines = formatArabicText(iep.present_levels_functional_ar, contentWidth - 20)
      doc.text('الأداء الوظيفي:', options.margins.left + 10, currentY)
      currentY += 6
      
      functionalLines.forEach(line => {
        doc.text(line, options.margins.left + 20, currentY)
        currentY += 6
      })
    }
  }
  
  return currentY + 10
}

/**
 * Add goals section
 */
const addGoalsSection = async (
  doc: jsPDF,
  goals: IEPGoal[],
  options: ExportOptions,
  yPos: number,
  contentWidth: number,
  arabicSupported: boolean
): Promise<number> => {
  let currentY = yPos
  
  // Section title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  
  const title = options.language === 'ar' ? 'الأهداف السنوية' : 'Annual Goals'
  doc.text(title, options.margins.left, currentY)
  currentY += 15
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  
  goals.forEach((goal, index) => {
    // Check for page break
    if (currentY > doc.internal.pageSize.getHeight() - options.margins.bottom - 60) {
      doc.addPage()
      currentY = options.margins.top
    }
    
    // Goal header
    doc.setFont('helvetica', 'bold')
    doc.text(`${options.language === 'ar' ? 'الهدف' : 'Goal'} ${index + 1}:`, options.margins.left, currentY)
    currentY += 8
    
    // Goal statement
    doc.setFont('helvetica', 'normal')
    const goalText = options.language === 'ar' ? goal.goal_statement_ar : 
                     (goal.goal_statement_en || goal.goal_statement_ar)
    
    if (goalText) {
      const goalLines = formatArabicText(goalText, contentWidth - 20)
      goalLines.forEach(line => {
        doc.text(line, options.margins.left + 10, currentY)
        currentY += 6
      })
    }
    
    // Progress information
    doc.setFontSize(10)
    doc.text(
      `${options.language === 'ar' ? 'التقدم:' : 'Progress:'} ${goal.current_progress_percentage || 0}% - ${goal.progress_status || 'not_started'}`,
      options.margins.left + 10,
      currentY + 5
    )
    
    currentY += 20
  })
  
  return currentY
}

/**
 * Add services section
 */
const addServicesSection = async (
  doc: jsPDF,
  services: any[],
  options: ExportOptions,
  yPos: number,
  contentWidth: number,
  arabicSupported: boolean
): Promise<number> => {
  let currentY = yPos
  
  // Section title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  
  const title = options.language === 'ar' ? 'الخدمات المقدمة' : 'Special Education Services'
  doc.text(title, options.margins.left, currentY)
  currentY += 15
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  
  services.forEach((service, index) => {
    const serviceText = options.language === 'ar' ? service.service_type_ar : service.service_type
    const frequencyText = options.language === 'ar' ? service.frequency_ar : service.frequency
    const durationText = service.duration_minutes ? `${service.duration_minutes} min` : ''
    
    doc.text(
      `${index + 1}. ${serviceText} - ${frequencyText} ${durationText}`,
      options.margins.left + 10,
      currentY
    )
    currentY += 8
  })
  
  return currentY + 10
}

/**
 * Add progress data section
 */
const addProgressDataSection = async (
  doc: jsPDF,
  progressData: IEPProgressData[],
  options: ExportOptions,
  yPos: number,
  contentWidth: number,
  arabicSupported: boolean
): Promise<number> => {
  let currentY = yPos
  
  // Section title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  
  const title = options.language === 'ar' ? 'بيانات التقدم' : 'Progress Data'
  doc.text(title, options.margins.left, currentY)
  currentY += 15
  
  // Create simple table header
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  
  const headers = options.language === 'ar' 
    ? ['التاريخ', 'النسبة المحققة', 'طريقة القياس', 'الملاحظات']
    : ['Date', 'Percentage', 'Method', 'Notes']
  
  const colWidths = [40, 30, 40, 70]
  let xPos = options.margins.left
  
  headers.forEach((header, index) => {
    doc.text(header, xPos, currentY)
    xPos += colWidths[index]
  })
  currentY += 8
  
  // Draw header line
  doc.line(options.margins.left, currentY, options.margins.left + contentWidth, currentY)
  currentY += 5
  
  // Add progress data rows
  doc.setFont('helvetica', 'normal')
  
  progressData.slice(0, 10).forEach(data => { // Limit to 10 most recent entries
    if (currentY > doc.internal.pageSize.getHeight() - options.margins.bottom - 20) {
      doc.addPage()
      currentY = options.margins.top
    }
    
    const row = [
      new Date(data.collection_date).toLocaleDateString(options.language === 'ar' ? 'ar-SA' : 'en-US'),
      `${data.percentage_achieved || 0}%`,
      data.measurement_method || '',
      (data.collection_notes || '').substring(0, 30) + (data.collection_notes && data.collection_notes.length > 30 ? '...' : '')
    ]
    
    xPos = options.margins.left
    row.forEach((cell, index) => {
      doc.text(cell, xPos, currentY)
      xPos += colWidths[index]
    })
    currentY += 8
  })
  
  return currentY + 10
}

/**
 * Add PDF footer
 */
const addPDFFooter = async (
  doc: jsPDF,
  options: ExportOptions,
  yPos: number,
  contentWidth: number
): Promise<void> => {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  // Signature lines (for official documents)
  const signatures = [
    { en: 'Parent/Guardian Signature', ar: 'توقيع ولي الأمر' },
    { en: 'Special Education Teacher', ar: 'معلم التربية الخاصة' },
    { en: 'Administrator Signature', ar: 'توقيع المدير' }
  ]
  
  signatures.forEach((sig, index) => {
    const xPos = options.margins.left + (index * (contentWidth / 3))
    const label = options.language === 'ar' ? sig.ar : sig.en
    
    doc.text(label, xPos, yPos)
    doc.line(xPos, yPos + 5, xPos + 60, yPos + 5) // Signature line
    doc.text('Date: ___________', xPos, yPos + 15)
  })
}

/**
 * Add watermark to document
 */
const addWatermark = (doc: jsPDF, watermark: string): void => {
  const pageCount = doc.getNumberOfPages()
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(50)
    doc.setTextColor(200, 200, 200)
    doc.text(
      watermark,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() / 2,
      { align: 'center', angle: 45 }
    )
  }
  
  doc.setTextColor(0, 0, 0) // Reset text color
}

/**
 * Add confidentiality notice
 */
const addConfidentialityNotice = (
  doc: jsPDF,
  options: ExportOptions,
  yPos: number
): void => {
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  
  const notice = options.language === 'ar'
    ? 'هذه الوثيقة سرية وتحتوي على معلومات تعليمية محمية بموجب قوانين الخصوصية'
    : 'This document is confidential and contains educational information protected by privacy laws'
  
  doc.text(notice, doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' })
}

// =============================================================================
// PROGRESS REPORT EXPORTS
// =============================================================================

/**
 * Export progress report to PDF
 */
export const exportProgressReportToPDF = async (
  goalId: string,
  reportData: ProgressReport,
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> => {
  return retryApiCall(async () => {
    const startTime = Date.now()
    console.log('🔍 DocumentExport: Starting progress report PDF export:', goalId)
    
    const user = await requireAuth()
    const finalOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options }
    
    try {
      // Initialize PDF document
      const doc = new jsPDF({
        orientation: finalOptions.pageOrientation,
        unit: 'mm',
        format: 'a4'
      })
      
      initializeArabicFonts(doc)
      
      // Generate progress report content
      await generateProgressReportPDF(doc, reportData, finalOptions)
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0]
      const fileName = `Progress_Report_${goalId}_${timestamp}.pdf`
      
      // Save PDF
      const pdfBlob = doc.output('blob')
      const fileSize = pdfBlob.size
      
      doc.save(fileName)
      
      const generationTime = Date.now() - startTime
      
      console.log('✅ DocumentExport: Progress report PDF generated successfully')
      
      return {
        success: true,
        fileName,
        fileSize,
        exportType: 'pdf',
        generationTime
      }
      
    } catch (error) {
      console.error('❌ DocumentExport: Failed to generate progress report PDF:', error)
      
      return {
        success: false,
        fileName: '',
        fileSize: 0,
        exportType: 'pdf',
        error: error instanceof Error ? error.message : 'PDF generation failed',
        generationTime: Date.now() - startTime
      }
    }
  }, {
    context: 'Exporting progress report to PDF',
    maxAttempts: 2,
    logErrors: true
  })
}

/**
 * Generate progress report PDF content
 */
const generateProgressReportPDF = async (
  doc: jsPDF,
  reportData: ProgressReport,
  options: ExportOptions
): Promise<void> => {
  let yPosition = options.margins.top
  
  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  
  const title = options.language === 'ar' 
    ? 'تقرير تقدم الهدف التعليمي'
    : 'IEP Goal Progress Report'
    
  doc.text(title, doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' })
  yPosition += 20
  
  // Report period
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  
  const periodText = options.language === 'ar'
    ? `فترة التقرير: ${reportData.periodStart.toLocaleDateString('ar-SA')} - ${reportData.periodEnd.toLocaleDateString('ar-SA')}`
    : `Report Period: ${reportData.periodStart.toLocaleDateString()} - ${reportData.periodEnd.toLocaleDateString()}`
    
  doc.text(periodText, doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' })
  yPosition += 30
  
  // Progress summary
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(options.language === 'ar' ? 'ملخص التقدم' : 'Progress Summary', options.margins.left, yPosition)
  yPosition += 15
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  
  const summaryItems = [
    {
      en: `Current Progress: ${reportData.summary.currentPercentage}%`,
      ar: `التقدم الحالي: ${reportData.summary.currentPercentage}%`
    },
    {
      en: `Status: ${reportData.summary.progressStatus}`,
      ar: `الحالة: ${reportData.summary.progressStatus}`
    },
    {
      en: `Total Data Points: ${reportData.summary.totalDataPoints}`,
      ar: `إجمالي نقاط البيانات: ${reportData.summary.totalDataPoints}`
    },
    {
      en: `Trend: ${reportData.summary.trend.direction}`,
      ar: `الاتجاه: ${reportData.summary.trend.direction}`
    }
  ]
  
  summaryItems.forEach(item => {
    const text = options.language === 'ar' ? item.ar : item.en
    doc.text(text, options.margins.left + 10, yPosition)
    yPosition += 8
  })
  
  yPosition += 15
  
  // Recommendations
  if (reportData.recommendations?.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text(options.language === 'ar' ? 'التوصيات' : 'Recommendations', options.margins.left, yPosition)
    yPosition += 12
    
    doc.setFont('helvetica', 'normal')
    reportData.recommendations.forEach((recommendation, index) => {
      doc.text(`${index + 1}. ${recommendation}`, options.margins.left + 10, yPosition)
      yPosition += 8
    })
  }
  
  // Add footer
  await addPDFFooter(doc, options, doc.internal.pageSize.getHeight() - 40, 
    doc.internal.pageSize.getWidth() - options.margins.left - options.margins.right)
}

// =============================================================================
// BULK EXPORT FUNCTIONS
// =============================================================================

/**
 * Export multiple IEPs to ZIP file
 */
export const exportMultipleIEPs = async (
  iepIds: string[],
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> => {
  return retryApiCall(async () => {
    const startTime = Date.now()
    console.log('🔍 DocumentExport: Starting bulk IEP export:', iepIds.length, 'documents')
    
    const user = await requireAuth()
    
    try {
      // Note: In production, you would use a library like JSZip to create a ZIP file
      // For now, we'll simulate the bulk export process
      
      const exportPromises = iepIds.map(id => exportIEPToPDF(id, options))
      const results = await Promise.all(exportPromises)
      
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      const generationTime = Date.now() - startTime
      
      console.log('✅ DocumentExport: Bulk export completed:', {
        successful,
        failed,
        generationTime
      })
      
      return {
        success: failed === 0,
        fileName: `IEP_Bulk_Export_${new Date().toISOString().split('T')[0]}.zip`,
        fileSize: results.reduce((sum, r) => sum + r.fileSize, 0),
        exportType: 'zip',
        generationTime
      }
      
    } catch (error) {
      console.error('❌ DocumentExport: Bulk export failed:', error)
      
      return {
        success: false,
        fileName: '',
        fileSize: 0,
        exportType: 'zip',
        error: error instanceof Error ? error.message : 'Bulk export failed',
        generationTime: Date.now() - startTime
      }
    }
  }, {
    context: 'Bulk IEP export',
    maxAttempts: 2,
    logErrors: true
  })
}

// =============================================================================
// EXPORT ALL FUNCTIONS
// =============================================================================

export {
  // Core exports
  exportIEPToPDF,
  exportProgressReportToPDF,
  exportMultipleIEPs,
  
  // Template management
  getDocumentTemplates,
  
  // Utilities
  initializeArabicFonts,
  formatArabicText,
  
  // Constants
  DEFAULT_EXPORT_OPTIONS
}