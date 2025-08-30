/**
 * Arabic Formatting Utilities
 * 
 * Why: Demonstrates utility functions for Arabic text processing:
 * - Arabic date and time formatting
 * - Number formatting with Arabic numerals
 * - Text normalization and validation
 * - Duration formatting for therapy sessions
 * - Arabic name processing
 * - RTL text utilities
 */

import { Language } from '../types/therapy-types'

// Arabic numerals mapping
const ARABIC_NUMERALS = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
}

const ENGLISH_NUMERALS = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
}

// Arabic month names
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

// Arabic day names
const ARABIC_DAYS = [
  'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
]

// Arabic time periods
const ARABIC_TIME_PERIODS = {
  am: 'ص',
  pm: 'م',
  morning: 'صباحاً',
  afternoon: 'بعد الظهر',
  evening: 'مساءً',
  night: 'ليلاً'
}

/**
 * Convert English numerals to Arabic numerals
 */
export const toArabicNumerals = (text: string): string => {
  return text.replace(/[0-9]/g, (digit) => ARABIC_NUMERALS[digit as keyof typeof ARABIC_NUMERALS])
}

/**
 * Convert Arabic numerals to English numerals
 */
export const toEnglishNumerals = (text: string): string => {
  return text.replace(/[٠-٩]/g, (digit) => ENGLISH_NUMERALS[digit as keyof typeof ENGLISH_NUMERALS])
}

/**
 * Format date for Arabic display
 */
export const formatArabicDate = (
  date: Date,
  options: {
    includeDay?: boolean
    includeTime?: boolean
    format?: 'short' | 'long' | 'numeric'
  } = {}
): string => {
  const { includeDay = false, includeTime = false, format = 'long' } = options

  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()
  const dayOfWeek = date.getDay()

  let result = ''

  // Add day of week if requested
  if (includeDay) {
    result += `${ARABIC_DAYS[dayOfWeek]}، `
  }

  // Format based on type
  switch (format) {
    case 'short':
      result += `${toArabicNumerals(day.toString())}/${toArabicNumerals((month + 1).toString())}`
      break
    case 'numeric':
      result += `${toArabicNumerals(day.toString())}/${toArabicNumerals((month + 1).toString())}/${toArabicNumerals(year.toString())}`
      break
    case 'long':
    default:
      result += `${toArabicNumerals(day.toString())} ${ARABIC_MONTHS[month]} ${toArabicNumerals(year.toString())}`
      break
  }

  // Add time if requested
  if (includeTime) {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const period = hours >= 12 ? 'م' : 'ص'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours

    result += ` - ${toArabicNumerals(displayHours.toString())}:${toArabicNumerals(minutes.toString().padStart(2, '0'))} ${period}`
  }

  return result
}

/**
 * Format time for Arabic display
 */
export const formatArabicTime = (
  date: Date,
  format: '12' | '24' = '12'
): string => {
  const hours = date.getHours()
  const minutes = date.getMinutes()

  if (format === '24') {
    return `${toArabicNumerals(hours.toString().padStart(2, '0'))}:${toArabicNumerals(minutes.toString().padStart(2, '0'))}`
  }

  const period = hours >= 12 ? 'م' : 'ص'
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours

  return `${toArabicNumerals(displayHours.toString())}:${toArabicNumerals(minutes.toString().padStart(2, '0'))} ${period}`
}

/**
 * Format duration in Arabic (for therapy sessions)
 */
export const formatArabicDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) {
    return `${toArabicNumerals(remainingMinutes.toString())} دقيقة`
  }

  if (remainingMinutes === 0) {
    return hours === 1 ? 'ساعة واحدة' : `${toArabicNumerals(hours.toString())} ساعات`
  }

  const hoursText = hours === 1 ? 'ساعة' : `${toArabicNumerals(hours.toString())} ساعات`
  return `${hoursText} و ${toArabicNumerals(remainingMinutes.toString())} دقيقة`
}

/**
 * Format relative time in Arabic (e.g., "منذ ساعتين")
 */
export const formatArabicRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) {
    return 'الآن'
  }

  if (diffMinutes < 60) {
    if (diffMinutes === 1) return 'منذ دقيقة'
    if (diffMinutes === 2) return 'منذ دقيقتين'
    if (diffMinutes <= 10) return `منذ ${toArabicNumerals(diffMinutes.toString())} دقائق`
    return `منذ ${toArabicNumerals(diffMinutes.toString())} دقيقة`
  }

  if (diffHours < 24) {
    if (diffHours === 1) return 'منذ ساعة'
    if (diffHours === 2) return 'منذ ساعتين'
    if (diffHours <= 10) return `منذ ${toArabicNumerals(diffHours.toString())} ساعات`
    return `منذ ${toArabicNumerals(diffHours.toString())} ساعة`
  }

  if (diffDays === 1) return 'أمس'
  if (diffDays === 2) return 'منذ يومين'
  if (diffDays <= 10) return `منذ ${toArabicNumerals(diffDays.toString())} أيام`
  if (diffDays <= 30) return `منذ ${toArabicNumerals(diffDays.toString())} يوماً`

  // For longer periods, show the actual date
  return formatArabicDate(date, { format: 'long' })
}

/**
 * Normalize Arabic text (remove diacritics, normalize characters)
 */
export const normalizeArabicText = (text: string): string => {
  return text
    // Remove diacritics
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Normalize Alef variations
    .replace(/[آأإ]/g, 'ا')
    // Normalize Teh Marbuta
    .replace(/ة/g, 'ه')
    // Normalize Yeh variations
    .replace(/[ىي]/g, 'ي')
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Validate Arabic text
 */
export const validateArabicText = (text: string): {
  isValid: boolean
  hasArabic: boolean
  hasEnglish: boolean
  errors: string[]
} => {
  const errors: string[] = []
  const hasArabic = /[\u0600-\u06FF]/.test(text)
  const hasEnglish = /[a-zA-Z]/.test(text)
  
  // Check for Arabic characters
  if (!hasArabic) {
    errors.push('النص يجب أن يحتوي على أحرف عربية')
  }

  // Check for invalid characters (numbers should be Arabic)
  if (/[0-9]/.test(text) && hasArabic) {
    errors.push('يجب استخدام الأرقام العربية مع النص العربي')
  }

  // Check minimum length
  if (text.trim().length < 2) {
    errors.push('النص قصير جداً')
  }

  return {
    isValid: errors.length === 0,
    hasArabic,
    hasEnglish,
    errors
  }
}

/**
 * Format Arabic names properly
 */
export const formatArabicName = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Extract initials from Arabic name
 */
export const getArabicInitials = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0))
    .join('')
    .substring(0, 2)
}

/**
 * Format therapy session status in Arabic
 */
export const formatTherapyStatus = (
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed',
  language: Language
): string => {
  const statusMap = {
    ar: {
      scheduled: 'مجدولة',
      in_progress: 'جارية',
      completed: 'مكتملة',
      cancelled: 'ملغية',
      missed: 'فائتة'
    },
    en: {
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      missed: 'Missed'
    }
  }

  return statusMap[language][status]
}

/**
 * Format therapy type in Arabic
 */
export const formatTherapyType = (
  type: 'speech' | 'physical' | 'occupational' | 'behavioral' | 'cognitive',
  language: Language
): string => {
  const typeMap = {
    ar: {
      speech: 'علاج النطق',
      physical: 'العلاج الطبيعي',
      occupational: 'العلاج الوظيفي',
      behavioral: 'العلاج السلوكي',
      cognitive: 'العلاج المعرفي'
    },
    en: {
      speech: 'Speech Therapy',
      physical: 'Physical Therapy',
      occupational: 'Occupational Therapy',
      behavioral: 'Behavioral Therapy',
      cognitive: 'Cognitive Therapy'
    }
  }

  return typeMap[language][type]
}

/**
 * Format progress percentage in Arabic
 */
export const formatArabicProgress = (percentage: number): string => {
  return `${toArabicNumerals(percentage.toString())}٪`
}

/**
 * Check if text needs RTL direction
 */
export const needsRTL = (text: string): boolean => {
  // Check if text contains Arabic characters
  const arabicRegex = /[\u0600-\u06FF]/
  return arabicRegex.test(text)
}

/**
 * Get text direction based on content
 */
export const getTextDirection = (text: string): 'rtl' | 'ltr' => {
  return needsRTL(text) ? 'rtl' : 'ltr'
}

/**
 * Format file size in Arabic
 */
export const formatArabicFileSize = (bytes: number): string => {
  const units = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  const formattedSize = unitIndex === 0 
    ? size.toString() 
    : size.toFixed(1)

  return `${toArabicNumerals(formattedSize)} ${units[unitIndex]}`
}

// Usage examples:
/*
// Date formatting
const sessionDate = new Date('2024-03-15T10:30:00')
console.log(formatArabicDate(sessionDate, { includeDay: true, includeTime: true }))
// Output: "الجمعة، ١٥ مارس ٢٠٢٤ - ١٠:٣٠ ص"

// Duration formatting
console.log(formatArabicDuration(90)) // "ساعة و ٣٠ دقيقة"
console.log(formatArabicDuration(45)) // "٤٥ دقيقة"

// Relative time
const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
console.log(formatArabicRelativeTime(pastDate)) // "منذ ساعتين"

// Text validation
const validation = validateArabicText("مرحباً بكم")
console.log(validation.isValid) // true
console.log(validation.hasArabic) // true

// Name formatting
console.log(formatArabicName("أحمد محمد علي")) // "أحمد محمد علي"
console.log(getArabicInitials("أحمد محمد علي")) // "أم"

// Status formatting
console.log(formatTherapyStatus('completed', 'ar')) // "مكتملة"
console.log(formatTherapyType('speech', 'ar')) // "علاج النطق"

// Progress formatting
console.log(formatArabicProgress(85)) // "٨٥٪"

// File size formatting
console.log(formatArabicFileSize(1536)) // "١.٥ كيلوبايت"
*/
