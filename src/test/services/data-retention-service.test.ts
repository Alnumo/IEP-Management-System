import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DataRetentionService } from '../../services/data-retention-service'
import { supabase } from '../../lib/supabase'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            data: [],
            error: null
          })),
          limit: vi.fn(() => ({
            data: [],
            error: null
          }))
        })),
        order: vi.fn(() => ({
          data: [],
          error: null,
          limit: vi.fn(() => ({
            data: [],
            error: null
          }))
        })),
        not: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          }))
        })),
        gte: vi.fn(() => ({
          data: [],
          error: null
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    })),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-123' } },
        error: null
      }))
    }
  }
}))

describe('DataRetentionService', () => {
  const mockPolicy = {
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getRetentionPolicies', () => {
    it('should fetch all retention policies successfully', async () => {
      const mockPolicies = [mockPolicy]
      
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockPolicies,
            error: null
          })
        })
      } as any)

      const result = await DataRetentionService.getRetentionPolicies()
      
      expect(supabase.from).toHaveBeenCalledWith('data_retention_policies')
      expect(result).toEqual(mockPolicies)
    })

    it('should handle fetch errors', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error')
          })
        })
      } as any)

      await expect(DataRetentionService.getRetentionPolicies())
        .rejects.toThrow('Failed to fetch retention policies')
    })
  })

  describe('getRetentionPolicy', () => {
    it('should fetch policy for specific table', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPolicy,
              error: null
            })
          })
        })
      } as any)

      const result = await DataRetentionService.getRetentionPolicy('medical_records')
      
      expect(result).toEqual(mockPolicy)
    })

    it('should return null when policy not found', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      } as any)

      const result = await DataRetentionService.getRetentionPolicy('nonexistent_table')
      
      expect(result).toBeNull()
    })
  })

  describe('updateRetentionPolicy', () => {
    it('should update retention policy successfully', async () => {
      const updates = { retention_period_days: 3000 }
      const updatedPolicy = { ...mockPolicy, ...updates }
      
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedPolicy,
                error: null
              })
            })
          })
        })
      } as any)

      const result = await DataRetentionService.updateRetentionPolicy('medical_records', updates)
      
      expect(result.retention_period_days).toBe(3000)
    })

    it('should handle update errors', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Update failed')
              })
            })
          })
        })
      } as any)

      await expect(DataRetentionService.updateRetentionPolicy('medical_records', {}))
        .rejects.toThrow('Failed to update retention policy for medical_records')
    })
  })

  describe('checkRetentionCompliance', () => {
    it('should check compliance successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockCompliance,
        error: null
      })

      const result = await DataRetentionService.checkRetentionCompliance('medical_records')
      
      expect(supabase.rpc).toHaveBeenCalledWith('check_data_retention_compliance', {
        target_table_name: 'medical_records'
      })
      expect(result).toEqual(mockCompliance)
    })

    it('should handle compliance check errors', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Compliance check failed')
      })

      await expect(DataRetentionService.checkRetentionCompliance('medical_records'))
        .rejects.toThrow('Failed to check retention compliance for medical_records')
    })
  })

  describe('getExpiredRecords', () => {
    it('should identify expired records', async () => {
      const mockExpiredRecords = [
        {
          record_id: 'record-123',
          created_at: '2020-01-01T00:00:00Z',
          days_expired: 30
        }
      ]
      
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockExpiredRecords,
        error: null
      })

      const result = await DataRetentionService.getExpiredRecords('medical_records')
      
      expect(supabase.rpc).toHaveBeenCalledWith('identify_expired_records', {
        target_table_name: 'medical_records'
      })
      expect(result).toEqual(mockExpiredRecords)
    })
  })

  describe('deleteExpiredRecords', () => {
    it('should delete expired records with dry run', async () => {
      const mockDeletionResult = {
        table_name: 'medical_records',
        expired_records_found: 50,
        records_deleted: 0,
        dry_run: true,
        backup_created: false,
        backup_id: null,
        retention_policy: mockPolicy
      }
      
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockDeletionResult,
        error: null
      })

      const result = await DataRetentionService.deleteExpiredRecords('medical_records', true)
      
      expect(supabase.rpc).toHaveBeenCalledWith('secure_delete_expired_records', {
        target_table_name: 'medical_records',
        dry_run: true
      })
      expect(result.dry_run).toBe(true)
      expect(result.records_deleted).toBe(0)
    })

    it('should delete expired records without dry run', async () => {
      const mockDeletionResult = {
        table_name: 'medical_records',
        expired_records_found: 50,
        records_deleted: 50,
        dry_run: false,
        backup_created: true,
        backup_id: 'backup-456',
        retention_policy: mockPolicy
      }
      
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockDeletionResult,
        error: null
      })

      const result = await DataRetentionService.deleteExpiredRecords('medical_records', false)
      
      expect(result.dry_run).toBe(false)
      expect(result.records_deleted).toBe(50)
      expect(result.backup_created).toBe(true)
    })
  })

  describe('createTableBackup', () => {
    it('should create table backup successfully', async () => {
      const backupId = 'BACKUP-medical_records-1234567890'
      
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: backupId,
        error: null
      })

      const result = await DataRetentionService.createTableBackup('medical_records', 'MANUAL')
      
      expect(supabase.rpc).toHaveBeenCalledWith('create_table_backup', {
        target_table_name: 'medical_records',
        backup_reason: 'MANUAL'
      })
      expect(result).toBe(backupId)
    })

    it('should handle backup creation errors', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Backup failed')
      })

      await expect(DataRetentionService.createTableBackup('medical_records'))
        .rejects.toThrow('Failed to create backup for medical_records')
    })
  })

  describe('createMedicalBackup', () => {
    it('should create comprehensive medical backup', async () => {
      const backupId = 'MEDICAL-BACKUP-1234567890'
      
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: backupId,
        error: null
      })

      const result = await DataRetentionService.createMedicalBackup('ALL_MEDICAL', false)
      
      expect(supabase.rpc).toHaveBeenCalledWith('create_medical_backup', {
        backup_scope: 'ALL_MEDICAL',
        include_deleted: false
      })
      expect(result).toBe(backupId)
    })
  })

  describe('runRetentionPolicyCheck', () => {
    it('should run retention policy check successfully', async () => {
      const checkResult = {
        status: 'completed',
        tables_checked: 5,
        results: [mockCompliance],
        timestamp: '2025-01-01T12:00:00Z'
      }
      
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: checkResult,
        error: null
      })

      const result = await DataRetentionService.runRetentionPolicyCheck()
      
      expect(supabase.rpc).toHaveBeenCalledWith('run_retention_policy_check')
      expect(result).toEqual(checkResult)
    })
  })

  describe('getBackups', () => {
    it('should fetch backup records', async () => {
      const mockBackups = [mockBackup]
      
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: mockBackups,
              error: null
            })
          })
        })
      } as any)

      const result = await DataRetentionService.getBackups(50)
      
      expect(result).toEqual(mockBackups)
    })

    it('should fetch backups filtered by table', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [mockBackup],
                error: null
              })
            })
          })
        })
      } as any)

      const result = await DataRetentionService.getBackups(50, 'medical_records')
      
      expect(result).toEqual([mockBackup])
    })
  })

  describe('getRetentionStatistics', () => {
    it('should calculate retention statistics', async () => {
      // Mock policy statistics
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: [
            { auto_delete_enabled: true },
            { auto_delete_enabled: false }
          ],
          error: null
        })
      } as any)

      // Mock backup count
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          count: 10,
          error: null
        })
      } as any)

      // Mock deletion count
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              count: 2,
              error: null
            })
          })
        })
      } as any)

      // Mock compliance overview
      const mockService = vi.spyOn(DataRetentionService, 'getComplianceOverview')
      mockService.mockResolvedValue([mockCompliance])

      const result = await DataRetentionService.getRetentionStatistics()
      
      expect(result.total_policies).toBe(2)
      expect(result.auto_delete_enabled).toBe(1)
      expect(result.total_backups).toBe(10)
      expect(result.recent_deletions).toBe(2)
      expect(result.compliance_score).toBe(95.0)

      mockService.mockRestore()
    })
  })

  describe('validateRetentionPolicy', () => {
    it('should validate correct policy settings', () => {
      const validPolicy = {
        retention_period_days: 2555,
        compliance_framework: 'HIPAA',
        auto_delete_enabled: true,
        backup_before_deletion: true
      }

      const errors = DataRetentionService.validateRetentionPolicy(validPolicy)
      expect(errors).toEqual([])
    })

    it('should reject invalid retention period', () => {
      const invalidPolicy = { retention_period_days: 0 }
      
      const errors = DataRetentionService.validateRetentionPolicy(invalidPolicy)
      expect(errors).toContain('Retention period must be at least 1 day')
    })

    it('should reject too long retention period', () => {
      const invalidPolicy = { retention_period_days: 11000 }
      
      const errors = DataRetentionService.validateRetentionPolicy(invalidPolicy)
      expect(errors).toContain('Retention period cannot exceed 30 years')
    })

    it('should reject invalid compliance framework', () => {
      const invalidPolicy = { compliance_framework: 'INVALID' }
      
      const errors = DataRetentionService.validateRetentionPolicy(invalidPolicy)
      expect(errors).toContain('Invalid compliance framework')
    })

    it('should reject auto-delete without backup', () => {
      const invalidPolicy = {
        auto_delete_enabled: true,
        backup_before_deletion: false
      }
      
      const errors = DataRetentionService.validateRetentionPolicy(invalidPolicy)
      expect(errors).toContain('Auto-delete requires backup before deletion to be enabled')
    })
  })

  describe('getBackupStorageUsage', () => {
    it('should calculate backup storage usage', async () => {
      const mockBackupData = [
        { backup_size_bytes: 1048576, created_at: '2025-01-01T00:00:00Z' },
        { backup_size_bytes: 2097152, created_at: '2025-01-02T00:00:00Z' }
      ]
      
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockBackupData,
              error: null
            })
          })
        })
      } as any)

      const result = await DataRetentionService.getBackupStorageUsage()
      
      expect(result.total_backups).toBe(2)
      expect(result.total_size_bytes).toBe(3145728) // 1MB + 2MB
      expect(result.total_size_gb).toBe(0) // Less than 1GB
      expect(result.oldest_backup).toBe('2025-01-01T00:00:00Z')
      expect(result.newest_backup).toBe('2025-01-02T00:00:00Z')
    })
  })

  describe('Arabic RTL and English LTR support', () => {
    it('should handle Arabic table names and descriptions', async () => {
      const arabicPolicy = {
        ...mockPolicy,
        table_name: 'السجلات_الطبية',
        policy_description: 'سياسة الاحتفاظ بالسجلات الطبية'
      }
      
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: arabicPolicy,
              error: null
            })
          })
        })
      } as any)

      const result = await DataRetentionService.getRetentionPolicy('السجلات_الطبية')
      
      expect(result?.table_name).toBe('السجلات_الطبية')
      expect(result?.policy_description).toBe('سياسة الاحتفاظ بالسجلات الطبية')
    })

    it('should handle mixed language metadata in backups', async () => {
      const bilingualBackup = {
        ...mockBackup,
        metadata: {
          description_ar: 'نسخة احتياطية من البيانات الطبية',
          description_en: 'Medical data backup',
          compliance_notes: 'HIPAA compliant backup procedure'
        }
      }
      
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: bilingualBackup,
              error: null
            })
          })
        })
      } as any)

      const result = await DataRetentionService.getBackup('backup-123')
      
      expect(result?.metadata.description_ar).toBe('نسخة احتياطية من البيانات الطبية')
      expect(result?.metadata.description_en).toBe('Medical data backup')
    })
  })

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Network error')
      })

      await expect(DataRetentionService.getRetentionPolicies())
        .rejects.toThrow('Failed to fetch retention policies')
    })

    it('should handle database connection errors', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Connection timeout'))

      await expect(DataRetentionService.checkRetentionCompliance('medical_records'))
        .rejects.toThrow('Failed to check retention compliance for medical_records')
    })
  })
})