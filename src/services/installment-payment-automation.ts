// Installment Payment Plan Automation Service
// Comprehensive automation for installment payments with WhatsApp integration
// Story 1.5 - Task 5: Installment Payment Plan Automation

import { supabase } from '../lib/supabase';
import { installmentPaymentService } from './installment-payment-service';
import { realTimeFinancialAnalytics } from './real-time-financial-analytics';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface InstallmentPlan {
  id: string;
  student_id: string;
  invoice_id: string;
  total_amount: number;
  installment_amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  number_of_installments: number;
  status: 'active' | 'completed' | 'defaulted' | 'paused';
  start_date: string;
  late_fees_enabled: boolean;
  late_fee_amount: number;
  grace_period_days: number;
  reminder_settings: {
    days_before_due: number[];
    days_after_due: number[];
    methods: string[];
  };
}

interface PaymentInstallment {
  id: string;
  payment_plan_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  paid_date?: string;
  paid_amount?: number;
  late_fee?: number;
}

interface PaymentReminder {
  id: string;
  installment_id: string;
  reminder_type: 'before_due' | 'after_due' | 'final_notice';
  days_offset: number;
  method: 'email' | 'whatsapp' | 'sms';
  status: 'pending' | 'sent' | 'failed';
  scheduled_date: string;
  sent_date?: string;
  message_content: string;
}

interface AutoCollectionResult {
  success: boolean;
  transaction_id?: string;
  amount_collected?: number;
  failure_reason?: string;
  next_retry_date?: string;
}

export class InstallmentPaymentAutomation {
  private static instance: InstallmentPaymentAutomation;
  private realtimeChannel: RealtimeChannel | null = null;
  private automationEnabled: boolean = true;
  private processingQueue: Map<string, any> = new Map();

  public static getInstance(): InstallmentPaymentAutomation {
    if (!InstallmentPaymentAutomation.instance) {
      InstallmentPaymentAutomation.instance = new InstallmentPaymentAutomation();
    }
    return InstallmentPaymentAutomation.instance;
  }

  private constructor() {
    this.initializeRealtimeSubscriptions();
    this.startAutomationScheduler();
  }

  /**
   * Initialize real-time subscriptions for payment plan updates
   */
  private initializeRealtimeSubscriptions() {
    this.realtimeChannel = supabase
      .channel('installment-automation')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_plans' },
        (payload) => this.handlePaymentPlanUpdate(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_installments' },
        (payload) => this.handleInstallmentUpdate(payload)
      )
      .subscribe();
  }

  /**
   * Create automated installment payment plan
   */
  async createAutomatedPaymentPlan(planData: {
    student_id: string;
    invoice_id: string;
    total_amount: number;
    number_of_installments: number;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    first_payment_date: string;
    auto_collect: boolean;
    reminder_preferences: {
      whatsapp_enabled: boolean;
      email_enabled: boolean;
      days_before: number[];
      days_after: number[];
    };
    late_fee_settings: {
      enabled: boolean;
      amount: number;
      grace_period_days: number;
    };
  }): Promise<{
    success: boolean;
    payment_plan_id?: string;
    installments?: PaymentInstallment[];
    error?: string;
  }> {
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Calculate installment amount
      const installmentAmount = Math.round((planData.total_amount / planData.number_of_installments) * 100) / 100;

      // Create payment plan
      const { data: paymentPlan, error: planError } = await supabase
        .from('payment_plans')
        .insert([
          {
            student_id: planData.student_id,
            invoice_id: planData.invoice_id,
            total_amount: planData.total_amount,
            number_of_installments: planData.number_of_installments,
            installment_amount: installmentAmount,
            frequency: planData.frequency,
            start_date: planData.first_payment_date,
            status: 'active',
            auto_collect_enabled: planData.auto_collect,
            late_fees_enabled: planData.late_fee_settings.enabled,
            late_fee_amount: planData.late_fee_settings.amount,
            grace_period_days: planData.late_fee_settings.grace_period_days,
            reminder_settings: {
              days_before_due: planData.reminder_preferences.days_before,
              days_after_due: planData.reminder_preferences.days_after,
              methods: [
                ...(planData.reminder_preferences.email_enabled ? ['email'] : []),
                ...(planData.reminder_preferences.whatsapp_enabled ? ['whatsapp'] : [])
              ]
            },
            created_by: currentUser.data.user.id
          }
        ])
        .select()
        .single();

      if (planError || !paymentPlan) {
        return { success: false, error: `Failed to create payment plan: ${planError?.message}` };
      }

      // Generate installment schedule
      const installments = await this.generateInstallmentSchedule(
        paymentPlan.id,
        planData.first_payment_date,
        planData.number_of_installments,
        installmentAmount,
        planData.frequency
      );

      if (!installments.success) {
        return { success: false, error: installments.error };
      }

      // Setup automated reminders
      await this.setupAutomatedReminders(paymentPlan.id, installments.installments!);

      // Setup auto-collection if enabled
      if (planData.auto_collect) {
        await this.setupAutoCollection(paymentPlan.id);
      }

      return {
        success: true,
        payment_plan_id: paymentPlan.id,
        installments: installments.installments
      };

    } catch (error) {
      console.error('Error creating automated payment plan:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Generate installment schedule
   */
  private async generateInstallmentSchedule(
    paymentPlanId: string,
    startDate: string,
    numberOfInstallments: number,
    installmentAmount: number,
    frequency: 'weekly' | 'biweekly' | 'monthly'
  ): Promise<{
    success: boolean;
    installments?: PaymentInstallment[];
    error?: string;
  }> {
    try {
      const installments: any[] = [];
      const start = new Date(startDate);

      for (let i = 1; i <= numberOfInstallments; i++) {
        const dueDate = new Date(start);
        
        // Calculate due date based on frequency
        switch (frequency) {
          case 'weekly':
            dueDate.setDate(start.getDate() + (i - 1) * 7);
            break;
          case 'biweekly':
            dueDate.setDate(start.getDate() + (i - 1) * 14);
            break;
          case 'monthly':
            dueDate.setMonth(start.getMonth() + (i - 1));
            break;
        }

        installments.push({
          payment_plan_id: paymentPlanId,
          installment_number: i,
          amount: installmentAmount,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending'
        });
      }

      // Insert installments into database
      const { data: createdInstallments, error } = await supabase
        .from('payment_installments')
        .insert(installments)
        .select();

      if (error) {
        return { success: false, error: `Failed to create installments: ${error.message}` };
      }

      return { success: true, installments: createdInstallments };

    } catch (error) {
      console.error('Error generating installment schedule:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Setup automated payment reminders
   */
  private async setupAutomatedReminders(
    paymentPlanId: string,
    installments: PaymentInstallment[]
  ): Promise<void> {
    try {
      // Get payment plan reminder settings
      const { data: paymentPlan } = await supabase
        .from('payment_plans')
        .select('reminder_settings')
        .eq('id', paymentPlanId)
        .single();

      if (!paymentPlan?.reminder_settings) return;

      const reminders: any[] = [];
      const settings = paymentPlan.reminder_settings;

      for (const installment of installments) {
        const dueDate = new Date(installment.due_date);

        // Before due date reminders
        for (const daysBefore of settings.days_before_due) {
          for (const method of settings.methods) {
            const reminderDate = new Date(dueDate);
            reminderDate.setDate(dueDate.getDate() - daysBefore);

            reminders.push({
              installment_id: installment.id,
              reminder_type: 'before_due',
              days_offset: -daysBefore,
              method: method,
              status: 'pending',
              scheduled_date: reminderDate.toISOString(),
              message_content: await this.generateReminderMessage(
                'before_due',
                installment,
                daysBefore,
                method
              )
            });
          }
        }

        // After due date reminders
        for (const daysAfter of settings.days_after_due) {
          for (const method of settings.methods) {
            const reminderDate = new Date(dueDate);
            reminderDate.setDate(dueDate.getDate() + daysAfter);

            reminders.push({
              installment_id: installment.id,
              reminder_type: 'after_due',
              days_offset: daysAfter,
              method: method,
              status: 'pending',
              scheduled_date: reminderDate.toISOString(),
              message_content: await this.generateReminderMessage(
                'after_due',
                installment,
                daysAfter,
                method
              )
            });
          }
        }
      }

      // Save reminders to database
      if (reminders.length > 0) {
        await supabase.from('payment_reminders').insert(reminders);
      }

    } catch (error) {
      console.error('Error setting up automated reminders:', error);
    }
  }

  /**
   * Setup auto-collection for payment plan
   */
  private async setupAutoCollection(paymentPlanId: string): Promise<void> {
    try {
      // Get payment plan details
      const { data: paymentPlan } = await supabase
        .from('payment_plans')
        .select(`
          *,
          students(*)
        `)
        .eq('id', paymentPlanId)
        .single();

      if (!paymentPlan) return;

      // Check if student has stored payment method
      const { data: paymentMethods } = await supabase
        .from('stored_payment_methods')
        .select('*')
        .eq('student_id', paymentPlan.student_id)
        .eq('is_active', true)
        .eq('auto_collect_enabled', true);

      if (!paymentMethods || paymentMethods.length === 0) {
        console.log('No stored payment methods found for auto-collection');
        return;
      }

      // Create auto-collection configuration
      const { error } = await supabase
        .from('auto_collection_configs')
        .insert([
          {
            payment_plan_id: paymentPlanId,
            payment_method_id: paymentMethods[0].id,
            max_retry_attempts: 3,
            retry_interval_days: 2,
            status: 'active'
          }
        ]);

      if (error) {
        console.error('Error setting up auto-collection:', error);
      }

    } catch (error) {
      console.error('Error in setupAutoCollection:', error);
    }
  }

  /**
   * Process automated collections
   */
  async processAutomatedCollections(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: Array<{
      installment_id: string;
      result: AutoCollectionResult;
    }>;
  }> {
    try {
      // Get all pending installments with auto-collection enabled
      const { data: pendingInstallments } = await supabase
        .from('payment_installments')
        .select(`
          *,
          payment_plans!inner(
            id,
            auto_collect_enabled,
            student_id
          ),
          auto_collection_configs(*)
        `)
        .eq('status', 'pending')
        .eq('payment_plans.auto_collect_enabled', true)
        .lte('due_date', new Date().toISOString().split('T')[0]);

      if (!pendingInstallments || pendingInstallments.length === 0) {
        return { processed: 0, successful: 0, failed: 0, results: [] };
      }

      const results = [];
      let successful = 0;
      let failed = 0;

      for (const installment of pendingInstallments) {
        try {
          const collectionResult = await this.processInstallmentCollection(installment);
          results.push({
            installment_id: installment.id,
            result: collectionResult
          });

          if (collectionResult.success) {
            successful++;
          } else {
            failed++;
          }

        } catch (error) {
          console.error(`Error processing collection for installment ${installment.id}:`, error);
          results.push({
            installment_id: installment.id,
            result: {
              success: false,
              failure_reason: error instanceof Error ? error.message : 'Unknown error'
            }
          });
          failed++;
        }
      }

      return {
        processed: results.length,
        successful,
        failed,
        results
      };

    } catch (error) {
      console.error('Error processing automated collections:', error);
      throw error;
    }
  }

  /**
   * Process individual installment collection
   */
  private async processInstallmentCollection(installment: any): Promise<AutoCollectionResult> {
    try {
      // Get stored payment method
      const { data: paymentMethod } = await supabase
        .from('stored_payment_methods')
        .select('*')
        .eq('id', installment.auto_collection_configs[0]?.payment_method_id)
        .single();

      if (!paymentMethod) {
        return {
          success: false,
          failure_reason: 'No payment method found'
        };
      }

      // Process payment through payment gateway
      // This would integrate with the payment gateway service
      const paymentResult = await this.processPayment({
        amount: installment.amount,
        payment_method: paymentMethod,
        installment_id: installment.id,
        description: `Installment payment ${installment.installment_number}`
      });

      if (paymentResult.success) {
        // Update installment status
        await supabase
          .from('payment_installments')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            paid_amount: paymentResult.amount_collected,
            payment_reference: paymentResult.transaction_id
          })
          .eq('id', installment.id);

        // Cancel pending reminders
        await this.cancelPendingReminders(installment.id);

        return paymentResult;
      } else {
        // Handle failed collection
        await this.handleFailedCollection(installment, paymentResult);
        return paymentResult;
      }

    } catch (error) {
      console.error('Error in processInstallmentCollection:', error);
      return {
        success: false,
        failure_reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send payment reminders
   */
  async sendPaymentReminders(): Promise<{
    sent: number;
    failed: number;
    results: Array<{
      reminder_id: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    try {
      // Get pending reminders that are due
      const { data: pendingReminders } = await supabase
        .from('payment_reminders')
        .select(`
          *,
          payment_installments(
            *,
            payment_plans(
              *,
              students(*)
            )
          )
        `)
        .eq('status', 'pending')
        .lte('scheduled_date', new Date().toISOString());

      if (!pendingReminders || pendingReminders.length === 0) {
        return { sent: 0, failed: 0, results: [] };
      }

      const results = [];
      let sent = 0;
      let failed = 0;

      for (const reminder of pendingReminders) {
        try {
          const sendResult = await this.sendReminder(reminder);
          results.push({
            reminder_id: reminder.id,
            success: sendResult.success,
            error: sendResult.error
          });

          // Update reminder status
          await supabase
            .from('payment_reminders')
            .update({
              status: sendResult.success ? 'sent' : 'failed',
              sent_date: sendResult.success ? new Date().toISOString() : null,
              failure_reason: sendResult.error
            })
            .eq('id', reminder.id);

          if (sendResult.success) {
            sent++;
          } else {
            failed++;
          }

        } catch (error) {
          console.error(`Error sending reminder ${reminder.id}:`, error);
          results.push({
            reminder_id: reminder.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failed++;
        }
      }

      return { sent, failed, results };

    } catch (error) {
      console.error('Error sending payment reminders:', error);
      throw error;
    }
  }

  /**
   * Handle overdue installments
   */
  async handleOverdueInstallments(): Promise<{
    processed: number;
    late_fees_applied: number;
    defaults_marked: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get overdue installments
      const { data: overdueInstallments } = await supabase
        .from('payment_installments')
        .select(`
          *,
          payment_plans(*)
        `)
        .eq('status', 'pending')
        .lt('due_date', today);

      if (!overdueInstallments || overdueInstallments.length === 0) {
        return { processed: 0, late_fees_applied: 0, defaults_marked: 0 };
      }

      let processed = 0;
      let lateFees = 0;
      let defaults = 0;

      for (const installment of overdueInstallments) {
        const paymentPlan = installment.payment_plans;
        const dueDate = new Date(installment.due_date);
        const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Check if within grace period
        if (daysPastDue <= paymentPlan.grace_period_days) {
          continue;
        }

        // Update status to overdue
        await supabase
          .from('payment_installments')
          .update({ status: 'overdue' })
          .eq('id', installment.id);

        // Apply late fee if enabled
        if (paymentPlan.late_fees_enabled && !installment.late_fee) {
          await supabase
            .from('payment_installments')
            .update({ late_fee: paymentPlan.late_fee_amount })
            .eq('id', installment.id);
          
          lateFees++;
        }

        // Check for default conditions (e.g., 30 days past due)
        if (daysPastDue > 30) {
          await supabase
            .from('payment_plans')
            .update({ status: 'defaulted' })
            .eq('id', paymentPlan.id);
          
          defaults++;
        }

        processed++;
      }

      return { processed, late_fees_applied: lateFees, defaults_marked: defaults };

    } catch (error) {
      console.error('Error handling overdue installments:', error);
      throw error;
    }
  }

  /**
   * Generate installment analytics
   */
  async getInstallmentAnalytics(dateRange?: { start: string; end: string }): Promise<{
    total_plans: number;
    active_plans: number;
    completed_plans: number;
    defaulted_plans: number;
    total_value: number;
    collected_amount: number;
    outstanding_amount: number;
    collection_rate: number;
    overdue_installments: number;
    late_fees_collected: number;
    average_plan_value: number;
    most_common_frequency: string;
    success_rate: number;
  }> {
    try {
      let query = supabase
        .from('payment_plans')
        .select(`
          *,
          payment_installments(*)
        `);

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const { data: paymentPlans } = await query;

      if (!paymentPlans) {
        return {
          total_plans: 0,
          active_plans: 0,
          completed_plans: 0,
          defaulted_plans: 0,
          total_value: 0,
          collected_amount: 0,
          outstanding_amount: 0,
          collection_rate: 0,
          overdue_installments: 0,
          late_fees_collected: 0,
          average_plan_value: 0,
          most_common_frequency: 'monthly',
          success_rate: 0
        };
      }

      // Calculate metrics
      const totalPlans = paymentPlans.length;
      const activePlans = paymentPlans.filter(p => p.status === 'active').length;
      const completedPlans = paymentPlans.filter(p => p.status === 'completed').length;
      const defaultedPlans = paymentPlans.filter(p => p.status === 'defaulted').length;
      
      const totalValue = paymentPlans.reduce((sum, p) => sum + p.total_amount, 0);
      const averagePlanValue = totalPlans > 0 ? totalValue / totalPlans : 0;

      let collectedAmount = 0;
      let lateFees = 0;
      let overdueCount = 0;

      paymentPlans.forEach(plan => {
        plan.payment_installments.forEach((installment: any) => {
          if (installment.status === 'paid') {
            collectedAmount += installment.paid_amount || installment.amount;
            if (installment.late_fee) {
              lateFees += installment.late_fee;
            }
          } else if (installment.status === 'overdue') {
            overdueCount++;
          }
        });
      });

      const outstandingAmount = totalValue - collectedAmount;
      const collectionRate = totalValue > 0 ? (collectedAmount / totalValue) * 100 : 0;
      const successRate = totalPlans > 0 ? ((completedPlans + activePlans) / totalPlans) * 100 : 0;

      // Find most common frequency
      const frequencyCount = paymentPlans.reduce((acc, plan) => {
        acc[plan.frequency] = (acc[plan.frequency] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostCommonFrequency = Object.entries(frequencyCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'monthly';

      return {
        total_plans: totalPlans,
        active_plans: activePlans,
        completed_plans: completedPlans,
        defaulted_plans: defaultedPlans,
        total_value: totalValue,
        collected_amount: collectedAmount,
        outstanding_amount: outstandingAmount,
        collection_rate: collectionRate,
        overdue_installments: overdueCount,
        late_fees_collected: lateFees,
        average_plan_value: averagePlanValue,
        most_common_frequency: mostCommonFrequency,
        success_rate: successRate
      };

    } catch (error) {
      console.error('Error generating installment analytics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async generateReminderMessage(
    type: 'before_due' | 'after_due',
    installment: PaymentInstallment,
    days: number,
    method: string
  ): Promise<string> {
    const amount = new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(installment.amount);

    const dueDate = new Date(installment.due_date).toLocaleDateString('ar-SA');

    if (type === 'before_due') {
      return method === 'whatsapp' 
        ? `تذكير دفع: قسط بقيمة ${amount} مستحق خلال ${days} أيام (${dueDate}). شكراً - مركز أركان للنمو`
        : `Payment Reminder: Installment of ${amount} due in ${days} days (${dueDate}). Thank you - Arkan Growth Center`;
    } else {
      return method === 'whatsapp'
        ? `تنبيه متأخر: قسط بقيمة ${amount} متأخر ${days} أيام. يرجى السداد فوراً لتجنب الرسوم الإضافية - مركز أركان للنمو`
        : `Overdue Notice: Installment of ${amount} is ${days} days overdue. Please pay immediately to avoid additional fees - Arkan Growth Center`;
    }
  }

  private async sendReminder(reminder: any): Promise<{ success: boolean; error?: string }> {
    try {
      const student = reminder.payment_installments.payment_plans.students;
      
      switch (reminder.method) {
        case 'whatsapp':
          return await this.sendWhatsAppReminder(student.parent_phone, reminder.message_content);
        case 'email':
          return await this.sendEmailReminder(student.parent_email, reminder.message_content);
        default:
          return { success: false, error: 'Unsupported reminder method' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendWhatsAppReminder(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
    // This would integrate with WhatsApp Business API
    // For now, return mock success
    console.log(`WhatsApp reminder sent to ${phoneNumber}: ${message}`);
    return { success: true };
  }

  private async sendEmailReminder(email: string, message: string): Promise<{ success: boolean; error?: string }> {
    // This would integrate with email service
    // For now, return mock success
    console.log(`Email reminder sent to ${email}: ${message}`);
    return { success: true };
  }

  private async processPayment(paymentData: any): Promise<AutoCollectionResult> {
    // This would integrate with the payment gateway service
    // For now, return mock result
    const success = Math.random() > 0.1; // 90% success rate
    
    if (success) {
      return {
        success: true,
        transaction_id: `TXN-${Date.now()}`,
        amount_collected: paymentData.amount
      };
    } else {
      return {
        success: false,
        failure_reason: 'Insufficient funds',
        next_retry_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      };
    }
  }

  private async cancelPendingReminders(installmentId: string): Promise<void> {
    await supabase
      .from('payment_reminders')
      .update({ status: 'cancelled' })
      .eq('installment_id', installmentId)
      .eq('status', 'pending');
  }

  private async handleFailedCollection(installment: any, result: AutoCollectionResult): Promise<void> {
    // Log failed collection attempt
    await supabase.from('collection_attempts').insert([
      {
        installment_id: installment.id,
        attempt_date: new Date().toISOString(),
        failure_reason: result.failure_reason,
        next_retry_date: result.next_retry_date
      }
    ]);

    // Update retry attempts
    const { data: config } = await supabase
      .from('auto_collection_configs')
      .select('retry_attempts, max_retry_attempts')
      .eq('payment_plan_id', installment.payment_plan_id)
      .single();

    if (config && config.retry_attempts < config.max_retry_attempts) {
      await supabase
        .from('auto_collection_configs')
        .update({ 
          retry_attempts: config.retry_attempts + 1,
          next_retry_date: result.next_retry_date
        })
        .eq('payment_plan_id', installment.payment_plan_id);
    } else {
      // Max retries reached, disable auto-collection
      await supabase
        .from('auto_collection_configs')
        .update({ status: 'disabled' })
        .eq('payment_plan_id', installment.payment_plan_id);
    }
  }

  /**
   * Event handlers
   */
  private handlePaymentPlanUpdate(payload: any) {
    // Handle payment plan updates
    console.log('Payment plan updated:', payload);
  }

  private handleInstallmentUpdate(payload: any) {
    // Handle installment updates
    console.log('Installment updated:', payload);
  }

  /**
   * Start automation scheduler
   */
  private startAutomationScheduler() {
    if (this.automationEnabled) {
      // Run automation tasks every 5 minutes
      setInterval(async () => {
        await this.runAutomationTasks();
      }, 5 * 60 * 1000);
    }
  }

  private async runAutomationTasks() {
    try {
      console.log('Running installment automation tasks...');
      
      // Send due reminders
      await this.sendPaymentReminders();
      
      // Process auto-collections
      await this.processAutomatedCollections();
      
      // Handle overdue installments
      await this.handleOverdueInstallments();
      
    } catch (error) {
      console.error('Error in automation tasks:', error);
    }
  }

  /**
   * Public control methods for automation
   */
  pauseAutomation(): void {
    this.automationEnabled = false;
    console.log('Installment payment automation paused');
  }

  resumeAutomation(): void {
    this.automationEnabled = true;
    this.startAutomationScheduler();
    console.log('Installment payment automation resumed');
  }

  isAutomationEnabled(): boolean {
    return this.automationEnabled;
  }

  async processOverduePayments(): Promise<void> {
    try {
      console.log('Processing overdue payments...');
      
      // Send reminders for overdue payments
      const reminderResults = await this.sendPaymentReminders();
      
      // Handle overdue installments (late fees, defaults)
      const overdueResults = await this.handleOverdueInstallments();
      
      console.log('Overdue payment processing completed:', {
        reminders: reminderResults,
        overdue: overdueResults
      });
      
    } catch (error) {
      console.error('Error processing overdue payments:', error);
      throw error;
    }
  }

  async getAutomationStatistics(): Promise<{
    totalAutomatedPlans: number;
    remindersSentToday: number;
    successfulCollections: number;
    failedCollections: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get automated plans count
      const { data: automatedPlans } = await supabase
        .from('payment_plans')
        .select('id')
        .eq('auto_collect_enabled', true)
        .eq('status', 'active');

      // Get reminders sent today
      const { data: todayReminders } = await supabase
        .from('payment_reminders')
        .select('id')
        .eq('status', 'sent')
        .gte('sent_date', today);

      // Get successful collections today
      const { data: successfulCollections } = await supabase
        .from('payment_installments')
        .select('id')
        .eq('status', 'paid')
        .gte('paid_date', today);

      // Get failed collection attempts today
      const { data: failedAttempts } = await supabase
        .from('collection_attempts')
        .select('id')
        .gte('attempt_date', today)
        .not('failure_reason', 'is', null);

      return {
        totalAutomatedPlans: automatedPlans?.length || 0,
        remindersSentToday: todayReminders?.length || 0,
        successfulCollections: successfulCollections?.length || 0,
        failedCollections: failedAttempts?.length || 0
      };

    } catch (error) {
      console.error('Error getting automation statistics:', error);
      return {
        totalAutomatedPlans: 0,
        remindersSentToday: 0,
        successfulCollections: 0,
        failedCollections: 0
      };
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.automationEnabled = false;
    this.processingQueue.clear();
  }
}

// Export singleton instance
export const installmentPaymentAutomation = InstallmentPaymentAutomation.getInstance();