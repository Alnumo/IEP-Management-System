// Real-Time Financial Analytics Service
// Comprehensive financial reporting engine with real-time revenue analytics
// Story 1.5 - Task 4: Financial Reporting Engine

import { supabase } from '../lib/supabase';
import { financialReportingService } from './financial-reporting-service';
import { insuranceClaimProcessor } from './insurance-claim-processor';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RevenueMetric {
  period: string;
  revenue: number;
  growth: number;
  projectedRevenue: number;
  variance: number;
}

interface FinancialSnapshot {
  timestamp: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashFlow: number;
  accountsReceivable: number;
  accountsPayable: number;
}

interface ServiceRevenue {
  serviceType: string;
  revenue: number;
  sessionCount: number;
  averageRate: number;
  utilizationRate: number;
}

interface PaymentAnalytics {
  totalCollected: number;
  pendingPayments: number;
  overduePayments: number;
  averageCollectionTime: number;
  paymentMethodBreakdown: Record<string, number>;
}

interface InsuranceAnalytics {
  totalClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  pendingClaims: number;
  totalClaimValue: number;
  approvalRate: number;
  averageProcessingTime: number;
}

export class RealTimeFinancialAnalytics {
  private static instance: RealTimeFinancialAnalytics;
  private realtimeChannel: RealtimeChannel | null = null;
  private updateCallbacks: Set<(data: any) => void> = new Set();
  private metricsCache: Map<string, any> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  public static getInstance(): RealTimeFinancialAnalytics {
    if (!RealTimeFinancialAnalytics.instance) {
      RealTimeFinancialAnalytics.instance = new RealTimeFinancialAnalytics();
    }
    return RealTimeFinancialAnalytics.instance;
  }

  private constructor() {
    this.initializeRealtimeSubscriptions();
  }

  /**
   * Initialize real-time subscriptions for financial data updates
   */
  private initializeRealtimeSubscriptions() {
    // Subscribe to payment updates
    this.realtimeChannel = supabase
      .channel('financial-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => this.handlePaymentUpdate(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        (payload) => this.handleInvoiceUpdate(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'insurance_claims' },
        (payload) => this.handleInsuranceClaimUpdate(payload)
      )
      .subscribe();
  }

  /**
   * Get real-time financial dashboard data
   */
  async getRealTimeDashboard(): Promise<{
    snapshot: FinancialSnapshot;
    revenueMetrics: RevenueMetric[];
    serviceRevenue: ServiceRevenue[];
    paymentAnalytics: PaymentAnalytics;
    insuranceAnalytics: InsuranceAnalytics;
    trends: {
      dailyRevenue: Array<{ date: string; amount: number }>;
      weeklyGrowth: number;
      monthlyGrowth: number;
      yearlyGrowth: number;
    };
    alerts: Array<{
      type: 'warning' | 'error' | 'info';
      message: string;
      timestamp: string;
    }>;
  }> {
    try {
      // Check cache first
      const cacheKey = 'dashboard-data';
      const cached = this.getCachedMetric(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch comprehensive data
      const [snapshot, revenue, services, payments, insurance, trends] = await Promise.all([
        this.getFinancialSnapshot(),
        this.getRevenueMetrics(),
        this.getServiceRevenue(),
        this.getPaymentAnalytics(),
        this.getInsuranceAnalytics(),
        this.getRevenueTrends()
      ]);

      // Generate alerts based on metrics
      const alerts = this.generateFinancialAlerts({
        snapshot,
        paymentAnalytics: payments,
        insuranceAnalytics: insurance
      });

      const dashboardData = {
        snapshot,
        revenueMetrics: revenue,
        serviceRevenue: services,
        paymentAnalytics: payments,
        insuranceAnalytics: insurance,
        trends,
        alerts
      };

      // Cache the results
      this.setCachedMetric(cacheKey, dashboardData);

      return dashboardData;

    } catch (error) {
      console.error('Error fetching real-time dashboard:', error);
      throw error;
    }
  }

  /**
   * Get financial snapshot
   */
  private async getFinancialSnapshot(): Promise<FinancialSnapshot> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get revenue data
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', startOfMonth.toISOString())
      .eq('status', 'completed');

    const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    // Get outstanding invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, paid_amount')
      .in('status', ['pending', 'partial']);

    const accountsReceivable = invoices?.reduce(
      (sum, inv) => sum + (inv.total_amount - inv.paid_amount),
      0
    ) || 0;

    // Calculate expenses (simplified - would include actual expense tracking)
    const totalExpenses = totalRevenue * 0.65; // Assuming 65% expense ratio
    const netIncome = totalRevenue - totalExpenses;
    const cashFlow = totalRevenue - accountsReceivable;

    return {
      timestamp: new Date().toISOString(),
      totalRevenue,
      totalExpenses,
      netIncome,
      cashFlow,
      accountsReceivable,
      accountsPayable: 0 // Would calculate from expense tracking
    };
  }

  /**
   * Get revenue metrics by period
   */
  private async getRevenueMetrics(): Promise<RevenueMetric[]> {
    const metrics: RevenueMetric[] = [];
    const now = new Date();

    // Calculate for different periods
    const periods = [
      { name: 'Today', days: 1 },
      { name: 'This Week', days: 7 },
      { name: 'This Month', days: 30 },
      { name: 'This Quarter', days: 90 },
      { name: 'This Year', days: 365 }
    ];

    for (const period of periods) {
      const startDate = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
      const previousStartDate = new Date(startDate.getTime() - period.days * 24 * 60 * 60 * 1000);

      // Current period revenue
      const { data: currentData } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', startDate.toISOString())
        .eq('status', 'completed');

      const currentRevenue = currentData?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // Previous period revenue
      const { data: previousData } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', previousStartDate.toISOString())
        .lt('payment_date', startDate.toISOString())
        .eq('status', 'completed');

      const previousRevenue = previousData?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // Calculate growth
      const growth = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      // Project revenue (simplified projection)
      const dailyAverage = currentRevenue / period.days;
      const remainingDays = period.name === 'This Year' ? 365 - now.getDay() : period.days;
      const projectedRevenue = currentRevenue + (dailyAverage * remainingDays * 0.9); // 90% confidence

      metrics.push({
        period: period.name,
        revenue: currentRevenue,
        growth,
        projectedRevenue,
        variance: ((projectedRevenue - currentRevenue) / currentRevenue) * 100
      });
    }

    return metrics;
  }

  /**
   * Get revenue breakdown by service type
   */
  private async getServiceRevenue(): Promise<ServiceRevenue[]> {
    const { data: sessions } = await supabase
      .from('therapy_sessions')
      .select('session_type, cost, duration_minutes')
      .gte('session_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .eq('payment_status', 'completed');

    const serviceMap = new Map<string, {
      revenue: number;
      count: number;
      totalMinutes: number;
    }>();

    sessions?.forEach(session => {
      const type = session.session_type || 'Other';
      const existing = serviceMap.get(type) || { revenue: 0, count: 0, totalMinutes: 0 };
      
      serviceMap.set(type, {
        revenue: existing.revenue + (session.cost || 0),
        count: existing.count + 1,
        totalMinutes: existing.totalMinutes + (session.duration_minutes || 0)
      });
    });

    const serviceRevenue: ServiceRevenue[] = [];
    const totalCapacityHours = 8 * 20 * 30; // 8 hours/day * 20 therapists * 30 days

    serviceMap.forEach((data, serviceType) => {
      serviceRevenue.push({
        serviceType,
        revenue: data.revenue,
        sessionCount: data.count,
        averageRate: data.count > 0 ? data.revenue / data.count : 0,
        utilizationRate: (data.totalMinutes / 60) / totalCapacityHours * 100
      });
    });

    return serviceRevenue.sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Get payment analytics
   */
  private async getPaymentAnalytics(): Promise<PaymentAnalytics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get payment data
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .gte('payment_date', thirtyDaysAgo.toISOString());

    const totalCollected = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    // Get pending invoices
    const { data: pendingInvoices } = await supabase
      .from('invoices')
      .select('total_amount, paid_amount, due_date')
      .in('status', ['pending', 'partial']);

    const pendingPayments = pendingInvoices?.reduce(
      (sum, inv) => sum + (inv.total_amount - inv.paid_amount),
      0
    ) || 0;

    const overduePayments = pendingInvoices?.filter(
      inv => new Date(inv.due_date) < now
    ).reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0) || 0;

    // Payment method breakdown
    const paymentMethodBreakdown: Record<string, number> = {};
    payments?.forEach(payment => {
      const method = payment.payment_method || 'unknown';
      paymentMethodBreakdown[method] = (paymentMethodBreakdown[method] || 0) + payment.amount;
    });

    // Calculate average collection time (simplified)
    const averageCollectionTime = 15; // Days - would calculate from actual data

    return {
      totalCollected,
      pendingPayments,
      overduePayments,
      averageCollectionTime,
      paymentMethodBreakdown
    };
  }

  /**
   * Get insurance analytics
   */
  private async getInsuranceAnalytics(): Promise<InsuranceAnalytics> {
    const { data: claims } = await supabase
      .from('insurance_claims')
      .select('*')
      .gte('submitted_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const totalClaims = claims?.length || 0;
    const approvedClaims = claims?.filter(c => c.status === 'approved').length || 0;
    const rejectedClaims = claims?.filter(c => c.status === 'rejected').length || 0;
    const pendingClaims = claims?.filter(c => c.status === 'submitted').length || 0;
    
    const totalClaimValue = claims?.reduce((sum, c) => sum + (c.claim_amount || 0), 0) || 0;
    const approvalRate = totalClaims > 0 ? (approvedClaims / totalClaims) * 100 : 0;

    // Calculate average processing time (mock for now)
    const averageProcessingTime = 3.5; // Days

    return {
      totalClaims,
      approvedClaims,
      rejectedClaims,
      pendingClaims,
      totalClaimValue,
      approvalRate,
      averageProcessingTime
    };
  }

  /**
   * Get revenue trends
   */
  private async getRevenueTrends(): Promise<{
    dailyRevenue: Array<{ date: string; amount: number }>;
    weeklyGrowth: number;
    monthlyGrowth: number;
    yearlyGrowth: number;
  }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get daily revenue for the last 30 days
    const { data: payments } = await supabase
      .from('payments')
      .select('payment_date, amount')
      .gte('payment_date', thirtyDaysAgo.toISOString())
      .eq('status', 'completed')
      .order('payment_date', { ascending: true });

    // Group by date
    const dailyRevenueMap = new Map<string, number>();
    payments?.forEach(payment => {
      const date = payment.payment_date.split('T')[0];
      dailyRevenueMap.set(date, (dailyRevenueMap.get(date) || 0) + payment.amount);
    });

    const dailyRevenue = Array.from(dailyRevenueMap.entries()).map(([date, amount]) => ({
      date,
      amount
    }));

    // Calculate growth rates
    const weeklyGrowth = await this.calculateGrowthRate(7);
    const monthlyGrowth = await this.calculateGrowthRate(30);
    const yearlyGrowth = await this.calculateGrowthRate(365);

    return {
      dailyRevenue,
      weeklyGrowth,
      monthlyGrowth,
      yearlyGrowth
    };
  }

  /**
   * Calculate growth rate for a period
   */
  private async calculateGrowthRate(days: number): Promise<number> {
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);

    // Current period
    const { data: currentData } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', currentStart.toISOString())
      .eq('status', 'completed');

    const currentRevenue = currentData?.reduce((sum, p) => sum + p.amount, 0) || 0;

    // Previous period
    const { data: previousData } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', previousStart.toISOString())
      .lt('payment_date', currentStart.toISOString())
      .eq('status', 'completed');

    const previousRevenue = previousData?.reduce((sum, p) => sum + p.amount, 0) || 0;

    return previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;
  }

  /**
   * Generate financial alerts based on metrics
   */
  private generateFinancialAlerts(data: {
    snapshot: FinancialSnapshot;
    paymentAnalytics: PaymentAnalytics;
    insuranceAnalytics: InsuranceAnalytics;
  }): Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }> {
    const alerts = [];
    const timestamp = new Date().toISOString();

    // Check for high accounts receivable
    if (data.snapshot.accountsReceivable > data.snapshot.totalRevenue * 0.3) {
      alerts.push({
        type: 'warning' as const,
        message: 'High accounts receivable detected. Consider implementing collection strategies.',
        timestamp
      });
    }

    // Check for overdue payments
    if (data.paymentAnalytics.overduePayments > 10000) {
      alerts.push({
        type: 'error' as const,
        message: `SAR ${data.paymentAnalytics.overduePayments.toFixed(2)} in overdue payments require immediate attention.`,
        timestamp
      });
    }

    // Check insurance claim approval rate
    if (data.insuranceAnalytics.approvalRate < 80) {
      alerts.push({
        type: 'warning' as const,
        message: `Insurance claim approval rate is ${data.insuranceAnalytics.approvalRate.toFixed(1)}%. Review submission process.`,
        timestamp
      });
    }

    // Check cash flow
    if (data.snapshot.cashFlow < data.snapshot.totalRevenue * 0.2) {
      alerts.push({
        type: 'warning' as const,
        message: 'Low cash flow detected. Monitor closely.',
        timestamp
      });
    }

    return alerts;
  }

  /**
   * Generate comparative analysis report
   */
  async generateComparativeAnalysis(
    period1: { start: string; end: string },
    period2: { start: string; end: string }
  ): Promise<{
    period1Metrics: any;
    period2Metrics: any;
    comparison: {
      revenueChange: number;
      volumeChange: number;
      averageValueChange: number;
      collectionRateChange: number;
    };
    insights: string[];
  }> {
    // Get metrics for both periods
    const [metrics1, metrics2] = await Promise.all([
      this.getPeriodMetrics(period1),
      this.getPeriodMetrics(period2)
    ]);

    // Calculate changes
    const comparison = {
      revenueChange: ((metrics2.totalRevenue - metrics1.totalRevenue) / metrics1.totalRevenue) * 100,
      volumeChange: ((metrics2.transactionCount - metrics1.transactionCount) / metrics1.transactionCount) * 100,
      averageValueChange: ((metrics2.averageTransactionValue - metrics1.averageTransactionValue) / metrics1.averageTransactionValue) * 100,
      collectionRateChange: metrics2.collectionRate - metrics1.collectionRate
    };

    // Generate insights
    const insights = this.generateInsights(comparison, metrics1, metrics2);

    return {
      period1Metrics: metrics1,
      period2Metrics: metrics2,
      comparison,
      insights
    };
  }

  /**
   * Get metrics for a specific period
   */
  private async getPeriodMetrics(period: { start: string; end: string }) {
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .gte('payment_date', period.start)
      .lte('payment_date', period.end)
      .eq('status', 'completed');

    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .gte('issue_date', period.start)
      .lte('issue_date', period.end);

    const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const transactionCount = payments?.length || 0;
    const averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
    
    const totalInvoiced = invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
    const totalPaid = invoices?.reduce((sum, inv) => sum + inv.paid_amount, 0) || 0;
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    return {
      totalRevenue,
      transactionCount,
      averageTransactionValue,
      collectionRate,
      totalInvoiced,
      totalPaid,
      period
    };
  }

  /**
   * Generate insights from comparative analysis
   */
  private generateInsights(
    comparison: any,
    metrics1: any,
    metrics2: any
  ): string[] {
    const insights = [];

    if (comparison.revenueChange > 10) {
      insights.push(`Revenue increased by ${comparison.revenueChange.toFixed(1)}% compared to the previous period.`);
    } else if (comparison.revenueChange < -10) {
      insights.push(`Revenue decreased by ${Math.abs(comparison.revenueChange).toFixed(1)}% compared to the previous period.`);
    }

    if (comparison.volumeChange > 15) {
      insights.push(`Transaction volume grew significantly by ${comparison.volumeChange.toFixed(1)}%.`);
    }

    if (comparison.collectionRateChange > 5) {
      insights.push(`Collection rate improved by ${comparison.collectionRateChange.toFixed(1)} percentage points.`);
    } else if (comparison.collectionRateChange < -5) {
      insights.push(`Collection rate declined by ${Math.abs(comparison.collectionRateChange).toFixed(1)} percentage points. Review collection processes.`);
    }

    if (comparison.averageValueChange > 0) {
      insights.push(`Average transaction value increased by ${comparison.averageValueChange.toFixed(1)}%.`);
    }

    return insights;
  }

  /**
   * Handle real-time payment updates
   */
  private handlePaymentUpdate(payload: any) {
    // Clear relevant caches
    this.metricsCache.delete('dashboard-data');
    this.metricsCache.delete('payment-analytics');
    
    // Notify subscribers
    this.notifySubscribers({
      type: 'payment_update',
      data: payload
    });
  }

  /**
   * Handle real-time invoice updates
   */
  private handleInvoiceUpdate(payload: any) {
    // Clear relevant caches
    this.metricsCache.delete('dashboard-data');
    this.metricsCache.delete('revenue-metrics');
    
    // Notify subscribers
    this.notifySubscribers({
      type: 'invoice_update',
      data: payload
    });
  }

  /**
   * Handle real-time insurance claim updates
   */
  private handleInsuranceClaimUpdate(payload: any) {
    // Clear relevant caches
    this.metricsCache.delete('dashboard-data');
    this.metricsCache.delete('insurance-analytics');
    
    // Notify subscribers
    this.notifySubscribers({
      type: 'insurance_update',
      data: payload
    });
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeToUpdates(callback: (data: any) => void) {
    this.updateCallbacks.add(callback);
    
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * Notify all subscribers of updates
   */
  private notifySubscribers(data: any) {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  /**
   * Cache management
   */
  private getCachedMetric(key: string): any {
    const cached = this.metricsCache.get(key);
    if (cached) {
      const { data, timestamp } = cached;
      if (Date.now() - timestamp < this.cacheTimeout) {
        return data;
      }
      this.metricsCache.delete(key);
    }
    return null;
  }

  private setCachedMetric(key: string, data: any) {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Export financial data
   */
  async exportFinancialData(
    format: 'csv' | 'excel' | 'pdf',
    dateRange: { start: string; end: string }
  ): Promise<Blob> {
    const data = await this.getRealTimeDashboard();
    
    // Use the existing financial reporting service for export
    const exportResult = await financialReportingService.generateFinancialExport(
      format as any,
      'comprehensive',
      dateRange,
      true
    );

    if (exportResult.success && exportResult.exportData) {
      return new Blob([exportResult.exportData], { type: exportResult.mimeType });
    }

    throw new Error('Failed to export financial data');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.updateCallbacks.clear();
    this.metricsCache.clear();
  }
}

// Export singleton instance
export const realTimeFinancialAnalytics = RealTimeFinancialAnalytics.getInstance();