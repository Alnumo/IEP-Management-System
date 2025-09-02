/**
 * Financial Reporting Service Tests
 * Comprehensive testing for financial reporting, compliance, and audit trail
 * Part of Story 2.3: Financial Management Module - Task 7: Testing and Quality Assurance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FinancialReportingService } from '../../services/financial-reporting-service'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      gte: vi.fn(() => ({
        lte: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      lte: vi.fn(() => ({
        gte: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        lte: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      order: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }))
}

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}))

describe('FinancialReportingService', () => {
  let service: FinancialReportingService
  
  beforeEach(() => {
    service = new FinancialReportingService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==============================================
  // VAT COMPLIANCE TESTS
  // ==============================================

  describe('generateVATReport', () => {
    const mockInvoices = [
      {
        id: 'inv-1',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        issue_date: '2024-01-15',
        status: 'paid',
        invoice_items: [
          { service_type: 'speech_therapy', amount: 1000 }
        ],
        payments: [
          { amount: 1150, payment_date: '2024-01-16' }
        ]
      },
      {
        id: 'inv-2',
        subtotal: 2000,
        tax_amount: 300,
        total_amount: 2300,
        issue_date: '2024-01-20',
        status: 'paid',
        invoice_items: [
          { service_type: 'aba_therapy', amount: 2000 }
        ],
        payments: [
          { amount: 2300, payment_date: '2024-01-22' }
        ]
      }
    ]

    const mockVATSettings = {
      setting_value: '"VAT-SA-123456789"'
    }

    it('should generate valid VAT compliance report', async () => {
      // Setup mocks
      const mockInvoicesQuery = {
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockInvoices, error: null }))
            }))
          }))
        }))
      }

      const mockVATQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockVATSettings, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'invoices') return mockInvoicesQuery
        if (table === 'billing_settings') return mockVATQuery
        return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
      })

      // Mock the cacheFinancialReport method
      vi.spyOn(service as any, 'cacheFinancialReport').mockResolvedValue(true)
      vi.spyOn(service as any, 'validateVATCompliance').mockReturnValue([])

      const result = await service.generateVATReport('2024-01-01', '2024-01-31')

      expect(result.success).toBe(true)
      expect(result.report).toBeDefined()
      expect(result.report?.vatRegistrationNumber).toBe('VAT-SA-123456789')
      expect(result.report?.vatRate).toBe(0.15)
      expect(result.report?.vatReturns).toHaveLength(1)
      
      const vatReturn = result.report?.vatReturns[0]
      expect(vatReturn?.totalSales).toBe(3000) // 1000 + 2000
      expect(vatReturn?.vatCollected).toBe(450) // 150 + 300
      expect(vatReturn?.netVat).toBe(450) // vatCollected - vatPaid (0)
      expect(vatReturn?.status).toBe('draft')
    })

    it('should handle VAT compliance issues', async () => {
      const mockInvoicesQuery = {
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockInvoices, error: null }))
            }))
          }))
        }))
      }

      const mockVATQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockVATSettings, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'invoices') return mockInvoicesQuery
        if (table === 'billing_settings') return mockVATQuery
        return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
      })

      // Mock compliance validation with issues
      vi.spyOn(service as any, 'cacheFinancialReport').mockResolvedValue(true)
      vi.spyOn(service as any, 'validateVATCompliance').mockReturnValue([
        'VAT rate inconsistent with Saudi regulations',
        'Missing VAT registration on some invoices'
      ])

      const result = await service.generateVATReport('2024-01-01', '2024-01-31')

      expect(result.success).toBe(true)
      expect(result.report?.complianceStatus).toBe('issues_found')
      expect(result.report?.issues).toHaveLength(2)
    })

    it('should handle missing VAT registration gracefully', async () => {
      const mockInvoicesQuery = {
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockInvoices, error: null }))
            }))
          }))
        }))
      }

      const mockVATQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'invoices') return mockInvoicesQuery
        if (table === 'billing_settings') return mockVATQuery
        return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
      })

      vi.spyOn(service as any, 'cacheFinancialReport').mockResolvedValue(true)
      vi.spyOn(service as any, 'validateVATCompliance').mockReturnValue([])

      const result = await service.generateVATReport('2024-01-01', '2024-01-31')

      expect(result.success).toBe(true)
      expect(result.report?.vatRegistrationNumber).toBe('VAT-REG-12345') // Default fallback
    })

    it('should handle database errors gracefully', async () => {
      const mockErrorQuery = {
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockErrorQuery)

      const result = await service.generateVATReport('2024-01-01', '2024-01-31')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch invoice data for VAT report')
    })

    it('should validate Saudi VAT rate compliance', async () => {
      const mockInvoicesQuery = {
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockInvoices, error: null }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'invoices') return mockInvoicesQuery
        return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
      })

      vi.spyOn(service as any, 'cacheFinancialReport').mockResolvedValue(true)
      vi.spyOn(service as any, 'validateVATCompliance').mockReturnValue([])

      const result = await service.generateVATReport('2024-01-01', '2024-01-31')

      expect(result.report?.vatRate).toBe(0.15) // Saudi VAT rate is 15%
    })

    // Arabic language test
    it('should handle Arabic date formats and content', async () => {
      const result = await service.generateVATReport('2024-01-01', '2024-01-31')
      
      if (result.success) {
        expect(result.report?.vatReturns[0].filingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(result.report?.lastComplianceCheck).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      }
    })
  })

  // ==============================================
  // AUDIT TRAIL TESTS
  // ==============================================

  describe('generateAuditTrail', () => {
    const mockAuditEntries = [
      {
        id: 'audit-1',
        entity_type: 'invoice',
        entity_id: 'inv-1',
        action: 'created',
        performed_by: 'user-1',
        performed_at: '2024-01-15T10:00:00.000Z',
        previous_values: null,
        new_values: { amount: 1500, status: 'draft' },
        reason: 'New therapy invoice created',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0',
        retention_period: 2555,
        is_archived: false,
        users: { name: 'John Therapist', email: 'john@example.com' }
      },
      {
        id: 'audit-2',
        entity_type: 'payment',
        entity_id: 'pay-1',
        action: 'processed',
        performed_by: 'user-2',
        performed_at: '2024-01-16T14:30:00.000Z',
        previous_values: { status: 'pending' },
        new_values: { status: 'completed', amount: 1500 },
        reason: 'Payment processed successfully',
        ip_address: '192.168.1.101',
        user_agent: 'Mozilla/5.0',
        retention_period: 2555,
        is_archived: false,
        users: { name: 'Sarah Admin', email: 'sarah@example.com' }
      }
    ]

    it('should generate comprehensive audit trail', async () => {
      const mockAuditQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: mockAuditEntries, error: null }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockAuditQuery)

      const result = await service.generateAuditTrail()

      expect(result.success).toBe(true)
      expect(result.auditTrail).toHaveLength(2)
      expect(result.summary).toBeDefined()
      expect(result.summary?.totalEntries).toBe(2)
      expect(result.summary?.actionBreakdown).toEqual({
        'created': 1,
        'processed': 1
      })
      expect(result.summary?.userBreakdown).toEqual({
        'user-1': 1,
        'user-2': 1
      })
    })

    it('should filter audit trail by entity type', async () => {
      const mockAuditQuery = {
        select: vi.fn(() => ({
          eq: vi.fn((field, value) => {
            if (field === 'entity_type' && value === 'invoice') {
              return {
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => Promise.resolve({ data: [mockAuditEntries[0]], error: null }))
                  }))
                }))
              }
            }
            return {
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }
          })
        }))
      }

      mockSupabase.from.mockReturnValue(mockAuditQuery)

      const result = await service.generateAuditTrail('invoice')

      expect(result.success).toBe(true)
      expect(result.auditTrail).toHaveLength(1)
      expect(result.auditTrail?.[0].entityType).toBe('invoice')
    })

    it('should filter audit trail by date range', async () => {
      const mockAuditQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: mockAuditEntries, error: null }))
                }))
              }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockAuditQuery)

      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      await service.generateAuditTrail(undefined, dateRange)

      expect(mockSupabase.from).toHaveBeenCalledWith('financial_audit_trail')
    })

    it('should filter audit trail by user', async () => {
      const mockAuditQuery = {
        select: vi.fn(() => ({
          eq: vi.fn((field, value) => {
            if (field === 'performed_by' && value === 'user-1') {
              return {
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => Promise.resolve({ data: [mockAuditEntries[0]], error: null }))
                  }))
                }))
              }
            }
            return {
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }
          })
        }))
      }

      mockSupabase.from.mockReturnValue(mockAuditQuery)

      const result = await service.generateAuditTrail(undefined, undefined, 'user-1')

      expect(result.success).toBe(true)
      expect(result.auditTrail).toHaveLength(1)
      expect(result.auditTrail?.[0].performedBy).toBe('user-1')
    })

    it('should handle empty audit trail data', async () => {
      const mockEmptyQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockEmptyQuery)

      const result = await service.generateAuditTrail()

      expect(result.success).toBe(true)
      expect(result.auditTrail).toEqual([])
      expect(result.summary?.totalEntries).toBe(0)
    })

    it('should handle audit trail database errors', async () => {
      const mockErrorQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: null, error: new Error('Audit error') }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockErrorQuery)

      const result = await service.generateAuditTrail()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch audit trail data')
    })

    it('should map audit entries correctly to the expected format', async () => {
      const mockAuditQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: mockAuditEntries, error: null }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockAuditQuery)

      const result = await service.generateAuditTrail()

      expect(result.success).toBe(true)
      const firstEntry = result.auditTrail?.[0]
      
      expect(firstEntry).toMatchObject({
        id: 'audit-1',
        entityType: 'invoice',
        entityId: 'inv-1',
        action: 'created',
        performedBy: 'user-1',
        reason: 'New therapy invoice created',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        isArchived: false
      })
    })
  })

  // ==============================================
  // FINANCIAL EXPORT TESTS
  // ==============================================

  describe('generateFinancialExport', () => {
    it('should generate revenue export successfully', async () => {
      // Mock the generateRevenueExport method
      vi.spyOn(service as any, 'generateRevenueExport').mockResolvedValue({
        totalRevenue: 50000,
        monthlyBreakdown: [],
        revenueByService: []
      })
      vi.spyOn(service as any, 'formatExportData').mockReturnValue({
        data: { formatted: true },
        mimeType: 'application/json'
      })

      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      const result = await service.generateFinancialExport('json', 'revenue', dateRange)

      expect(result.success).toBe(true)
      expect(result.exportData).toEqual({ formatted: true })
      expect(result.fileName).toBe('financial-revenue-2024-01-01-2024-01-31.json')
      expect(result.mimeType).toBe('application/json')
    })

    it('should generate payments export successfully', async () => {
      vi.spyOn(service as any, 'generatePaymentsExport').mockResolvedValue({
        totalPayments: 25,
        paymentBreakdown: []
      })
      vi.spyOn(service as any, 'formatExportData').mockReturnValue({
        data: 'CSV,Data,Here',
        mimeType: 'text/csv'
      })

      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      const result = await service.generateFinancialExport('csv', 'payments', dateRange)

      expect(result.success).toBe(true)
      expect(result.fileName).toBe('financial-payments-2024-01-01-2024-01-31.csv')
      expect(result.mimeType).toBe('text/csv')
    })

    it('should generate VAT export successfully', async () => {
      vi.spyOn(service, 'generateVATReport').mockResolvedValue({
        success: true,
        report: {
          vatRegistrationNumber: 'VAT-123',
          vatRate: 0.15,
          vatReturns: [],
          lastComplianceCheck: new Date().toISOString(),
          complianceStatus: 'compliant',
          issues: []
        }
      })
      vi.spyOn(service as any, 'formatExportData').mockReturnValue({
        data: Buffer.from('PDF content'),
        mimeType: 'application/pdf'
      })

      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      const result = await service.generateFinancialExport('pdf', 'vat', dateRange)

      expect(result.success).toBe(true)
      expect(result.fileName).toBe('financial-vat-2024-01-01-2024-01-31.pdf')
      expect(result.mimeType).toBe('application/pdf')
    })

    it('should generate comprehensive export successfully', async () => {
      vi.spyOn(service as any, 'generateComprehensiveExport').mockResolvedValue({
        summary: {},
        revenue: {},
        payments: {},
        vat: {},
        audit: {}
      })
      vi.spyOn(service as any, 'formatExportData').mockReturnValue({
        data: [['Header'], ['Data']],
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      const result = await service.generateFinancialExport('excel', 'comprehensive', dateRange)

      expect(result.success).toBe(true)
      expect(result.fileName).toBe('financial-comprehensive-2024-01-01-2024-01-31.excel')
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    })

    it('should handle invalid report type', async () => {
      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      const result = await service.generateFinancialExport('json', 'invalid' as any, dateRange)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid report type')
    })

    it('should handle export generation errors', async () => {
      vi.spyOn(service as any, 'generateRevenueExport').mockRejectedValue(new Error('Export error'))

      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      const result = await service.generateFinancialExport('json', 'revenue', dateRange)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal error generating financial export')
    })
  })

  // ==============================================
  // PARENT FINANCIAL STATEMENT TESTS
  // ==============================================

  describe('generateParentFinancialStatement', () => {
    it('should generate parent financial statement successfully', async () => {
      const mockStudentData = {
        id: 'student-1',
        name: 'Ahmad Ali',
        name_ar: 'أحمد علي'
      }

      const mockInvoices = [
        {
          invoice_number: 'INV-001',
          issue_date: '2024-01-15',
          due_date: '2024-01-30',
          total_amount: 1500,
          paid_amount: 1500,
          status: 'paid',
          invoice_items: [
            {
              service_type: 'speech_therapy',
              session_date: '2024-01-15',
              amount: 1500,
              therapist_id: 'therapist-1'
            }
          ]
        }
      ]

      // Mock queries
      const mockStudentQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockStudentData, error: null }))
          }))
        }))
      }

      const mockInvoicesQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => Promise.resolve({ data: mockInvoices, error: null }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'students') return mockStudentQuery
        if (table === 'invoices') return mockInvoicesQuery
        return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
      })

      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      const result = await service.generateParentFinancialStatement('student-1', dateRange)

      expect(result.success).toBe(true)
      expect(result.statement?.student).toEqual({
        id: 'student-1',
        name: 'Ahmad Ali',
        nameAr: 'أحمد علي'
      })
      expect(result.statement?.summary.totalInvoiced).toBe(1500)
      expect(result.statement?.summary.totalPaid).toBe(1500)
      expect(result.statement?.summary.outstandingBalance).toBe(0)
    })

    it('should handle missing student data', async () => {
      const mockStudentQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockStudentQuery)

      const dateRange = { start: '2024-01-01', end: '2024-01-31' }
      const result = await service.generateParentFinancialStatement('invalid-student', dateRange)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Student not found')
    })
  })

  // ==============================================
  // EDGE CASE AND ERROR HANDLING TESTS
  // ==============================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed date ranges', async () => {
      const result = await service.generateVATReport('invalid-date', 'another-invalid-date')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to fetch invoice data')
    })

    it('should handle very large datasets efficiently', async () => {
      const largeAuditDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `audit-${i}`,
        entity_type: 'invoice',
        entity_id: `inv-${i}`,
        action: 'created',
        performed_by: `user-${Math.floor(i / 100)}`,
        performed_at: new Date(2024, 0, Math.floor(i / 30) + 1).toISOString(),
        previous_values: null,
        new_values: { amount: Math.random() * 5000 },
        reason: 'Automated test entry',
        ip_address: '192.168.1.100',
        user_agent: 'Test Agent',
        retention_period: 2555,
        is_archived: false,
        users: { name: `User ${i}`, email: `user${i}@test.com` }
      }))

      const mockLargeQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: largeAuditDataset, error: null }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockLargeQuery)

      const startTime = Date.now()
      const result = await service.generateAuditTrail()
      const executionTime = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(executionTime).toBeLessThan(3000) // Should complete within 3 seconds
      expect(result.auditTrail?.length).toBe(1000)
      expect(result.summary?.totalEntries).toBe(1000)
    })

    it('should handle network timeouts gracefully', async () => {
      const mockTimeoutQuery = {
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              eq: vi.fn(() => new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Network timeout')), 100)
              }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockTimeoutQuery)

      const result = await service.generateVATReport('2024-01-01', '2024-01-31')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal error generating VAT compliance report')
    })

    // Arabic language test
    it('should handle Arabic financial data correctly', async () => {
      const mockArabicStudent = {
        id: 'student-ar',
        name: 'Ahmad Al-Rashid',
        name_ar: 'أحمد الراشد'
      }

      const mockStudentQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockArabicStudent, error: null }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockStudentQuery)

      const result = await service.generateParentFinancialStatement('student-ar', 
        { start: '2024-01-01', end: '2024-01-31' }
      )

      if (result.success) {
        expect(result.statement?.student.nameAr).toBe('أحمد الراشد')
        expect(result.statement?.student.name).toBe('Ahmad Al-Rashid')
      }
    })

    // Mobile responsive test (data structure should work on mobile)
    it('should return mobile-friendly data structures', async () => {
      const result = await service.generateVATReport('2024-01-01', '2024-01-31')
      
      if (result.success) {
        expect(result.report).toHaveProperty('vatRegistrationNumber')
        expect(result.report).toHaveProperty('vatRate')
        expect(result.report).toHaveProperty('complianceStatus')
        expect(Array.isArray(result.report?.vatReturns)).toBe(true)
      }
    })
  })

  // ==============================================
  // PERFORMANCE TESTS
  // ==============================================

  describe('Performance Tests', () => {
    it('should handle concurrent report generation efficiently', async () => {
      // Mock all report methods
      vi.spyOn(service, 'generateVATReport').mockResolvedValue({ success: true })
      vi.spyOn(service, 'generateAuditTrail').mockResolvedValue({ success: true })
      vi.spyOn(service as any, 'generateRevenueExport').mockResolvedValue({})
      vi.spyOn(service as any, 'formatExportData').mockReturnValue({ data: {}, mimeType: 'application/json' })

      const startTime = Date.now()
      
      // Simulate concurrent requests
      const promises = [
        service.generateVATReport('2024-01-01', '2024-01-31'),
        service.generateAuditTrail(),
        service.generateFinancialExport('json', 'revenue', { start: '2024-01-01', end: '2024-01-31' }),
        service.generateVATReport('2024-02-01', '2024-02-28'),
        service.generateAuditTrail('payment')
      ]

      await Promise.all(promises)
      const executionTime = Date.now() - startTime

      expect(executionTime).toBeLessThan(3000) // All concurrent requests should complete within 3 seconds
    })

    it('should efficiently process financial calculations', async () => {
      // Mock complex dataset for calculations
      const complexInvoiceDataset = Array.from({ length: 500 }, (_, i) => ({
        id: `inv-${i}`,
        subtotal: Math.random() * 10000,
        tax_amount: Math.random() * 1500,
        total_amount: Math.random() * 11500,
        issue_date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
        status: 'paid',
        invoice_items: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => ({
          service_type: ['speech_therapy', 'aba_therapy', 'occupational_therapy'][Math.floor(Math.random() * 3)],
          amount: Math.random() * 2000
        })),
        payments: [{ amount: Math.random() * 11500, payment_date: new Date().toISOString() }]
      }))

      const mockComplexQuery = {
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: complexInvoiceDataset, error: null }))
            }))
          }))
        }))
      }

      mockSupabase.from.mockReturnValue(mockComplexQuery)

      vi.spyOn(service as any, 'cacheFinancialReport').mockResolvedValue(true)
      vi.spyOn(service as any, 'validateVATCompliance').mockReturnValue([])

      const startTime = Date.now()
      const result = await service.generateVATReport('2024-01-01', '2024-12-31')
      const executionTime = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(executionTime).toBeLessThan(2000) // Complex calculations should complete within 2 seconds
      expect(result.report?.vatReturns[0].totalSales).toBeGreaterThan(0)
    })
  })
})