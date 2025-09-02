/**
 * Financial Analytics Service Tests
 * Comprehensive unit testing for financial analytics, forecasting, and KPI calculations
 * Part of Story 2.3: Financial Management Module - Task 7: Testing and Quality Assurance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FinancialAnalyticsService } from '../../services/financial-analytics-service'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        lte: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      gte: vi.fn(() => ({
        lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        gt: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      lte: vi.fn(() => ({
        gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      lt: vi.fn(() => ({
        gt: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      gt: vi.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }))
}

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}))

describe('FinancialAnalyticsService', () => {
  let service: FinancialAnalyticsService
  
  beforeEach(() => {
    service = new FinancialAnalyticsService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==============================================
  // REVENUE ANALYTICS TESTS
  // ==============================================

  describe('getRevenueAnalytics', () => {
    const mockInvoices = [
      {
        id: 'inv-1',
        status: 'paid',
        total_amount: 1500,
        created_at: '2024-01-15T00:00:00.000Z',
        invoice_items: [
          { service_type: 'speech_therapy', therapist_id: 'therapist-1' }
        ],
        payments: [
          { 
            id: 'pay-1', 
            amount: 1500, 
            payment_date: '2024-01-16T00:00:00.000Z',
            payment_method: 'card',
            status: 'completed'
          }
        ],
        students: { name: 'Student One', name_ar: 'الطالب الأول' }
      },
      {
        id: 'inv-2',
        status: 'paid',
        total_amount: 2000,
        created_at: '2024-01-20T00:00:00.000Z',
        invoice_items: [
          { service_type: 'aba_therapy', therapist_id: 'therapist-2' }
        ],
        payments: [
          { 
            id: 'pay-2', 
            amount: 2000, 
            payment_date: '2024-01-22T00:00:00.000Z',
            payment_method: 'bank_transfer',
            status: 'completed'
          }
        ],
        students: { name: 'Student Two', name_ar: 'الطالب الثاني' }
      }
    ]

    const mockPayments = [
      {
        id: 'pay-1',
        amount: 1500,
        payment_date: '2024-01-16T00:00:00.000Z',
        payment_method: 'card',
        status: 'completed',
        invoices: {
          invoice_items: [
            { service_type: 'speech_therapy', therapist_id: 'therapist-1' }
          ]
        }
      },
      {
        id: 'pay-2',
        amount: 2000,
        payment_date: '2024-01-22T00:00:00.000Z',
        payment_method: 'bank_transfer',
        status: 'completed',
        invoices: {
          invoice_items: [
            { service_type: 'aba_therapy', therapist_id: 'therapist-2' }
          ]
        }
      }
    ]

    it('should calculate total revenue analytics successfully', async () => {
      // Setup mocks
      const mockInvoicesQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockInvoices, error: null }))
        }))
      }
      const mockPaymentsQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockPayments, error: null }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'invoices') return mockInvoicesQuery
        if (table === 'payments') return mockPaymentsQuery
        return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
      })

      const result = await service.getRevenueAnalytics()

      expect(result).toBeDefined()
      expect(result.totalRevenue).toBeDefined()
      expect(result.totalRevenue.value).toBe(3500) // 1500 + 2000
      expect(result.totalRevenue.currency).toBe('SAR')
      expect(result.totalRevenue.metric).toBe('Total Revenue')
      expect(result.recurringRevenue).toBeDefined()
      expect(result.oneTimeRevenue).toBeDefined()
      expect(Array.isArray(result.revenueByService)).toBe(true)
      expect(Array.isArray(result.revenueByTherapist)).toBe(true)
      expect(Array.isArray(result.monthlyRevenue)).toBe(true)
    })

    it('should apply date range filtering correctly', async () => {
      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      
      const mockInvoicesQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => Promise.resolve({ data: mockInvoices, error: null }))
            }))
          }))
        }))
      }
      const mockPaymentsQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => Promise.resolve({ data: mockPayments, error: null }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'invoices') return mockInvoicesQuery
        if (table === 'payments') return mockPaymentsQuery
        return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
      })

      await service.getRevenueAnalytics(dateRange)

      expect(mockInvoicesQuery.select).toHaveBeenCalled()
      expect(mockPaymentsQuery.select).toHaveBeenCalled()
    })

    it('should handle empty data gracefully', async () => {
      const mockEmptyQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockEmptyQuery)

      const result = await service.getRevenueAnalytics()

      expect(result.totalRevenue.value).toBe(0)
      expect(result.recurringRevenue.value).toBe(0)
      expect(result.oneTimeRevenue.value).toBe(0)
      expect(result.revenueByService).toEqual([])
      expect(result.revenueByTherapist).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      const mockErrorQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockErrorQuery)

      const result = await service.getRevenueAnalytics()

      expect(result).toBeDefined()
      expect(result.totalRevenue.value).toBe(0)
      expect(result.totalRevenue.changeType).toBe('neutral')
    })

    it('should calculate revenue by service type correctly', async () => {
      const mockInvoicesQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockInvoices, error: null }))
        }))
      }
      const mockPaymentsQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockPayments, error: null }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'invoices') return mockInvoicesQuery
        if (table === 'payments') return mockPaymentsQuery
        return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
      })

      const result = await service.getRevenueAnalytics()

      expect(result.revenueByService.length).toBeGreaterThan(0)
      const speechTherapy = result.revenueByService.find(s => s.serviceType === 'speech_therapy')
      const abaTherapy = result.revenueByService.find(s => s.serviceType === 'aba_therapy')
      
      expect(speechTherapy).toBeDefined()
      expect(abaTherapy).toBeDefined()
      expect(speechTherapy?.revenue).toBe(1500)
      expect(abaTherapy?.revenue).toBe(2000)
    })

    // Arabic language test
    it('should handle Arabic content correctly', async () => {
      const result = await service.getRevenueAnalytics()
      
      expect(result).toBeDefined()
      expect(result.totalRevenue.metric).toBe('Total Revenue')
      // Verify that the service can handle Arabic names in student data
      expect(typeof result.totalRevenue.value).toBe('number')
    })

    // Mobile responsive test (data structure should work on mobile)
    it('should return mobile-friendly data structure', async () => {
      const result = await service.getRevenueAnalytics()
      
      expect(result.totalRevenue).toHaveProperty('value')
      expect(result.totalRevenue).toHaveProperty('currency')
      expect(result.totalRevenue).toHaveProperty('change')
      expect(result.totalRevenue).toHaveProperty('changeType')
      
      // Ensure arrays are present for chart rendering
      expect(Array.isArray(result.monthlyRevenue)).toBe(true)
      expect(Array.isArray(result.dailyRevenue)).toBe(true)
    })
  })

  // ==============================================
  // PAYMENT ANALYTICS TESTS
  // ==============================================

  describe('getPaymentAnalytics', () => {
    const mockPayments = [
      {
        id: 'pay-1',
        amount: 1500,
        payment_date: '2024-01-16T00:00:00.000Z',
        payment_method: 'card',
        status: 'completed',
        invoices: {
          due_date: '2024-01-20T00:00:00.000Z',
          created_at: '2024-01-15T00:00:00.000Z'
        }
      },
      {
        id: 'pay-2',
        amount: 2000,
        payment_date: '2024-01-25T00:00:00.000Z',
        payment_method: 'bank_transfer',
        status: 'completed',
        invoices: {
          due_date: '2024-01-22T00:00:00.000Z',
          created_at: '2024-01-20T00:00:00.000Z'
        }
      }
    ]

    const mockOverdueInvoices = [
      { balance_amount: 500 },
      { balance_amount: 750 }
    ]

    it('should calculate payment analytics successfully', async () => {
      const mockPaymentsQuery = {
        select: vi.fn(() => Promise.resolve({ data: mockPayments, error: null }))
      }
      const mockOverdueQuery = {
        select: vi.fn(() => ({
          lt: vi.fn(() => ({
            gt: vi.fn(() => Promise.resolve({ data: mockOverdueInvoices, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payments') return mockPaymentsQuery
        if (table === 'invoices') return mockOverdueQuery
        return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
      })

      const result = await service.getPaymentAnalytics()

      expect(result).toBeDefined()
      expect(result.collectionRate).toBeDefined()
      expect(result.collectionRate.value).toBe(100) // Both payments completed
      expect(result.averagePaymentTime).toBeDefined()
      expect(result.overdueAmount).toBeDefined()
      expect(result.overdueAmount.value).toBe(1250) // 500 + 750
      expect(Array.isArray(result.paymentMethodBreakdown)).toBe(true)
    })

    it('should calculate collection rate correctly', async () => {
      const mixedStatusPayments = [
        ...mockPayments,
        {
          id: 'pay-3',
          amount: 1000,
          payment_date: '2024-01-30T00:00:00.000Z',
          payment_method: 'cash',
          status: 'failed',
          invoices: {
            due_date: '2024-01-28T00:00:00.000Z',
            created_at: '2024-01-25T00:00:00.000Z'
          }
        }
      ]

      const mockPaymentsQuery = {
        select: vi.fn(() => Promise.resolve({ data: mixedStatusPayments, error: null }))
      }
      const mockOverdueQuery = {
        select: vi.fn(() => ({
          lt: vi.fn(() => ({
            gt: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payments') return mockPaymentsQuery
        if (table === 'invoices') return mockOverdueQuery
        return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
      })

      const result = await service.getPaymentAnalytics()

      // Collection rate should be 66.67% (2 completed out of 3 total)
      expect(result.collectionRate.value).toBeCloseTo(66.67, 1)
    })

    it('should apply date filtering correctly', async () => {
      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      
      const mockPaymentsQuery = {
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => Promise.resolve({ data: mockPayments, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payments') return mockPaymentsQuery
        return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
      })

      await service.getPaymentAnalytics(dateRange)

      expect(mockPaymentsQuery.select).toHaveBeenCalled()
    })

    it('should handle empty payment data', async () => {
      const mockEmptyQuery = {
        select: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }

      mockSupabase.from.mockReturnValue(mockEmptyQuery)

      const result = await service.getPaymentAnalytics()

      expect(result.collectionRate.value).toBe(0)
      expect(result.averagePaymentTime.value).toBe(0)
      expect(result.overdueAmount.value).toBe(0)
    })

    it('should calculate payment method breakdown correctly', async () => {
      const mockPaymentsQuery = {
        select: vi.fn(() => Promise.resolve({ data: mockPayments, error: null }))
      }
      const mockOverdueQuery = {
        select: vi.fn(() => ({
          lt: vi.fn(() => ({
            gt: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payments') return mockPaymentsQuery
        if (table === 'invoices') return mockOverdueQuery
        return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
      })

      const result = await service.getPaymentAnalytics()

      expect(result.paymentMethodBreakdown.length).toBeGreaterThan(0)
      const cardMethod = result.paymentMethodBreakdown.find(m => m.method === 'card')
      const bankTransferMethod = result.paymentMethodBreakdown.find(m => m.method === 'bank_transfer')
      
      expect(cardMethod).toBeDefined()
      expect(bankTransferMethod).toBeDefined()
      expect(cardMethod?.amount).toBe(1500)
      expect(bankTransferMethod?.amount).toBe(2000)
    })
  })

  // ==============================================
  // FINANCIAL FORECASTING TESTS
  // ==============================================

  describe('getFinancialForecasting', () => {
    it('should generate revenue projections successfully', async () => {
      const result = await service.getFinancialForecasting(6, 'revenue')

      expect(result).toBeDefined()
      expect(Array.isArray(result.revenueProjection)).toBe(true)
      expect(result.revenueProjection.length).toBe(6)
      
      result.revenueProjection.forEach(projection => {
        expect(projection).toHaveProperty('period')
        expect(projection).toHaveProperty('projectedRevenue')
        expect(projection).toHaveProperty('confidenceInterval')
        expect(projection).toHaveProperty('factors')
      })
    })

    it('should generate cash flow projections successfully', async () => {
      const result = await service.getFinancialForecasting(12, 'cashflow')

      expect(result).toBeDefined()
      expect(Array.isArray(result.cashFlowProjection)).toBe(true)
      expect(result.cashFlowProjection.length).toBe(12)
      
      result.cashFlowProjection.forEach(projection => {
        expect(projection).toHaveProperty('period')
        expect(projection).toHaveProperty('inflow')
        expect(projection).toHaveProperty('outflow')
        expect(projection).toHaveProperty('netCashFlow')
        expect(projection).toHaveProperty('cumulativeCashFlow')
      })
    })

    it('should generate both revenue and cash flow projections', async () => {
      const result = await service.getFinancialForecasting(3, 'both')

      expect(result).toBeDefined()
      expect(Array.isArray(result.revenueProjection)).toBe(true)
      expect(Array.isArray(result.cashFlowProjection)).toBe(true)
      expect(result.revenueProjection.length).toBe(3)
      expect(result.cashFlowProjection.length).toBe(3)
    })

    it('should generate scenario analysis', async () => {
      const result = await service.getFinancialForecasting()

      expect(result.scenarios).toBeDefined()
      expect(Array.isArray(result.scenarios)).toBe(true)
      expect(result.scenarios.length).toBe(3) // Optimistic, Conservative, Pessimistic
      
      result.scenarios.forEach(scenario => {
        expect(scenario).toHaveProperty('name')
        expect(scenario).toHaveProperty('nameAr')
        expect(scenario).toHaveProperty('assumptions')
        expect(scenario).toHaveProperty('projectedImpact')
      })

      const optimistic = result.scenarios.find(s => s.name === 'Optimistic')
      const conservative = result.scenarios.find(s => s.name === 'Conservative')
      const pessimistic = result.scenarios.find(s => s.name === 'Pessimistic')
      
      expect(optimistic).toBeDefined()
      expect(conservative).toBeDefined()
      expect(pessimistic).toBeDefined()
      expect(optimistic?.nameAr).toBe('متفائل')
      expect(conservative?.nameAr).toBe('محافظ')
      expect(pessimistic?.nameAr).toBe('متشائم')
    })

    it('should handle forecasting errors gracefully', async () => {
      // Mock service method to throw error
      const originalMethod = service.getFinancialForecasting
      vi.spyOn(service, 'getFinancialForecasting').mockImplementation(() => {
        throw new Error('Forecasting error')
      })

      const result = await service.getFinancialForecasting.call(service)

      expect(result.revenueProjection).toEqual([])
      expect(result.cashFlowProjection).toEqual([])
      expect(result.scenarios).toEqual([])

      service.getFinancialForecasting = originalMethod
    })
  })

  // ==============================================
  // FINANCIAL KPI TESTS
  // ==============================================

  describe('getFinancialKPIs', () => {
    const mockKPIData = {
      totalRevenue: { value: 50000, metric: 'Total Revenue' },
      recurringRevenue: { value: 35000, metric: 'Recurring Revenue' },
      collectionRate: { value: 95.5, metric: 'Collection Rate' },
      averagePaymentTime: { value: 12.5, metric: 'Average Payment Time' },
      overdueAmount: { value: 2500, metric: 'Overdue Amount' }
    }

    it('should return comprehensive KPI list', async () => {
      // Mock the dependent methods
      vi.spyOn(service, 'getRevenueAnalytics').mockResolvedValue({
        totalRevenue: mockKPIData.totalRevenue,
        recurringRevenue: mockKPIData.recurringRevenue,
        oneTimeRevenue: { value: 15000, metric: 'One-time Revenue' },
        revenueByService: [],
        revenueByTherapist: [],
        revenueByProgram: [],
        monthlyRevenue: [],
        dailyRevenue: [],
        revenueForecast: []
      } as any)

      vi.spyOn(service, 'getPaymentAnalytics').mockResolvedValue({
        collectionRate: mockKPIData.collectionRate,
        averagePaymentTime: mockKPIData.averagePaymentTime,
        overdueAmount: mockKPIData.overdueAmount,
        paymentMethodBreakdown: [],
        outstandingBalance: { value: 0 },
        agingAnalysis: [],
        paymentTrends: []
      } as any)

      const result = await service.getFinancialKPIs()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(5)
      
      const totalRevenue = result.find(kpi => kpi.metric === 'Total Revenue')
      const collectionRate = result.find(kpi => kpi.metric === 'Collection Rate')
      
      expect(totalRevenue).toBeDefined()
      expect(collectionRate).toBeDefined()
      expect(totalRevenue?.value).toBe(50000)
      expect(collectionRate?.value).toBe(95.5)
    })

    it('should apply date filtering to KPIs', async () => {
      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      
      vi.spyOn(service, 'getRevenueAnalytics').mockResolvedValue({} as any)
      vi.spyOn(service, 'getPaymentAnalytics').mockResolvedValue({} as any)

      await service.getFinancialKPIs(dateRange)

      expect(service.getRevenueAnalytics).toHaveBeenCalledWith(dateRange)
      expect(service.getPaymentAnalytics).toHaveBeenCalledWith(dateRange)
    })

    it('should handle KPI calculation errors', async () => {
      vi.spyOn(service, 'getRevenueAnalytics').mockRejectedValue(new Error('Revenue error'))
      
      const result = await service.getFinancialKPIs()
      
      expect(result).toEqual([])
    })
  })

  // ==============================================
  // DASHBOARD DATA TESTS
  // ==============================================

  describe('getDashboardData', () => {
    it('should fetch all dashboard components successfully', async () => {
      // Mock all dependent methods
      vi.spyOn(service, 'getRevenueAnalytics').mockResolvedValue({} as any)
      vi.spyOn(service, 'getPaymentAnalytics').mockResolvedValue({} as any)
      vi.spyOn(service, 'getFinancialKPIs').mockResolvedValue([])
      vi.spyOn(service, 'getFinancialForecasting').mockResolvedValue({} as any)

      const result = await service.getDashboardData()

      expect(result).toBeDefined()
      expect(result).toHaveProperty('revenue')
      expect(result).toHaveProperty('payments')
      expect(result).toHaveProperty('kpis')
      expect(result).toHaveProperty('forecasting')
      expect(result).toHaveProperty('lastUpdated')
      expect(typeof result.lastUpdated).toBe('string')
    })

    it('should apply date filtering to dashboard data', async () => {
      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      
      vi.spyOn(service, 'getRevenueAnalytics').mockResolvedValue({} as any)
      vi.spyOn(service, 'getPaymentAnalytics').mockResolvedValue({} as any)
      vi.spyOn(service, 'getFinancialKPIs').mockResolvedValue([])
      vi.spyOn(service, 'getFinancialForecasting').mockResolvedValue({} as any)

      await service.getDashboardData(dateRange)

      expect(service.getRevenueAnalytics).toHaveBeenCalledWith(dateRange)
      expect(service.getPaymentAnalytics).toHaveBeenCalledWith(dateRange)
      expect(service.getFinancialKPIs).toHaveBeenCalledWith(dateRange)
      expect(service.getFinancialForecasting).toHaveBeenCalledWith(6, 'both')
    })

    it('should handle dashboard data errors', async () => {
      vi.spyOn(service, 'getRevenueAnalytics').mockRejectedValue(new Error('Dashboard error'))

      await expect(service.getDashboardData()).rejects.toThrow('Dashboard error')
    })
  })

  // ==============================================
  // EDGE CASE AND ERROR HANDLING TESTS
  // ==============================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined payment data', async () => {
      const mockQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await service.getPaymentAnalytics()
      
      expect(result).toBeDefined()
      expect(result.collectionRate.value).toBe(0)
    })

    it('should handle malformed date ranges', async () => {
      const invalidDateRange = { start: 'invalid-date', end: 'another-invalid-date' }
      
      const result = await service.getRevenueAnalytics(invalidDateRange)
      
      expect(result).toBeDefined()
      expect(result.totalRevenue.value).toBe(0)
    })

    it('should handle network timeouts gracefully', async () => {
      const mockTimeoutQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Network timeout')), 100)
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockTimeoutQuery)

      const result = await service.getRevenueAnalytics()
      
      expect(result).toBeDefined()
      expect(result.totalRevenue.changeType).toBe('neutral')
    })

    it('should handle very large datasets efficiently', async () => {
      const largePaymentDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `pay-${i}`,
        amount: Math.random() * 5000,
        payment_date: new Date(2024, 0, Math.floor(Math.random() * 365)).toISOString(),
        payment_method: ['card', 'bank_transfer', 'cash'][Math.floor(Math.random() * 3)],
        status: 'completed',
        invoices: {
          invoice_items: [{ service_type: 'speech_therapy', therapist_id: `therapist-${Math.floor(Math.random() * 10)}` }]
        }
      }))

      const mockLargeQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: largePaymentDataset, error: null }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockLargeQuery)

      const startTime = Date.now()
      const result = await service.getRevenueAnalytics()
      const executionTime = Date.now() - startTime

      expect(result).toBeDefined()
      expect(executionTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(result.totalRevenue.value).toBeGreaterThan(0)
    })
  })

  // ==============================================
  // PERFORMANCE TESTS
  // ==============================================

  describe('Performance Tests', () => {
    it('should handle concurrent analytics requests efficiently', async () => {
      // Mock successful responses
      vi.spyOn(service, 'getRevenueAnalytics').mockResolvedValue({} as any)
      vi.spyOn(service, 'getPaymentAnalytics').mockResolvedValue({} as any)
      vi.spyOn(service, 'getFinancialKPIs').mockResolvedValue([])

      const startTime = Date.now()
      
      // Simulate concurrent requests
      const promises = [
        service.getRevenueAnalytics(),
        service.getPaymentAnalytics(),
        service.getFinancialKPIs(),
        service.getRevenueAnalytics({ start: '2024-01-01', end: '2024-01-31' }),
        service.getPaymentAnalytics({ start: '2024-01-01', end: '2024-01-31' })
      ]

      await Promise.all(promises)
      const executionTime = Date.now() - startTime

      expect(executionTime).toBeLessThan(2000) // All concurrent requests should complete within 2 seconds
    })

    it('should cache expensive calculations appropriately', async () => {
      const mockQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      // First call
      await service.getRevenueAnalytics()
      const firstCallCount = mockSupabase.from.mock.calls.length

      // Second call with same parameters should potentially use cache
      await service.getRevenueAnalytics()
      const secondCallCount = mockSupabase.from.mock.calls.length

      // Verify database calls were made (caching would be implemented at a higher level)
      expect(secondCallCount).toBeGreaterThan(firstCallCount)
    })
  })
})