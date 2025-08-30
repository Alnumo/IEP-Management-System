import { describe, it, expect } from 'vitest'
import { 
  formatCurrency, 
  formatDate, 
  safeString, 
  safeNumber, 
  safeArray,
  formatPhoneNumber,
  calculateAge 
} from '@/lib/utils'

describe('Utils', () => {
  describe('formatCurrency', () => {
    it('should format SAR currency by default', () => {
      expect(formatCurrency(100)).toBe('100.00 ر.س')
      expect(formatCurrency(99.5)).toBe('99.50 ر.س')
    })

    it('should format other currencies', () => {
      expect(formatCurrency(100, 'USD')).toBe('100.00 USD')
      expect(formatCurrency(50.75, 'EUR')).toBe('50.75 EUR')
    })
  })

  describe('formatDate', () => {
    it('should format dates with default locale', () => {
      const date = new Date('2024-01-15')
      const result = formatDate(date)
      // Result might be in Arabic numerals for ar-SA locale
      expect(result).toBeTruthy()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle string dates', () => {
      const result = formatDate('2024-01-15', 'en-US')
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/)
    })

    it('should return empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('')
    })
  })

  describe('safeString', () => {
    it('should return string value', () => {
      expect(safeString('hello')).toBe('hello')
    })

    it('should return empty string for null/undefined', () => {
      expect(safeString(null)).toBe('')
      expect(safeString(undefined)).toBe('')
    })

    it('should return custom fallback', () => {
      expect(safeString(null, 'fallback')).toBe('fallback')
      expect(safeString(undefined, 'default')).toBe('default')
    })
  })

  describe('safeNumber', () => {
    it('should return number value', () => {
      expect(safeNumber(42)).toBe(42)
      expect(safeNumber(0)).toBe(0)
    })

    it('should return 0 for null/undefined', () => {
      expect(safeNumber(null)).toBe(0)
      expect(safeNumber(undefined)).toBe(0)
    })

    it('should return custom fallback', () => {
      expect(safeNumber(null, 99)).toBe(99)
      expect(safeNumber(undefined, -1)).toBe(-1)
    })
  })

  describe('safeArray', () => {
    it('should return array value', () => {
      const arr = [1, 2, 3]
      expect(safeArray(arr)).toBe(arr)
    })

    it('should return empty array for null/undefined', () => {
      expect(safeArray(null)).toEqual([])
      expect(safeArray(undefined)).toEqual([])
    })

    it('should return custom fallback', () => {
      const fallback = ['default']
      expect(safeArray(null, fallback)).toBe(fallback)
    })
  })

  describe('formatPhoneNumber', () => {
    it('should format Saudi phone numbers', () => {
      expect(formatPhoneNumber('966501234567')).toBe('+966 50 123 4567')
      expect(formatPhoneNumber('0501234567')).toBe('+966 50 123 4567')
      expect(formatPhoneNumber('501234567')).toBe('+966 50 123 4567')
    })

    it('should return original for invalid formats', () => {
      expect(formatPhoneNumber('123')).toBe('123')
      expect(formatPhoneNumber('invalid')).toBe('invalid')
    })
  })

  describe('calculateAge', () => {
    it('should calculate age from date string', () => {
      const birthDate = '2000-01-01'
      const age = calculateAge(birthDate)
      const currentYear = new Date().getFullYear()
      const expectedAge = currentYear - 2000
      
      // Age should be within 1 year (accounting for exact birth date)
      expect(age).toBeGreaterThanOrEqual(expectedAge - 1)
      expect(age).toBeLessThanOrEqual(expectedAge)
    })

    it('should calculate age from Date object', () => {
      const birthDate = new Date('1990-06-15')
      const age = calculateAge(birthDate)
      expect(age).toBeGreaterThan(30) // Should be at least 30+ years old
    })
  })
})