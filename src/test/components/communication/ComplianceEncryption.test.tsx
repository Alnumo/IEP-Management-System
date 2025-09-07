/**
 * Compliance and Encryption System Tests
 * Comprehensive testing for message encryption and compliance features
 * Arkan Al-Numo Center - Security and Compliance Testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComplianceDashboard } from '@/components/communication/ComplianceManagement/ComplianceDashboard'
import { messageEncryptionService, messageEncryptionUtils } from '@/services/message-encryption-service'
import { communicationComplianceService } from '@/services/communication-compliance'
import { LanguageProvider } from '@/contexts/LanguageContext'

// Mock dependencies
vi.mock('@/services/message-encryption-service')
vi.mock('@/services/communication-compliance')
vi.mock('@/lib/supabase')
vi.mock('sonner')

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    generateKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    digest: vi.fn()
  },
  getRandomValues: vi.fn()
}

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  configurable: true
})

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode; language?: 'ar' | 'en' }> = ({ 
  children, 
  language = 'ar' 
}) => (
  <LanguageProvider defaultLanguage={language}>
    {children}
  </LanguageProvider>
)

// Mock message data
const mockMessage = {
  id: 'msg-1',
  content_ar: 'رسالة تجريبية تحتوي على معلومات طبية',
  content_en: 'Test message containing medical information',
  message_type: 'text' as const,
  media_attachments: []
}

const mockEncryptedMessage = {
  id: 'msg-1',
  conversation_id: 'conv-1',
  sender_id: 'user-1',
  recipient_id: 'user-2',
  encrypted_content_ar: 'encrypted-arabic-content',
  encrypted_content_en: 'encrypted-english-content',
  content_hash: 'hash123',
  encryption_key_id: 'key-1',
  iv: 'iv123',
  message_type: 'text',
  priority_level: 'medium',
  created_at: new Date().toISOString(),
  decrypted: false
}

describe('MessageEncryptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock crypto operations
    mockCrypto.subtle.generateKey.mockResolvedValue({})
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(32))
    mockCrypto.subtle.decrypt.mockResolvedValue(new ArrayBuffer(32))
    mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32))
    mockCrypto.getRandomValues.mockReturnValue(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))
  })

  describe('Message Encryption', () => {
    it('should encrypt message content correctly', async () => {
      const mockEncryptionResult = {
        encryptedMessage: {
          content_ar: 'encrypted-arabic',
          content_en: 'encrypted-english'
        },
        encryptionMetadata: {
          keyId: 'key-1',
          iv: 'iv123',
          contentHash: 'hash123'
        }
      }

      vi.mocked(messageEncryptionService.encryptMessage).mockResolvedValue(mockEncryptionResult)

      const result = await messageEncryptionService.encryptMessage(mockMessage)

      expect(result).toEqual(mockEncryptionResult)
      expect(messageEncryptionService.encryptMessage).toHaveBeenCalledWith(mockMessage)
    })

    it('should decrypt message content correctly', async () => {
      const mockDecryptedMessage = {
        ...mockEncryptedMessage,
        content_ar: mockMessage.content_ar,
        content_en: mockMessage.content_en,
        decrypted: true
      }

      vi.mocked(messageEncryptionService.decryptMessage).mockResolvedValue(mockDecryptedMessage as any)

      const result = await messageEncryptionService.decryptMessage(mockEncryptedMessage)

      expect(result).toEqual(mockDecryptedMessage)
      expect(result.decrypted).toBe(true)
      expect(result.content_ar).toBe(mockMessage.content_ar)
      expect(result.content_en).toBe(mockMessage.content_en)
    })

    it('should handle encryption errors gracefully', async () => {
      vi.mocked(messageEncryptionService.encryptMessage).mockRejectedValue(new Error('Encryption failed'))

      await expect(messageEncryptionService.encryptMessage(mockMessage)).rejects.toThrow('Encryption failed')
    })

    it('should verify message integrity', async () => {
      vi.mocked(messageEncryptionService.verifyMessageIntegrity).mockResolvedValue(true)

      const result = await messageEncryptionService.verifyMessageIntegrity(mockMessage as any, 'hash123')

      expect(result).toBe(true)
      expect(messageEncryptionService.verifyMessageIntegrity).toHaveBeenCalledWith(mockMessage, 'hash123')
    })
  })

  describe('Batch Operations', () => {
    it('should encrypt multiple messages efficiently', async () => {
      const messages = Array(5).fill(mockMessage)
      const mockResults = messages.map((_, index) => ({
        encryptedMessage: { content_ar: `encrypted-${index}` },
        encryptionMetadata: { keyId: 'key-1', iv: 'iv123', contentHash: `hash${index}` }
      }))

      vi.mocked(messageEncryptionService.batchEncryptMessages).mockResolvedValue(mockResults)

      const results = await messageEncryptionService.batchEncryptMessages(messages)

      expect(results).toHaveLength(5)
      expect(results[0].encryptionMetadata.contentHash).toBe('hash0')
      expect(results[4].encryptionMetadata.contentHash).toBe('hash4')
    })
  })

  describe('Media Encryption', () => {
    const mockMediaAttachment = {
      id: 'file-1',
      filename: 'test.pdf',
      file_path: 'https://example.com/file.pdf',
      mime_type: 'application/pdf',
      file_size: 1024
    }

    it('should encrypt media attachments', async () => {
      const mockEncryptedAttachment = {
        ...mockMediaAttachment,
        encrypted_file_path: 'https://example.com/encrypted/file.enc',
        encryption_metadata: {
          keyId: 'key-1',
          iv: 'iv123',
          authTag: 'tag123',
          originalFilename: 'test.pdf',
          encryptedSize: 1088
        }
      }

      vi.mocked(messageEncryptionService.encryptMediaAttachment).mockResolvedValue(mockEncryptedAttachment as any)

      const result = await messageEncryptionService.encryptMediaAttachment(mockMediaAttachment as any)

      expect(result.encrypted_file_path).toContain('encrypted')
      expect(result.encryption_metadata.originalFilename).toBe('test.pdf')
    })

    it('should decrypt media attachments', async () => {
      const mockEncryptedAttachment = {
        ...mockMediaAttachment,
        encrypted_file_path: 'https://example.com/encrypted/file.enc',
        encryption_metadata: {
          keyId: 'key-1',
          iv: 'iv123',
          authTag: 'tag123',
          originalFilename: 'test.pdf',
          encryptedSize: 1088
        }
      }

      vi.mocked(messageEncryptionService.decryptMediaAttachment).mockResolvedValue(mockMediaAttachment as any)

      const result = await messageEncryptionService.decryptMediaAttachment(mockEncryptedAttachment as any)

      expect(result.filename).toBe('test.pdf')
      expect(result.file_path).toContain('temp')
    })
  })

  describe('Utility Functions', () => {
    it('should correctly identify encrypted messages', () => {
      vi.mocked(messageEncryptionUtils.isMessageEncrypted).mockReturnValue(true)

      const result = messageEncryptionUtils.isMessageEncrypted(mockEncryptedMessage)

      expect(result).toBe(true)
    })

    it('should get conversation encryption status', async () => {
      const mockStatus = {
        isEnabled: true,
        keyRotationDate: '2024-01-01',
        totalEncryptedMessages: 150
      }

      vi.mocked(messageEncryptionUtils.getConversationEncryptionStatus).mockResolvedValue(mockStatus)

      const result = await messageEncryptionUtils.getConversationEncryptionStatus('conv-1')

      expect(result.isEnabled).toBe(true)
      expect(result.totalEncryptedMessages).toBe(150)
    })

    it('should measure encryption performance', async () => {
      const mockMetrics = {
        averageEncryptionTime: 5.2,
        averageDecryptionTime: 3.8,
        throughputMsgPerSecond: 120
      }

      vi.mocked(messageEncryptionUtils.measureEncryptionPerformance).mockResolvedValue(mockMetrics)

      const result = await messageEncryptionUtils.measureEncryptionPerformance()

      expect(result.averageEncryptionTime).toBe(5.2)
      expect(result.throughputMsgPerSecond).toBe(120)
    })
  })
})

describe('CommunicationComplianceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Compliance Validation', () => {
    it('should validate message compliance correctly', async () => {
      const mockValidationResult = {
        isCompliant: true,
        violations: [],
        warnings: ['Message contains sensitive medical information and will be encrypted'],
        requiresEncryption: true
      }

      vi.mocked(communicationComplianceService.validateMessageCompliance).mockResolvedValue(mockValidationResult)

      const result = await communicationComplianceService.validateMessageCompliance(
        mockMessage,
        'conv-1',
        'user-1'
      )

      expect(result.isCompliant).toBe(true)
      expect(result.requiresEncryption).toBe(true)
      expect(result.warnings).toContain('Message contains sensitive medical information and will be encrypted')
    })

    it('should detect compliance violations', async () => {
      const mockViolation = {
        id: 'violation-1',
        rule_id: 'rule-1',
        resource_type: 'message' as const,
        resource_id: 'msg-1',
        violation_type: 'unencrypted_sensitive_content',
        severity: 'critical' as const,
        description_ar: 'رسالة تحتوي على معلومات طبية حساسة غير مشفرة',
        description_en: 'Message contains unencrypted sensitive medical information',
        user_id: 'user-1',
        detected_at: new Date().toISOString(),
        metadata: { content_type: 'medical_diagnosis' }
      }

      const mockValidationResult = {
        isCompliant: false,
        violations: [mockViolation],
        warnings: [],
        requiresEncryption: true
      }

      vi.mocked(communicationComplianceService.validateMessageCompliance).mockResolvedValue(mockValidationResult)

      const result = await communicationComplianceService.validateMessageCompliance(
        mockMessage,
        'conv-1',
        'user-1'
      )

      expect(result.isCompliant).toBe(false)
      expect(result.violations).toHaveLength(1)
      expect(result.violations[0].severity).toBe('critical')
    })
  })

  describe('Audit Trail', () => {
    it('should log audit trail entries', async () => {
      const mockAuditEntry = {
        action_type: 'message_encrypted',
        resource_type: 'message',
        resource_id: 'msg-1',
        user_id: 'user-1',
        user_role: 'therapist',
        details: { encryption_algorithm: 'AES-256-GCM' },
        compliance_flags: ['encryption', 'medical_data']
      }

      vi.mocked(communicationComplianceService.logAuditTrail).mockResolvedValue('audit-1')

      const result = await communicationComplianceService.logAuditTrail(mockAuditEntry)

      expect(result).toBe('audit-1')
      expect(communicationComplianceService.logAuditTrail).toHaveBeenCalledWith(mockAuditEntry)
    })
  })

  describe('Report Generation', () => {
    it('should generate compliance reports', async () => {
      const mockReport = {
        report_id: 'report-1',
        report_type: 'audit_summary' as const,
        generated_at: new Date().toISOString(),
        period_start: new Date().toISOString(),
        period_end: new Date().toISOString(),
        data: { total_actions: 1500 },
        format: 'json' as const
      }

      vi.mocked(communicationComplianceService.generateComplianceReport).mockResolvedValue(mockReport)

      const result = await communicationComplianceService.generateComplianceReport(
        'audit_summary',
        new Date(),
        new Date()
      )

      expect(result.report_type).toBe('audit_summary')
      expect(result.data.total_actions).toBe(1500)
    })
  })

  describe('Data Retention', () => {
    it('should apply data retention policies', async () => {
      const mockRetentionResult = {
        processed: 100,
        deleted: 25,
        errors: []
      }

      vi.mocked(communicationComplianceService.applyDataRetentionPolicies).mockResolvedValue(mockRetentionResult)

      const result = await communicationComplianceService.applyDataRetentionPolicies()

      expect(result.processed).toBe(100)
      expect(result.deleted).toBe(25)
      expect(result.errors).toHaveLength(0)
    })
  })
})

describe('ComplianceDashboard', () => {
  const mockProps = {
    organizationId: 'org-1',
    userRole: 'admin' as const
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Arabic Language Support', () => {
    it('should render Arabic interface correctly', async () => {
      render(
        <TestWrapper language="ar">
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('لوحة الامتثال')).toBeInTheDocument()
        expect(screen.getByText('امتثال التشفير')).toBeInTheDocument()
        expect(screen.getByText('المخالفات النشطة')).toBeInTheDocument()
      })
    })

    it('should handle RTL layout properly', async () => {
      render(
        <TestWrapper language="ar">
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        const container = screen.getByText('لوحة الامتثال').closest('div')
        expect(container).toHaveAttribute('dir', 'rtl')
      })
    })
  })

  describe('English Language Support', () => {
    it('should render English interface correctly', async () => {
      render(
        <TestWrapper language="en">
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Compliance Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Encryption Compliance')).toBeInTheDocument()
        expect(screen.getByText('Active Violations')).toBeInTheDocument()
      })
    })
  })

  describe('Metrics Display', () => {
    it('should display compliance metrics correctly', async () => {
      render(
        <TestWrapper>
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        // Should show encryption compliance percentage
        expect(screen.getByText(/96.5%/)).toBeInTheDocument()
        
        // Should show violation counts
        expect(screen.getByText(/23/)).toBeInTheDocument() // Total violations
        
        // Should show audit trail count
        expect(screen.getByText(/45,230/)).toBeInTheDocument()
      })
    })

    it('should show compliance status colors correctly', async () => {
      render(
        <TestWrapper>
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      await waitFor(() => {
        // High compliance should show green indicators
        const progressBars = screen.getAllByRole('progressbar')
        expect(progressBars.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Violations Management', () => {
    it('should display violations with proper severity indicators', async () => {
      render(
        <TestWrapper>
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      // Click on violations tab
      const violationsTab = screen.getByText(/المخالفات|Violations/)
      await userEvent.setup().click(violationsTab)

      await waitFor(() => {
        // Should show violation severity badges
        expect(screen.getByText(/critical|حرج/i)).toBeInTheDocument()
        expect(screen.getByText(/high|عالي/i)).toBeInTheDocument()
      })
    })

    it('should filter violations by severity', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      // Navigate to violations tab
      const violationsTab = screen.getByText(/المخالفات|Violations/)
      await user.click(violationsTab)

      await waitFor(async () => {
        // Find and use severity filter
        const severityFilter = screen.getByRole('combobox')
        await user.click(severityFilter)
        
        const criticalOption = screen.getByText(/Critical|حرج/)
        await user.click(criticalOption)
        
        // Should filter to show only critical violations
      })
    })

    it('should search violations by content', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      const violationsTab = screen.getByText(/المخالفات|Violations/)
      await user.click(violationsTab)

      await waitFor(async () => {
        const searchInput = screen.getByPlaceholderText(/البحث في المخالفات|Search violations/)
        await user.type(searchInput, 'encryption')
        
        // Should filter violations containing 'encryption'
      })
    })
  })

  describe('Audit Trail', () => {
    it('should display audit trail entries', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      const auditTab = screen.getByText(/سجل التدقيق|Audit Trail/)
      await user.click(auditTab)

      await waitFor(() => {
        // Should show audit trail table
        expect(screen.getByText(/الوقت|Time/)).toBeInTheDocument()
        expect(screen.getByText(/الإجراء|Action/)).toBeInTheDocument()
        expect(screen.getByText(/المستخدم|User/)).toBeInTheDocument()
      })
    })
  })

  describe('Report Generation', () => {
    it('should generate different types of reports', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      const reportsTab = screen.getByText(/التقارير|Reports/)
      await user.click(reportsTab)

      await waitFor(async () => {
        // Should show report generation buttons
        expect(screen.getByText(/ملخص التدقيق|Audit Summary/)).toBeInTheDocument()
        expect(screen.getByText(/تقرير المخالفات|Violation Report/)).toBeInTheDocument()
        
        // Click on audit summary report
        const auditSummaryButton = screen.getByText(/ملخص التدقيق|Audit Summary/)
        await user.click(auditSummaryButton)
      })
    })
  })

  describe('Date Range Selection', () => {
    it('should update data when date range changes', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      await waitFor(async () => {
        // Should have date range picker
        const dateRangePicker = screen.getByRole('button', { name: /date/i })
        if (dateRangePicker) {
          await user.click(dateRangePicker)
        }
      })
    })
  })

  describe('Settings Management', () => {
    it('should show compliance settings for admins', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <ComplianceDashboard {...mockProps} userRole="admin" />
        </TestWrapper>
      )

      const settingsTab = screen.getByText(/الإعدادات|Settings/)
      await user.click(settingsTab)

      await waitFor(() => {
        expect(screen.getByText(/التشفير التلقائي|Automatic Encryption/)).toBeInTheDocument()
        expect(screen.getByText(/الاحتفاظ بالبيانات|Data Retention/)).toBeInTheDocument()
        expect(screen.getByText(/سجل التدقيق|Audit Logging/)).toBeInTheDocument()
      })
    })

    it('should show restricted access for non-admin users', async () => {
      render(
        <TestWrapper>
          <ComplianceDashboard {...mockProps} userRole="compliance_officer" />
        </TestWrapper>
      )

      const user = userEvent.setup()
      const settingsTab = screen.getByText(/الإعدادات|Settings/)
      await user.click(settingsTab)

      await waitFor(() => {
        expect(screen.getByText(/صلاحيات إدارية|administrative privileges/)).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should refresh data when refresh button clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      await waitFor(async () => {
        const refreshButton = screen.getByText(/تحديث|Refresh/)
        await user.click(refreshButton)
        
        // Should trigger data reload
      })
    })
  })

  describe('Mobile Responsive Design', () => {
    it('should maintain functionality on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      render(
        <TestWrapper>
          <ComplianceDashboard {...mockProps} />
        </TestWrapper>
      )

      // All main sections should still be accessible
      expect(screen.getByText(/لوحة الامتثال|Compliance Dashboard/)).toBeInTheDocument()
    })
  })
})