/**
 * Medical Data Migration Service Tests
 * Story 1.2: Security Compliance & Data Protection
 * Tests migration of medical records with data integrity verification
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { MedicalDataMigrationService } from '../../services/medical-data-migration'

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis()
    })),
    rpc: vi.fn()
  }
}))

vi.mock('../../services/encryption-service', () => ({
  EncryptionService: vi.fn().mockImplementation(() => ({
    encryptMedicalRecord: vi.fn(),
    decryptMedicalField: vi.fn()
  }))
}))

import { supabase } from '../../lib/supabase'

// Mock crypto API for hash calculation
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn().mockImplementation(() => {
        return Promise.resolve(new ArrayBuffer(32))
      })
    }
  }
})

Object.defineProperty(global, 'TextEncoder', {
  value: class TextEncoder {
    encode(input: string) {
      return new Uint8Array(input.split('').map(char => char.charCodeAt(0)))
    }
  }
})

describe('MedicalDataMigrationService', () => {
  let migrationService: MedicalDataMigrationService
  const mockSupabaseFrom = supabase.from as Mock
  const mockSupabaseRpc = supabase.rpc as Mock

  beforeEach(() => {
    migrationService = new MedicalDataMigrationService()
    vi.clearAllMocks()
  })

  describe('migrateMedicalRecords', () => {
    it('should migrate medical records successfully', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          medical_history: { condition: 'Test condition' },
          current_medications: { current: ['Med1'] },
          is_encrypted: false,
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'record-2',
          medical_history: { condition: 'Another condition' },
          current_medications: { current: ['Med2'] },
          is_encrypted: false,
          created_at: '2025-01-02T00:00:00Z'
        }
      ]

      const mockEncryptedResult = {
        medicalHistory: {
          encryptedData: 'encrypted_history',
          keyId: 'KEY-123',
          iv: 'iv_123',
          authTag: 'tag_123',
          algorithm: 'AES-256-GCM'
        },
        medications: {
          encryptedData: 'encrypted_meds',
          keyId: 'KEY-123',
          iv: 'iv_124',
          authTag: 'tag_124',
          algorithm: 'AES-256-GCM'
        }
      }

      // Mock database queries
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockRecords,
          error: null
        }),
        update: vi.fn().mockReturnThis(),
        single: vi.fn()
      })

      // Mock encryption service
      const mockEncryptionService = (migrationService as any).encryptionService
      mockEncryptionService.encryptMedicalRecord.mockResolvedValue(mockEncryptedResult)

      // Mock get encryption key
      mockSupabaseRpc.mockResolvedValue({
        data: { key_id: 'KEY-123' },
        error: null
      })

      // Mock update operations
      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      mockSupabaseFrom.mockReturnValue(mockUpdate)

      const result = await migrationService.migrateMedicalRecords({
        batchSize: 2,
        verifyIntegrity: false,
        dryRun: false
      })

      expect(result.totalRecords).toBe(2)
      expect(result.successful).toBe(2)
      expect(result.errors).toBe(0)
      expect(result.processed).toBe(2)
    })

    it('should handle dry run mode', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          medical_history: { condition: 'Test condition' },
          is_encrypted: false
        }
      ]

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockRecords,
          error: null
        })
      })

      const result = await migrationService.migrateMedicalRecords({
        dryRun: true,
        verifyIntegrity: false
      })

      expect(result.totalRecords).toBe(1)
      expect(result.successful).toBe(1)
      expect(result.results[0].message).toBe('Dry run - would encrypt')
      
      // Should not call encryption service in dry run
      const mockEncryptionService = (migrationService as any).encryptionService
      expect(mockEncryptionService.encryptMedicalRecord).not.toHaveBeenCalled()
    })

    it('should skip already encrypted records', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          medical_history: { condition: 'Test condition' },
          is_encrypted: true
        }
      ]

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockRecords,
          error: null
        })
      })

      const result = await migrationService.migrateMedicalRecords({
        verifyIntegrity: false
      })

      expect(result.skipped).toBe(1)
      expect(result.results[0].message).toBe('Record already encrypted')
    })

    it('should skip records with no sensitive data', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          medical_history: null,
          current_medications: null,
          allergies: null,
          is_encrypted: false
        }
      ]

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockRecords,
          error: null
        })
      })

      const result = await migrationService.migrateMedicalRecords({
        verifyIntegrity: false
      })

      expect(result.skipped).toBe(1)
      expect(result.results[0].message).toBe('No sensitive data to encrypt')
    })

    it('should handle encryption errors gracefully', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          medical_history: { condition: 'Test condition' },
          is_encrypted: false
        }
      ]

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockRecords,
          error: null
        })
      })

      // Mock encryption service to throw error
      const mockEncryptionService = (migrationService as any).encryptionService
      mockEncryptionService.encryptMedicalRecord.mockRejectedValue(
        new Error('Encryption failed')
      )

      const result = await migrationService.migrateMedicalRecords({
        verifyIntegrity: false
      })

      expect(result.errors).toBe(1)
      expect(result.results[0].status).toBe('error')
      expect(result.results[0].message).toBe('Encryption failed')
    })

    it('should handle database fetch errors', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      })

      await expect(migrationService.migrateMedicalRecords())
        .rejects.toThrow('Failed to fetch medical records: Database connection failed')
    })

    it('should handle empty result set', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      const result = await migrationService.migrateMedicalRecords()

      expect(result.totalRecords).toBe(0)
      expect(result.processed).toBe(0)
      expect(result.successful).toBe(0)
      expect(result.errors).toBe(0)
    })
  })

  describe('getMigrationStatus', () => {
    it('should return correct migration status', async () => {
      // Mock total records count
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({
            data: new Array(100).fill({ id: 'record' }),
            error: null
          })
        })
        // Mock encrypted records count
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: new Array(75).fill({ id: 'record' }),
            error: null
          })
        })

      const status = await migrationService.getMigrationStatus()

      expect(status.totalRecords).toBe(100)
      expect(status.encryptedRecords).toBe(75)
      expect(status.unencryptedRecords).toBe(25)
      expect(status.migrationProgress).toBe(75)
    })

    it('should handle zero records correctly', async () => {
      mockSupabaseFrom
        .mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [],
            error: null
          }),
          eq: vi.fn().mockReturnThis()
        })

      const status = await migrationService.getMigrationStatus()

      expect(status.totalRecords).toBe(0)
      expect(status.encryptedRecords).toBe(0)
      expect(status.migrationProgress).toBe(0)
    })

    it('should handle database errors', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Query failed' }
        }),
        eq: vi.fn().mockReturnThis()
      })

      await expect(migrationService.getMigrationStatus())
        .rejects.toThrow('Failed to get migration status')
    })
  })

  describe('rollbackRecordMigration', () => {
    it('should rollback encrypted record successfully', async () => {
      const mockRecord = {
        id: 'record-1',
        medical_history: {
          encryptedData: 'encrypted_data',
          keyId: 'KEY-123',
          iv: 'iv_123',
          authTag: 'tag_123'
        },
        is_encrypted: true,
        audit_log: []
      }

      // Mock fetch encrypted record
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockRecord,
          error: null
        }),
        update: vi.fn().mockReturnThis()
      })

      // Mock decryption
      const mockEncryptionService = (migrationService as any).encryptionService
      mockEncryptionService.decryptMedicalField.mockResolvedValue({
        condition: 'Test condition'
      })

      const result = await migrationService.rollbackRecordMigration('record-1')

      expect(result).toBe(true)
      expect(mockEncryptionService.decryptMedicalField).toHaveBeenCalled()
    })

    it('should handle rollback errors gracefully', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Record not found' }
        })
      })

      const result = await migrationService.rollbackRecordMigration('nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('Data Integrity', () => {
    it('should calculate consistent data hashes', async () => {
      const testData = {
        diagnosisCodes: ['ICD-10-001'],
        medicalHistory: { condition: 'Test condition' }
      }

      const hash1 = await (migrationService as any).calculateDataHash(testData)
      const hash2 = await (migrationService as any).calculateDataHash(testData)

      expect(hash1).toBe(hash2)
      expect(typeof hash1).toBe('string')
      expect(hash1.length).toBeGreaterThan(0)
    })

    it('should produce different hashes for different data', async () => {
      const data1 = { diagnosisCodes: ['ICD-10-001'] }
      const data2 = { diagnosisCodes: ['ICD-10-002'] }

      const hash1 = await (migrationService as any).calculateDataHash(data1)
      const hash2 = await (migrationService as any).calculateDataHash(data2)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Batch Processing', () => {
    it('should process records in specified batch sizes', async () => {
      const mockRecords = new Array(25).fill(0).map((_, i) => ({
        id: `record-${i}`,
        medical_history: { condition: `Condition ${i}` },
        is_encrypted: false
      }))

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockRecords,
          error: null
        }),
        update: vi.fn().mockReturnThis()
      })

      const mockEncryptionService = (migrationService as any).encryptionService
      mockEncryptionService.encryptMedicalRecord.mockResolvedValue({
        medicalHistory: { encryptedData: 'encrypted' }
      })

      mockSupabaseRpc.mockResolvedValue({
        data: { key_id: 'KEY-123' },
        error: null
      })

      const result = await migrationService.migrateMedicalRecords({
        batchSize: 10,
        verifyIntegrity: false
      })

      expect(result.totalRecords).toBe(25)
      expect(result.processed).toBe(25)
    })
  })

  describe('Error Recovery', () => {
    it('should continue processing after individual record failures', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          medical_history: { condition: 'Test condition 1' },
          is_encrypted: false
        },
        {
          id: 'record-2',
          medical_history: { condition: 'Test condition 2' },
          is_encrypted: false
        }
      ]

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockRecords,
          error: null
        })
      })

      const mockEncryptionService = (migrationService as any).encryptionService
      mockEncryptionService.encryptMedicalRecord
        .mockRejectedValueOnce(new Error('Encryption failed for record 1'))
        .mockResolvedValueOnce({ medicalHistory: { encryptedData: 'encrypted' } })

      mockSupabaseRpc.mockResolvedValue({
        data: { key_id: 'KEY-123' },
        error: null
      })

      const result = await migrationService.migrateMedicalRecords({
        verifyIntegrity: false
      })

      expect(result.errors).toBe(1)
      expect(result.successful).toBe(1)
      expect(result.processed).toBe(2)
    })
  })
})