/**
 * useInstallmentPayments Hook
 * React Query hooks for installment payment plan management
 * Part of Story 2.3: Financial Management Module - Task 3
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { installmentPaymentService } from '../services/installment-payment-service'
import type {
  PaymentPlan,
  PaymentInstallment,
  PaymentPlanCreationRequest,
  PaymentPlanAnalytics,
  PaymentMethod
} from '../types/financial-management'

// ==============================================
// QUERY KEYS
// ==============================================

export const installmentPaymentKeys = {
  all: ['installmentPayments'] as const,
  paymentPlans: () => [...installmentPaymentKeys.all, 'paymentPlans'] as const,
  paymentPlan: (id: string) => [...installmentPaymentKeys.paymentPlans(), id] as const,
  installments: (planId: string) => [...installmentPaymentKeys.all, 'installments', planId] as const,
  analytics: () => [...installmentPaymentKeys.all, 'analytics'] as const,
  templates: () => [...installmentPaymentKeys.all, 'templates'] as const,
  studentPlans: (studentId: string) => [...installmentPaymentKeys.paymentPlans(), 'student', studentId] as const,
  overduePlans: () => [...installmentPaymentKeys.paymentPlans(), 'overdue'] as const
} as const

// ==============================================
// PAYMENT PLAN QUERIES
// ==============================================

/**
 * Get payment plans with optional filtering
 */
export function usePaymentPlans(filters?: {
  status?: 'active' | 'completed' | 'cancelled' | 'defaulted'
  studentId?: string
  dateRange?: { start: string; end: string }
}) {
  return useQuery({
    queryKey: [...installmentPaymentKeys.paymentPlans(), filters],
    queryFn: async () => {
      // This would typically call the service method
      // For now, returning mock data structure
      const mockPlans: PaymentPlan[] = []
      return mockPlans
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  })
}

/**
 * Get specific payment plan details
 */
export function usePaymentPlan(paymentPlanId: string) {
  return useQuery({
    queryKey: installmentPaymentKeys.paymentPlan(paymentPlanId),
    queryFn: async () => {
      // Would implement service method to get single payment plan
      const mockPlan: PaymentPlan | null = null
      return mockPlan
    },
    enabled: !!paymentPlanId,
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Get installments for a payment plan
 */
export function usePaymentInstallments(paymentPlanId: string) {
  return useQuery({
    queryKey: installmentPaymentKeys.installments(paymentPlanId),
    queryFn: async () => {
      // Would implement service method to get installments
      const mockInstallments: PaymentInstallment[] = []
      return mockInstallments
    },
    enabled: !!paymentPlanId,
    staleTime: 2 * 60 * 1000 // 2 minutes - installments update more frequently
  })
}

/**
 * Get payment plans for a specific student
 */
export function useStudentPaymentPlans(studentId: string) {
  return useQuery({
    queryKey: installmentPaymentKeys.studentPlans(studentId),
    queryFn: async () => {
      // Would filter payment plans by student
      const mockPlans: PaymentPlan[] = []
      return mockPlans
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Get overdue payment plans
 */
export function useOverduePaymentPlans() {
  return useQuery({
    queryKey: installmentPaymentKeys.overduePlans(),
    queryFn: async () => {
      // Would implement service method to get overdue plans
      const mockOverduePlans: Array<PaymentPlan & { daysOverdue: number }> = []
      return mockOverduePlans
    },
    staleTime: 1 * 60 * 1000, // 1 minute - overdue status changes frequently
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
  })
}

// ==============================================
// ANALYTICS QUERIES
// ==============================================

/**
 * Get payment plan analytics
 */
export function usePaymentPlanAnalytics(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: [...installmentPaymentKeys.analytics(), dateRange],
    queryFn: () => installmentPaymentService.getPaymentPlanAnalytics(dateRange),
    staleTime: 10 * 60 * 1000, // 10 minutes - analytics don't need real-time updates
    gcTime: 30 * 60 * 1000 // 30 minutes
  })
}

// ==============================================
// PAYMENT PLAN MUTATIONS
// ==============================================

/**
 * Create new payment plan
 */
export function useCreatePaymentPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: PaymentPlanCreationRequest) => 
      installmentPaymentService.createPaymentPlan(request),
    onSuccess: (data, variables) => {
      // Invalidate and refetch payment plans
      queryClient.invalidateQueries({ queryKey: installmentPaymentKeys.paymentPlans() })
      
      // Invalidate student-specific plans
      queryClient.invalidateQueries({ 
        queryKey: installmentPaymentKeys.studentPlans(data.paymentPlan?.studentId || '') 
      })
      
      // Invalidate analytics
      queryClient.invalidateQueries({ queryKey: installmentPaymentKeys.analytics() })

      // Optimistically add the new payment plan to cache if successful
      if (data.success && data.paymentPlan) {
        queryClient.setQueryData(
          installmentPaymentKeys.paymentPlan(data.paymentPlan.id),
          data.paymentPlan
        )
      }
    },
    onError: (error) => {
      console.error('Failed to create payment plan:', error)
    }
  })
}

/**
 * Modify existing payment plan
 */
export function useModifyPaymentPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      paymentPlanId, 
      modifications 
    }: { 
      paymentPlanId: string
      modifications: {
        newSchedule?: Array<{ installmentNumber: number; amount: number; dueDate: string }>
        newFrequency?: 'weekly' | 'biweekly' | 'monthly'
        reason: string
        reasonAr: string
      }
    }) => installmentPaymentService.modifyPaymentPlan(paymentPlanId, modifications),
    onSuccess: (data, variables) => {
      // Invalidate affected payment plan
      queryClient.invalidateQueries({ 
        queryKey: installmentPaymentKeys.paymentPlan(variables.paymentPlanId) 
      })
      
      // Invalidate installments for this plan
      queryClient.invalidateQueries({ 
        queryKey: installmentPaymentKeys.installments(variables.paymentPlanId) 
      })
      
      // Invalidate all payment plans list
      queryClient.invalidateQueries({ queryKey: installmentPaymentKeys.paymentPlans() })
    },
    onError: (error) => {
      console.error('Failed to modify payment plan:', error)
    }
  })
}

/**
 * Process installment payment
 */
export function useProcessInstallmentPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      installmentId,
      paymentData
    }: {
      installmentId: string
      paymentData: {
        amount: number
        paymentMethod: PaymentMethod
        transactionId?: string
        receiptNumber: string
        notes?: string
      }
    }) => installmentPaymentService.processInstallmentPayment(installmentId, paymentData),
    onSuccess: (data, variables) => {
      // Invalidate all payment-related queries since payment affects multiple entities
      queryClient.invalidateQueries({ queryKey: installmentPaymentKeys.all })
      
      // Also invalidate payments queries if they exist
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      
      // Invalidate invoices as payment affects invoice balance
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (error) => {
      console.error('Failed to process installment payment:', error)
    }
  })
}

/**
 * Schedule automated payment
 */
export function useScheduleAutomatedPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      installmentId,
      paymentMethod,
      scheduledDate
    }: {
      installmentId: string
      paymentMethod: PaymentMethod
      scheduledDate: string
    }) => installmentPaymentService.scheduleAutomatedPayment(installmentId, paymentMethod, scheduledDate),
    onSuccess: () => {
      // Invalidate automated payment queries
      queryClient.invalidateQueries({ queryKey: ['automatedPayments'] })
    },
    onError: (error) => {
      console.error('Failed to schedule automated payment:', error)
    }
  })
}

// ==============================================
// UTILITY HOOKS
// ==============================================

/**
 * Calculate payment plan preview
 */
export function usePaymentPlanPreview() {
  return useMutation({
    mutationFn: async ({
      totalAmount,
      numberOfInstallments,
      frequency,
      startDate,
      firstPaymentAmount
    }: {
      totalAmount: number
      numberOfInstallments: number
      frequency: 'weekly' | 'biweekly' | 'monthly'
      startDate: string
      firstPaymentAmount?: number
    }) => {
      // Calculate preview without creating actual plan
      const baseAmount = Math.floor(totalAmount / numberOfInstallments * 100) / 100
      const remainder = totalAmount - (baseAmount * numberOfInstallments)
      
      const amounts = Array(numberOfInstallments).fill(baseAmount)
      if (remainder > 0) {
        amounts[amounts.length - 1] += remainder
      }

      if (firstPaymentAmount && firstPaymentAmount !== baseAmount) {
        amounts[0] = firstPaymentAmount
        const remainingAmount = totalAmount - firstPaymentAmount
        const remainingInstallments = numberOfInstallments - 1
        const newBaseAmount = Math.floor(remainingAmount / remainingInstallments * 100) / 100
        
        for (let i = 1; i < amounts.length; i++) {
          amounts[i] = newBaseAmount
        }
        
        const calculatedTotal = amounts.reduce((sum, amount) => sum + amount, 0)
        const difference = totalAmount - calculatedTotal
        if (Math.abs(difference) > 0.01) {
          amounts[amounts.length - 1] += difference
        }
      }

      // Generate schedule
      const schedule = []
      let currentDate = new Date(startDate)
      
      for (let i = 0; i < amounts.length; i++) {
        schedule.push({
          installmentNumber: i + 1,
          amount: amounts[i],
          dueDate: currentDate.toISOString().split('T')[0]
        })

        switch (frequency) {
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7)
            break
          case 'biweekly':
            currentDate.setDate(currentDate.getDate() + 14)
            break
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1)
            break
        }
      }

      return {
        installments: schedule,
        totalAmount,
        averageInstallmentAmount: totalAmount / numberOfInstallments,
        duration: {
          weeks: frequency === 'weekly' ? numberOfInstallments : 
                  frequency === 'biweekly' ? numberOfInstallments * 2 : 
                  numberOfInstallments * 4.33,
          months: frequency === 'monthly' ? numberOfInstallments :
                  frequency === 'biweekly' ? numberOfInstallments * 0.5 :
                  numberOfInstallments * 0.25
        }
      }
    }
  })
}

/**
 * Validate payment plan eligibility
 */
export function useValidatePaymentPlanEligibility() {
  return useMutation({
    mutationFn: async ({
      invoiceId,
      studentId,
      requestedAmount
    }: {
      invoiceId: string
      studentId: string
      requestedAmount: number
    }) => {
      // Implement eligibility validation logic
      const eligibility = {
        eligible: true,
        reasons: [] as string[],
        maxInstallments: 12,
        minInstallmentAmount: 50,
        recommendedFrequency: 'monthly' as const
      }

      // Add validation rules
      if (requestedAmount < 100) {
        eligibility.eligible = false
        eligibility.reasons.push('Minimum payment plan amount is SAR 100')
      }

      // Check for existing overdue plans for this student
      // This would query the database in a real implementation
      
      return eligibility
    }
  })
}