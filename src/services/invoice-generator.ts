import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Invoice, BillingItem } from './billing-service';

export interface InvoiceTemplate {
  id: string;
  name: string;
  nameAr: string;
  format: 'pdf' | 'html' | 'excel';
  language: 'ar' | 'en' | 'both';
  template: string;
  styles?: string;
  isDefault: boolean;
}

export interface CompanyInfo {
  name: string;
  nameAr: string;
  address: string;
  addressAr: string;
  phone: string;
  email: string;
  website: string;
  taxId: string; // VAT registration number
  crNumber: string; // Commercial registration
  logo?: string; // Base64 encoded logo
}

export interface InvoiceGenerationOptions {
  format: 'pdf' | 'html' | 'excel';
  language: 'ar' | 'en' | 'both';
  template?: string;
  includePaymentInstructions: boolean;
  watermark?: string;
  emailRecipients?: string[];
}

class InvoiceGeneratorService {
  private readonly companyInfo: CompanyInfo = {
    name: 'Arkan Growth Center',
    nameAr: 'مركز أركان للنمو',
    address: '123 King Abdulaziz Road, Riyadh, Saudi Arabia',
    addressAr: '123 طريق الملك عبدالعزيز، الرياض، المملكة العربية السعودية',
    phone: '+966 11 234 5678',
    email: 'info@arkangrowth.com',
    website: 'www.arkangrowth.com',
    taxId: '300123456789003', // Saudi VAT number format
    crNumber: '1010123456'
  };

  /**
   * Generate invoice in specified format
   */
  async generateInvoice(
    invoice: Invoice,
    studentInfo: any,
    parentInfo: any,
    options: InvoiceGenerationOptions
  ): Promise<{ success: boolean; fileName?: string; data?: any; error?: string }> {
    try {
      switch (options.format) {
        case 'pdf':
          return await this.generatePDFInvoice(invoice, studentInfo, parentInfo, options);
        case 'html':
          return await this.generateHTMLInvoice(invoice, studentInfo, parentInfo, options);
        case 'excel':
          return await this.generateExcelInvoice(invoice, studentInfo, parentInfo, options);
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invoice generation failed'
      };
    }
  }

  /**
   * Generate PDF invoice
   */
  private async generatePDFInvoice(
    invoice: Invoice,
    studentInfo: any,
    parentInfo: any,
    options: InvoiceGenerationOptions
  ): Promise<{ success: boolean; fileName?: string; data?: any }> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set font for Arabic support (you'd need to add Arabic font)
    // pdf.addFont('NotoSansArabic.ttf', 'NotoSansArabic', 'normal');

    const isArabic = options.language === 'ar';
    const isBilingual = options.language === 'both';

    let yPos = 20;
    const leftMargin = 20;
    const rightMargin = 190;

    // Header - Company Info
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    
    if (isArabic || isBilingual) {
      pdf.text(this.companyInfo.nameAr, rightMargin, yPos, { align: 'right' });
      if (isBilingual) {
        pdf.text(this.companyInfo.name, leftMargin, yPos);
      }
    } else {
      pdf.text(this.companyInfo.name, leftMargin, yPos);
    }

    yPos += 10;

    // Company details
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    const companyDetails = [
      isArabic ? this.companyInfo.addressAr : this.companyInfo.address,
      `${isArabic ? 'هاتف:' : 'Phone:'} ${this.companyInfo.phone}`,
      `${isArabic ? 'البريد الإلكتروني:' : 'Email:'} ${this.companyInfo.email}`,
      `${isArabic ? 'رقم السجل التجاري:' : 'CR Number:'} ${this.companyInfo.crNumber}`,
      `${isArabic ? 'الرقم الضريبي:' : 'VAT Number:'} ${this.companyInfo.taxId}`
    ];

    companyDetails.forEach(detail => {
      pdf.text(detail, isArabic ? rightMargin : leftMargin, yPos, { align: isArabic ? 'right' : 'left' });
      yPos += 5;
    });

    yPos += 10;

    // Invoice title and details
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const invoiceTitle = isArabic ? 'فاتورة' : 'INVOICE';
    pdf.text(invoiceTitle, isArabic ? rightMargin : leftMargin, yPos, { align: isArabic ? 'right' : 'left' });

    yPos += 15;

    // Invoice info table
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    const invoiceInfo = [
      [`${isArabic ? 'رقم الفاتورة:' : 'Invoice Number:'}`, invoice.invoiceNumber],
      [`${isArabic ? 'تاريخ الإصدار:' : 'Issue Date:'}`, new Date(invoice.issueDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')],
      [`${isArabic ? 'تاريخ الاستحقاق:' : 'Due Date:'}`, new Date(invoice.dueDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')],
      [`${isArabic ? 'العملة:' : 'Currency:'}`, invoice.currency]
    ];

    invoiceInfo.forEach(([label, value]) => {
      pdf.text(label, isArabic ? rightMargin - 60 : leftMargin, yPos, { align: isArabic ? 'right' : 'left' });
      pdf.text(value, isArabic ? rightMargin : leftMargin + 60, yPos, { align: isArabic ? 'right' : 'left' });
      yPos += 6;
    });

    yPos += 10;

    // Bill To section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(isArabic ? 'إلى:' : 'Bill To:', isArabic ? rightMargin : leftMargin, yPos, { align: isArabic ? 'right' : 'left' });
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    const billToInfo = [
      isArabic ? (parentInfo.nameAr || parentInfo.name) : parentInfo.name,
      `${isArabic ? 'الطالب:' : 'Student:'} ${isArabic ? (studentInfo.nameAr || studentInfo.name) : studentInfo.name}`,
      `${isArabic ? 'الهاتف:' : 'Phone:'} ${parentInfo.phone || ''}`,
      `${isArabic ? 'البريد الإلكتروني:' : 'Email:'} ${parentInfo.email || ''}`
    ];

    billToInfo.forEach(info => {
      if (info) {
        pdf.text(info, isArabic ? rightMargin : leftMargin, yPos, { align: isArabic ? 'right' : 'left' });
        yPos += 5;
      }
    });

    yPos += 15;

    // Items table header
    const tableHeaders = isArabic 
      ? ['المجموع', 'الضريبة', 'الخصم', 'السعر', 'الكمية', 'الخدمة', 'التاريخ']
      : ['Total', 'Tax', 'Discount', 'Rate', 'Qty', 'Service', 'Date'];

    const colWidths = [25, 20, 20, 20, 15, 50, 25]; // Column widths
    let tableX = isArabic ? rightMargin - colWidths.reduce((sum, w) => sum + w, 0) : leftMargin;

    // Table header
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(tableX, yPos, colWidths.reduce((sum, w) => sum + w, 0), 8, 'F');
    
    let currentX = tableX;
    tableHeaders.forEach((header, index) => {
      const colWidth = colWidths[isArabic ? tableHeaders.length - 1 - index : index];
      pdf.text(header, currentX + colWidth / 2, yPos + 5, { align: 'center' });
      currentX += colWidth;
    });

    yPos += 8;

    // Table rows
    pdf.setFont('helvetica', 'normal');
    invoice.items.forEach(item => {
      if (yPos > 250) { // Page break
        pdf.addPage();
        yPos = 20;
      }

      const serviceDate = new Date(item.date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US');
      const serviceName = this.getServiceName(item.serviceType, isArabic);
      
      const rowData = [
        this.formatCurrency(item.totalAmount, invoice.currency, isArabic),
        this.formatCurrency(item.taxAmount, invoice.currency, isArabic),
        this.formatCurrency(item.discountAmount || 0, invoice.currency, isArabic),
        this.formatCurrency(item.unitPrice, invoice.currency, isArabic),
        item.quantity.toString(),
        serviceName,
        serviceDate
      ];

      currentX = tableX;
      rowData.forEach((data, index) => {
        const colWidth = colWidths[isArabic ? rowData.length - 1 - index : index];
        pdf.text(data, currentX + colWidth / 2, yPos + 5, { align: 'center' });
        currentX += colWidth;
      });

      yPos += 8;
    });

    // Add border to table
    pdf.setDrawColor(0);
    pdf.rect(tableX, yPos - (invoice.items.length * 8) - 8, colWidths.reduce((sum, w) => sum + w, 0), (invoice.items.length + 1) * 8);

    yPos += 15;

    // Totals section
    const totalsX = isArabic ? leftMargin : rightMargin - 80;
    const totalsLabels = isArabic 
      ? ['المجموع الفرعي:', 'الخصم:', 'ضريبة القيمة المضافة (15%):', 'المجموع الإجمالي:', 'المبلغ المدفوع:', 'الرصيد المستحق:']
      : ['Subtotal:', 'Discount:', 'VAT (15%):', 'Total Amount:', 'Amount Paid:', 'Balance Due:'];
    
    const totalsValues = [
      this.formatCurrency(invoice.subtotal, invoice.currency, isArabic),
      this.formatCurrency(invoice.discountAmount, invoice.currency, isArabic),
      this.formatCurrency(invoice.taxAmount, invoice.currency, isArabic),
      this.formatCurrency(invoice.totalAmount, invoice.currency, isArabic),
      this.formatCurrency(invoice.paidAmount, invoice.currency, isArabic),
      this.formatCurrency(invoice.balanceAmount, invoice.currency, isArabic)
    ];

    totalsLabels.forEach((label, index) => {
      const fontStyle = index >= 3 ? 'bold' : 'normal'; // Bold for total, paid, balance
      pdf.setFont('helvetica', fontStyle);
      
      pdf.text(label, totalsX, yPos, { align: isArabic ? 'right' : 'left' });
      pdf.text(totalsValues[index], totalsX + (isArabic ? -60 : 60), yPos, { align: isArabic ? 'left' : 'right' });
      yPos += 6;
    });

    // Insurance information
    if (invoice.insuranceProvider) {
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text(isArabic ? 'معلومات التأمين:' : 'Insurance Information:', isArabic ? rightMargin : leftMargin, yPos, { align: isArabic ? 'right' : 'left' });
      yPos += 8;

      pdf.setFont('helvetica', 'normal');
      const insuranceInfo = [
        [`${isArabic ? 'شركة التأمين:' : 'Insurance Provider:'}`, invoice.insuranceProvider],
        [`${isArabic ? 'نسبة التغطية:' : 'Coverage:'}`, `${invoice.insuranceCoverage}%`],
        [`${isArabic ? 'مبلغ التأمين:' : 'Insurance Amount:'}`, this.formatCurrency(invoice.insuranceAmount, invoice.currency, isArabic)],
        [`${isArabic ? 'مسؤولية المريض:' : 'Patient Responsibility:'}`, this.formatCurrency(invoice.patientResponsibility, invoice.currency, isArabic)]
      ];

      insuranceInfo.forEach(([label, value]) => {
        pdf.text(label, isArabic ? rightMargin - 80 : leftMargin, yPos, { align: isArabic ? 'right' : 'left' });
        pdf.text(value, isArabic ? rightMargin : leftMargin + 80, yPos, { align: isArabic ? 'right' : 'left' });
        yPos += 5;
      });
    }

    // Payment instructions
    if (options.includePaymentInstructions) {
      yPos += 15;
      pdf.setFont('helvetica', 'bold');
      pdf.text(isArabic ? 'تعليمات الدفع:' : 'Payment Instructions:', isArabic ? rightMargin : leftMargin, yPos, { align: isArabic ? 'right' : 'left' });
      yPos += 8;

      pdf.setFont('helvetica', 'normal');
      const paymentInstructions = isArabic 
        ? [
            'يمكنكم الدفع عبر الطرق التالية:',
            '• الدفع نقداً في المركز',
            '• التحويل البنكي',
            '• STC Pay: 966xxxxxxxx',
            '• مدى كارت',
            'يرجى ذكر رقم الفاتورة عند الدفع'
          ]
        : [
            'Payment can be made through the following methods:',
            '• Cash payment at the center',
            '• Bank transfer',
            '• STC Pay: 966xxxxxxxx', 
            '• MADA Card',
            'Please mention invoice number when making payment'
          ];

      paymentInstructions.forEach(instruction => {
        pdf.text(instruction, isArabic ? rightMargin : leftMargin, yPos, { 
          align: isArabic ? 'right' : 'left',
          maxWidth: 150 
        });
        yPos += 5;
      });
    }

    // Footer
    yPos = 280;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    const footerText = isArabic 
      ? 'شكراً لثقتكم في مركز أركان للنمو'
      : 'Thank you for choosing Arkan Growth Center';
    
    pdf.text(footerText, 105, yPos, { align: 'center' });

    // Save PDF
    const fileName = `Invoice_${invoice.invoiceNumber}.pdf`;
    const pdfBlob = pdf.output('blob');
    saveAs(pdfBlob, fileName);

    return {
      success: true,
      fileName,
      data: pdfBlob
    };
  }

  /**
   * Generate HTML invoice
   */
  private async generateHTMLInvoice(
    invoice: Invoice,
    studentInfo: any,
    parentInfo: any,
    options: InvoiceGenerationOptions
  ): Promise<{ success: boolean; fileName?: string; data?: any }> {
    const isArabic = options.language === 'ar';
    const isBilingual = options.language === 'both';

    const htmlContent = `
<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isArabic ? 'فاتورة' : 'Invoice'} ${invoice.invoiceNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: ${isArabic ? 'Arial, "Noto Sans Arabic", sans-serif' : 'Arial, sans-serif'};
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
        }
        
        .header {
            text-align: ${isArabic ? 'right' : 'left'};
            border-bottom: 2px solid #0066cc;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 10px;
        }
        
        .company-details {
            font-size: 12px;
            line-height: 1.4;
        }
        
        .invoice-title {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            color: #0066cc;
        }
        
        .invoice-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .bill-to, .invoice-details {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
        }
        
        .section-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #0066cc;
            font-size: 14px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: ${isArabic ? 'right' : 'left'};
        }
        
        .items-table th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        
        .text-center {
            text-align: center;
        }
        
        .text-right {
            text-align: right;
        }
        
        .totals {
            max-width: 300px;
            margin-left: ${isArabic ? '0' : 'auto'};
            margin-right: ${isArabic ? 'auto' : '0'};
        }
        
        .totals table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .totals td {
            padding: 8px;
            border-bottom: 1px solid #eee;
        }
        
        .total-row {
            font-weight: bold;
            font-size: 16px;
            background: #f8f9fa;
        }
        
        .insurance-section {
            background: #e6f3ff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        
        .payment-instructions {
            background: #f0f8f0;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            font-style: italic;
            color: #666;
        }
        
        @media print {
            body {
                max-width: none;
                margin: 0;
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="company-name">
            ${this.companyInfo.nameAr}
            ${isBilingual ? `<br><small style="font-size: 18px;">${this.companyInfo.name}</small>` : ''}
        </div>
        <div class="company-details">
            ${isArabic ? this.companyInfo.addressAr : this.companyInfo.address}<br>
            ${isArabic ? 'هاتف:' : 'Phone:'} ${this.companyInfo.phone}<br>
            ${isArabic ? 'البريد الإلكتروني:' : 'Email:'} ${this.companyInfo.email}<br>
            ${isArabic ? 'رقم السجل التجاري:' : 'CR Number:'} ${this.companyInfo.crNumber}<br>
            ${isArabic ? 'الرقم الضريبي:' : 'VAT Number:'} ${this.companyInfo.taxId}
        </div>
    </div>
    
    <!-- Invoice Title -->
    <div class="invoice-title">
        ${isArabic ? 'فاتورة' : 'INVOICE'}
    </div>
    
    <!-- Invoice Info -->
    <div class="invoice-info">
        <div class="bill-to">
            <div class="section-title">${isArabic ? 'إلى:' : 'Bill To:'}</div>
            <strong>${isArabic ? (parentInfo.nameAr || parentInfo.name) : parentInfo.name}</strong><br>
            ${isArabic ? 'الطالب:' : 'Student:'} ${isArabic ? (studentInfo.nameAr || studentInfo.name) : studentInfo.name}<br>
            ${parentInfo.phone ? `${isArabic ? 'الهاتف:' : 'Phone:'} ${parentInfo.phone}<br>` : ''}
            ${parentInfo.email ? `${isArabic ? 'البريد الإلكتروني:' : 'Email:'} ${parentInfo.email}` : ''}
        </div>
        
        <div class="invoice-details">
            <div class="section-title">${isArabic ? 'تفاصيل الفاتورة:' : 'Invoice Details:'}</div>
            <strong>${isArabic ? 'رقم الفاتورة:' : 'Invoice Number:'}</strong> ${invoice.invoiceNumber}<br>
            <strong>${isArabic ? 'تاريخ الإصدار:' : 'Issue Date:'}</strong> ${new Date(invoice.issueDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}<br>
            <strong>${isArabic ? 'تاريخ الاستحقاق:' : 'Due Date:'}</strong> ${new Date(invoice.dueDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}<br>
            <strong>${isArabic ? 'العملة:' : 'Currency:'}</strong> ${invoice.currency}
        </div>
    </div>
    
    <!-- Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th>${isArabic ? 'التاريخ' : 'Date'}</th>
                <th>${isArabic ? 'الخدمة' : 'Service'}</th>
                <th>${isArabic ? 'الكمية' : 'Qty'}</th>
                <th>${isArabic ? 'السعر' : 'Rate'}</th>
                <th>${isArabic ? 'الخصم' : 'Discount'}</th>
                <th>${isArabic ? 'الضريبة' : 'Tax'}</th>
                <th>${isArabic ? 'المجموع' : 'Total'}</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.items.map(item => `
                <tr>
                    <td>${new Date(item.date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}</td>
                    <td>${this.getServiceName(item.serviceType, isArabic)}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">${this.formatCurrency(item.unitPrice, invoice.currency, isArabic)}</td>
                    <td class="text-right">${this.formatCurrency(item.discountAmount || 0, invoice.currency, isArabic)}</td>
                    <td class="text-right">${this.formatCurrency(item.taxAmount, invoice.currency, isArabic)}</td>
                    <td class="text-right">${this.formatCurrency(item.totalAmount, invoice.currency, isArabic)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <!-- Totals -->
    <div class="totals">
        <table>
            <tr>
                <td>${isArabic ? 'المجموع الفرعي:' : 'Subtotal:'}</td>
                <td class="text-right">${this.formatCurrency(invoice.subtotal, invoice.currency, isArabic)}</td>
            </tr>
            <tr>
                <td>${isArabic ? 'الخصم:' : 'Discount:'}</td>
                <td class="text-right">${this.formatCurrency(invoice.discountAmount, invoice.currency, isArabic)}</td>
            </tr>
            <tr>
                <td>${isArabic ? 'ضريبة القيمة المضافة (15%):' : 'VAT (15%):'}</td>
                <td class="text-right">${this.formatCurrency(invoice.taxAmount, invoice.currency, isArabic)}</td>
            </tr>
            <tr class="total-row">
                <td>${isArabic ? 'المجموع الإجمالي:' : 'Total Amount:'}</td>
                <td class="text-right">${this.formatCurrency(invoice.totalAmount, invoice.currency, isArabic)}</td>
            </tr>
            <tr>
                <td>${isArabic ? 'المبلغ المدفوع:' : 'Amount Paid:'}</td>
                <td class="text-right">${this.formatCurrency(invoice.paidAmount, invoice.currency, isArabic)}</td>
            </tr>
            <tr class="total-row">
                <td>${isArabic ? 'الرصيد المستحق:' : 'Balance Due:'}</td>
                <td class="text-right">${this.formatCurrency(invoice.balanceAmount, invoice.currency, isArabic)}</td>
            </tr>
        </table>
    </div>
    
    ${invoice.insuranceProvider ? `
    <!-- Insurance Information -->
    <div class="insurance-section">
        <div class="section-title">${isArabic ? 'معلومات التأمين:' : 'Insurance Information:'}</div>
        <strong>${isArabic ? 'شركة التأمين:' : 'Insurance Provider:'}</strong> ${invoice.insuranceProvider}<br>
        <strong>${isArabic ? 'نسبة التغطية:' : 'Coverage:'}</strong> ${invoice.insuranceCoverage}%<br>
        <strong>${isArabic ? 'مبلغ التأمين:' : 'Insurance Amount:'}</strong> ${this.formatCurrency(invoice.insuranceAmount, invoice.currency, isArabic)}<br>
        <strong>${isArabic ? 'مسؤولية المريض:' : 'Patient Responsibility:'}</strong> ${this.formatCurrency(invoice.patientResponsibility, invoice.currency, isArabic)}
    </div>
    ` : ''}
    
    ${options.includePaymentInstructions ? `
    <!-- Payment Instructions -->
    <div class="payment-instructions">
        <div class="section-title">${isArabic ? 'تعليمات الدفع:' : 'Payment Instructions:'}</div>
        ${isArabic ? `
            يمكنكم الدفع عبر الطرق التالية:<br>
            • الدفع نقداً في المركز<br>
            • التحويل البنكي<br>
            • STC Pay: 966xxxxxxxx<br>
            • مدى كارت<br>
            <br>يرجى ذكر رقم الفاتورة عند الدفع
        ` : `
            Payment can be made through the following methods:<br>
            • Cash payment at the center<br>
            • Bank transfer<br>
            • STC Pay: 966xxxxxxxx<br>
            • MADA Card<br>
            <br>Please mention invoice number when making payment
        `}
    </div>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
        ${isArabic ? 'شكراً لثقتكم في مركز أركان للنمو' : 'Thank you for choosing Arkan Growth Center'}
    </div>
</body>
</html>`;

    const fileName = `Invoice_${invoice.invoiceNumber}.html`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    saveAs(blob, fileName);

    return {
      success: true,
      fileName,
      data: htmlContent
    };
  }

  /**
   * Generate Excel invoice
   */
  private async generateExcelInvoice(
    invoice: Invoice,
    studentInfo: any,
    parentInfo: any,
    options: InvoiceGenerationOptions
  ): Promise<{ success: boolean; fileName?: string; data?: any }> {
    const isArabic = options.language === 'ar';
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Invoice data
    const invoiceData = [
      [isArabic ? 'مركز أركان للنمو' : 'Arkan Growth Center'],
      [isArabic ? this.companyInfo.addressAr : this.companyInfo.address],
      [`${isArabic ? 'هاتف:' : 'Phone:'} ${this.companyInfo.phone}`],
      [`${isArabic ? 'البريد الإلكتروني:' : 'Email:'} ${this.companyInfo.email}`],
      [`${isArabic ? 'الرقم الضريبي:' : 'VAT Number:'} ${this.companyInfo.taxId}`],
      [''],
      [isArabic ? 'فاتورة' : 'INVOICE'],
      [''],
      [`${isArabic ? 'رقم الفاتورة:' : 'Invoice Number:'}`, invoice.invoiceNumber],
      [`${isArabic ? 'تاريخ الإصدار:' : 'Issue Date:'}`, new Date(invoice.issueDate).toLocaleDateString()],
      [`${isArabic ? 'تاريخ الاستحقاق:' : 'Due Date:'}`, new Date(invoice.dueDate).toLocaleDateString()],
      [''],
      [`${isArabic ? 'إلى:' : 'Bill To:'}`, isArabic ? (parentInfo.nameAr || parentInfo.name) : parentInfo.name],
      [`${isArabic ? 'الطالب:' : 'Student:'}`, isArabic ? (studentInfo.nameAr || studentInfo.name) : studentInfo.name],
      [`${isArabic ? 'الهاتف:' : 'Phone:'}`, parentInfo.phone || ''],
      [''],
      // Table headers
      [
        isArabic ? 'التاريخ' : 'Date',
        isArabic ? 'الخدمة' : 'Service', 
        isArabic ? 'الكمية' : 'Qty',
        isArabic ? 'السعر' : 'Rate',
        isArabic ? 'الخصم' : 'Discount',
        isArabic ? 'الضريبة' : 'Tax',
        isArabic ? 'المجموع' : 'Total'
      ]
    ];

    // Add invoice items
    invoice.items.forEach(item => {
      invoiceData.push([
        new Date(item.date).toLocaleDateString(),
        this.getServiceName(item.serviceType, isArabic),
        item.quantity,
        item.unitPrice,
        item.discountAmount || 0,
        item.taxAmount,
        item.totalAmount
      ]);
    });

    // Add totals
    invoiceData.push(['']);
    invoiceData.push([isArabic ? 'المجموع الفرعي:' : 'Subtotal:', invoice.subtotal]);
    invoiceData.push([isArabic ? 'الخصم:' : 'Discount:', invoice.discountAmount]);
    invoiceData.push([isArabic ? 'ضريبة القيمة المضافة:' : 'VAT:', invoice.taxAmount]);
    invoiceData.push([isArabic ? 'المجموع الإجمالي:' : 'Total Amount:', invoice.totalAmount]);
    invoiceData.push([isArabic ? 'المبلغ المدفوع:' : 'Amount Paid:', invoice.paidAmount]);
    invoiceData.push([isArabic ? 'الرصيد المستحق:' : 'Balance Due:', invoice.balanceAmount]);

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(invoiceData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, isArabic ? 'فاتورة' : 'Invoice');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const fileName = `Invoice_${invoice.invoiceNumber}.xlsx`;
    saveAs(blob, fileName);

    return {
      success: true,
      fileName,
      data: blob
    };
  }

  /**
   * Get service name in specified language
   */
  private getServiceName(serviceType: string, isArabic: boolean): string {
    const serviceNames: Record<string, { en: string; ar: string }> = {
      aba_session: { en: 'ABA Therapy Session', ar: 'جلسة العلاج السلوكي التطبيقي' },
      speech_therapy: { en: 'Speech Therapy', ar: 'علاج النطق' },
      occupational_therapy: { en: 'Occupational Therapy', ar: 'العلاج الوظيفي' },
      physical_therapy: { en: 'Physical Therapy', ar: 'العلاج الطبيعي' },
      behavioral_therapy: { en: 'Behavioral Therapy', ar: 'العلاج السلوكي' },
      assessment: { en: 'Assessment', ar: 'تقييم' },
      consultation: { en: 'Consultation', ar: 'استشارة' },
      group_session: { en: 'Group Session', ar: 'جلسة جماعية' },
      home_program: { en: 'Home Program', ar: 'برنامج منزلي' },
      parent_training: { en: 'Parent Training', ar: 'تدريب الوالدين' },
      music_therapy: { en: 'Music Therapy', ar: 'العلاج بالموسيقى' },
      art_therapy: { en: 'Art Therapy', ar: 'العلاج بالفن' },
      social_skills: { en: 'Social Skills', ar: 'المهارات الاجتماعية' },
      feeding_therapy: { en: 'Feeding Therapy', ar: 'علاج التغذية' },
      early_intervention: { en: 'Early Intervention', ar: 'التدخل المبكر' }
    };

    const serviceName = serviceNames[serviceType];
    return serviceName ? (isArabic ? serviceName.ar : serviceName.en) : serviceType;
  }

  /**
   * Format currency with proper locale
   */
  private formatCurrency(amount: number, currency: string, isArabic: boolean): string {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Generate invoice templates list
   */
  getInvoiceTemplates(): InvoiceTemplate[] {
    return [
      {
        id: 'default_en',
        name: 'Default English',
        nameAr: 'النموذج الافتراضي الإنجليزي',
        format: 'pdf',
        language: 'en',
        template: 'default',
        isDefault: true
      },
      {
        id: 'default_ar',
        name: 'Default Arabic',
        nameAr: 'النموذج الافتراضي العربي',
        format: 'pdf',
        language: 'ar',
        template: 'default',
        isDefault: false
      },
      {
        id: 'bilingual',
        name: 'Bilingual Template',
        nameAr: 'النموذج ثنائي اللغة',
        format: 'pdf',
        language: 'both',
        template: 'bilingual',
        isDefault: false
      }
    ];
  }
}

export const invoiceGenerator = new InvoiceGeneratorService();