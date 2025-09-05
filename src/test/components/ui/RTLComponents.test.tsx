import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableHead, TableCell, TableCaption } from '@/components/ui/table'

// Create mock functions outside of the mock
const mockLanguage = vi.fn()
const mockIsRTL = vi.fn()

// Mock the useLanguage hook
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: mockLanguage(),
    isRTL: mockIsRTL(),
    toggleLanguage: vi.fn(),
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => key)
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children
}))

describe('RTL Component Tests', () => {
  describe('Card Components', () => {
    it('should apply RTL text alignment for Arabic language', () => {
      mockLanguage.mockReturnValue('ar')
      mockIsRTL.mockReturnValue(true)
      
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>عنوان البطاقة</CardTitle>
            <CardDescription>وصف البطاقة</CardDescription>
          </CardHeader>
          <CardContent>محتوى البطاقة</CardContent>
          <CardFooter>تذييل البطاقة</CardFooter>
        </Card>
      )
      
      // Check RTL styling is applied
      const header = container.querySelector('div[style*="text-align: right"]')
      expect(header).toBeTruthy()
      
      const title = container.querySelector('h3[style*="text-align: right"]')
      expect(title).toBeTruthy()
    })

    it('should apply LTR text alignment for English language', () => {
      mockLanguage.mockReturnValue('en')
      mockIsRTL.mockReturnValue(false)
      
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Card Content</CardContent>
          <CardFooter>Card Footer</CardFooter>
        </Card>
      )
      
      // Check LTR styling is applied
      const header = container.querySelector('div[style*="text-align: left"]')
      expect(header).toBeTruthy()
      
      const title = container.querySelector('h3[style*="text-align: left"]')
      expect(title).toBeTruthy()
    })

    it('should apply Arabic font family for Arabic language', () => {
      mockLanguage.mockReturnValue('ar')
      mockIsRTL.mockReturnValue(true)
      
      const { container } = render(
        <CardTitle>عنوان عربي</CardTitle>
      )
      
      const title = container.querySelector('.font-arabic')
      expect(title).toBeTruthy()
    })
  })

  describe('Input Component', () => {
    it('should apply RTL direction for Arabic input', () => {
      mockLanguage.mockReturnValue('ar')
      mockIsRTL.mockReturnValue(true)
      
      const { container } = render(
        <Input placeholder="أدخل النص هنا" />
      )
      
      const input = container.querySelector('input[style*="direction: rtl"]')
      expect(input).toBeTruthy()
      expect(input).toHaveStyle({ textAlign: 'right' })
    })

    it('should apply LTR direction for English input', () => {
      mockLanguage.mockReturnValue('en')
      mockIsRTL.mockReturnValue(false)
      
      const { container } = render(
        <Input placeholder="Enter text here" />
      )
      
      const input = container.querySelector('input[style*="direction: ltr"]')
      expect(input).toBeTruthy()
      expect(input).toHaveStyle({ textAlign: 'left' })
    })

    it('should apply Arabic font class for Arabic language', () => {
      mockLanguage.mockReturnValue('ar')
      mockIsRTL.mockReturnValue(true)
      
      const { container } = render(
        <Input defaultValue="نص عربي" />
      )
      
      const input = container.querySelector('input.font-arabic')
      expect(input).toBeTruthy()
    })
  })

  describe('Textarea Component', () => {
    it('should apply RTL direction for Arabic textarea', () => {
      mockLanguage.mockReturnValue('ar')
      mockIsRTL.mockReturnValue(true)
      
      const { container } = render(
        <Textarea placeholder="أدخل النص المطول هنا" />
      )
      
      const textarea = container.querySelector('textarea[style*="direction: rtl"]')
      expect(textarea).toBeTruthy()
      expect(textarea).toHaveStyle({ textAlign: 'right' })
    })

    it('should apply LTR direction for English textarea', () => {
      mockLanguage.mockReturnValue('en')
      mockIsRTL.mockReturnValue(false)
      
      const { container } = render(
        <Textarea placeholder="Enter long text here" />
      )
      
      const textarea = container.querySelector('textarea[style*="direction: ltr"]')
      expect(textarea).toBeTruthy()
      expect(textarea).toHaveStyle({ textAlign: 'left' })
    })
  })

  describe('Table Components', () => {
    it('should apply RTL direction for Arabic table', () => {
      mockLanguage.mockReturnValue('ar')
      mockIsRTL.mockReturnValue(true)
      
      const { container } = render(
        <Table>
          <thead>
            <tr>
              <TableHead>رأس الجدول</TableHead>
            </tr>
          </thead>
          <tbody>
            <tr>
              <TableCell>خلية الجدول</TableCell>
            </tr>
          </tbody>
          <TableCaption>تعليق الجدول</TableCaption>
        </Table>
      )
      
      const table = container.querySelector('table[style*="direction: rtl"]')
      expect(table).toBeTruthy()
      
      const th = container.querySelector('th[style*="text-align: right"]')
      expect(th).toBeTruthy()
      
      const td = container.querySelector('td[style*="text-align: right"]')
      expect(td).toBeTruthy()
    })

    it('should apply LTR direction for English table', () => {
      mockLanguage.mockReturnValue('en')
      mockIsRTL.mockReturnValue(false)
      
      const { container } = render(
        <Table>
          <thead>
            <tr>
              <TableHead>Table Header</TableHead>
            </tr>
          </thead>
          <tbody>
            <tr>
              <TableCell>Table Cell</TableCell>
            </tr>
          </tbody>
          <TableCaption>Table Caption</TableCaption>
        </Table>
      )
      
      const table = container.querySelector('table[style*="direction: ltr"]')
      expect(table).toBeTruthy()
      
      const th = container.querySelector('th[style*="text-align: left"]')
      expect(th).toBeTruthy()
      
      const td = container.querySelector('td[style*="text-align: left"]')
      expect(td).toBeTruthy()
    })

    it('should apply Arabic font class for Arabic table elements', () => {
      mockLanguage.mockReturnValue('ar')
      mockIsRTL.mockReturnValue(true)
      
      const { container } = render(
        <Table>
          <thead>
            <tr>
              <TableHead>رأس</TableHead>
            </tr>
          </thead>
          <tbody>
            <tr>
              <TableCell>خلية</TableCell>
            </tr>
          </tbody>
        </Table>
      )
      
      const th = container.querySelector('th.font-arabic')
      expect(th).toBeTruthy()
      
      const td = container.querySelector('td.font-arabic')
      expect(td).toBeTruthy()
    })
  })

  describe('Language Context Integration', () => {
    it('should correctly apply RTL styles when language is Arabic', () => {
      mockLanguage.mockReturnValue('ar')
      mockIsRTL.mockReturnValue(true)
      
      const { container } = render(
        <Input placeholder="اختبار" />
      )
      
      const input = container.querySelector('input')
      expect(input).toBeTruthy()
      // Check that Arabic class is applied
      expect(input?.className).toContain('font-arabic')
      // Check RTL styling
      expect(input?.style.direction).toBe('rtl')
      expect(input?.style.textAlign).toBe('right')
    })

    it('should correctly apply LTR styles when language is English', () => {
      mockLanguage.mockReturnValue('en')
      mockIsRTL.mockReturnValue(false)
      
      const { container } = render(
        <Input placeholder="Test" />
      )
      
      const input = container.querySelector('input')
      expect(input).toBeTruthy()
      // Check that Arabic class is NOT applied
      expect(input?.className).not.toContain('font-arabic')
      // Check LTR styling
      expect(input?.style.direction).toBe('ltr')
      expect(input?.style.textAlign).toBe('left')
    })
  })
})