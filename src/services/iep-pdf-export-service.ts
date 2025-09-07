/**
 * IEP PDF Export Service with Arabic Cultural Appropriateness
 * خدمة تصدير PDF للبرنامج التعليمي الفردي مع الملاءمة الثقافية العربية
 * 
 * @description Culturally appropriate PDF export for IEPs with Arabic RTL support
 * Story 1.3 - Task 4: Arabic PDF export with cultural appropriateness
 */

import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import type { IEP, IEPGoal, Student } from '@/types/iep'

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface IEPPDFOptions {
  language: 'ar' | 'en'
  includeArabicCalendar?: boolean
  includeCulturalNotes?: boolean
  includeIslamicCalendar?: boolean
  watermark?: string
  companyInfo: {
    name_ar: string
    name_en: string
    address_ar: string
    address_en: string
    phone: string
    email: string
    logo?: string
    license_number?: string
  }
  culturalSettings: {
    respectPrivacy: boolean
    includeGenderConsiderations: boolean
    includeFamilyDynamicsNotes: boolean
    useConservativeLanguage: boolean
  }
}

export interface IEPPDFData extends IEP {
  student: Student & {
    cultural_background?: 'saudi' | 'gulf' | 'arab' | 'international'
    family_preferences?: {
      language_preference: 'ar' | 'en' | 'bilingual'
      cultural_considerations: string[]
      religious_considerations: string[]
    }
  }
  goals: IEPGoal[]
  assessment_results?: Array<{
    assessment_type: string
    score: number
    date: string
    notes_ar?: string
    notes_en?: string
  }>
}

// =============================================================================
// ARABIC FONTS & CULTURAL CONSTANTS
// =============================================================================

const ARABIC_CULTURAL_TERMS = {
  // Respectful terms for special needs in Arabic context
  special_needs_ar: 'ذوي الاحتياجات الخاصة',
  special_needs_respectful_ar: 'أصحاب الهمم',
  disabilities_ar: 'الإعاقات',
  disabilities_respectful_ar: 'التحديات',
  
  // Family-centered language
  family_ar: 'الأسرة الكريمة',
  parents_ar: 'الوالدان المحترمان',
  father_ar: 'الوالد المحترم',
  mother_ar: 'الوالدة المحترمة',
  
  // Educational terms with cultural sensitivity
  student_ar: 'الطالب/الطالبة',
  child_ar: 'النشء الكريم',
  learner_ar: 'المتعلم/المتعلمة',
  
  // Positive reinforcement terms
  progress_ar: 'التقدم الإيجابي',
  achievement_ar: 'الإنجاز المتميز',
  growth_ar: 'النمو المبارك',
  success_ar: 'النجاح بإذن الله'
}

const ISLAMIC_CALENDAR_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
]

// =============================================================================
// MAIN SERVICE CLASS
// =============================================================================

export class IEPPDFExportService {
  private static instance: IEPPDFExportService
  private arabicFont = 'Amiri' // Better Arabic font support
  private englishFont = 'DejaVuSans'

  public static getInstance(): IEPPDFExportService {
    if (!IEPPDFExportService.instance) {
      IEPPDFExportService.instance = new IEPPDFExportService()
    }
    return IEPPDFExportService.instance
  }

  private constructor() {
    this.initializeFonts()
  }

  private async initializeFonts(): Promise<void> {
    // In production, we would load proper Arabic fonts
    // For now, using built-in support with cultural considerations
  }

  // =============================================================================
  // MAIN EXPORT FUNCTION
  // =============================================================================

  public async generateIEPPDF(
    iepData: IEPPDFData,
    options: IEPPDFOptions
  ): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const isRTL = options.language === 'ar'
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20

    // Set RTL for Arabic
    if (isRTL) {
      doc.setR2L(true)
    }

    // Apply cultural watermark if specified
    if (options.watermark) {
      this.addCulturalWatermark(doc, options.watermark, options.language, pageWidth, pageHeight)
    }

    // Add sections with cultural considerations
    let currentY = margin
    
    currentY = await this.addHeader(doc, options, pageWidth, currentY)
    currentY = await this.addCulturalBlessings(doc, options, pageWidth, currentY)
    currentY = await this.addStudentInfo(doc, iepData, options, pageWidth, currentY)
    currentY = await this.addPresentLevels(doc, iepData, options, pageWidth, currentY)
    
    // Check if we need a new page
    if (currentY > pageHeight - 100) {
      doc.addPage()
      if (isRTL) doc.setR2L(true)
      currentY = margin
    }
    
    currentY = await this.addGoals(doc, iepData, options, pageWidth, currentY)
    currentY = await this.addServices(doc, iepData, options, pageWidth, currentY)
    currentY = await this.addCulturalConsiderations(doc, iepData, options, pageWidth, currentY)
    
    // Add footer with cultural respect
    this.addCulturalFooter(doc, options, pageHeight, pageWidth, margin)

    return doc.output('blob')
  }

  // =============================================================================
  // HEADER SECTION WITH CULTURAL RESPECT
  // =============================================================================

  private async addHeader(
    doc: jsPDF,
    options: IEPPDFOptions,
    pageWidth: number,
    startY: number
  ): Promise<number> {
    const isRTL = options.language === 'ar'
    const margin = 20
    let currentY = startY

    // Add company logo
    if (options.companyInfo.logo) {
      try {
        doc.addImage(options.companyInfo.logo, 'PNG', margin, currentY, 40, 20)
      } catch (error) {
        console.warn('Logo could not be loaded:', error)
      }
    }

    // Company information with cultural respect
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')

    const companyName = isRTL ? options.companyInfo.name_ar : options.companyInfo.name_en
    const address = isRTL ? options.companyInfo.address_ar : options.companyInfo.address_en

    if (isRTL) {
      doc.text(companyName, pageWidth - margin, currentY + 10, { align: 'right' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(address, pageWidth - margin, currentY + 20, { align: 'right' })
    } else {
      doc.text(companyName, margin + 50, currentY + 10)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(address, margin + 50, currentY + 20)
    }

    currentY += 40

    // IEP Title with cultural sensitivity
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')

    const title = isRTL 
      ? 'البرنامج التعليمي الفردي'
      : 'Individualized Education Program (IEP)'

    if (isRTL) {
      doc.text(title, pageWidth - margin, currentY, { align: 'right' })
    } else {
      doc.text(title, pageWidth / 2, currentY, { align: 'center' })
    }

    currentY += 20

    // Add dates with both Gregorian and Islamic calendar
    if (options.includeIslamicCalendar && isRTL) {
      const islamicDate = this.getIslamicDate(new Date())
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`التاريخ الهجري: ${islamicDate}`, pageWidth - margin, currentY, { align: 'right' })
      currentY += 10
    }

    const gregorianDate = format(new Date(), 'dd/MM/yyyy', {
      locale: isRTL ? ar : enUS
    })
    
    doc.setFontSize(10)
    const dateLabel = isRTL ? `التاريخ الميلادي: ${gregorianDate}` : `Date: ${gregorianDate}`
    
    if (isRTL) {
      doc.text(dateLabel, pageWidth - margin, currentY, { align: 'right' })
    } else {
      doc.text(dateLabel, margin, currentY)
    }

    return currentY + 20
  }

  // =============================================================================
  // CULTURAL BLESSINGS SECTION
  // =============================================================================

  private async addCulturalBlessings(
    doc: jsPDF,
    options: IEPPDFOptions,
    pageWidth: number,
    startY: number
  ): Promise<number> {
    if (!options.includeCulturalNotes || options.language !== 'ar') {
      return startY
    }

    const margin = 20
    let currentY = startY

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')

    const blessing = 'بسم الله نبدأ هذا البرنامج التعليمي، سائلين الله التوفيق والسداد'
    doc.text(blessing, pageWidth - margin, currentY, { align: 'right' })

    return currentY + 25
  }

  // =============================================================================
  // STUDENT INFORMATION WITH CULTURAL SENSITIVITY
  // =============================================================================

  private async addStudentInfo(
    doc: jsPDF,
    iepData: IEPPDFData,
    options: IEPPDFOptions,
    pageWidth: number,
    startY: number
  ): Promise<number> {
    const isRTL = options.language === 'ar'
    const margin = 20
    let currentY = startY

    // Section title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')

    const sectionTitle = isRTL 
      ? 'معلومات النشء الكريم' 
      : 'Student Information'

    if (isRTL) {
      doc.text(sectionTitle, pageWidth - margin, currentY, { align: 'right' })
    } else {
      doc.text(sectionTitle, margin, currentY)
    }

    currentY += 15

    // Add decorative line
    doc.setDrawColor(100, 100, 100)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 10

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')

    // Student details with cultural respect
    const studentName = isRTL ? iepData.student.name_ar : iepData.student.name_en
    const nameLabel = isRTL ? 'الاسم الكريم:' : 'Student Name:'

    // Gender-appropriate language
    let studentTitle = ''
    if (options.culturalSettings.includeGenderConsiderations && isRTL) {
      studentTitle = iepData.student.gender === 'male' ? 'الطالب' : 'الطالبة'
    }

    if (isRTL) {
      doc.text(`${nameLabel} ${studentTitle} ${studentName}`, pageWidth - margin, currentY, { align: 'right' })
    } else {
      doc.text(`${nameLabel} ${studentName}`, margin, currentY)
    }
    currentY += 10

    // Birth date with cultural sensitivity
    const birthDate = format(new Date(iepData.student.birth_date), 'dd/MM/yyyy', {
      locale: isRTL ? ar : enUS
    })
    const birthLabel = isRTL ? 'تاريخ الميلاد:' : 'Date of Birth:'

    if (isRTL) {
      doc.text(`${birthLabel} ${birthDate}`, pageWidth - margin, currentY, { align: 'right' })
    } else {
      doc.text(`${birthLabel} ${birthDate}`, margin, currentY)
    }
    currentY += 10

    // Cultural background if available
    if (iepData.student.cultural_background && options.includeCulturalNotes) {
      const culturalLabel = isRTL ? 'الخلفية الثقافية:' : 'Cultural Background:'
      const culturalBg = isRTL 
        ? this.getCulturalBackgroundArabic(iepData.student.cultural_background)
        : iepData.student.cultural_background

      if (isRTL) {
        doc.text(`${culturalLabel} ${culturalBg}`, pageWidth - margin, currentY, { align: 'right' })
      } else {
        doc.text(`${culturalLabel} ${culturalBg}`, margin, currentY)
      }
      currentY += 10
    }

    return currentY + 10
  }

  // =============================================================================
  // PRESENT LEVELS WITH POSITIVE LANGUAGE
  // =============================================================================

  private async addPresentLevels(
    doc: jsPDF,
    iepData: IEPPDFData,
    options: IEPPDFOptions,
    pageWidth: number,
    startY: number
  ): Promise<number> {
    const isRTL = options.language === 'ar'
    const margin = 20
    let currentY = startY

    // Section title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')

    const sectionTitle = isRTL 
      ? 'المستويات الحالية للأداء'
      : 'Present Levels of Performance'

    if (isRTL) {
      doc.text(sectionTitle, pageWidth - margin, currentY, { align: 'right' })
    } else {
      doc.text(sectionTitle, margin, currentY)
    }

    currentY += 15

    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 10

    // Academic performance with positive framing
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')

    const academicTitle = isRTL ? 'الأداء الأكاديمي المتميز:' : 'Academic Performance:'

    if (isRTL) {
      doc.text(academicTitle, pageWidth - margin, currentY, { align: 'right' })
    } else {
      doc.text(academicTitle, margin, currentY)
    }
    currentY += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Use culturally positive language
    let academicText = isRTL ? iepData.present_levels_academic_ar : iepData.present_levels_academic_en
    
    if (options.culturalSettings.useConservativeLanguage && academicText) {
      academicText = this.applyCulturalLanguageFilter(academicText, isRTL)
    }

    if (academicText) {
      const lines = doc.splitTextToSize(academicText, pageWidth - 2 * margin - 20)
      if (isRTL) {
        doc.text(lines, pageWidth - margin - 10, currentY, { align: 'right' })
      } else {
        doc.text(lines, margin + 10, currentY)
      }
      currentY += lines.length * 5 + 5
    }

    // Functional performance
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')

    const functionalTitle = isRTL ? 'المهارات الحياتية المباركة:' : 'Functional Performance:'

    if (isRTL) {
      doc.text(functionalTitle, pageWidth - margin, currentY, { align: 'right' })
    } else {
      doc.text(functionalTitle, margin, currentY)
    }
    currentY += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    let functionalText = isRTL ? iepData.present_levels_functional_ar : iepData.present_levels_functional_en
    
    if (options.culturalSettings.useConservativeLanguage && functionalText) {
      functionalText = this.applyCulturalLanguageFilter(functionalText, isRTL)
    }

    if (functionalText) {
      const lines = doc.splitTextToSize(functionalText, pageWidth - 2 * margin - 20)
      if (isRTL) {
        doc.text(lines, pageWidth - margin - 10, currentY, { align: 'right' })
      } else {
        doc.text(lines, margin + 10, currentY)
      }
      currentY += lines.length * 5 + 10
    }

    return currentY + 10
  }

  // =============================================================================
  // GOALS WITH POSITIVE REINFORCEMENT
  // =============================================================================

  private async addGoals(
    doc: jsPDF,
    iepData: IEPPDFData,
    options: IEPPDFOptions,
    pageWidth: number,
    startY: number
  ): Promise<number> {
    const isRTL = options.language === 'ar'
    const margin = 20
    let currentY = startY

    // Section title with positive language
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')

    const sectionTitle = isRTL 
      ? 'الأهداف السنوية المباركة'
      : 'Annual Goals'

    if (isRTL) {
      doc.text(sectionTitle, pageWidth - margin, currentY, { align: 'right' })
    } else {
      doc.text(sectionTitle, margin, currentY)
    }

    currentY += 15

    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 10

    // Add motivational phrase in Arabic
    if (isRTL && options.includeCulturalNotes) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.text('بالتوفيق والسداد نسعى لتحقيق هذه الأهداف النبيلة', pageWidth - margin, currentY, { align: 'right' })
      currentY += 15
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')

    // List goals with positive framing
    iepData.goals?.forEach((goal, index) => {
      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage()
        if (isRTL) doc.setR2L(true)
        currentY = margin
      }

      // Goal number
      const goalNumber = isRTL ? `الهدف ${index + 1}:` : `Goal ${index + 1}:`
      
      doc.setFont('helvetica', 'bold')
      if (isRTL) {
        doc.text(goalNumber, pageWidth - margin, currentY, { align: 'right' })
      } else {
        doc.text(goalNumber, margin, currentY)
      }
      currentY += 8

      doc.setFont('helvetica', 'normal')

      // Goal text with cultural sensitivity
      let goalText = isRTL ? goal.goal_text_ar : goal.goal_text_en
      
      if (options.culturalSettings.useConservativeLanguage && goalText) {
        goalText = this.applyCulturalLanguageFilter(goalText, isRTL)
      }

      if (goalText) {
        const lines = doc.splitTextToSize(goalText, pageWidth - 2 * margin - 20)
        if (isRTL) {
          doc.text(lines, pageWidth - margin - 10, currentY, { align: 'right' })
        } else {
          doc.text(lines, margin + 10, currentY)
        }
        currentY += lines.length * 5 + 10
      }
    })

    return currentY + 10
  }

  // =============================================================================
  // SERVICES WITH CULTURAL CONSIDERATIONS
  // =============================================================================

  private async addServices(
    doc: jsPDF,
    iepData: IEPPDFData,
    options: IEPPDFOptions,
    pageWidth: number,
    startY: number
  ): Promise<number> {
    const isRTL = options.language === 'ar'
    const margin = 20
    let currentY = startY

    // Section title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')

    const sectionTitle = isRTL 
      ? 'الخدمات المتخصصة والدعم'
      : 'Special Services and Support'

    if (isRTL) {
      doc.text(sectionTitle, pageWidth - margin, currentY, { align: 'right' })
    } else {
      doc.text(sectionTitle, margin, currentY)
    }

    currentY += 15

    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 10

    // LRE with cultural sensitivity
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')

    const lreTitle = isRTL ? 'البيئة التعليمية المناسبة:' : 'Educational Environment:'

    if (isRTL) {
      doc.text(lreTitle, pageWidth - margin, currentY, { align: 'right' })
    } else {
      doc.text(lreTitle, margin, currentY)
    }
    currentY += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    let lreText = isRTL ? iepData.lre_justification_ar : iepData.lre_justification_en
    
    if (options.culturalSettings.useConservativeLanguage && lreText) {
      lreText = this.applyCulturalLanguageFilter(lreText, isRTL)
    }

    if (lreText) {
      const lines = doc.splitTextToSize(lreText, pageWidth - 2 * margin - 20)
      if (isRTL) {
        doc.text(lines, pageWidth - margin - 10, currentY, { align: 'right' })
      } else {
        doc.text(lines, margin + 10, currentY)
      }
      currentY += lines.length * 5 + 10
    }

    return currentY + 10
  }

  // =============================================================================
  // CULTURAL CONSIDERATIONS SECTION
  // =============================================================================

  private async addCulturalConsiderations(
    doc: jsPDF,
    iepData: IEPPDFData,
    options: IEPPDFOptions,
    pageWidth: number,
    startY: number
  ): Promise<number> {
    if (!options.includeCulturalNotes || !iepData.student.family_preferences) {
      return startY
    }

    const isRTL = options.language === 'ar'
    const margin = 20
    let currentY = startY

    // Check if we need a new page
    if (currentY > 220) {
      doc.addPage()
      if (isRTL) doc.setR2L(true)
      currentY = margin
    }

    // Section title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')

    const sectionTitle = isRTL 
      ? 'الاعتبارات الثقافية والدينية'
      : 'Cultural and Religious Considerations'

    if (isRTL) {
      doc.text(sectionTitle, pageWidth - margin, currentY, { align: 'right' })
    } else {
      doc.text(sectionTitle, margin, currentY)
    }

    currentY += 15

    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Cultural considerations
    if (iepData.student.family_preferences.cultural_considerations) {
      const culturalTitle = isRTL ? 'الاعتبارات الثقافية:' : 'Cultural Considerations:'
      
      if (isRTL) {
        doc.text(culturalTitle, pageWidth - margin, currentY, { align: 'right' })
      } else {
        doc.text(culturalTitle, margin, currentY)
      }
      currentY += 8

      iepData.student.family_preferences.cultural_considerations.forEach(consideration => {
        if (isRTL) {
          doc.text(`• ${consideration}`, pageWidth - margin - 10, currentY, { align: 'right' })
        } else {
          doc.text(`• ${consideration}`, margin + 10, currentY)
        }
        currentY += 6
      })
      currentY += 5
    }

    // Religious considerations
    if (iepData.student.family_preferences.religious_considerations) {
      const religiousTitle = isRTL ? 'الاعتبارات الدينية:' : 'Religious Considerations:'
      
      if (isRTL) {
        doc.text(religiousTitle, pageWidth - margin, currentY, { align: 'right' })
      } else {
        doc.text(religiousTitle, margin, currentY)
      }
      currentY += 8

      iepData.student.family_preferences.religious_considerations.forEach(consideration => {
        if (isRTL) {
          doc.text(`• ${consideration}`, pageWidth - margin - 10, currentY, { align: 'right' })
        } else {
          doc.text(`• ${consideration}`, margin + 10, currentY)
        }
        currentY += 6
      })
    }

    return currentY + 10
  }

  // =============================================================================
  // CULTURAL FOOTER WITH BLESSINGS
  // =============================================================================

  private addCulturalFooter(
    doc: jsPDF,
    options: IEPPDFOptions,
    pageHeight: number,
    pageWidth: number,
    margin: number
  ): void {
    const isRTL = options.language === 'ar'
    const footerY = pageHeight - 30

    // Add blessing line
    if (isRTL && options.includeCulturalNotes) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.text('وفق الله الجميع لما فيه الخير والصلاح', pageWidth - margin, footerY, { align: 'right' })
    }

    // Company signature
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    const footerText = isRTL
      ? `${options.companyInfo.name_ar} - رخصة رقم: ${options.companyInfo.license_number || 'غير محدد'}`
      : `${options.companyInfo.name_en} - License: ${options.companyInfo.license_number || 'Not specified'}`

    if (isRTL) {
      doc.text(footerText, pageWidth - margin, footerY + 15, { align: 'right' })
    } else {
      doc.text(footerText, margin, footerY + 15)
    }

    // Page number
    const pageNumber = isRTL ? `صفحة ١ من ١` : `Page 1 of 1`
    doc.text(pageNumber, pageWidth / 2, footerY + 15, { align: 'center' })
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  private addCulturalWatermark(
    doc: jsPDF,
    watermarkText: string,
    language: 'ar' | 'en',
    pageWidth: number,
    pageHeight: number
  ): void {
    doc.saveGraphicsState()
    doc.setGState(new doc.GState({ opacity: 0.08 }))
    doc.setFontSize(60)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(128, 128, 128)

    const text = language === 'ar' ? watermarkText : watermarkText
    
    doc.text(text, pageWidth / 2, pageHeight / 2, {
      angle: -45,
      align: 'center'
    })

    doc.restoreGraphicsState()
  }

  private getIslamicDate(date: Date): string {
    // Simplified Islamic date calculation - in production use proper library
    const islamicYear = 1445 // Approximate current year
    const month = ISLAMIC_CALENDAR_MONTHS[date.getMonth() % 12]
    return `${date.getDate()} ${month} ${islamicYear}هـ`
  }

  private getCulturalBackgroundArabic(background: string): string {
    const translations: Record<string, string> = {
      'saudi': 'سعودي',
      'gulf': 'خليجي', 
      'arab': 'عربي',
      'international': 'دولي'
    }
    return translations[background] || background
  }

  private applyCulturalLanguageFilter(text: string, isRTL: boolean): string {
    if (!text) return text

    let filteredText = text

    if (isRTL) {
      // Replace direct terms with more respectful alternatives
      Object.entries(ARABIC_CULTURAL_TERMS).forEach(([key, value]) => {
        if (key.includes('_respectful_ar')) {
          const originalKey = key.replace('_respectful_ar', '_ar')
          const originalTerm = ARABIC_CULTURAL_TERMS[originalKey as keyof typeof ARABIC_CULTURAL_TERMS]
          if (originalTerm) {
            filteredText = filteredText.replace(new RegExp(originalTerm, 'g'), value)
          }
        }
      })

      // Add positive reinforcement
      filteredText = filteredText.replace(/\bيحتاج\b/g, 'يستفيد من')
      filteredText = filteredText.replace(/\bمشكلة\b/g, 'تحدي')
      filteredText = filteredText.replace(/\bضعف\b/g, 'مجال للنمو')
    } else {
      // English cultural filtering
      filteredText = filteredText.replace(/\bdisability\b/gi, 'challenge')
      filteredText = filteredText.replace(/\bdeficit\b/gi, 'area for growth')
      filteredText = filteredText.replace(/\bproblem\b/gi, 'opportunity')
    }

    return filteredText
  }
}

// =============================================================================
// EXPORT CONVENIENCE FUNCTIONS
// =============================================================================

export const generateIEPPDF = async (
  iepData: IEPPDFData,
  options: IEPPDFOptions
): Promise<Blob> => {
  const service = IEPPDFExportService.getInstance()
  return service.generateIEPPDF(iepData, options)
}

export default IEPPDFExportService