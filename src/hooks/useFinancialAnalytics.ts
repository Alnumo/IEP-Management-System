/**
 * useFinancialAnalytics Hook
 * React Query hooks for financial analytics and dashboard data
 * Part of Story 2.3: Financial Management Module - Task 4
 */

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialAnalyticsService } from '../services/financial-analytics-service'
import type {
  RevenueAnalytics,
  PaymentAnalytics,
  FinancialForecasting,
  FinancialKPI
} from '../types/financial-management'

// ==============================================
// QUERY KEYS
// ==============================================

export const financialAnalyticsKeys = {
  all: ['financialAnalytics'] as const,
  revenue: () => [...financialAnalyticsKeys.all, 'revenue'] as const,
  payments: () => [...financialAnalyticsKeys.all, 'payments'] as const,
  forecasting: () => [...financialAnalyticsKeys.all, 'forecasting'] as const,
  kpis: () => [...financialAnalyticsKeys.all, 'kpis'] as const,
  dashboard: () => [...financialAnalyticsKeys.all, 'dashboard'] as const,
  revenueWithRange: (dateRange?: { start: string; end: string }) => 
    [...financialAnalyticsKeys.revenue(), dateRange] as const,
  paymentsWithRange: (dateRange?: { start: string; end: string }) => 
    [...financialAnalyticsKeys.payments(), dateRange] as const,
  kpisWithRange: (dateRange?: { start: string; end: string }) => 
    [...financialAnalyticsKeys.kpis(), dateRange] as const,
  dashboardWithRange: (dateRange?: { start: string; end: string }) => 
    [...financialAnalyticsKeys.dashboard(), dateRange] as const,
  forecastingWithParams: (periods: number, type: 'revenue' | 'cashflow' | 'both') =>
    [...financialAnalyticsKeys.forecasting(), { periods, type }] as const
} as const

// ==============================================
// REVENUE ANALYTICS QUERIES
// ==============================================

/**
 * Get comprehensive revenue analytics
 */
export function useRevenueAnalytics(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: financialAnalyticsKeys.revenueWithRange(dateRange),
    queryFn: () => financialAnalyticsService.getRevenueAnalytics(dateRange),
    staleTime: 10 * 60 * 1000, // 10 minutes - financial data doesn't need real-time updates
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Get revenue analytics with automatic refetch
 */
export function useRevenueAnalyticsLive(
  dateRange?: { start: string; end: string },
  refetchInterval = 5 * 60 * 1000 // 5 minutes
) {
  return useQuery({
    queryKey: financialAnalyticsKeys.revenueWithRange(dateRange),
    queryFn: () => financialAnalyticsService.getRevenueAnalytics(dateRange),
    staleTime: 2 * 60 * 1000, // 2 minutes for live data
    refetchInterval,
    refetchIntervalInBackground: true,
    retry: 2
  })
}

// ==============================================
// PAYMENT ANALYTICS QUERIES
// ==============================================

/**
 * Get comprehensive payment analytics
 */
export function usePaymentAnalytics(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: financialAnalyticsKeys.paymentsWithRange(dateRange),
    queryFn: () => financialAnalyticsService.getPaymentAnalytics(dateRange),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3
  })
}

/**
 * Get payment analytics with real-time updates
 */
export function usePaymentAnalyticsLive(
  dateRange?: { start: string; end: string },
  refetchInterval = 3 * 60 * 1000 // 3 minutes - payment data changes more frequently
) {
  return useQuery({
    queryKey: financialAnalyticsKeys.paymentsWithRange(dateRange),
    queryFn: () => financialAnalyticsService.getPaymentAnalytics(dateRange),
    staleTime: 1 * 60 * 1000, // 1 minute for live payment data
    refetchInterval,
    refetchIntervalInBackground: true,
    retry: 2
  })
}

// ==============================================
// FORECASTING QUERIES
// ==============================================

/**
 * Get financial forecasting data
 */
export function useFinancialForecasting(
  periods: number = 12,
  type: 'revenue' | 'cashflow' | 'both' = 'both'
) {
  return useQuery({
    queryKey: financialAnalyticsKeys.forecastingWithParams(periods, type),
    queryFn: () => financialAnalyticsService.getFinancialForecasting(periods, type),
    staleTime: 60 * 60 * 1000, // 1 hour - forecasting data is stable
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 2
  })
}

/**
 * Get revenue forecasting only
 */
export function useRevenueForecast(periods: number = 6) {
  return useQuery({
    queryKey: financialAnalyticsKeys.forecastingWithParams(periods, 'revenue'),
    queryFn: () => financialAnalyticsService.getFinancialForecasting(periods, 'revenue'),
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    select: (data) => data.revenueProjection // Only return revenue projection
  })
}

/**
 * Get cash flow forecasting only
 */
export function useCashFlowForecast(periods: number = 6) {
  return useQuery({
    queryKey: financialAnalyticsKeys.forecastingWithParams(periods, 'cashflow'),
    queryFn: () => financialAnalyticsService.getFinancialForecasting(periods, 'cashflow'),
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    select: (data) => data.cashFlowProjection // Only return cash flow projection
  })
}

// ==============================================
// KPI QUERIES
// ==============================================

/**
 * Get key financial KPIs
 */
export function useFinancialKPIs(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: financialAnalyticsKeys.kpisWithRange(dateRange),
    queryFn: () => financialAnalyticsService.getFinancialKPIs(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes - KPIs need frequent updates
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 3
  })
}

/**
 * Get specific KPI by metric name
 */
export function useFinancialKPI(
  metricName: string, 
  dateRange?: { start: string; end: string }
) {
  return useQuery({
    queryKey: [...financialAnalyticsKeys.kpisWithRange(dateRange), metricName],
    queryFn: async () => {
      const kpis = await financialAnalyticsService.getFinancialKPIs(dateRange)
      return kpis.find(kpi => kpi.metric === metricName) || null
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!metricName,
    retry: 2
  })
}

// ==============================================
// DASHBOARD QUERIES
// ==============================================

/**
 * Get complete dashboard data in a single query
 */
export function useFinancialDashboard(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: financialAnalyticsKeys.dashboardWithRange(dateRange),
    queryFn: () => financialAnalyticsService.getDashboardData(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches on focus
    refetchOnReconnect: true // But refetch on reconnect
  })
}

/**
 * Get dashboard data with automatic updates
 */
export function useFinancialDashboardLive(
  dateRange?: { start: string; end: string },
  refetchInterval = 2 * 60 * 1000 // 2 minutes
) {
  return useQuery({
    queryKey: financialAnalyticsKeys.dashboardWithRange(dateRange),
    queryFn: () => financialAnalyticsService.getDashboardData(dateRange),
    staleTime: 1 * 60 * 1000, // 1 minute for live dashboard
    refetchInterval,
    refetchIntervalInBackground: true,
    retry: 2,
    refetchOnWindowFocus: false
  })
}

// ==============================================
// UTILITY HOOKS
// ==============================================

/**
 * Prefetch analytics data for better performance
 */
export function usePrefetchFinancialData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dateRange?: { start: string; end: string }) => {
      // Prefetch all major analytics queries
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: financialAnalyticsKeys.revenueWithRange(dateRange),
          queryFn: () => financialAnalyticsService.getRevenueAnalytics(dateRange),
          staleTime: 10 * 60 * 1000
        }),
        queryClient.prefetchQuery({
          queryKey: financialAnalyticsKeys.paymentsWithRange(dateRange),
          queryFn: () => financialAnalyticsService.getPaymentAnalytics(dateRange),
          staleTime: 10 * 60 * 1000
        }),
        queryClient.prefetchQuery({
          queryKey: financialAnalyticsKeys.kpisWithRange(dateRange),
          queryFn: () => financialAnalyticsService.getFinancialKPIs(dateRange),
          staleTime: 5 * 60 * 1000
        })
      ])
    }
  })
}

/**
 * Calculate period comparison (current vs previous)
 */
export function usePeriodComparison(
  currentRange: { start: string; end: string },
  comparisonType: 'previous_period' | 'previous_year' = 'previous_period'
) {
  // Calculate previous period based on current range
  const getPreviousRange = () => {
    const current = {
      start: new Date(currentRange.start),
      end: new Date(currentRange.end)
    }
    
    const diffMs = current.end.getTime() - current.start.getTime()
    
    if (comparisonType === 'previous_year') {
      return {
        start: new Date(current.start.getFullYear() - 1, current.start.getMonth(), current.start.getDate()).toISOString().split('T')[0],
        end: new Date(current.end.getFullYear() - 1, current.end.getMonth(), current.end.getDate()).toISOString().split('T')[0]
      }
    }
    
    // Previous period
    return {
      start: new Date(current.start.getTime() - diffMs).toISOString().split('T')[0],
      end: new Date(current.start.getTime() - 1).toISOString().split('T')[0]
    }
  }

  const previousRange = getPreviousRange()
  
  const currentData = useRevenueAnalytics(currentRange)
  const previousData = useRevenueAnalytics(previousRange)
  
  const comparison = {
    current: currentData.data,
    previous: previousData.data,
    isLoading: currentData.isLoading || previousData.isLoading,
    error: currentData.error || previousData.error,
    percentChange: (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Number(((current - previous) / previous * 100).toFixed(2))
    }
  }
  
  return comparison
}

/**
 * Get analytics data for specific date ranges (today, this week, this month, etc.)
 */
export function useQuickRangeAnalytics() {
  const today = new Date().toISOString().split('T')[0]
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]

  const todayData = useRevenueAnalytics({ start: today, end: today })
  const weekData = useRevenueAnalytics({ start: weekStart, end: today })
  const monthData = useRevenueAnalytics({ start: monthStart, end: today })
  const yearData = useRevenueAnalytics({ start: yearStart, end: today })

  return {
    today: todayData,
    thisWeek: weekData,
    thisMonth: monthData,
    thisYear: yearData,
    isLoading: todayData.isLoading || weekData.isLoading || monthData.isLoading || yearData.isLoading
  }
}

/**
 * Export analytics data for external use
 */
export function useExportAnalytics() {
  return useMutation({
    mutationFn: async ({
      dateRange,
      format,
      includeForecasting = false
    }: {
      dateRange?: { start: string; end: string }
      format: 'json' | 'csv' | 'xlsx'
      includeForecasting?: boolean
    }) => {
      const [revenue, payments, kpis, forecasting] = await Promise.all([
        financialAnalyticsService.getRevenueAnalytics(dateRange),
        financialAnalyticsService.getPaymentAnalytics(dateRange),
        financialAnalyticsService.getFinancialKPIs(dateRange),
        includeForecasting ? financialAnalyticsService.getFinancialForecasting() : null
      ])

      const exportData = {
        revenue,
        payments,
        kpis,
        ...(forecasting && { forecasting }),
        exportedAt: new Date().toISOString(),
        dateRange: dateRange || { start: 'all-time', end: 'all-time' }
      }

      if (format === 'json') {
        return {
          data: JSON.stringify(exportData, null, 2),
          filename: `financial-analytics-${Date.now()}.json`,
          mimeType: 'application/json'
        }
      }

      // For CSV/XLSX formats, would implement conversion logic
      return {
        data: JSON.stringify(exportData, null, 2), // Placeholder
        filename: `financial-analytics-${Date.now()}.${format}`,
        mimeType: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    }
  })
}

// ==============================================
// CACHE MANAGEMENT
// ==============================================

/**
 * Invalidate all financial analytics cache
 */
export function useInvalidateFinancialAnalytics() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({
        queryKey: financialAnalyticsKeys.all
      })
    }
  })
}

/**
 * Clear and refresh specific analytics cache
 */
export function useRefreshAnalytics() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (type: 'revenue' | 'payments' | 'kpis' | 'dashboard' | 'all' = 'all') => {
      const keyMap = {
        revenue: financialAnalyticsKeys.revenue(),
        payments: financialAnalyticsKeys.payments(),
        kpis: financialAnalyticsKeys.kpis(),
        dashboard: financialAnalyticsKeys.dashboard(),
        all: financialAnalyticsKeys.all
      }

      await queryClient.invalidateQueries({
        queryKey: keyMap[type]
      })

      // Optionally refetch immediately
      if (type !== 'all') {
        await queryClient.refetchQueries({
          queryKey: keyMap[type]
        })
      }
    }
  })
}

// ==============================================
// ERROR HANDLING HOOKS
// ==============================================

/**
 * Handle analytics query errors with retry logic
 */
export function useAnalyticsErrorHandler() {
  const queryClient = useQueryClient()

  return {
    onError: (error: any, variables: any, context: any) => {
      console.error('Analytics query error:', error)
      
      // Log error details for monitoring
      if (error?.message?.includes('network')) {
        // Network error - could retry
        console.log('Network error detected, will retry automatically')
      } else if (error?.message?.includes('authorization')) {
        // Auth error - redirect to login
        console.log('Authorization error, user may need to re-authenticate')
      } else {
        // Other error - log for debugging
        console.log('Unknown analytics error:', error)
      }
    },
    onSuccess: () => {
      // Clear any previous error states
      queryClient.setQueryData(['analyticsError'], null)
    }
  }
}

/**
 * Track analytics query performance
 */
export function useAnalyticsPerformance() {
  const [performanceMetrics, setPerformanceMetrics] = React.useState<{
    [key: string]: { duration: number; timestamp: string }
  }>({})

  const trackQuery = (queryKey: string, startTime: number) => {
    const duration = Date.now() - startTime
    setPerformanceMetrics(prev => ({
      ...prev,
      [queryKey]: {
        duration,
        timestamp: new Date().toISOString()
      }
    }))

    // Log slow queries
    if (duration > 5000) { // 5 seconds
      console.warn(`Slow analytics query detected: ${queryKey} took ${duration}ms`)
    }
  }

  return {
    performanceMetrics,
    trackQuery
  }
}