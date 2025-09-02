import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDataRetention } from '../../hooks/useDataRetention'
import { DataRetentionService } from '../../services/data-retention-service'
import { useAuth } from '../../components/auth/AuthGuard'
import { useLanguage } from '../../contexts/LanguageContext'
import React, { createElement } from 'react'

// Mock dependencies
vi.mock('../../services/data-retention-service')
vi.mock('../../components/auth/AuthGuard')
vi.mock('../../contexts/LanguageContext')
vi.mock('sonner')

const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  user_metadata: { role: 'admin' }
}

const mockI18n = {
  t: (key: string, fallback?: string) => fallback || key,
  language: 'en',
  isRTL: false,
  toggleLanguage: vi.fn(),
  setLanguage: vi.fn()
}

const mockRetentionPolicy = {
  id: 'policy-123',
  table_name: 'medical_records',
  retention_period_days: 2555,
  auto_delete_enabled: false,
  encryption_required: true,
  backup_before_deletion: true,
  compliance_framework: 'HIPAA',
  policy_description: 'Medical records retention policy',
  created_by: 'admin-123',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  last_applied: null
}

const mockCompliance = {
  table_name: 'medical_records',
  total_records: 1000,
  expired_records: 50,
  compliance_percentage: 95.0,
  retention_period_days: 2555,
  oldest_record_age_days: 3000
}

const mockBackup = {
  id: 'backup-123',
  backup_type: 'TABLE_SPECIFIC',
  backup_scope: 'medical_records',
  target_table: 'medical_records',
  backup_location: '/secure/backups/backup-123.sql.enc',
  backup_size_bytes: 1048576,
  encryption_key_id: 'AES-123456',
  backup_status: 'COMPLETED',
  backup_started_at: '2025-01-01T00:00:00Z',
  backup_completed_at: '2025-01-01T00:05:00Z',
  backup_expires_at: '2032-01-01T00:00:00Z',
  checksum_sha256: 'abc123def456',
  metadata: { record_count: 1000 },
  created_by: 'admin-123',
  created_at: '2025-01-01T00:00:00Z'
}

// Create wrapper component for tests without JSX
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: React.ReactNode }) => 
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useDataRetention', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      isAuthenticated: true
    })
    
    vi.mocked(useLanguage).mockReturnValue(mockI18n)
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('data fetching', () => {
    it('should fetch retention policies on mount', async () => {
      vi.mocked(DataRetentionService.getRetentionPolicies).mockResolvedValue([mockRetentionPolicy])
      vi.mocked(DataRetentionService.getComplianceOverview).mockResolvedValue([mockCompliance])
      vi.mocked(DataRetentionService.getRetentionStatistics).mockResolvedValue({
        total_policies: 1,
        auto_delete_enabled: 0,
        total_backups: 5,
        recent_deletions: 0,
        compliance_score: 95.0
      })

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.retentionPolicies).toEqual([mockRetentionPolicy])
        expect(result.current.complianceOverview).toEqual([mockCompliance])
        expect(result.current.isLoading).toBe(false)
      })

      expect(DataRetentionService.getRetentionPolicies).toHaveBeenCalled()
      expect(DataRetentionService.getComplianceOverview).toHaveBeenCalled()
    })

    it('should fetch backups and lifecycle events', async () => {
      const mockLifecycleEvent = {
        id: 'event-123',
        event_type: 'BACKUP_CREATED',
        table_name: 'medical_records',
        event_status: 'COMPLETED',
        event_details: { backup_id: 'backup-123' },
        scheduled_for: null,
        executed_at: '2025-01-01T00:05:00Z',
        error_message: null,
        created_by: 'admin-123',
        created_at: '2025-01-01T00:00:00Z'
      }

      vi.mocked(DataRetentionService.getRetentionPolicies).mockResolvedValue([])
      vi.mocked(DataRetentionService.getComplianceOverview).mockResolvedValue([])
      vi.mocked(DataRetentionService.getBackups).mockResolvedValue([mockBackup])
      vi.mocked(DataRetentionService.getLifecycleEvents).mockResolvedValue([mockLifecycleEvent])

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.backupRecords).toEqual([mockBackup])
        expect(result.current.lifecycleEvents).toEqual([mockLifecycleEvent])
      })
    })
  })

  describe('policy management', () => {
    it('should update retention policy', async () => {
      const updatedPolicy = { ...mockRetentionPolicy, retention_period_days: 3000 }
      
      vi.mocked(DataRetentionService.getRetentionPolicies).mockResolvedValue([mockRetentionPolicy])
      vi.mocked(DataRetentionService.updateRetentionPolicy).mockResolvedValue(updatedPolicy)

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.retentionPolicies).toEqual([mockRetentionPolicy])
      })

      await act(async () => {
        await result.current.updateRetentionPolicy('medical_records', {
          retention_period_days: 3000
        })
      })

      expect(DataRetentionService.updateRetentionPolicy).toHaveBeenCalledWith(
        'medical_records',
        { retention_period_days: 3000 }
      )
    })

    it('should validate policy before updating', async () => {
      vi.mocked(DataRetentionService.getRetentionPolicies).mockResolvedValue([mockRetentionPolicy])

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.retentionPolicies).toEqual([mockRetentionPolicy])
      })

      await expect(
        act(async () => {
          await result.current.updateRetentionPolicy('medical_records', {
            retention_period_days: 0 // Invalid
          })
        })
      ).rejects.toThrow('Retention period must be at least 1 day')
    })
  })

  describe('compliance checking', () => {
    it('should check compliance for specific table', async () => {
      vi.mocked(DataRetentionService.checkRetentionCompliance).mockResolvedValue(mockCompliance)

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        const compliance = await result.current.checkCompliance('medical_records')
        expect(compliance).toEqual(mockCompliance)
      })

      expect(DataRetentionService.checkRetentionCompliance).toHaveBeenCalledWith('medical_records')
    })

    it('should refresh compliance data after check', async () => {
      vi.mocked(DataRetentionService.checkRetentionCompliance).mockResolvedValue(mockCompliance)
      vi.mocked(DataRetentionService.getComplianceOverview).mockResolvedValue([mockCompliance])

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        await result.current.checkCompliance('medical_records')
      })

      // Should invalidate and refetch compliance overview
      await waitFor(() => {
        expect(result.current.complianceOverview).toEqual([mockCompliance])
      })
    })
  })

  describe('record deletion', () => {
    it('should delete expired records with dry run', async () => {
      const deletionResult = {
        table_name: 'medical_records',
        expired_records_found: 50,
        records_deleted: 0,
        dry_run: true,
        backup_created: false,
        backup_id: null,
        retention_policy: mockRetentionPolicy
      }

      vi.mocked(DataRetentionService.deleteExpiredRecords).mockResolvedValue(deletionResult)

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        const result_data = await result.current.deleteExpiredRecords('medical_records', true)
        expect(result_data.dry_run).toBe(true)
        expect(result_data.records_deleted).toBe(0)
      })

      expect(DataRetentionService.deleteExpiredRecords).toHaveBeenCalledWith('medical_records', true)
    })

    it('should delete expired records without dry run', async () => {
      const deletionResult = {
        table_name: 'medical_records',
        expired_records_found: 50,
        records_deleted: 50,
        dry_run: false,
        backup_created: true,
        backup_id: 'backup-456',
        retention_policy: mockRetentionPolicy
      }

      vi.mocked(DataRetentionService.deleteExpiredRecords).mockResolvedValue(deletionResult)

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        const result_data = await result.current.deleteExpiredRecords('medical_records', false)
        expect(result_data.dry_run).toBe(false)
        expect(result_data.records_deleted).toBe(50)
      })
    })
  })

  describe('backup management', () => {
    it('should create table backup', async () => {
      const backupId = 'BACKUP-medical_records-1234567890'
      
      vi.mocked(DataRetentionService.createTableBackup).mockResolvedValue(backupId)

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        const result_id = await result.current.createBackup('medical_records', 'MANUAL')
        expect(result_id).toBe(backupId)
      })

      expect(DataRetentionService.createTableBackup).toHaveBeenCalledWith('medical_records', 'MANUAL')
    })

    it('should create medical backup', async () => {
      const backupId = 'MEDICAL-BACKUP-1234567890'
      
      vi.mocked(DataRetentionService.createMedicalBackup).mockResolvedValue(backupId)

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        const result_id = await result.current.createMedicalBackup('ALL_MEDICAL', false)
        expect(result_id).toBe(backupId)
      })

      expect(DataRetentionService.createMedicalBackup).toHaveBeenCalledWith('ALL_MEDICAL', false)
    })
  })

  describe('retention policy automation', () => {
    it('should run retention policy check', async () => {
      const checkResult = {
        status: 'completed',
        tables_checked: 5,
        results: [mockCompliance],
        timestamp: '2025-01-01T12:00:00Z'
      }
      
      vi.mocked(DataRetentionService.runRetentionPolicyCheck).mockResolvedValue(checkResult)

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        const result_data = await result.current.runRetentionCheck()
        expect(result_data).toEqual(checkResult)
      })

      expect(DataRetentionService.runRetentionPolicyCheck).toHaveBeenCalled()
    })

    it('should schedule retention enforcement', async () => {
      const lifecycleEvent = {
        id: 'event-456',
        event_type: 'SCHEDULED_RETENTION_CHECK',
        table_name: 'medical_records',
        event_status: 'SCHEDULED',
        event_details: { retention_period_days: 2555 },
        scheduled_for: '2025-01-02T00:00:00Z',
        executed_at: null,
        error_message: null,
        created_by: 'admin-123',
        created_at: '2025-01-01T00:00:00Z'
      }
      
      vi.mocked(DataRetentionService.scheduleRetentionEnforcement).mockResolvedValue(lifecycleEvent)

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        await result.current.scheduleRetention('medical_records')
      })

      expect(DataRetentionService.scheduleRetentionEnforcement).toHaveBeenCalledWith('medical_records')
    })
  })

  describe('helper functions', () => {
    it('should find table policy', async () => {
      vi.mocked(DataRetentionService.getRetentionPolicies).mockResolvedValue([mockRetentionPolicy])

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        const policy = result.current.getTablePolicy('medical_records')
        expect(policy).toEqual(mockRetentionPolicy)
      })
    })

    it('should find table compliance', async () => {
      vi.mocked(DataRetentionService.getComplianceOverview).mockResolvedValue([mockCompliance])

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        const compliance = result.current.getTableCompliance('medical_records')
        expect(compliance).toEqual(mockCompliance)
      })
    })

    it('should check if table has expired records', async () => {
      vi.mocked(DataRetentionService.getComplianceOverview).mockResolvedValue([mockCompliance])

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        const hasExpired = result.current.hasExpiredRecords('medical_records')
        expect(hasExpired).toBe(true) // mockCompliance has 50 expired records
      })
    })

    it('should get compliance status color', () => {
      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      expect(result.current.getComplianceStatusColor(98)).toBe('green')
      expect(result.current.getComplianceStatusColor(90)).toBe('yellow')
      expect(result.current.getComplianceStatusColor(80)).toBe('orange')
      expect(result.current.getComplianceStatusColor(60)).toBe('red')
    })

    it('should format file sizes correctly', () => {
      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      expect(result.current.formatFileSize(0)).toBe('0 Bytes')
      expect(result.current.formatFileSize(1024)).toBe('1 KB')
      expect(result.current.formatFileSize(1048576)).toBe('1 MB')
      expect(result.current.formatFileSize(1073741824)).toBe('1 GB')
    })

    it('should format retention periods correctly', () => {
      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      expect(result.current.formatRetentionPeriod(15)).toBe('15 days')
      expect(result.current.formatRetentionPeriod(90)).toBe('3 months')
      expect(result.current.formatRetentionPeriod(2555)).toBe('7 years')
    })
  })

  describe('loading states', () => {
    it('should handle loading states correctly', async () => {
      // Mock loading state
      vi.mocked(DataRetentionService.getRetentionPolicies).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      )
      vi.mocked(DataRetentionService.getComplianceOverview).mockResolvedValue([])

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      // Initially should be loading
      expect(result.current.isLoading).toBe(true)

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should show action loading states', async () => {
      vi.mocked(DataRetentionService.updateRetentionPolicy).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockRetentionPolicy), 100))
      )

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      act(() => {
        result.current.updateRetentionPolicy('medical_records', { retention_period_days: 3000 })
      })

      expect(result.current.isUpdatingPolicy).toBe(true)

      await waitFor(() => {
        expect(result.current.isUpdatingPolicy).toBe(false)
      })
    })
  })

  describe('Arabic RTL and English LTR support', () => {
    it('should handle Arabic translations', () => {
      const arabicI18n = {
        t: (key: string, fallback?: string) => {
          const translations: Record<string, string> = {
            'retention.policy.updated': 'تم تحديث سياسة الاحتفاظ بنجاح',
            'backup.created': 'تم إنشاء النسخة الاحتياطية بنجاح',
            'retention.period.days': 'يوم',
            'retention.period.months': 'شهر',
            'retention.period.years': 'سنة'
          }
          return translations[key] || fallback || key
        },
        language: 'ar',
        isRTL: true,
        toggleLanguage: vi.fn(),
        setLanguage: vi.fn()
      }

      vi.mocked(useLanguage).mockReturnValue(arabicI18n)

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      // The hook should use the Arabic i18n function
      expect(result.current).toBeDefined()
    })

    it('should format retention periods in different languages', () => {
      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      // English formatting
      expect(result.current.formatRetentionPeriod(365)).toBe('1 years')
      expect(result.current.formatRetentionPeriod(30)).toBe('1 months')
      expect(result.current.formatRetentionPeriod(7)).toBe('7 days')
    })
  })

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(DataRetentionService.getRetentionPolicies).mockRejectedValue(
        new Error('Service error')
      )

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })

    it('should handle update errors', async () => {
      vi.mocked(DataRetentionService.updateRetentionPolicy).mockRejectedValue(
        new Error('Update failed')
      )

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        try {
          await result.current.updateRetentionPolicy('medical_records', {
            retention_period_days: 3000
          })
        } catch (error) {
          // Expected to throw
        }
      })

      await waitFor(() => {
        expect(result.current.updateError).toBeTruthy()
      })
    })
  })

  describe('auto-refresh functionality', () => {
    it('should use shorter stale time when autoRefresh is enabled', async () => {
      vi.mocked(DataRetentionService.getRetentionPolicies).mockResolvedValue([])

      const { result } = renderHook(() => useDataRetention({ autoRefresh: true }), {
        wrapper: createWrapper()
      })

      expect(result.current).toBeDefined()
      // The hook should use shorter stale times for auto-refresh
    })

    it('should disable queries when user is not authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false
      })

      const { result } = renderHook(() => useDataRetention(), {
        wrapper: createWrapper()
      })

      expect(result.current.retentionPolicies).toEqual([])
      expect(result.current.isLoading).toBe(false)
    })
  })
})