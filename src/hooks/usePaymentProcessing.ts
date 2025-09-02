// Payment Processing Hook for Story 2.3: Financial Management
// React hook for managing payment processing state and operations

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentGatewayService } from '../services/payment-gateway-service'
import type { 
  PaymentRequest,
  PaymentResult,
  PaymentMethod,
  PaymentGatewayConfig,
  PaymentStatus
} from '../types/financial-management'

interface UsePaymentProcessingOptions {
  onSuccess?: (result: PaymentResult) => void
  onError?: (error: string) => void
  onRequiresAction?: (result: PaymentResult) => void
}

interface PaymentProcessingState {
  isProcessing: boolean
  currentPayment: PaymentResult | null
  error: string | null
  requiresAction: boolean
  actionType: '3d_secure' | 'otp' | 'redirect' | null
  actionUrl: string | null
}

export function usePaymentProcessing(options: UsePaymentProcessingOptions = {}) {
  const queryClient = useQueryClient()
  
  // Local state for payment processing
  const [state, setState] = useState<PaymentProcessingState>({
    isProcessing: false,
    currentPayment: null,
    error: null,
    requiresAction: false,
    actionType: null,
    actionUrl: null
  })

  // Get supported payment methods
  const {
    data: supportedMethods = [],
    isLoading: isLoadingMethods
  } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentGatewayService.getSupportedPaymentMethods(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Get gateway configurations
  const {
    data: gatewayConfigs = [],
    isLoading: isLoadingConfigs
  } = useQuery({
    queryKey: ['gateway-configs'],
    queryFn: () => paymentGatewayService.getGatewayConfigurations(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentRequest: PaymentRequest): Promise<PaymentResult> => {
      setState(prev => ({
        ...prev,
        isProcessing: true,
        error: null,
        requiresAction: false,
        actionType: null,
        actionUrl: null
      }))

      try {
        const result = await paymentGatewayService.processPayment(paymentRequest)
        
        setState(prev => ({
          ...prev,
          currentPayment: result,
          isProcessing: false
        }))

        // Handle different payment states
        if (result.success) {
          if (result.status === 'completed') {
            options.onSuccess?.(result)
            
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
            queryClient.invalidateQueries({ queryKey: ['payments'] })
            queryClient.invalidateQueries({ queryKey: ['financial-analytics'] })
            
          } else if (result.status === 'requires_action' && result.actionRequired) {
            setState(prev => ({
              ...prev,
              requiresAction: true,
              actionType: result.actionRequired?.type as any,
              actionUrl: result.actionRequired?.url || null
            }))
            
            options.onRequiresAction?.(result)
          }
        } else {
          setState(prev => ({
            ...prev,
            error: result.error?.message || 'Payment failed'
          }))
          
          options.onError?.(result.error?.message || 'Payment failed')
        }

        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Payment processing failed'
        
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: errorMessage
        }))
        
        options.onError?.(errorMessage)
        throw error
      }
    }
  })

  // Get payment status query function
  const createPaymentStatusQuery = (transactionId: string) => ({
    queryKey: ['payment-status', transactionId],
    queryFn: () => paymentGatewayService.getPaymentStatus(transactionId),
    enabled: !!transactionId,
    refetchInterval: (data: PaymentResult | null) => {
      // Stop polling if payment is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed' || data?.status === 'cancelled') {
        return false
      }
      return 3000 // Poll every 3 seconds for pending/processing payments
    },
    refetchIntervalInBackground: false
  })

  // Refund payment mutation
  const refundPaymentMutation = useMutation({
    mutationFn: async (params: { 
      transactionId: string
      amount?: number
      reason?: string 
    }): Promise<PaymentResult> => {
      const result = await paymentGatewayService.refundPayment(
        params.transactionId,
        params.amount,
        params.reason
      )

      if (result.success) {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['payments'] })
        queryClient.invalidateQueries({ queryKey: ['invoices'] })
        queryClient.invalidateQueries({ queryKey: ['financial-analytics'] })
      }

      return result
    }
  })

  // Utility functions
  const processPayment = useCallback((paymentRequest: PaymentRequest) => {
    return processPaymentMutation.mutate(paymentRequest)
  }, [processPaymentMutation])

  const refundPayment = useCallback((transactionId: string, amount?: number, reason?: string) => {
    return refundPaymentMutation.mutate({ transactionId, amount, reason })
  }, [refundPaymentMutation])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const clearPaymentState = useCallback(() => {
    setState({
      isProcessing: false,
      currentPayment: null,
      error: null,
      requiresAction: false,
      actionType: null,
      actionUrl: null
    })
  }, [])

  const completeAction = useCallback((actionData?: any) => {
    if (state.currentPayment && state.requiresAction) {
      // Handle action completion (e.g., 3D Secure return, OTP verification)
      setState(prev => ({
        ...prev,
        requiresAction: false,
        actionType: null,
        actionUrl: null,
        isProcessing: true
      }))

      // Would typically make another API call to complete the payment
      // This is a simplified version
      if (state.currentPayment.transactionId) {
        queryClient.invalidateQueries({ 
          queryKey: ['payment-status', state.currentPayment.transactionId] 
        })
      }
    }
  }, [state.currentPayment, state.requiresAction, queryClient])

  // Get gateway info for a specific payment method
  const getGatewayInfo = useCallback((paymentMethod: PaymentMethod): PaymentGatewayConfig | null => {
    return gatewayConfigs.find(config => 
      config.supportedPaymentMethods.includes(paymentMethod)
    ) || null
  }, [gatewayConfigs])

  // Calculate processing fee for a payment method
  const calculateProcessingFee = useCallback((
    paymentMethod: PaymentMethod,
    amount: number
  ): number => {
    const gatewayConfig = getGatewayInfo(paymentMethod)
    if (!gatewayConfig || !gatewayConfig.feeStructure.length) return 0

    const fee = gatewayConfig.feeStructure[0]
    
    switch (fee.feeType) {
      case 'fixed':
        return fee.amount
      case 'percentage':
        const calculatedFee = amount * fee.amount
        return Math.max(
          fee.minFee || 0,
          Math.min(calculatedFee, fee.maxFee || calculatedFee)
        )
      case 'tiered':
        if (fee.tiers) {
          const tier = fee.tiers.find(t => 
            amount >= t.minAmount && (!t.maxAmount || amount <= t.maxAmount)
          )
          return tier ? tier.fee : 0
        }
        return 0
      default:
        return 0
    }
  }, [getGatewayInfo])

  // Check if payment method is available for amount
  const isPaymentMethodAvailable = useCallback((
    paymentMethod: PaymentMethod,
    amount: number
  ): boolean => {
    const gatewayConfig = getGatewayInfo(paymentMethod)
    if (!gatewayConfig) return false

    if (gatewayConfig.minAmount && amount < gatewayConfig.minAmount) return false
    if (gatewayConfig.maxAmount && amount > gatewayConfig.maxAmount) return false

    return true
  }, [getGatewayInfo])

  // Get processing time estimate
  const getProcessingTimeEstimate = useCallback((paymentMethod: PaymentMethod): number => {
    const gatewayConfig = getGatewayInfo(paymentMethod)
    return gatewayConfig?.averageProcessingTime || 0
  }, [getGatewayInfo])

  return {
    // State
    ...state,
    isLoading: isLoadingMethods || isLoadingConfigs,
    
    // Data
    supportedMethods,
    gatewayConfigs,
    
    // Actions
    processPayment,
    refundPayment,
    clearError,
    clearPaymentState,
    completeAction,
    
    // Utilities
    getGatewayInfo,
    calculateProcessingFee,
    isPaymentMethodAvailable,
    getProcessingTimeEstimate,
    createPaymentStatusQuery,
    
    // Mutation states
    isProcessingPayment: processPaymentMutation.isPending,
    isRefundingPayment: refundPaymentMutation.isPending,
    
    // Mutation functions for direct access
    processPaymentMutation,
    refundPaymentMutation
  }
}

// Hook for monitoring a specific payment status
export function usePaymentStatus(transactionId: string | null, options: {
  onStatusChange?: (status: PaymentStatus) => void
  onCompleted?: (result: PaymentResult) => void
  onFailed?: (result: PaymentResult) => void
} = {}) {
  const { data: paymentStatus, ...query } = useQuery({
    queryKey: ['payment-status', transactionId],
    queryFn: () => transactionId ? paymentGatewayService.getPaymentStatus(transactionId) : null,
    enabled: !!transactionId,
    refetchInterval: (data) => {
      // Stop polling if payment is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed' || data?.status === 'cancelled') {
        return false
      }
      return 3000 // Poll every 3 seconds
    },
    refetchIntervalInBackground: false
  })

  // Handle status changes
  React.useEffect(() => {
    if (paymentStatus?.status) {
      options.onStatusChange?.(paymentStatus.status)
      
      if (paymentStatus.status === 'completed') {
        options.onCompleted?.(paymentStatus)
      } else if (paymentStatus.status === 'failed') {
        options.onFailed?.(paymentStatus)
      }
    }
  }, [paymentStatus?.status, options])

  return {
    paymentStatus,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  }
}

// Hook for bulk payment operations
export function useBulkPaymentOperations() {
  const queryClient = useQueryClient()

  const bulkRefundMutation = useMutation({
    mutationFn: async (payments: Array<{
      transactionId: string
      amount?: number
      reason?: string
    }>): Promise<Array<{ transactionId: string; result: PaymentResult }>> => {
      const results = await Promise.allSettled(
        payments.map(payment => 
          paymentGatewayService.refundPayment(payment.transactionId, payment.amount, payment.reason)
            .then(result => ({ transactionId: payment.transactionId, result }))
        )
      )

      return results
        .filter((result): result is PromiseFulfilledResult<{ transactionId: string; result: PaymentResult }> => 
          result.status === 'fulfilled')
        .map(result => result.value)
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['financial-analytics'] })
    }
  })

  return {
    bulkRefund: bulkRefundMutation.mutate,
    isBulkRefunding: bulkRefundMutation.isPending,
    bulkRefundError: bulkRefundMutation.error
  }
}