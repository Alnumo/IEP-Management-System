// PDF Export Service - Story 2.3 Task 3
// Bilingual invoice generation with Arabic RTL and English LTR support

import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Invoice, Student, TherapyProgram } from '../types/financial-management';

interface InvoicePDFOptions {
  language: 'ar' | 'en';
  companyInfo: {
    name_ar: string;
    name_en: string;
    address_ar: string;
    address_en: string;
    phone: string;
    email: string;
    logo?: string;
  };
  includeWatermark?: boolean;
  customTemplate?: string;
}

interface PDFInvoiceData extends Invoice {
  student: Student;
  therapyPrograms: TherapyProgram[];
  companyInfo: InvoicePDFOptions['companyInfo'];
}

export class PDFExportService {
  private static instance: PDFExportService;
  private arabicFont = 'Tajawal';
  private englishFont = 'Arial';

  public static getInstance(): PDFExportService {
    if (!PDFExportService.instance) {
      PDFExportService.instance = new PDFExportService();
    }
    return PDFExportService.instance;
  }

  private constructor() {
    // Initialize font support for Arabic
    this.initializeFonts();
  }

  private async initializeFonts(): Promise<void> {
    // In a real implementation, you would load Arabic font files
    // For now, we'll use the built-in font support
  }

  public async generateInvoicePDF(
    invoiceData: PDFInvoiceData,
    options: InvoicePDFOptions
  ): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const isRTL = options.language === 'ar';
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Set text direction for RTL
    if (isRTL) {
      doc.setR2L(true);
    }

    // Add company logo if provided
    if (options.companyInfo.logo) {
      try {
        doc.addImage(options.companyInfo.logo, 'PNG', margin, margin, 50, 25);
      } catch (error) {
        console.warn('Logo could not be loaded:', error);
      }
    }

    // Company header
    this.addCompanyHeader(doc, options.companyInfo, options.language, pageWidth, margin);

    // Invoice header
    this.addInvoiceHeader(doc, invoiceData, options.language, pageWidth, margin);

    // Student information
    this.addStudentInfo(doc, invoiceData.student, options.language, pageWidth, margin);

    // Invoice items
    this.addInvoiceItems(doc, invoiceData, options.language, pageWidth, margin);

    // Payment information
    this.addPaymentInfo(doc, invoiceData, options.language, pageWidth, margin);

    // Footer
    this.addFooter(doc, options, pageHeight, pageWidth, margin);

    // Add watermark if requested
    if (options.includeWatermark) {
      this.addWatermark(doc, options.language, pageWidth, pageHeight);
    }

    return doc.output('blob');
  }

  private addCompanyHeader(
    doc: jsPDF,
    companyInfo: InvoicePDFOptions['companyInfo'],
    language: 'ar' | 'en',
    pageWidth: number,
    margin: number
  ): void {
    const isRTL = language === 'ar';
    const startY = margin + 35;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');

    const companyName = language === 'ar' ? companyInfo.name_ar : companyInfo.name_en;
    const address = language === 'ar' ? companyInfo.address_ar : companyInfo.address_en;

    if (isRTL) {
      doc.text(companyName, pageWidth - margin, startY, { align: 'right' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(address, pageWidth - margin, startY + 7, { align: 'right' });
      doc.text(`${companyInfo.phone} | ${companyInfo.email}`, pageWidth - margin, startY + 14, { align: 'right' });
    } else {
      doc.text(companyName, margin, startY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(address, margin, startY + 7);
      doc.text(`${companyInfo.phone} | ${companyInfo.email}`, margin, startY + 14);
    }
  }

  private addInvoiceHeader(
    doc: jsPDF,
    invoiceData: PDFInvoiceData,
    language: 'ar' | 'en',
    pageWidth: number,
    margin: number
  ): void {
    const isRTL = language === 'ar';
    const startY = margin + 70;

    const labels = {
      ar: {
        invoice: 'فاتورة',
        invoiceNumber: 'رقم الفاتورة:',
        date: 'التاريخ:',
        dueDate: 'تاريخ الاستحقاق:'
      },
      en: {
        invoice: 'INVOICE',
        invoiceNumber: 'Invoice Number:',
        date: 'Date:',
        dueDate: 'Due Date:'
      }
    };

    const currentLabels = labels[language];

    // Invoice title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    
    if (isRTL) {
      doc.text(currentLabels.invoice, pageWidth - margin, startY, { align: 'right' });
    } else {
      doc.text(currentLabels.invoice, margin, startY);
    }

    // Invoice details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const invoiceDate = format(new Date(invoiceData.invoice_date), 'dd/MM/yyyy', {
      locale: language === 'ar' ? ar : enUS
    });
    const dueDate = format(new Date(invoiceData.due_date), 'dd/MM/yyyy', {
      locale: language === 'ar' ? ar : enUS
    });

    if (isRTL) {
      doc.text(`${currentLabels.invoiceNumber} ${invoiceData.invoice_number}`, pageWidth - margin, startY + 15, { align: 'right' });
      doc.text(`${currentLabels.date} ${invoiceDate}`, pageWidth - margin, startY + 25, { align: 'right' });
      doc.text(`${currentLabels.dueDate} ${dueDate}`, pageWidth - margin, startY + 35, { align: 'right' });
    } else {
      doc.text(`${currentLabels.invoiceNumber} ${invoiceData.invoice_number}`, margin, startY + 15);
      doc.text(`${currentLabels.date} ${invoiceDate}`, margin, startY + 25);
      doc.text(`${currentLabels.dueDate} ${dueDate}`, margin, startY + 35);
    }
  }

  private addStudentInfo(
    doc: jsPDF,
    student: Student,
    language: 'ar' | 'en',
    pageWidth: number,
    margin: number
  ): void {
    const isRTL = language === 'ar';
    const startY = margin + 130;

    const labels = {
      ar: {
        billTo: 'الفاتورة إلى:',
        studentName: 'اسم الطالب:',
        parentName: 'اسم ولي الأمر:',
        phone: 'الهاتف:'
      },
      en: {
        billTo: 'Bill To:',
        studentName: 'Student Name:',
        parentName: 'Parent Name:',
        phone: 'Phone:'
      }
    };

    const currentLabels = labels[language];

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    
    if (isRTL) {
      doc.text(currentLabels.billTo, pageWidth - margin, startY, { align: 'right' });
    } else {
      doc.text(currentLabels.billTo, margin, startY);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const studentName = language === 'ar' ? student.name_ar : student.name_en;
    const parentName = language === 'ar' ? student.parent_name_ar : student.parent_name_en;

    if (isRTL) {
      doc.text(`${currentLabels.studentName} ${studentName}`, pageWidth - margin, startY + 12, { align: 'right' });
      doc.text(`${currentLabels.parentName} ${parentName}`, pageWidth - margin, startY + 22, { align: 'right' });
      doc.text(`${currentLabels.phone} ${student.parent_phone}`, pageWidth - margin, startY + 32, { align: 'right' });
    } else {
      doc.text(`${currentLabels.studentName} ${studentName}`, margin, startY + 12);
      doc.text(`${currentLabels.parentName} ${parentName}`, margin, startY + 22);
      doc.text(`${currentLabels.phone} ${student.parent_phone}`, margin, startY + 32);
    }
  }

  private addInvoiceItems(
    doc: jsPDF,
    invoiceData: PDFInvoiceData,
    language: 'ar' | 'en',
    pageWidth: number,
    margin: number
  ): void {
    const isRTL = language === 'ar';
    const startY = margin + 180;
    const tableStartY = startY + 15;

    const labels = {
      ar: {
        description: 'الوصف',
        quantity: 'الكمية',
        unitPrice: 'السعر',
        total: 'المجموع',
        subtotal: 'المجموع الفرعي:',
        discount: 'الخصم:',
        tax: 'الضريبة:',
        totalAmount: 'المجموع الكلي:'
      },
      en: {
        description: 'Description',
        quantity: 'Qty',
        unitPrice: 'Unit Price',
        total: 'Total',
        subtotal: 'Subtotal:',
        discount: 'Discount:',
        tax: 'Tax:',
        totalAmount: 'Total Amount:'
      }
    };

    const currentLabels = labels[language];

    // Table header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    const colWidths = [80, 30, 35, 35];
    const colPositions = isRTL 
      ? [pageWidth - margin - colWidths[0], pageWidth - margin - colWidths[0] - colWidths[1], pageWidth - margin - colWidths[0] - colWidths[1] - colWidths[2], margin]
      : [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];

    if (isRTL) {
      doc.text(currentLabels.description, colPositions[0], tableStartY, { align: 'right' });
      doc.text(currentLabels.quantity, colPositions[1], tableStartY, { align: 'center' });
      doc.text(currentLabels.unitPrice, colPositions[2], tableStartY, { align: 'center' });
      doc.text(currentLabels.total, colPositions[3], tableStartY, { align: 'left' });
    } else {
      doc.text(currentLabels.description, colPositions[0], tableStartY);
      doc.text(currentLabels.quantity, colPositions[1], tableStartY);
      doc.text(currentLabels.unitPrice, colPositions[2], tableStartY);
      doc.text(currentLabels.total, colPositions[3], tableStartY);
    }

    // Table line
    doc.line(margin, tableStartY + 5, pageWidth - margin, tableStartY + 5);

    // Invoice items
    doc.setFont('helvetica', 'normal');
    let currentY = tableStartY + 15;

    invoiceData.invoice_items.forEach((item) => {
      const description = language === 'ar' ? item.description_ar : item.description_en;
      const total = item.quantity * item.unit_price;

      if (isRTL) {
        doc.text(description, colPositions[0], currentY, { align: 'right' });
        doc.text(item.quantity.toString(), colPositions[1], currentY, { align: 'center' });
        doc.text(`${item.unit_price.toFixed(2)} 1J'D`, colPositions[2], currentY, { align: 'center' });
        doc.text(`${total.toFixed(2)} 1J'D`, colPositions[3], currentY, { align: 'left' });
      } else {
        doc.text(description, colPositions[0], currentY);
        doc.text(item.quantity.toString(), colPositions[1], currentY);
        doc.text(`SAR ${item.unit_price.toFixed(2)}`, colPositions[2], currentY);
        doc.text(`SAR ${total.toFixed(2)}`, colPositions[3], currentY);
      }

      currentY += 10;
    });

    // Totals section
    const totalsStartY = currentY + 10;
    doc.line(margin, totalsStartY - 5, pageWidth - margin, totalsStartY - 5);

    const currency = language === 'ar' ? 'ريال' : 'SAR';

    if (isRTL) {
      doc.text(`${currentLabels.subtotal} ${invoiceData.subtotal_amount.toFixed(2)} ${currency}`, pageWidth - margin, totalsStartY, { align: 'right' });
      if (invoiceData.discount_amount > 0) {
        doc.text(`${currentLabels.discount} ${invoiceData.discount_amount.toFixed(2)} ${currency}`, pageWidth - margin, totalsStartY + 10, { align: 'right' });
      }
      if (invoiceData.tax_amount > 0) {
        doc.text(`${currentLabels.tax} ${invoiceData.tax_amount.toFixed(2)} ${currency}`, pageWidth - margin, totalsStartY + 20, { align: 'right' });
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentLabels.totalAmount} ${invoiceData.total_amount.toFixed(2)} ${currency}`, pageWidth - margin, totalsStartY + 30, { align: 'right' });
    } else {
      doc.text(`${currentLabels.subtotal} ${currency} ${invoiceData.subtotal_amount.toFixed(2)}`, pageWidth - 80, totalsStartY);
      if (invoiceData.discount_amount > 0) {
        doc.text(`${currentLabels.discount} ${currency} ${invoiceData.discount_amount.toFixed(2)}`, pageWidth - 80, totalsStartY + 10);
      }
      if (invoiceData.tax_amount > 0) {
        doc.text(`${currentLabels.tax} ${currency} ${invoiceData.tax_amount.toFixed(2)}`, pageWidth - 80, totalsStartY + 20);
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentLabels.totalAmount} ${currency} ${invoiceData.total_amount.toFixed(2)}`, pageWidth - 80, totalsStartY + 30);
    }
  }

  private addPaymentInfo(
    doc: jsPDF,
    invoiceData: PDFInvoiceData,
    language: 'ar' | 'en',
    pageWidth: number,
    margin: number
  ): void {
    const isRTL = language === 'ar';
    const startY = 245;

    const labels = {
      ar: {
        paymentInfo: 'معلومات الدفع:',
        paymentTerms: 'شروط الدفع:',
        bankInfo: 'معلومات البنك:'
      },
      en: {
        paymentInfo: 'Payment Information:',
        paymentTerms: 'Payment Terms:',
        bankInfo: 'Bank Information:'
      }
    };

    const currentLabels = labels[language];

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    if (isRTL) {
      doc.text(currentLabels.paymentInfo, pageWidth - margin, startY, { align: 'right' });
    } else {
      doc.text(currentLabels.paymentInfo, margin, startY);
    }

    doc.setFont('helvetica', 'normal');

    const paymentTermsText = language === 'ar' 
      ? `الدفع مطلوب خلال ${invoiceData.payment_terms || 30} يوماً من تاريخ الفاتورة`
      : `Payment is due within ${invoiceData.payment_terms || 30} days of invoice date`;

    const bankInfoText = language === 'ar'
      ? 'تفاصيل التحويل البنكي متاحة عند الطلب'
      : 'Bank transfer details available upon request';

    if (isRTL) {
      doc.text(paymentTermsText, pageWidth - margin, startY + 12, { align: 'right' });
      doc.text(bankInfoText, pageWidth - margin, startY + 22, { align: 'right' });
    } else {
      doc.text(paymentTermsText, margin, startY + 12);
      doc.text(bankInfoText, margin, startY + 22);
    }
  }

  private addFooter(
    doc: jsPDF,
    options: InvoicePDFOptions,
    pageHeight: number,
    pageWidth: number,
    margin: number
  ): void {
    const isRTL = options.language === 'ar';
    const footerY = pageHeight - margin;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const footerText = options.language === 'ar'
      ? 'شكراً لاختياركم خدماتنا | مركز أركان للنمو'
      : 'Thank you for choosing our services | Arkan Growth Center';

    if (isRTL) {
      doc.text(footerText, pageWidth - margin, footerY, { align: 'right' });
    } else {
      doc.text(footerText, margin, footerY);
    }

    // Add page number
    const pageNumber = options.language === 'ar' ? `5A-) 1 EF 1` : `Page 1 of 1`;
    doc.text(pageNumber, pageWidth / 2, footerY, { align: 'center' });
  }

  private addWatermark(
    doc: jsPDF,
    language: 'ar' | 'en',
    pageWidth: number,
    pageHeight: number
  ): void {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.1 }));
    doc.setFontSize(50);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(128, 128, 128);

    const watermarkText = language === 'ar' ? 'مركز أركان' : 'ARKAN CENTER';
    
    // Rotate text for watermark effect
    const angle = -45;
    const x = pageWidth / 2;
    const y = pageHeight / 2;
    
    doc.text(watermarkText, x, y, {
      angle: angle,
      align: 'center'
    });

    doc.restoreGraphicsState();
  }

  public async generateBulkInvoices(
    invoicesData: PDFInvoiceData[],
    options: InvoicePDFOptions
  ): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    for (let i = 0; i < invoicesData.length; i++) {
      if (i > 0) {
        doc.addPage();
      }
      
      // Generate individual invoice on current page
      await this.addSingleInvoiceToDoc(doc, invoicesData[i], options);
    }

    return doc.output('blob');
  }

  private async addSingleInvoiceToDoc(
    doc: jsPDF,
    invoiceData: PDFInvoiceData,
    options: InvoicePDFOptions
  ): Promise<void> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    if (options.language === 'ar') {
      doc.setR2L(true);
    }

    this.addCompanyHeader(doc, options.companyInfo, options.language, pageWidth, margin);
    this.addInvoiceHeader(doc, invoiceData, options.language, pageWidth, margin);
    this.addStudentInfo(doc, invoiceData.student, options.language, pageWidth, margin);
    this.addInvoiceItems(doc, invoiceData, options.language, pageWidth, margin);
    this.addPaymentInfo(doc, invoiceData, options.language, pageWidth, margin);
    this.addFooter(doc, options, pageHeight, pageWidth, margin);

    if (options.includeWatermark) {
      this.addWatermark(doc, options.language, pageWidth, pageHeight);
    }
  }
}

// Export convenience functions
export const generateInvoicePDF = async (
  invoiceData: PDFInvoiceData,
  options: InvoicePDFOptions
): Promise<Blob> => {
  const service = PDFExportService.getInstance();
  return service.generateInvoicePDF(invoiceData, options);
};

export const generateBulkInvoicesPDF = async (
  invoicesData: PDFInvoiceData[],
  options: InvoicePDFOptions
): Promise<Blob> => {
  const service = PDFExportService.getInstance();
  return service.generateBulkInvoices(invoicesData, options);
};

export default PDFExportService;