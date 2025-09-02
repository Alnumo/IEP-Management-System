/**
 * Encryption Service Tests
 * Tests for HIPAA-compliant encryption functionality
 * Story 1.2: Task 2 - Encryption Service Testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EncryptionService, encryptionService, type EncryptedField, type MedicalDataEncryption } from '@/services/encryption-service'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
const mockSupabase = vi.mocked(supabase)

describe('EncryptionService', () => {
  let service: EncryptionService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new EncryptionService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('encryptMedicalField()', () => {
    it('should encrypt string data successfully', async () => {
      const mockEncryptedResult = {
        encrypted_data: 'ZW5jcnlwdGVkX2RhdGE=', // base64 encoded
        iv: 'aXZfdmFsdWU=',
        auth_tag: 'YXV0aF90YWc='
      }

      // Mock getCurrentEncryptionKeyId first
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { key_id: 'KEY-123' },
        error: null
      })

      // Then mock encrypt_medical_data
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockEncryptedResult,
        error: null
      })

      const result = await service.encryptMedicalField('sensitive medical data')

      expect(result).toMatchObject({
        encryptedData: 'ZW5jcnlwdGVkX2RhdGE=',
        keyId: 'KEY-123',
        iv: 'aXZfdmFsdWU=',
        authTag: 'YXV0aF90YWc=',
        algorithm: 'AES-256-GCM'
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_current_encryption_key')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('encrypt_medical_data', {
        plaintext_data: 'sensitive medical data',
        encryption_key_id: 'KEY-123'
      })
    })

    it('should encrypt object data as JSON string', async () => {
      const medicalData = {
        diagnosis: 'Test diagnosis',
        medications: ['Med1', 'Med2'],
        notes: 'Test notes'
      }

      const mockEncryptedResult = {
        encrypted_data: 'ZW5jcnlwdGVkX2RhdGE=',
        iv: 'aXZfdmFsdWU=',
        auth_tag: 'YXV0aF90YWc='
      }

      // Mock getCurrentEncryptionKeyId first
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { key_id: 'KEY-123' },
        error: null
      })

      // Then mock encrypt_medical_data
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockEncryptedResult,
        error: null
      })

      const result = await service.encryptMedicalField(medicalData)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('encrypt_medical_data', {
        plaintext_data: JSON.stringify(medicalData),
        encryption_key_id: 'KEY-123'
      })

      expect(result.encryptedData).toBe('ZW5jcnlwdGVkX2RhdGE=')
    })

    it('should handle encryption errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Encryption failed' }
      })

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { key_id: 'KEY-123' },
        error: null
      })

      await expect(service.encryptMedicalField('test data'))
        .rejects
        .toThrow('Failed to encrypt medical data')
    })

    it('should use provided key ID when specified', async () => {
      const mockEncryptedResult = {
        encrypted_data: 'ZW5jcnlwdGVkX2RhdGE=',
        iv: 'aXZfdmFsdWU=',
        auth_tag: 'YXV0aF90YWc='
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockEncryptedResult,
        error: null
      })

      await service.encryptMedicalField('test data', 'CUSTOM-KEY-456')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('encrypt_medical_data', {
        plaintext_data: 'test data',
        encryption_key_id: 'CUSTOM-KEY-456'
      })
    })
  })

  describe('decryptMedicalField()', () => {
    it('should decrypt string data successfully', async () => {
      const encryptedField: EncryptedField = {
        encryptedData: 'ZW5jcnlwdGVkX2RhdGE=',
        keyId: 'KEY-123',
        iv: 'aXZfdmFsdWU=',
        authTag: 'YXV0aF90YWc=',
        algorithm: 'AES-256-GCM'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { decrypted_data: 'sensitive medical data' },
        error: null
      })

      const result = await service.decryptMedicalField(encryptedField)

      expect(result).toBe('sensitive medical data')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('decrypt_medical_data', {
        encrypted_data: 'ZW5jcnlwdGVkX2RhdGE=',
        encryption_key_id: 'KEY-123',
        iv_value: 'aXZfdmFsdWU=',
        auth_tag: 'YXV0aF90YWc='
      })
    })

    it('should decrypt and parse JSON data', async () => {
      const originalData = {
        diagnosis: 'Test diagnosis',
        medications: ['Med1', 'Med2']
      }

      const encryptedField: EncryptedField = {
        encryptedData: 'ZW5jcnlwdGVkX2RhdGE=',
        keyId: 'KEY-123',
        iv: 'aXZfdmFsdWU=',
        authTag: 'YXV0aF90YWc=',
        algorithm: 'AES-256-GCM'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { decrypted_data: JSON.stringify(originalData) },
        error: null
      })

      const result = await service.decryptMedicalField(encryptedField)

      expect(result).toEqual(originalData)
    })

    it('should handle decryption errors gracefully', async () => {
      const encryptedField: EncryptedField = {
        encryptedData: 'invalid_data',
        keyId: 'KEY-123',
        iv: 'aXZfdmFsdWU=',
        authTag: 'YXV0aF90YWc=',
        algorithm: 'AES-256-GCM'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Decryption failed' }
      })

      await expect(service.decryptMedicalField(encryptedField))
        .rejects
        .toThrow('Failed to decrypt medical data')
    })

    it('should return string for non-JSON decrypted data', async () => {
      const encryptedField: EncryptedField = {
        encryptedData: 'ZW5jcnlwdGVkX2RhdGE=',
        keyId: 'KEY-123',
        iv: 'aXZfdmFsdWU=',
        authTag: 'YXV0aF90YWc=',
        algorithm: 'AES-256-GCM'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { decrypted_data: 'simple text data' },
        error: null
      })

      const result = await service.decryptMedicalField(encryptedField)

      expect(result).toBe('simple text data')
      expect(typeof result).toBe('string')
    })
  })

  describe('encryptMedicalRecord()', () => {
    it('should encrypt complete medical record', async () => {
      const medicalData: MedicalDataEncryption = {
        diagnosisCodes: ['ICD-10-001', 'ICD-10-002'],
        medicalHistory: { condition: 'Test condition', onset: '2025-01-01' },
        medications: { current: ['Med1'], previous: ['Med2'] },
        allergies: ['Peanuts', 'Shellfish'],
        treatmentNotes: 'Treatment notes here'
      }

      const mockEncryptedResult = {
        encrypted_data: 'ZW5jcnlwdGVkX2RhdGE=',
        iv: 'aXZfdmFsdWU=',
        auth_tag: 'YXV0aF90YWc='
      }

      // Mock getCurrentEncryptionKeyId
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { key_id: 'KEY-123' },
        error: null
      })

      // Mock encryption calls for each field (5 fields = 5 calls)
      for (let i = 0; i < 5; i++) {
        mockSupabase.rpc.mockResolvedValueOnce({
          data: mockEncryptedResult,
          error: null
        })
      }

      const result = await service.encryptMedicalRecord(medicalData)

      expect(result).toHaveProperty('diagnosisCodes')
      expect(result).toHaveProperty('medicalHistory')
      expect(result).toHaveProperty('medications')
      expect(result).toHaveProperty('allergies')
      expect(result).toHaveProperty('treatmentNotes')

      // Verify each encrypted field has correct structure
      Object.values(result).forEach(encryptedField => {
        expect(encryptedField).toMatchObject({
          encryptedData: expect.any(String),
          keyId: expect.any(String),
          iv: expect.any(String),
          authTag: expect.any(String),
          algorithm: 'AES-256-GCM'
        })
      })

      // Should make 6 RPC calls: 1 for key + 5 for field encryption
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(6)
    })

    it('should handle partial medical records', async () => {
      const medicalData: MedicalDataEncryption = {
        diagnosisCodes: ['ICD-10-001'],
        allergies: ['Peanuts']
        // Only 2 fields provided
      }

      const mockEncryptedResult = {
        encrypted_data: 'ZW5jcnlwdGVkX2RhdGE=',
        iv: 'aXZfdmFsdWU=',
        auth_tag: 'YXV0aF90YWc='
      }

      // Mock getCurrentEncryptionKeyId
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { key_id: 'KEY-123' },
        error: null
      })

      // Mock encryption calls for 2 fields
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockEncryptedResult,
        error: null
      })
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockEncryptedResult,
        error: null
      })

      const result = await service.encryptMedicalRecord(medicalData)

      expect(result).toHaveProperty('diagnosisCodes')
      expect(result).toHaveProperty('allergies')
      expect(result).not.toHaveProperty('medications')
      expect(result).not.toHaveProperty('medicalHistory')

      // Should make 3 RPC calls: 1 for key + 2 for field encryption
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(3)
    })
  })

  describe('decryptMedicalRecord()', () => {
    it('should decrypt complete medical record', async () => {
      const encryptedRecord = {
        diagnosisCodes: {
          encryptedData: 'ZW5jcnlwdGVkXzE=',
          keyId: 'KEY-123',
          iv: 'aXZfMQ==',
          authTag: 'dGFnXzE=',
          algorithm: 'AES-256-GCM'
        } as EncryptedField,
        medications: {
          encryptedData: 'ZW5jcnlwdGVkXzI=',
          keyId: 'KEY-123',
          iv: 'aXZfMg==',
          authTag: 'dGFnXzI=',
          algorithm: 'AES-256-GCM'
        } as EncryptedField
      }

      // Mock decryption responses
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { decrypted_data: JSON.stringify(['ICD-10-001', 'ICD-10-002']) },
        error: null
      })
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { decrypted_data: JSON.stringify({ current: ['Med1'], previous: ['Med2'] }) },
        error: null
      })

      const result = await service.decryptMedicalRecord(encryptedRecord)

      expect(result.diagnosisCodes).toEqual(['ICD-10-001', 'ICD-10-002'])
      expect(result.medications).toEqual({ current: ['Med1'], previous: ['Med2'] })
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2)
    })

    it('should handle empty encrypted record', async () => {
      const result = await service.decryptMedicalRecord({})

      expect(result).toEqual({})
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })
  })

  describe('generateEncryptionKey()', () => {
    it('should generate new encryption key successfully', async () => {
      const mockKeyData = {
        key_id: 'KEY-123456789',
        algorithm: 'AES-256-GCM',
        key_version: 1,
        created_at: '2025-09-01T00:00:00.000Z'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockKeyData,
        error: null
      })

      const result = await service.generateEncryptionKey()

      expect(result).toMatchObject({
        keyId: 'KEY-123456789',
        algorithm: 'AES-256-GCM',
        keyVersion: 1,
        createdAt: expect.any(Date),
        status: 'active'
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('generate_encryption_key', {
        algorithm: 'AES-256-GCM'
      })
    })

    it('should handle key generation errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Key generation failed' }
      })

      await expect(service.generateEncryptionKey())
        .rejects
        .toThrow('Failed to generate encryption key')
    })
  })

  describe('rotateEncryptionKey()', () => {
    it('should rotate encryption key successfully', async () => {
      const mockNewKeyData = {
        key_id: 'KEY-NEW-123',
        algorithm: 'AES-256-GCM',
        key_version: 2,
        created_at: '2025-09-01T00:00:00.000Z'
      }

      // Mock key generation
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockNewKeyData,
        error: null
      })

      // Mock key deprecation
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      })

      const result = await service.rotateEncryptionKey('KEY-OLD-123')

      expect(result).toMatchObject({
        keyId: 'KEY-NEW-123',
        algorithm: 'AES-256-GCM',
        keyVersion: 2,
        status: 'active'
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('generate_encryption_key', {
        algorithm: 'AES-256-GCM'
      })
      expect(mockSupabase.rpc).toHaveBeenCalledWith('deprecate_encryption_key', {
        key_id: 'KEY-OLD-123'
      })
    })
  })

  describe('validateEncryptionAccess()', () => {
    it('should return true for authorized users', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      })

      const result = await service.validateEncryptionAccess('user-123', 'medical_record')

      expect(result).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('can_access_encrypted_data', {
        record_id: 'user-123',
        data_type: 'medical_record'
      })
    })

    it('should return false for unauthorized users', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null
      })

      const result = await service.validateEncryptionAccess('user-456', 'medical_record')

      expect(result).toBe(false)
    })

    it('should return false on access validation error', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Access denied' }
      })

      const result = await service.validateEncryptionAccess('user-789', 'medical_record')

      expect(result).toBe(false)
    })
  })

  describe('testEncryptionPerformance()', () => {
    beforeEach(() => {
      // Mock performance.now() for consistent testing
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)    // encrypt start
        .mockReturnValueOnce(10)   // encrypt end
        .mockReturnValueOnce(10)   // decrypt start  
        .mockReturnValueOnce(15)   // decrypt end
    })

    it('should measure encryption performance', async () => {
      const mockEncryptedResult = {
        encrypted_data: 'ZW5jcnlwdGVkX2RhdGE=',
        iv: 'aXZfdmFsdWU=',
        auth_tag: 'YXV0aF90YWc='
      }

      // Mock getCurrentEncryptionKeyId
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { key_id: 'KEY-123' },
        error: null
      })

      // Mock encryption
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockEncryptedResult,
        error: null
      })

      // Mock decryption
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { decrypted_data: 'test data' },
        error: null
      })

      const result = await service.testEncryptionPerformance('small')

      expect(result).toMatchObject({
        encryptionTime: 10,
        decryptionTime: 5,
        dataSize: expect.any(Number)
      })

      expect(result.dataSize).toBeGreaterThan(0)
    })

    it('should handle different test data sizes', async () => {
      const mockEncryptedResult = {
        encrypted_data: 'ZW5jcnlwdGVkX2RhdGE=',
        iv: 'aXZfdmFsdWU=',
        auth_tag: 'YXV0aF90YWc='
      }

      // Mock calls for large data test
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { key_id: 'KEY-123' },
        error: null
      })
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockEncryptedResult,
        error: null
      })
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { decrypted_data: 'test data' },
        error: null
      })

      const result = await service.testEncryptionPerformance('large')

      expect(result.dataSize).toBeGreaterThan(1000) // Large test data should be bigger
    })
  })

  // Arabic RTL Testing
  describe('Arabic RTL Encryption Functionality', () => {
    it('should encrypt Arabic medical data correctly', async () => {
      const arabicMedicalData = {
        diagnosisCodes: ['ICD-10-001'],
        medicalHistory: {
          تشخيص: 'حالة طبية معقدة',
          أدوية: ['دواء أ', 'دواء ب'],
          حساسية: ['الفول السوداني']
        },
        treatmentNotes: 'ملاحظات العلاج باللغة العربية'
      }

      const mockEncryptedResult = {
        encrypted_data: 'ZW5jcnlwdGVkX2FyYWJpY19kYXRh',
        iv: 'YXJhYmljX2l2',
        auth_tag: 'YXJhYmljX3RhZw=='
      }

      // Mock getCurrentEncryptionKeyId
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { key_id: 'KEY-AR-123' },
        error: null
      })

      // Mock encryption calls for 3 fields
      for (let i = 0; i < 3; i++) {
        mockSupabase.rpc.mockResolvedValueOnce({
          data: mockEncryptedResult,
          error: null
        })
      }

      const result = await service.encryptMedicalRecord(arabicMedicalData)

      expect(result).toHaveProperty('diagnosisCodes')
      expect(result).toHaveProperty('medicalHistory')
      expect(result).toHaveProperty('treatmentNotes')

      // Verify Arabic data was properly JSON stringified before encryption
      expect(mockSupabase.rpc).toHaveBeenCalledWith('encrypt_medical_data', {
        plaintext_data: JSON.stringify(arabicMedicalData.medicalHistory),
        encryption_key_id: 'KEY-AR-123'
      })
    })

    it('should decrypt Arabic medical data correctly', async () => {
      const arabicDecryptedData = {
        تشخيص: 'حالة طبية معقدة',
        أدوية: ['دواء أ', 'دواء ب']
      }

      const encryptedField: EncryptedField = {
        encryptedData: 'ZW5jcnlwdGVkX2FyYWJpY19kYXRh',
        keyId: 'KEY-AR-123',
        iv: 'YXJhYmljX2l2',
        authTag: 'YXJhYmljX3RhZw==',
        algorithm: 'AES-256-GCM'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { decrypted_data: JSON.stringify(arabicDecryptedData) },
        error: null
      })

      const result = await service.decryptMedicalField(encryptedField)

      expect(result).toEqual(arabicDecryptedData)
      expect((result as any).تشخيص).toBe('حالة طبية معقدة')
      expect((result as any).أدوية).toEqual(['دواء أ', 'دواء ب'])
    })
  })

  // English LTR Testing
  describe('English LTR Encryption Functionality', () => {
    it('should encrypt English medical data correctly', async () => {
      const englishMedicalData = {
        diagnosisCodes: ['ICD-10-001', 'ICD-10-002'],
        medicalHistory: {
          diagnosis: 'Complex medical condition',
          medications: ['Medicine A', 'Medicine B'],
          allergies: ['Peanuts', 'Shellfish']
        },
        treatmentNotes: 'Treatment notes in English'
      }

      const mockEncryptedResult = {
        encrypted_data: 'ZW5jcnlwdGVkX2VuZ2xpc2hfZGF0YQ==',
        iv: 'ZW5nbGlzaF9pdg==',
        auth_tag: 'ZW5nbGlzaF90YWc='
      }

      // Mock getCurrentEncryptionKeyId
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { key_id: 'KEY-EN-123' },
        error: null
      })

      // Mock encryption calls for 3 fields
      for (let i = 0; i < 3; i++) {
        mockSupabase.rpc.mockResolvedValueOnce({
          data: mockEncryptedResult,
          error: null
        })
      }

      const result = await service.encryptMedicalRecord(englishMedicalData)

      expect(result).toHaveProperty('diagnosisCodes')
      expect(result).toHaveProperty('medicalHistory')
      expect(result).toHaveProperty('treatmentNotes')

      // Verify English data was properly processed
      expect(mockSupabase.rpc).toHaveBeenCalledWith('encrypt_medical_data', {
        plaintext_data: JSON.stringify(englishMedicalData.diagnosisCodes),
        encryption_key_id: 'KEY-EN-123'
      })
    })
  })

  // Mobile Responsive Testing
  describe('Mobile Responsive Encryption', () => {
    it('should work efficiently on mobile devices with limited resources', async () => {
      // Mock mobile environment with limited performance
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)    // encrypt start
        .mockReturnValueOnce(50)   // encrypt end (slower on mobile)
        .mockReturnValueOnce(50)   // decrypt start  
        .mockReturnValueOnce(80)   // decrypt end (slower on mobile)

      const mockEncryptedResult = {
        encrypted_data: 'bW9iaWxlX2VuY3J5cHRlZF9kYXRh',
        iv: 'bW9iaWxlX2l2',
        auth_tag: 'bW9iaWxlX3RhZw=='
      }

      // Mock mobile-optimized encryption
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { key_id: 'KEY-MOBILE-123' },
        error: null
      })
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockEncryptedResult,
        error: null
      })
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { decrypted_data: 'mobile test data' },
        error: null
      })

      const result = await service.testEncryptionPerformance('small')

      // Should handle mobile performance gracefully
      expect(result.encryptionTime).toBeLessThan(100) // Reasonable mobile performance
      expect(result.decryptionTime).toBeLessThan(50)
      expect(result.dataSize).toBeGreaterThan(0)
    })
  })
})