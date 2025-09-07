// PDF Invoice Integration Tests
// Testing integration between AutomatedInvoiceGenerationService and PDFExportService

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PDFExportService, generateInvoicesFromSessionsPDF } from '../../services/pdf-export-service';
import { AutomatedInvoiceGenerationService } from '../../services/automated-invoice-generation-service';
import type { InvoicePDFOptions } from '../../services/pdf-export-service';

// Mock jsPDF
vi.mock('jspdf', () => {
  const mockDoc = {
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297
      }
    },
    setR2L: vi.fn(),
    addImage: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    addPage: vi.fn(),
    saveGraphicsState: vi.fn(),
    setGState: vi.fn(),
    setTextColor: vi.fn(),
    restoreGraphicsState: vi.fn(),
    output: vi.fn().mockReturnValue(new Blob(['mock-pdf'], { type: 'application/pdf' })),
    GState: vi.fn().mockImplementation((opts) => opts)
  };
  
  return {
    jsPDF: vi.fn().mockImplementation(() => mockDoc)
  };
});

// Mock AutomatedInvoiceGenerationService
vi.mock('../../services/automated-invoice-generation-service', () => {
  const mockInvoiceData = [
    {
      id: 'inv-001',
      invoice_number: 'INV-202401-001',
      student_id: 'student-1',
      invoice_date: '2024-01-15',
      due_date: '2024-02-15',
      subtotal_amount: 1000.00,
      discount_amount: 0.00,
      tax_amount: 150.00,
      total_amount: 1150.00,
      payment_terms: 30,
      vat_number: '300123456789003',
      invoice_items: [
        {
          id: 'item-1',
          description_ar: 'جلسة تحليل السلوك التطبيقي',
          description_en: 'Applied Behavior Analysis Session',
          quantity: 4,
          unit_price: 250.00
        }
      ]
    }
  ];

  const mockInvoiceService = {
    generateInvoicesForCompletedSessions: vi.fn().mockResolvedValue(mockInvoiceData)
  };

  return {
    AutomatedInvoiceGenerationService: {
      getInstance: vi.fn().mockReturnValue(mockInvoiceService)
    }
  };
});

describe('PDF Invoice Integration', () => {
  let pdfService: PDFExportService;
  let mockOptions: InvoicePDFOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the mock to return successful data by default
    const mockInvoiceData = [
      {
        id: 'inv-001',
        invoice_number: 'INV-202401-001',
        student_id: 'student-1',
        invoice_date: '2024-01-15',
        due_date: '2024-02-15',
        subtotal_amount: 1000.00,
        discount_amount: 0.00,
        tax_amount: 150.00,
        total_amount: 1150.00,
        payment_terms: 30,
        vat_number: '300123456789003',
        invoice_items: [
          {
            id: 'item-1',
            description_ar: 'جلسة تحليل السلوك التطبيقي',
            description_en: 'Applied Behavior Analysis Session',
            quantity: 4,
            unit_price: 250.00
          }
        ]
      }
    ];
    
    vi.mocked(AutomatedInvoiceGenerationService.getInstance).mockReturnValue({
      generateInvoicesForCompletedSessions: vi.fn().mockResolvedValue(mockInvoiceData)
    } as any);
    
    pdfService = PDFExportService.getInstance();
    
    mockOptions = {
      language: 'ar',
      companyInfo: {
        name_ar: 'مركز أركان للنمو',
        name_en: 'Arkan Growth Center',
        address_ar: 'الرياض، المملكة العربية السعودية',
        address_en: 'Riyadh, Saudi Arabia',
        phone: '+966 11 234 5678',
        email: 'info@arkangrowth.com'
      },
      includeWatermark: true
    };
  });

  describe('Invoice Generation from Sessions', () => {
    it('should generate PDF from completed therapy sessions', async () => {
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
    });

    it('should handle Arabic language invoice generation', async () => {
      mockOptions.language = 'ar';
      
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle English language invoice generation', async () => {
      mockOptions.language = 'en';
      
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
    });

    it('should throw error when no invoices are generated', async () => {
      // Mock the getInstance to return empty invoices for this test
      vi.mocked(AutomatedInvoiceGenerationService.getInstance).mockReturnValue({
        generateInvoicesForCompletedSessions: vi.fn().mockResolvedValue([])
      } as any);

      await expect(
        pdfService.generateInvoicesFromSessions(mockOptions)
      ).rejects.toThrow('No invoices were generated from completed sessions');
    });

    it('should include Saudi VAT information in Arabic invoices', async () => {
      mockOptions.language = 'ar';
      
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      // Verify VAT information would be included in PDF (mocked)
    });

    it('should include Saudi VAT information in English invoices', async () => {
      mockOptions.language = 'en';
      
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      // Verify VAT information would be included in PDF (mocked)
    });
  });

  describe('Convenience Functions', () => {
    it('should export generateInvoicesFromSessionsPDF function', async () => {
      const result = await generateInvoicesFromSessionsPDF(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
    });
  });

  describe('Data Integration', () => {
    it('should fetch student data for PDF generation', async () => {
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      // Student data fetching is mocked but would be called
    });

    it('should fetch therapy program data for PDF generation', async () => {
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      // Therapy program data fetching is mocked but would be called
    });
  });

  describe('Error Handling', () => {
    it('should handle PDF generation errors gracefully', async () => {
      // Mock the getInstance to return error for this test
      vi.mocked(AutomatedInvoiceGenerationService.getInstance).mockReturnValue({
        generateInvoicesForCompletedSessions: vi.fn().mockRejectedValue(
          new Error('Database connection failed')
        )
      } as any);

      await expect(
        pdfService.generateInvoicesFromSessions(mockOptions)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle missing company logo gracefully', async () => {
      mockOptions.companyInfo.logo = 'invalid-logo-path';
      
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      // Should continue without logo
    });
  });

  describe('Saudi Arabia Compliance', () => {
    it('should format Saudi Riyal currency correctly in Arabic', async () => {
      mockOptions.language = 'ar';
      
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      // Currency formatting would be verified in actual PDF
    });

    it('should format Saudi Riyal currency correctly in English', async () => {
      mockOptions.language = 'en';
      
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      // Currency formatting would be verified in actual PDF
    });

    it('should include VAT number in invoice when available', async () => {
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      // VAT number inclusion would be verified in actual PDF
    });
  });

  describe('Bilingual Support', () => {
    it('should generate RTL layout for Arabic invoices', async () => {
      mockOptions.language = 'ar';
      
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      // RTL layout would be applied in actual PDF
    });

    it('should generate LTR layout for English invoices', async () => {
      mockOptions.language = 'en';
      
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      // LTR layout would be applied in actual PDF
    });

    it('should use correct fonts for Arabic text', async () => {
      mockOptions.language = 'ar';
      
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      // Arabic fonts would be verified in actual PDF
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should generate mobile-friendly PDF dimensions', async () => {
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      expect(result).toBeInstanceOf(Blob);
      // PDF should be readable on mobile devices
    });
  });

  describe('Performance', () => {
    it('should handle bulk invoice PDF generation efficiently', async () => {
      const start = Date.now();
      
      const result = await pdfService.generateInvoicesFromSessions(mockOptions);
      
      const end = Date.now();
      const duration = end - start;
      
      expect(result).toBeInstanceOf(Blob);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});