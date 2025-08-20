import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  if (currency === 'SAR') {
    return `${amount.toFixed(2)} ر.س`
  }
  return `${amount.toFixed(2)} ${currency}`
}

export function formatDate(date: string | Date, locale: string = 'ar-SA'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString(locale)
}

export function calculatePlanTotal(
  durationWeeks: number,
  sessionsPerWeek: number,
  pricePerSession: number,
  discountPercentage: number = 0
): number {
  const totalSessions = durationWeeks * sessionsPerWeek
  const totalPrice = totalSessions * pricePerSession
  const discountAmount = (totalPrice * discountPercentage) / 100
  return totalPrice - discountAmount
}

// Student Management Utilities
export function formatPhoneNumber(phone: string): string {
  // Remove any non-digits
  const cleaned = phone.replace(/\D/g, '')
  
  // Format as Saudi phone number: +966 XX XXX XXXX
  if (cleaned.startsWith('966')) {
    const number = cleaned.slice(3)
    return `+966 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`
  } else if (cleaned.startsWith('05')) {
    return `+966 ${cleaned.slice(1, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  } else if (cleaned.length === 9) {
    return `+966 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`
  }
  
  return phone
}

export function generateStudentId(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `STU${year}${random}`
}

export function calculateAge(birthDate: string | Date): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}