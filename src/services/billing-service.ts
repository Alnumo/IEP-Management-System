import { supabase } from '../lib/supabase';

// Service rates in Saudi Riyals (SAR)
export const SERVICE_RATES = {
  aba_session: 250,           // ABA session per hour
  speech_therapy: 200,        // Speech therapy session
  occupational_therapy: 180,  // OT session  
  physical_therapy: 180,      // PT session
  behavioral_therapy: 220,    // Behavioral intervention
  assessment: 400,            // Initial assessment
  consultation: 300,          // Consultation meeting
  group_session: 150,         // Group therapy session
  home_program: 100,          // Home program training
  parent_training: 180,       // Parent training session
  music_therapy: 160,         // Music therapy
  art_therapy: 160,           // Art therapy
  social_skills: 140,         // Social skills group
  feeding_therapy: 200,       // Feeding therapy
  early_intervention: 190     // Early intervention
} as const;

export type ServiceType = keyof typeof SERVICE_RATES;

export interface BillingItem {
  id: string;
  sessionId: string;
  studentId: string;
  serviceType: ServiceType;
  quantity: number; // Duration in hours or number of sessions
  unitPrice: number;
  subtotal: number;
  discountAmount?: number;
  taxAmount: number;
  totalAmount: number;
  date: string;
  therapistId: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  parentId: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  currency: 'SAR' | 'USD';
  
  // Invoice totals
  subtotal: number;
  discountAmount: number;
  taxAmount: number; // VAT 15%
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  
  // Payment terms
  paymentTerms: number; // Days
  paymentMethod?: string;
  
  // Insurance
  insuranceProvider?: string;
  insuranceCoverage: number; // Percentage
  insuranceAmount: number;
  patientResponsibility: number;
  
  // Items
  items: BillingItem[];
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Notes
  notes?: string;
  internalNotes?: string;
}

export interface PaymentPlan {
  id: string;
  invoiceId: string;
  studentId: string;
  totalAmount: number;
  numberOfInstallments: number;
  installmentAmount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  status: 'active' | 'completed' | 'cancelled' | 'defaulted';
  
  installments: PaymentInstallment[];
  
  createdAt: string;
  updatedAt: string;
}

export interface PaymentInstallment {
  id: string;
  paymentPlanId: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  
  // Payment details
  paymentMethod?: string;
  transactionId?: string;
  receiptNumber?: string;
  
  notes?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'stc_pay' | 'mada' | 'insurance';
  currency: 'SAR' | 'USD';
  
  // Transaction details
  transactionId?: string;
  receiptNumber: string;
  referenceNumber?: string;
  
  // Payment gateway info
  gatewayProvider?: string;
  gatewayResponse?: any;
  
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  
  // Insurance payment
  isInsurancePayment: boolean;
  insuranceProvider?: string;
  claimNumber?: string;
  
  createdBy: string;
  createdAt: string;
  
  notes?: string;
}

export interface BillingSettings {
  vatRate: number; // 0.15 for Saudi Arabia
  currency: 'SAR' | 'USD';
  invoicePrefix: string;
  paymentTerms: number; // Default days
  
  // Insurance settings
  insuranceProviders: InsuranceProvider[];
  
  // Payment methods
  enabledPaymentMethods: string[];
  
  // Reminders
  reminderSettings: {
    firstReminder: number; // Days before due date
    secondReminder: number; // Days after due date
    finalNotice: number; // Days after due date
  };
  
  // Late fees
  lateFeeSettings: {
    enabled: boolean;
    feeType: 'fixed' | 'percentage';
    feeAmount: number;
    gracePeriod: number; // Days
  };
}

export interface InsuranceProvider {
  id: string;
  name: string;
  nameAr: string;
  apiEndpoint?: string;
  authorizationRequired: boolean;
  coveragePercentage: number;
  maxSessionsPerYear?: number;
  supportedServices: ServiceType[];
  
  // Contact info
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  
  isActive: boolean;
}

class BillingService {
  private readonly VAT_RATE = 0.15; // 15% VAT in Saudi Arabia
  
  /**
   * Calculate billing for therapy sessions
   */
  async calculateSessionBilling(
    sessionId: string,
    serviceType: ServiceType,
    duration: number, // in hours
    studentId: string,
    therapistId: string,
    date: string,
    discountPercentage: number = 0
  ): Promise<BillingItem> {
    const unitPrice = SERVICE_RATES[serviceType];
    const subtotal = unitPrice * duration;
    const discountAmount = subtotal * (discountPercentage / 100);
    const discountedAmount = subtotal - discountAmount;
    const taxAmount = discountedAmount * this.VAT_RATE;
    const totalAmount = discountedAmount + taxAmount;
    
    return {
      id: `bill_${Date.now()}`,
      sessionId,
      studentId,
      serviceType,
      quantity: duration,
      unitPrice,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      date,
      therapistId
    };
  }
  
  /**
   * Create invoice from billing items
   */
  async createInvoice(
    studentId: string,
    parentId: string,
    billingItems: BillingItem[],
    insuranceProvider?: string,
    insuranceCoverage: number = 0,
    paymentTerms: number = 30
  ): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber();
    const issueDate = new Date().toISOString();
    const dueDate = new Date(Date.now() + paymentTerms * 24 * 60 * 60 * 1000).toISOString();
    
    // Calculate totals
    const subtotal = billingItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = billingItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    const taxAmount = billingItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = billingItems.reduce((sum, item) => sum + item.totalAmount, 0);
    
    // Calculate insurance amounts
    const insuranceAmount = totalAmount * (insuranceCoverage / 100);
    const patientResponsibility = totalAmount - insuranceAmount;
    
    const invoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      studentId,
      parentId,
      issueDate,
      dueDate,
      status: 'draft',
      currency: 'SAR',
      
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      
      paymentTerms,
      
      insuranceProvider,
      insuranceCoverage,
      insuranceAmount,
      patientResponsibility,
      
      items: billingItems,
      
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    const { error } = await supabase
      .from('invoices')
      .insert(invoice);
    
    if (error) throw error;
    
    return invoice;
  }
  
  /**
   * Create payment plan for invoice
   */
  async createPaymentPlan(
    invoiceId: string,
    studentId: string,
    totalAmount: number,
    numberOfInstallments: number,
    frequency: 'weekly' | 'biweekly' | 'monthly',
    startDate: string
  ): Promise<PaymentPlan> {
    const installmentAmount = Math.round((totalAmount / numberOfInstallments) * 100) / 100;
    const installments: PaymentInstallment[] = [];
    
    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = this.calculateInstallmentDueDate(startDate, frequency, i - 1);
      
      installments.push({
        id: `inst_${Date.now()}_${i}`,
        paymentPlanId: `plan_${Date.now()}`,
        installmentNumber: i,
        amount: i === numberOfInstallments ? 
          totalAmount - (installmentAmount * (numberOfInstallments - 1)) : // Adjust last installment for rounding
          installmentAmount,
        dueDate,
        status: 'pending'
      });
    }
    
    const paymentPlan: PaymentPlan = {
      id: `plan_${Date.now()}`,
      invoiceId,
      studentId,
      totalAmount,
      numberOfInstallments,
      installmentAmount,
      frequency,
      startDate,
      status: 'active',
      installments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    const { error } = await supabase
      .from('payment_plans')
      .insert(paymentPlan);
    
    if (error) throw error;
    
    return paymentPlan;
  }
  
  /**
   * Process payment for invoice
   */
  async processPayment(
    invoiceId: string,
    amount: number,
    paymentMethod: string,
    paymentDate: string = new Date().toISOString(),
    transactionDetails?: any
  ): Promise<Payment> {
    const receiptNumber = await this.generateReceiptNumber();
    
    const payment: Payment = {
      id: `pay_${Date.now()}`,
      invoiceId,
      studentId: '', // Will be populated from invoice
      amount,
      paymentDate,
      paymentMethod: paymentMethod as any,
      currency: 'SAR',
      
      receiptNumber,
      transactionId: transactionDetails?.transactionId,
      referenceNumber: transactionDetails?.referenceNumber,
      
      gatewayProvider: transactionDetails?.gateway,
      gatewayResponse: transactionDetails?.response,
      
      status: 'completed',
      isInsurancePayment: paymentMethod === 'insurance',
      
      createdBy: 'system',
      createdAt: new Date().toISOString()
    };
    
    // Update invoice paid amount
    await this.updateInvoicePayment(invoiceId, amount);
    
    // Save payment
    const { error } = await supabase
      .from('payments')
      .insert(payment);
    
    if (error) throw error;
    
    return payment;
  }
  
  /**
   * Generate overdue invoices report
   */
  async getOverdueInvoices(): Promise<Invoice[]> {
    const today = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .lt('dueDate', today)
      .gt('balanceAmount', 0)
      .in('status', ['sent', 'overdue']);
    
    if (error) throw error;
    
    return data || [];
  }
  
  /**
   * Calculate financial metrics
   */
  async getFinancialMetrics(startDate: string, endDate: string): Promise<{
    totalRevenue: number;
    totalPayments: number;
    outstandingAmount: number;
    overdueAmount: number;
    averagePaymentTime: number;
    paymentMethodBreakdown: Record<string, number>;
  }> {
    // Get all invoices in date range
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .gte('issueDate', startDate)
      .lte('issueDate', endDate);
    
    if (invoicesError) throw invoicesError;
    
    // Get all payments in date range
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .gte('paymentDate', startDate)
      .lte('paymentDate', endDate);
    
    if (paymentsError) throw paymentsError;
    
    const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.totalAmount, 0) || 0;
    const totalPayments = payments?.reduce((sum, pay) => sum + pay.amount, 0) || 0;
    const outstandingAmount = invoices?.reduce((sum, inv) => sum + inv.balanceAmount, 0) || 0;
    
    // Calculate overdue amount
    const today = new Date().toISOString();
    const overdueAmount = invoices
      ?.filter(inv => inv.dueDate < today && inv.balanceAmount > 0)
      .reduce((sum, inv) => sum + inv.balanceAmount, 0) || 0;
    
    // Payment method breakdown
    const paymentMethodBreakdown = payments?.reduce((acc: Record<string, number>, payment) => {
      acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + payment.amount;
      return acc;
    }, {}) || {};
    
    // Average payment time (simplified calculation)
    const averagePaymentTime = 15; // Days - would need more complex calculation
    
    return {
      totalRevenue,
      totalPayments,
      outstandingAmount,
      overdueAmount,
      averagePaymentTime,
      paymentMethodBreakdown
    };
  }
  
  /**
   * Send payment reminder
   */
  async sendPaymentReminder(invoiceId: string, reminderType: 'first' | 'second' | 'final'): Promise<boolean> {
    try {
      // Get invoice details
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*, students(name, nameAr), parents(email, phone)')
        .eq('id', invoiceId)
        .single();
      
      if (error || !invoice) throw new Error('Invoice not found');
      
      // Generate reminder message
      const reminderMessage = this.generateReminderMessage(invoice, reminderType);
      
      // Send via notification service
      // This would integrate with SMS/Email service
      console.log(`Sending ${reminderType} reminder for invoice ${invoice.invoiceNumber}`);
      
      return true;
    } catch (error) {
      console.error('Failed to send reminder:', error);
      return false;
    }
  }
  
  // Private helper methods
  
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'last_invoice_number')
      .single();
    
    let nextNumber = 1;
    if (data && !error) {
      nextNumber = parseInt(data.value) + 1;
    }
    
    // Update counter
    await supabase
      .from('system_settings')
      .upsert({ 
        key: 'last_invoice_number', 
        value: nextNumber.toString() 
      }, { onConflict: 'key' });
    
    return `INV-${year}-${nextNumber.toString().padStart(5, '0')}`;
  }
  
  private async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'last_receipt_number')
      .single();
    
    let nextNumber = 1;
    if (data && !error) {
      nextNumber = parseInt(data.value) + 1;
    }
    
    // Update counter
    await supabase
      .from('system_settings')
      .upsert({ 
        key: 'last_receipt_number', 
        value: nextNumber.toString() 
      }, { onConflict: 'key' });
    
    return `REC-${year}-${nextNumber.toString().padStart(5, '0')}`;
  }
  
  private calculateInstallmentDueDate(startDate: string, frequency: string, installmentIndex: number): string {
    const start = new Date(startDate);
    let dueDate = new Date(start);
    
    switch (frequency) {
      case 'weekly':
        dueDate.setDate(start.getDate() + (installmentIndex * 7));
        break;
      case 'biweekly':
        dueDate.setDate(start.getDate() + (installmentIndex * 14));
        break;
      case 'monthly':
        dueDate.setMonth(start.getMonth() + installmentIndex);
        break;
    }
    
    return dueDate.toISOString();
  }
  
  private async updateInvoicePayment(invoiceId: string, paymentAmount: number): Promise<void> {
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('paidAmount, totalAmount')
      .eq('id', invoiceId)
      .single();
    
    if (fetchError || !invoice) throw new Error('Invoice not found');
    
    const newPaidAmount = invoice.paidAmount + paymentAmount;
    const newBalanceAmount = invoice.totalAmount - newPaidAmount;
    const newStatus = newBalanceAmount <= 0 ? 'paid' : 'sent';
    
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      .eq('id', invoiceId);
    
    if (updateError) throw updateError;
  }
  
  private generateReminderMessage(invoice: any, reminderType: string): string {
    // Generate bilingual reminder message
    const arabicMessage = `تذكير بالدفع - فاتورة رقم ${invoice.invoiceNumber}`;
    const englishMessage = `Payment Reminder - Invoice ${invoice.invoiceNumber}`;
    
    return `${arabicMessage}\n${englishMessage}`;
  }
}

export const billingService = new BillingService();