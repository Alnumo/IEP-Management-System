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