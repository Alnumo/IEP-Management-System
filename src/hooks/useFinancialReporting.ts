/**
 * useFinancialReporting Hook
 * React Query hooks for financial reporting and compliance data
 * Part of Story 2.3: Financial Management Module - Task 5
 */

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialReportingService } from '../services/financial-reporting-service'
import type {
  VatCompliance,
  AuditTrailEntry,
  ParentFinancialStatement,
  ExecutiveSummaryReport,
  ReportType,
  ExportFormat
} from '../types/financial-management'

// ==============================================
// QUERY KEYS
// ==============================================

export const financialReportingKeys = {
  all: ['financialReporting'] as const,
  vat: () => [...financialReportingKeys.all, 'vat'] as const,
  audit: () => [...financialReportingKeys.all, 'audit'] as const,
  parentStatements: () => [...financialReportingKeys.all, 'parentStatements'] as const,
  executiveSummary: () => [...financialReportingKeys.all, 'executiveSummary'] as const,
  reportHistory: () => [...financialReportingKeys.all, 'history'] as const,
  vatWithPeriod: (periodStart: string, periodEnd: string) => 
    [...financialReportingKeys.vat(), { periodStart, periodEnd }] as const,
  auditWithParams: (params: {
    entityType?: 'invoice' | 'payment' | 'refund' | 'adjustment'
    entityId?: string
    userId?: string
    startDate?: string
    endDate?: string
  }) => [...financialReportingKeys.audit(), params] as const,
  parentStatementWithId: (parentId: string, periodStart: string, periodEnd: string) =>
    [...financialReportingKeys.parentStatements(), { parentId, periodStart, periodEnd }] as const,
  executiveSummaryWithPeriod: (periodStart: string, periodEnd: string) =>
    [...financialReportingKeys.executiveSummary(), { periodStart, periodEnd }] as const
} as const

// ==============================================
// VAT COMPLIANCE QUERIES
// ==============================================

/**
 * Get VAT compliance report for a specific period
 */
export function useVATReport(periodStart: string, periodEnd: string) {
  return useQuery({
    queryKey: financialReportingKeys.vatWithPeriod(periodStart, periodEnd),
    queryFn: () => financialReportingService.generateVATReport(periodStart, periodEnd),
    staleTime: 30 * 60 * 1000, // 30 minutes - VAT data is stable
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!periodStart && !!periodEnd
  })
}

/**
 * Get current quarter VAT report
 */
export function useCurrentQuarterVAT() {
  const now = new Date()
  const currentQuarter = Math.floor(now.getMonth() / 3)
  const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
  const quarterEnd = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0)
  
  const periodStart = quarterStart.toISOString().split('T')[0]
  const periodEnd = quarterEnd.toISOString().split('T')[0]

  return useVATReport(periodStart, periodEnd)
}

/**
 * Get VAT summary for dashboard
 */
export function useVATSummary() {
  const currentQuarter = useCurrentQuarterVAT()
  
  return useQuery({
    queryKey: [...financialReportingKeys.vat(), 'summary'],
    queryFn: async () => {
      const report = await currentQuarter.refetch()
      if (!report.data?.success || !report.data.report) {
        throw new Error('Failed to generate VAT summary')
      }
      
      const vat = report.data.report
      return {
        totalTaxableAmount: vat.totalTaxableAmount,
        totalVATAmount: vat.totalVATAmount,
        taxRate: vat.taxRate,
        complianceStatus: vat.complianceStatus,
        nextFilingDate: vat.nextFilingDate,
        periodsOverdue: vat.periodsOverdue
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!currentQuarter.data?.success
  })
}

// ==============================================
// AUDIT TRAIL QUERIES
// ==============================================

/**
 * Get comprehensive audit trail
 */
export function useAuditTrail(params?: {
  entityType?: 'invoice' | 'payment' | 'refund' | 'adjustment'
  entityId?: string
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
}) {
  return useQuery({
    queryKey: financialReportingKeys.auditWithParams(params || {}),
    queryFn: () => financialReportingService.generateAuditTrail(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - audit data changes frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2
  })
}

/**
 * Get audit trail for specific entity
 */
export function useEntityAuditTrail(
  entityType: 'invoice' | 'payment' | 'refund' | 'adjustment',
  entityId: string
) {
  return useQuery({
    queryKey: [...financialReportingKeys.audit(), 'entity', entityType, entityId],
    queryFn: () => financialReportingService.generateAuditTrail({
      entityType,
      entityId
    }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!entityType && !!entityId,
    retry: 2
  })
}

/**
 * Get user activity audit trail
 */
export function useUserAuditTrail(userId: string, days: number = 30) {
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return useQuery({
    queryKey: [...financialReportingKeys.audit(), 'user', userId, { startDate, endDate }],
    queryFn: () => financialReportingService.generateAuditTrail({
      userId,
      startDate,
      endDate
    }),
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!userId,
    retry: 2
  })
}

/**
 * Get recent audit activities (for dashboard)
 */
export function useRecentAuditActivities(limit: number = 50) {
  return useQuery({
    queryKey: [...financialReportingKeys.audit(), 'recent', limit],
    queryFn: () => financialReportingService.generateAuditTrail({ limit }),
    staleTime: 2 * 60 * 1000, // 2 minutes for recent activities
    refetchInterval: 5 * 60 * 1000, // Auto refresh every 5 minutes
    retry: 2
  })
}

// ==============================================
// PARENT FINANCIAL STATEMENTS
// ==============================================

/**
 * Get financial statement for a specific parent
 */
export function useParentFinancialStatement(
  parentId: string, 
  periodStart: string, 
  periodEnd: string
) {
  return useQuery({
    queryKey: financialReportingKeys.parentStatementWithId(parentId, periodStart, periodEnd),
    queryFn: () => financialReportingService.generateParentFinancialStatement(
      parentId, 
      periodStart, 
      periodEnd
    ),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 45 * 60 * 1000, // 45 minutes
    enabled: !!parentId && !!periodStart && !!periodEnd,
    retry: 3
  })
}

/**
 * Get financial statements for multiple parents
 */
export function useMultipleParentStatements(
  parentIds: string[],
  periodStart: string,
  periodEnd: string
) {
  return useQuery({
    queryKey: [...financialReportingKeys.parentStatements(), 'multiple', { parentIds, periodStart, periodEnd }],
    queryFn: async () => {
      const statements = await Promise.allSettled(
        parentIds.map(parentId => 
          financialReportingService.generateParentFinancialStatement(
            parentId,
            periodStart,
            periodEnd
          )
        )
      )

      const successful = statements
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value.statement)
        .filter(Boolean)

      const failed = statements
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason)

      return {
        statements: successful,
        failedCount: failed.length,
        errors: failed
      }
    },
    staleTime: 20 * 60 * 1000, // 20 minutes
    enabled: parentIds.length > 0 && !!periodStart && !!periodEnd,
    retry: 2
  })
}

/**
 * Get parent payment summary (lightweight version)
 */
export function useParentPaymentSummary(parentId: string, months: number = 6) {
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return useQuery({
    queryKey: [...financialReportingKeys.parentStatements(), 'summary', parentId, months],
    queryFn: async () => {
      const response = await financialReportingService.generateParentFinancialStatement(
        parentId,
        startDate,
        endDate
      )
      
      if (!response.success || !response.statement) {
        throw new Error('Failed to generate parent payment summary')
      }

      const statement = response.statement
      return {
        totalPaid: statement.totalAmountPaid,
        totalOutstanding: statement.outstandingBalance,
        lastPaymentDate: statement.lastPaymentDate,
        nextDueDate: statement.nextDueDate,
        paymentPlanStatus: statement.activePaymentPlans.length > 0 ? 'active' : 'none',
        overdueAmount: statement.overdueAmount
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!parentId,
    retry: 2
  })
}

// ==============================================
// EXECUTIVE SUMMARY REPORTS
// ==============================================

/**
 * Get executive summary report
 */
export function useExecutiveSummary(periodStart: string, periodEnd: string) {
  return useQuery({
    queryKey: financialReportingKeys.executiveSummaryWithPeriod(periodStart, periodEnd),
    queryFn: () => financialReportingService.generateExecutiveSummary(periodStart, periodEnd),
    staleTime: 30 * 60 * 1000, // 30 minutes - executive reports are stable
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    enabled: !!periodStart && !!periodEnd,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Get monthly executive summary
 */
export function useMonthlyExecutiveSummary(year: number, month: number) {
  const monthStart = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const monthEnd = new Date(year, month, 0).toISOString().split('T')[0]

  return useExecutiveSummary(monthStart, monthEnd)
}

/**
 * Get quarterly executive summary
 */
export function useQuarterlyExecutiveSummary(year: number, quarter: number) {
  const quarterStart = new Date(year, (quarter - 1) * 3, 1).toISOString().split('T')[0]
  const quarterEnd = new Date(year, quarter * 3, 0).toISOString().split('T')[0]

  return useExecutiveSummary(quarterStart, quarterEnd)
}

/**
 * Get yearly executive summary
 */
export function useYearlyExecutiveSummary(year: number) {
  const yearStart = new Date(year, 0, 1).toISOString().split('T')[0]
  const yearEnd = new Date(year, 11, 31).toISOString().split('T')[0]

  return useExecutiveSummary(yearStart, yearEnd)
}

// ==============================================
// REPORT GENERATION & EXPORT
// ==============================================

/**
 * Generate and export reports
 */
export function useExportReport() {
  return useMutation({
    mutationFn: async ({
      reportType,
      format,
      parameters
    }: {
      reportType: ReportType
      format: ExportFormat
      parameters: Record<string, any>
    }) => {
      let reportData
      
      switch (reportType) {
        case 'vat_compliance':
          reportData = await financialReportingService.generateVATReport(
            parameters.periodStart,
            parameters.periodEnd
          )
          break
          
        case 'audit_trail':
          reportData = await financialReportingService.generateAuditTrail(parameters)
          break
          
        case 'parent_statement':
          reportData = await financialReportingService.generateParentFinancialStatement(
            parameters.parentId,
            parameters.periodStart,
            parameters.periodEnd
          )
          break
          
        case 'executive_summary':
          reportData = await financialReportingService.generateExecutiveSummary(
            parameters.periodStart,
            parameters.periodEnd
          )
          break
          
        default:
          throw new Error(`Unsupported report type: ${reportType}`)
      }

      if (!reportData.success) {
        throw new Error(reportData.error || 'Failed to generate report')
      }

      // Convert to requested format
      const exportData = await financialReportingService.exportReport(
        reportData,
        format,
        reportType
      )

      return {
        data: exportData.data,
        filename: exportData.filename,
        mimeType: exportData.mimeType
      }
    },
    retry: 2,
    retryDelay: 1000
  })
}

/**
 * Bulk export multiple reports
 */
export function useBulkExportReports() {
  return useMutation({
    mutationFn: async (reports: Array<{
      reportType: ReportType
      format: ExportFormat
      parameters: Record<string, any>
      filename?: string
    }>) => {
      const results = await Promise.allSettled(
        reports.map(async report => {
          let reportData
          
          switch (report.reportType) {
            case 'vat_compliance':
              reportData = await financialReportingService.generateVATReport(
                report.parameters.periodStart,
                report.parameters.periodEnd
              )
              break
              
            case 'audit_trail':
              reportData = await financialReportingService.generateAuditTrail(report.parameters)
              break
              
            case 'parent_statement':
              reportData = await financialReportingService.generateParentFinancialStatement(
                report.parameters.parentId,
                report.parameters.periodStart,
                report.parameters.periodEnd
              )
              break
              
            case 'executive_summary':
              reportData = await financialReportingService.generateExecutiveSummary(
                report.parameters.periodStart,
                report.parameters.periodEnd
              )
              break
              
            default:
              throw new Error(`Unsupported report type: ${report.reportType}`)
          }

          if (!reportData.success) {
            throw new Error(reportData.error || 'Failed to generate report')
          }

          const exportData = await financialReportingService.exportReport(
            reportData,
            report.format,
            report.reportType
          )

          return {
            reportType: report.reportType,
            format: report.format,
            data: exportData.data,
            filename: report.filename || exportData.filename,
            mimeType: exportData.mimeType
          }
        })
      )

      const successful = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)

      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason)

      return {
        successful,
        failed,
        totalCount: reports.length,
        successCount: successful.length,
        failureCount: failed.length
      }
    },
    retry: 1
  })
}

// ==============================================
// REPORT HISTORY & MANAGEMENT
// ==============================================

/**
 * Get report generation history
 */
export function useReportHistory(limit: number = 100) {
  return useQuery({
    queryKey: [...financialReportingKeys.reportHistory(), limit],
    queryFn: () => financialReportingService.getReportHistory(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  })
}

/**
 * Get scheduled reports
 */
export function useScheduledReports() {
  return useQuery({
    queryKey: [...financialReportingKeys.all, 'scheduled'],
    queryFn: () => financialReportingService.getScheduledReports(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 2
  })
}

/**
 * Schedule recurring report
 */
export function useScheduleReport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (scheduleData: {
      reportType: ReportType
      format: ExportFormat
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
      parameters: Record<string, any>
      emailRecipients?: string[]
      isActive?: boolean
    }) => financialReportingService.scheduleRecurringReport(scheduleData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...financialReportingKeys.all, 'scheduled']
      })
    }
  })
}

// ==============================================
// UTILITY HOOKS
// ==============================================

/**
 * Prefetch financial reporting data
 */
export function usePrefetchReportingData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dateRange?: { start: string; end: string }) => {
      const endDate = dateRange?.end || new Date().toISOString().split('T')[0]
      const startDate = dateRange?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: financialReportingKeys.vatWithPeriod(startDate, endDate),
          queryFn: () => financialReportingService.generateVATReport(startDate, endDate),
          staleTime: 30 * 60 * 1000
        }),
        queryClient.prefetchQuery({
          queryKey: financialReportingKeys.auditWithParams({ startDate, endDate }),
          queryFn: () => financialReportingService.generateAuditTrail({ startDate, endDate }),
          staleTime: 5 * 60 * 1000
        }),
        queryClient.prefetchQuery({
          queryKey: financialReportingKeys.executiveSummaryWithPeriod(startDate, endDate),
          queryFn: () => financialReportingService.generateExecutiveSummary(startDate, endDate),
          staleTime: 30 * 60 * 1000
        })
      ])
    }
  })
}

/**
 * Invalidate all financial reporting cache
 */
export function useInvalidateFinancialReporting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({
        queryKey: financialReportingKeys.all
      })
    }
  })
}

/**
 * Clear and refresh specific report cache
 */
export function useRefreshReports() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (type: 'vat' | 'audit' | 'parent' | 'executive' | 'all' = 'all') => {
      const keyMap = {
        vat: financialReportingKeys.vat(),
        audit: financialReportingKeys.audit(),
        parent: financialReportingKeys.parentStatements(),
        executive: financialReportingKeys.executiveSummary(),
        all: financialReportingKeys.all
      }

      await queryClient.invalidateQueries({
        queryKey: keyMap[type]
      })

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
 * Handle reporting query errors with retry logic
 */
export function useReportingErrorHandler() {
  const queryClient = useQueryClient()

  return {
    onError: (error: any, variables: any, context: any) => {
      console.error('Financial reporting error:', error)
      
      if (error?.message?.includes('network')) {
        console.log('Network error detected, will retry automatically')
      } else if (error?.message?.includes('authorization')) {
        console.log('Authorization error, user may need to re-authenticate')
      } else if (error?.message?.includes('validation')) {
        console.log('Validation error:', error.message)
      } else {
        console.log('Unknown reporting error:', error)
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['reportingError'], null)
    }
  }
}

/**
 * Track reporting query performance
 */
export function useReportingPerformance() {
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

    if (duration > 10000) { // 10 seconds for complex reports
      console.warn(`Slow reporting query detected: ${queryKey} took ${duration}ms`)
    }
  }

  return {
    performanceMetrics,
    trackQuery
  }
}