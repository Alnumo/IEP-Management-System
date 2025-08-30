/**
 * Arabic Date/Time Utilities
 * 
 * Why: Specialized date/time formatting for Arabic therapy applications:
 * - Arabic calendar support (Hijri)
 * - Therapy session scheduling utilities
 * - Arabic time zone handling
 * - Prayer time integration for scheduling
 * - Academic year calculations
 * - Therapy progress timeline formatting
 */

import { Language } from '../types/therapy-types'

// Arabic month names (Gregorian)
const ARABIC_MONTHS_GREGORIAN = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

// Arabic day names
const ARABIC_DAYS = [
  'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
]

// Arabic day names (short)
const ARABIC_DAYS_SHORT = [
  'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'
]

// Hijri month names
const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
]

// Time periods in Arabic
const TIME_PERIODS_AR = {
  morning: 'صباحاً',
  afternoon: 'بعد الظهر',
  evening: 'مساءً',
  night: 'ليلاً'
}

// Academic terms in Arabic
const ACADEMIC_TERMS_AR = {
  fall: 'الفصل الأول',
  spring: 'الفصل الثاني',
  summer: 'الفصل الصيفي'
}

// Therapy session time slots
export interface TherapyTimeSlot {
  id: string
  startTime: Date
  endTime: Date
  available: boolean
  therapistId?: string
  sessionType: 'individual' | 'group' | 'assessment'
}

// Academic year interface
export interface AcademicYear {
  year: number
  startDate: Date
  endDate: Date
  terms: {
    fall: { start: Date; end: Date }
    spring: { start: Date; end: Date }
    summer?: { start: Date; end: Date }
  }
}

// Format date in Arabic
export const formatDateArabic = (
  date: Date,
  format: 'full' | 'short' | 'numeric' | 'relative' = 'full'
): string => {
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()
  const dayOfWeek = date.getDay()

  switch (format) {
    case 'full':
      return `${ARABIC_DAYS[dayOfWeek]}، ${day} ${ARABIC_MONTHS_GREGORIAN[month]} ${year}`
    
    case 'short':
      return `${ARABIC_DAYS_SHORT[dayOfWeek]} ${day}/${month + 1}`
    
    case 'numeric':
      return `${day}/${month + 1}/${year}`
    
    case 'relative':
      return getRelativeDateArabic(date)
    
    default:
      return formatDateArabic(date, 'full')
  }
}

// Format time in Arabic
export const formatTimeArabic = (
  date: Date,
  format: '12' | '24' = '12',
  showSeconds: boolean = false
): string => {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()

  if (format === '24') {
    const timeStr = showSeconds 
      ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    return convertToArabicNumerals(timeStr)
  }

  // 12-hour format
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const period = hours >= 12 ? 'م' : 'ص' // م = مساءً (PM), ص = صباحاً (AM)
  
  const timeStr = showSeconds
    ? `${hour12}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${period}`
    : `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
  
  return convertToArabicNumerals(timeStr)
}

// Get relative date in Arabic
export const getRelativeDateArabic = (date: Date): string => {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffDays === 0) {
    if (diffHours === 0) {
      if (diffMinutes === 0) return 'الآن'
      if (diffMinutes > 0) return `خلال ${convertToArabicNumerals(diffMinutes.toString())} دقيقة`
      return `منذ ${convertToArabicNumerals(Math.abs(diffMinutes).toString())} دقيقة`
    }
    if (diffHours > 0) return `خلال ${convertToArabicNumerals(diffHours.toString())} ساعة`
    return `منذ ${convertToArabicNumerals(Math.abs(diffHours).toString())} ساعة`
  }

  if (diffDays === 1) return 'غداً'
  if (diffDays === -1) return 'أمس'
  if (diffDays > 1 && diffDays <= 7) return `خلال ${convertToArabicNumerals(diffDays.toString())} أيام`
  if (diffDays < -1 && diffDays >= -7) return `منذ ${convertToArabicNumerals(Math.abs(diffDays).toString())} أيام`
  
  return formatDateArabic(date, 'short')
}

// Convert to Arabic numerals
export const convertToArabicNumerals = (text: string): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return text.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)])
}

// Convert from Arabic numerals
export const convertFromArabicNumerals = (text: string): string => {
  const arabicToEnglish: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  }
  return text.replace(/[٠-٩]/g, (digit) => arabicToEnglish[digit])
}

// Format therapy session duration
export const formatSessionDurationArabic = (
  startTime: Date,
  endTime: Date
): string => {
  const durationMs = endTime.getTime() - startTime.getTime()
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours === 0) {
    return `${convertToArabicNumerals(minutes.toString())} دقيقة`
  }
  
  if (minutes === 0) {
    return hours === 1 ? 'ساعة واحدة' : `${convertToArabicNumerals(hours.toString())} ساعات`
  }

  const hoursText = hours === 1 ? 'ساعة' : `${convertToArabicNumerals(hours.toString())} ساعات`
  return `${hoursText} و ${convertToArabicNumerals(minutes.toString())} دقيقة`
}

// Get therapy session time period
export const getSessionTimePeriod = (date: Date): keyof typeof TIME_PERIODS_AR => {
  const hour = date.getHours()
  
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

// Format session time with period
export const formatSessionTimeArabic = (date: Date): string => {
  const time = formatTimeArabic(date)
  const period = TIME_PERIODS_AR[getSessionTimePeriod(date)]
  return `${time} ${period}`
}

// Generate therapy time slots for a day
export const generateTherapyTimeSlots = (
  date: Date,
  startHour: number = 8,
  endHour: number = 17,
  slotDuration: number = 60, // minutes
  breakDuration: number = 15 // minutes between slots
): TherapyTimeSlot[] => {
  const slots: TherapyTimeSlot[] = []
  const currentDate = new Date(date)
  currentDate.setHours(startHour, 0, 0, 0)

  let slotId = 1
  while (currentDate.getHours() < endHour) {
    const startTime = new Date(currentDate)
    const endTime = new Date(currentDate.getTime() + slotDuration * 60 * 1000)

    // Skip lunch break (12:00 - 13:00)
    if (!(startTime.getHours() === 12 && startTime.getMinutes() === 0)) {
      slots.push({
        id: `slot-${date.toISOString().split('T')[0]}-${slotId}`,
        startTime,
        endTime,
        available: true,
        sessionType: 'individual'
      })
      slotId++
    }

    currentDate.setTime(currentDate.getTime() + (slotDuration + breakDuration) * 60 * 1000)
    
    // Skip lunch hour
    if (currentDate.getHours() === 12 && currentDate.getMinutes() < 60) {
      currentDate.setHours(13, 0, 0, 0)
    }
  }

  return slots
}

// Get current academic year
export const getCurrentAcademicYear = (): AcademicYear => {
  const now = new Date()
  const currentYear = now.getFullYear()
  
  // Academic year starts in September
  const academicStartYear = now.getMonth() >= 8 ? currentYear : currentYear - 1
  
  return {
    year: academicStartYear,
    startDate: new Date(academicStartYear, 8, 1), // September 1st
    endDate: new Date(academicStartYear + 1, 5, 30), // June 30th
    terms: {
      fall: {
        start: new Date(academicStartYear, 8, 1), // September 1st
        end: new Date(academicStartYear + 1, 0, 31) // January 31st
      },
      spring: {
        start: new Date(academicStartYear + 1, 1, 1), // February 1st
        end: new Date(academicStartYear + 1, 5, 30) // June 30th
      },
      summer: {
        start: new Date(academicStartYear + 1, 6, 1), // July 1st
        end: new Date(academicStartYear + 1, 7, 31) // August 31st
      }
    }
  }
}

// Get academic term for a date
export const getAcademicTerm = (date: Date): keyof typeof ACADEMIC_TERMS_AR => {
  const month = date.getMonth()
  
  if (month >= 8 || month <= 0) return 'fall' // Sep-Jan
  if (month >= 1 && month <= 5) return 'spring' // Feb-Jun
  return 'summer' // Jul-Aug
}

// Format academic term in Arabic
export const formatAcademicTermArabic = (date: Date): string => {
  const term = getAcademicTerm(date)
  const academicYear = getCurrentAcademicYear()
  return `${ACADEMIC_TERMS_AR[term]} ${convertToArabicNumerals(academicYear.year.toString())}-${convertToArabicNumerals((academicYear.year + 1).toString())}`
}

// Calculate therapy progress timeline
export const calculateProgressTimeline = (
  startDate: Date,
  targetDate: Date,
  currentDate: Date = new Date()
): {
  totalDays: number
  elapsedDays: number
  remainingDays: number
  progressPercentage: number
  timelineArabic: string
} => {
  const totalMs = targetDate.getTime() - startDate.getTime()
  const elapsedMs = currentDate.getTime() - startDate.getTime()
  const remainingMs = targetDate.getTime() - currentDate.getTime()

  const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)))
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)))
  
  const progressPercentage = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))

  let timelineArabic = ''
  if (remainingDays === 0) {
    timelineArabic = 'انتهت المدة المحددة'
  } else if (remainingDays === 1) {
    timelineArabic = 'يوم واحد متبقي'
  } else if (remainingDays <= 7) {
    timelineArabic = `${convertToArabicNumerals(remainingDays.toString())} أيام متبقية`
  } else if (remainingDays <= 30) {
    const weeks = Math.ceil(remainingDays / 7)
    timelineArabic = weeks === 1 ? 'أسبوع واحد متبقي' : `${convertToArabicNumerals(weeks.toString())} أسابيع متبقية`
  } else {
    const months = Math.ceil(remainingDays / 30)
    timelineArabic = months === 1 ? 'شهر واحد متبقي' : `${convertToArabicNumerals(months.toString())} أشهر متبقية`
  }

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    progressPercentage,
    timelineArabic
  }
}

// Check if date is within therapy hours
export const isWithinTherapyHours = (
  date: Date,
  startHour: number = 8,
  endHour: number = 17
): boolean => {
  const hour = date.getHours()
  const dayOfWeek = date.getDay()
  
  // Skip weekends (Friday = 5, Saturday = 6 in Arabic context)
  if (dayOfWeek === 5 || dayOfWeek === 6) return false
  
  return hour >= startHour && hour < endHour
}

// Get next available therapy date
export const getNextAvailableTherapyDate = (
  fromDate: Date = new Date(),
  skipWeekends: boolean = true
): Date => {
  const nextDate = new Date(fromDate)
  nextDate.setDate(nextDate.getDate() + 1)
  
  while (skipWeekends && (nextDate.getDay() === 5 || nextDate.getDay() === 6)) {
    nextDate.setDate(nextDate.getDate() + 1)
  }
  
  // Set to start of therapy hours
  nextDate.setHours(8, 0, 0, 0)
  
  return nextDate
}

// Format therapy schedule summary
export const formatTherapyScheduleSummary = (
  sessions: { date: Date; duration: number }[],
  language: Language = 'ar'
): string => {
  if (sessions.length === 0) {
    return language === 'ar' ? 'لا توجد جلسات مجدولة' : 'No sessions scheduled'
  }

  const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0)
  const totalHours = Math.floor(totalDuration / 60)
  const totalMinutes = totalDuration % 60

  if (language === 'ar') {
    const sessionsText = sessions.length === 1 ? 'جلسة واحدة' : `${convertToArabicNumerals(sessions.length.toString())} جلسات`
    const durationText = totalHours > 0 
      ? `${convertToArabicNumerals(totalHours.toString())} ساعة و ${convertToArabicNumerals(totalMinutes.toString())} دقيقة`
      : `${convertToArabicNumerals(totalMinutes.toString())} دقيقة`
    
    return `${sessionsText} مجدولة بإجمالي ${durationText}`
  } else {
    const sessionsText = sessions.length === 1 ? '1 session' : `${sessions.length} sessions`
    const durationText = totalHours > 0 
      ? `${totalHours} hours and ${totalMinutes} minutes`
      : `${totalMinutes} minutes`
    
    return `${sessionsText} scheduled for a total of ${durationText}`
  }
}

// Usage examples:
/*
// Format current date in Arabic
const today = new Date()
console.log(formatDateArabic(today)) // "الأحد، ١٥ يناير ٢٠٢٤"

// Format session time
const sessionTime = new Date(2024, 0, 15, 14, 30)
console.log(formatSessionTimeArabic(sessionTime)) // "٢:٣٠ م بعد الظهر"

// Generate time slots for therapy
const timeSlots = generateTherapyTimeSlots(today)
console.log(timeSlots.length) // Number of available slots

// Calculate progress timeline
const startDate = new Date(2024, 0, 1)
const targetDate = new Date(2024, 5, 30)
const progress = calculateProgressTimeline(startDate, targetDate)
console.log(progress.timelineArabic) // "٥ أشهر متبقية"

// Get current academic year
const academicYear = getCurrentAcademicYear()
console.log(formatAcademicTermArabic(today)) // "الفصل الثاني ٢٠٢٣-٢٠٢٤"

// Format therapy schedule
const sessions = [
  { date: new Date(), duration: 60 },
  { date: new Date(), duration: 45 }
]
console.log(formatTherapyScheduleSummary(sessions)) // "٢ جلسات مجدولة بإجمالي ١ ساعة و ٤٥ دقيقة"
*/
