/**
 * IEP PDF Export Dialog Tests
 * اختبارات مربع حوار تصدير PDF للبرنامج التعليمي الفردي
 * 
 * @description Test suite for IEP PDF export dialog with cultural considerations
 * Story 1.3 - Task 4: Arabic PDF export with cultural appropriateness
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { IEPPDFExportDialog } from '@/components/iep/IEPPDFExportDialog'
import { LanguageProvider } from '@/contexts/LanguageContext'
import * as iepPdfService from '@/services/iep-pdf-export-service'

// =============================================================================
// MOCKS
// =============================================================================

// Mock PDF export service
vi.mock('@/services/iep-pdf-export-service', () => ({
  generateIEPPDF: vi.fn(),
  IEPPDFExportService: vi.fn()
}))

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

// Mock URL.createObjectURL and related DOM APIs
const mockCreateObjectURL = vi.fn(() => 'mock-blob-url')
const mockRevokeObjectURL = vi.fn()

Object.defineProperty(window.URL, 'createObjectURL', {
  value: mockCreateObjectURL
})
Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL
})

// Mock document.createElement for download link
const mockClick = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()

Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    href: '',
    download: '',
    click: mockClick,
    style: { display: '' }
  }))
})

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild
})
Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild
})

// =============================================================================
// TEST DATA
// =============================================================================

const mockIEPData = {
  id: 'iep-001',
  student_id: 'student-001',
  student: {
    id: 'student-001',
    name_ar: 'أحمد محمد العلي',
    name_en: 'Ahmed Mohammed Al-Ali',
    birth_date: '2010-05-15',
    gender: 'male' as const,
    parent_name_ar: 'محمد العلي',
    parent_name_en: 'Mohammed Al-Ali',
    parent_phone: '+966501234567'
  },
  goals: [
    {
      id: 'goal-001',
      goal_text_ar: 'تحسين مهارات القراءة',
      goal_text_en: 'Improve reading skills',
      target_date: '2024-12-31',
      progress_percentage: 75
    },
    {
      id: 'goal-002',
      goal_text_ar: 'تطوير المهارات الاجتماعية',
      goal_text_en: 'Develop social skills',
      target_date: '2024-12-31',
      progress_percentage: 60
    }
  ],
  present_levels_academic_ar: 'الطالب يؤدي أداءً جيداً في معظم المواد الأكاديمية',
  present_levels_academic_en: 'Student performs well in most academic subjects',
  present_levels_functional_ar: 'يحتاج دعماً في المهارات الحياتية اليومية',
  present_levels_functional_en: 'Needs support in daily living skills',
  lre_justification_ar: 'يستفيد من التعليم في الصف العام مع الدعم المناسب',
  lre_justification_en: 'Benefits from general education with appropriate support',
  effective_date: '2024-01-01',
  annual_review_date: '2024-12-01',
  mainstreaming_percentage: 75
}

const mockPDFBlob = new Blob(['mock pdf content'], { type: 'application/pdf' })

// =============================================================================
// TEST SETUP
// =============================================================================

const TestWrapper: React.FC<{ 
  children: React.ReactNode
  language?: 'ar' | 'en' 
}> = ({ children, language = 'en' }) => {
  return (
    <LanguageProvider defaultLanguage={language}>
      {children}
    </LanguageProvider>
  )
}

// =============================================================================
// TESTS
// =============================================================================

describe('IEPPDFExportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(iepPdfService.generateIEPPDF).mockResolvedValue(mockPDFBlob)
  })

  describe('English Language Tests', () => {
    it('should render export dialog trigger', () => {
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      expect(screen.getByText('Export PDF')).toBeInTheDocument()
    })

    it('should open dialog when trigger is clicked', async () => {
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        expect(screen.getByText('Export IEP as PDF')).toBeInTheDocument()
        expect(screen.getByText('Important Cultural Note')).toBeInTheDocument()
      })
    })

    it('should display cultural presets', async () => {
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        expect(screen.getByText('Saudi Cultural Settings')).toBeInTheDocument()
        expect(screen.getByText('International Settings')).toBeInTheDocument()
        expect(screen.getByText('Custom Settings')).toBeInTheDocument()
      })
    })

    it('should switch between tabs correctly', async () => {
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        // Click on Cultural tab
        fireEvent.click(screen.getByRole('tab', { name: 'Cultural' }))
        expect(screen.getByText('Cultural Settings')).toBeInTheDocument()
        expect(screen.getByText('Respect cultural privacy')).toBeInTheDocument()
      })
    })

    it('should display format options', async () => {
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        // Click on Format tab
        fireEvent.click(screen.getByRole('tab', { name: 'Format' }))
        expect(screen.getByText('Format Options')).toBeInTheDocument()
        expect(screen.getByText('Include Islamic calendar')).toBeInTheDocument()
        expect(screen.getByText('Include cultural notes')).toBeInTheDocument()
      })
    })

    it('should allow changing cultural settings', async () => {
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Cultural' }))
        
        // Find and click the conservative language checkbox
        const conservativeCheckbox = screen.getByLabelText('Use conservative language')
        expect(conservativeCheckbox).toBeChecked() // Should be checked by default
        
        fireEvent.click(conservativeCheckbox)
        expect(conservativeCheckbox).not.toBeChecked()
      })
    })

    it('should export PDF successfully', async () => {
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        const exportButton = screen.getAllByText('Export PDF').find(btn => 
          (btn as HTMLElement).closest('button')
        )
        if (exportButton) {
          fireEvent.click(exportButton)
        }
      })

      await waitFor(() => {
        expect(iepPdfService.generateIEPPDF).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'iep-001',
            student: expect.objectContaining({
              name_ar: 'أحمد محمد العلي',
              cultural_background: 'saudi'
            })
          }),
          expect.objectContaining({
            language: 'en',
            culturalSettings: expect.objectContaining({
              respectPrivacy: true,
              useConservativeLanguage: true
            })
          })
        )
      })

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockPDFBlob)
        expect(mockClick).toHaveBeenCalled()
      })
    })

    it('should handle export errors gracefully', async () => {
      vi.mocked(iepPdfService.generateIEPPDF).mockRejectedValueOnce(new Error('Export failed'))

      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        const exportButton = screen.getAllByText('Export PDF').find(btn => 
          (btn as HTMLElement).closest('button')
        )
        if (exportButton) {
          fireEvent.click(exportButton)
        }
      })

      await waitFor(() => {
        // Should not crash and should handle error
        expect(iepPdfService.generateIEPPDF).toHaveBeenCalled()
      })
    })
  })

  describe('Arabic Language Tests', () => {
    it('should render dialog in Arabic', async () => {
      render(
        <TestWrapper language="ar">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      expect(screen.getByText('تصدير PDF')).toBeInTheDocument()

      fireEvent.click(screen.getByText('تصدير PDF'))

      await waitFor(() => {
        expect(screen.getByText('تصدير البرنامج التعليمي الفردي كـ PDF')).toBeInTheDocument()
        expect(screen.getByText('ملاحظة ثقافية مهمة')).toBeInTheDocument()
      })
    })

    it('should display Arabic cultural presets', async () => {
      render(
        <TestWrapper language="ar">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('تصدير PDF'))

      await waitFor(() => {
        expect(screen.getByText('الإعدادات الثقافية السعودية')).toBeInTheDocument()
        expect(screen.getByText('الإعدادات الدولية')).toBeInTheDocument()
        expect(screen.getByText('إعدادات مخصصة')).toBeInTheDocument()
      })
    })

    it('should show Arabic cultural settings', async () => {
      render(
        <TestWrapper language="ar">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('تصدير PDF'))

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'الثقافية' }))
        expect(screen.getByText('الإعدادات الثقافية')).toBeInTheDocument()
        expect(screen.getByText('احترام الخصوصية الثقافية')).toBeInTheDocument()
        expect(screen.getByText('استخدام لغة محافظة ومهذبة')).toBeInTheDocument()
      })
    })

    it('should export with Arabic settings', async () => {
      render(
        <TestWrapper language="ar">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('تصدير PDF'))

      await waitFor(() => {
        const exportButton = screen.getAllByText('تصدير PDF').find(btn => 
          (btn as HTMLElement).closest('button') && 
          !(btn as HTMLElement).closest('[role="dialog"]')
        )
        if (!exportButton) {
          // If not found, look for it in the dialog
          const dialogExportButton = screen.getAllByText('تصدير PDF').find(btn => 
            (btn as HTMLElement).closest('[role="dialog"]')
          )
          if (dialogExportButton) {
            fireEvent.click(dialogExportButton)
          }
        } else {
          fireEvent.click(exportButton)
        }
      })

      await waitFor(() => {
        expect(iepPdfService.generateIEPPDF).toHaveBeenCalledWith(
          expect.objectContaining({
            student: expect.objectContaining({
              family_preferences: expect.objectContaining({
                language_preference: 'ar'
              })
            })
          }),
          expect.objectContaining({
            language: 'ar',
            includeIslamicCalendar: true,
            includeCulturalNotes: true
          })
        )
      })
    })
  })

  describe('Cultural Preset Tests', () => {
    it('should switch presets correctly', async () => {
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        // Click on International Settings preset
        fireEvent.click(screen.getByText('International Settings'))
        
        // Switch to Cultural tab to verify settings changed
        fireEvent.click(screen.getByRole('tab', { name: 'Cultural' }))
        
        // Gender considerations should be unchecked for international preset
        const genderCheckbox = screen.getByLabelText('Include gender considerations')
        expect(genderCheckbox).not.toBeChecked()
      })
    })

    it('should allow custom settings modifications', async () => {
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        // Switch to Format tab
        fireEvent.click(screen.getByRole('tab', { name: 'Format' }))
        
        // Toggle Islamic calendar option
        const islamicCalendarCheckbox = screen.getByLabelText('Include Islamic calendar')
        fireEvent.click(islamicCalendarCheckbox)
        
        // Add watermark text
        const watermarkInput = screen.getByPlaceholderText('Watermark text')
        fireEvent.change(watermarkInput, { target: { value: 'CONFIDENTIAL' } })
        expect(watermarkInput).toHaveValue('CONFIDENTIAL')
      })
    })
  })

  describe('Company Information Tests', () => {
    it('should allow editing company information', async () => {
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        // Switch to Company tab
        fireEvent.click(screen.getByRole('tab', { name: 'Company' }))
        expect(screen.getByText('Company Information')).toBeInTheDocument()
        
        // Verify default values are present
        expect(screen.getByDisplayValue('Arkan Growth Center')).toBeInTheDocument()
        expect(screen.getByDisplayValue('مركز أركان للنمو')).toBeInTheDocument()
        
        // Change company name
        const companyNameEn = screen.getByDisplayValue('Arkan Growth Center')
        fireEvent.change(companyNameEn, { target: { value: 'New Company Name' } })
        expect(companyNameEn).toHaveValue('New Company Name')
      })
    })
  })

  describe('Progress and Loading States', () => {
    it('should show progress during export', async () => {
      // Mock a delayed response to see progress
      vi.mocked(iepPdfService.generateIEPPDF).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPDFBlob), 1000))
      )

      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        const exportButton = screen.getAllByText('Export PDF').find(btn => 
          (btn as HTMLElement).closest('button')
        )
        if (exportButton) {
          fireEvent.click(exportButton)
        }
      })

      // Should show exporting state
      await waitFor(() => {
        expect(screen.getByText('Exporting...')).toBeInTheDocument()
      })
    })

    it('should disable buttons during export', async () => {
      vi.mocked(iepPdfService.generateIEPPDF).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPDFBlob), 500))
      )

      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        const exportButton = screen.getAllByText('Export PDF').find(btn => 
          (btn as HTMLElement).closest('button')
        )
        if (exportButton) {
          fireEvent.click(exportButton)
        }
      })

      // Buttons should be disabled during export
      await waitFor(() => {
        const exportingButton = screen.getByText('Exporting...')
        expect((exportingButton as HTMLElement).closest('button')).toBeDisabled()
        
        const cancelButton = screen.getByText('Cancel')
        expect((cancelButton as HTMLElement).closest('button')).toBeDisabled()
      })
    })
  })

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        // Check for dialog role
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        
        // Check for tab navigation
        expect(screen.getByRole('tab', { name: 'Presets' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Cultural' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Format' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Company' })).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation', async () => {
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog iepData={mockIEPData} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        const presetsTab = screen.getByRole('tab', { name: 'Presets' })
        presetsTab.focus()
        expect(document.activeElement).toBe(presetsTab)
        
        // Navigate to next tab with arrow key
        fireEvent.keyDown(presetsTab, { key: 'ArrowRight' })
        const culturalTab = screen.getByRole('tab', { name: 'Cultural' })
        expect(document.activeElement).toBe(culturalTab)
      })
    })
  })

  describe('Custom Trigger Tests', () => {
    it('should accept custom trigger element', () => {
      const customTrigger = <button>Custom Export Button</button>
      
      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog 
            iepData={mockIEPData} 
            trigger={customTrigger}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Custom Export Button')).toBeInTheDocument()
      expect(screen.queryByText('Export PDF')).not.toBeInTheDocument()
    })
  })

  describe('Callback Tests', () => {
    it('should call onExportComplete callback on successful export', async () => {
      const onExportComplete = vi.fn()

      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog 
            iepData={mockIEPData} 
            onExportComplete={onExportComplete}
          />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        const exportButton = screen.getAllByText('Export PDF').find(btn => 
          (btn as HTMLElement).closest('button')
        )
        if (exportButton) {
          fireEvent.click(exportButton)
        }
      })

      await waitFor(() => {
        expect(onExportComplete).toHaveBeenCalledWith(true)
      })
    })

    it('should call onExportComplete callback on export failure', async () => {
      const onExportComplete = vi.fn()
      vi.mocked(iepPdfService.generateIEPPDF).mockRejectedValueOnce(new Error('Export failed'))

      render(
        <TestWrapper language="en">
          <IEPPDFExportDialog 
            iepData={mockIEPData} 
            onExportComplete={onExportComplete}
          />
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Export PDF'))

      await waitFor(() => {
        const exportButton = screen.getAllByText('Export PDF').find(btn => 
          (btn as HTMLElement).closest('button')
        )
        if (exportButton) {
          fireEvent.click(exportButton)
        }
      })

      await waitFor(() => {
        expect(onExportComplete).toHaveBeenCalledWith(false)
      })
    })
  })
})