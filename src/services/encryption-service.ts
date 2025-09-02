/**
 * HIPAA-Compliant Encryption Service
 * Implements field-level encryption for sensitive medical data
 * Story 1.2: Task 2 - Data Encryption Implementation
 */

import { supabase } from '@/lib/supabase'

export interface EncryptionKeyMetadata {
  keyId: string
  algorithm: 'AES-256-GCM' | 'AES-256-CBC'
  keyVersion: number
  createdAt: Date
  status: 'active' | 'deprecated' | 'revoked'
}

export interface EncryptedField {
  encryptedData: string
  keyId: string
  iv: string
  authTag?: string
  algorithm: string
}

export interface MedicalDataEncryption {
  // Core medical fields that require encryption
  diagnosisCodes?: string[]
  medicalHistory?: Record<string, any>
  medications?: Record<string, any>
  allergies?: string[]
  treatmentNotes?: string
  labResults?: Record<string, any>
  imagingResults?: Record<string, any>
  emergencyProtocol?: string
  contraindications?: string
}

/**
 * HIPAA-compliant encryption service using PostgreSQL pgcrypto
 */
export class EncryptionService {
  private readonly ENCRYPTION_ALGORITHM = 'AES-256-GCM'
  
  /**
   * Encrypts sensitive medical data using PostgreSQL pgcrypto
   */
  async encryptMedicalField(
    data: string | Record<string, any> | string[], 
    keyId?: string
  ): Promise<EncryptedField> {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data)
      const encryptionKeyId = keyId || await this.getCurrentEncryptionKeyId()
      
      // Use PostgreSQL pgcrypto function for encryption
      const { data: encryptedResult, error } = await supabase
        .rpc('encrypt_medical_data', {
          plaintext_data: dataString,
          encryption_key_id: encryptionKeyId
        })
      
      if (error) {
        throw new Error(`Encryption failed: ${error.message}`)
      }
      
      return {
        encryptedData: encryptedResult.encrypted_data,
        keyId: encryptionKeyId,
        iv: encryptedResult.iv,
        authTag: encryptedResult.auth_tag,
        algorithm: this.ENCRYPTION_ALGORITHM
      }
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt medical data')
    }
  }
  
  /**
   * Decrypts sensitive medical data using PostgreSQL pgcrypto
   */
  async decryptMedicalField(encryptedField: EncryptedField): Promise<string | Record<string, any> | string[]> {
    try {
      // Use PostgreSQL pgcrypto function for decryption
      const { data: decryptedResult, error } = await supabase
        .rpc('decrypt_medical_data', {
          encrypted_data: encryptedField.encryptedData,
          encryption_key_id: encryptedField.keyId,
          iv_value: encryptedField.iv,
          auth_tag: encryptedField.authTag
        })
      
      if (error) {
        throw new Error(`Decryption failed: ${error.message}`)
      }
      
      const decryptedString = decryptedResult.decrypted_data
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decryptedString)
      } catch {
        return decryptedString
      }
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt medical data')
    }
  }
  
  /**
   * Encrypts a complete medical record with all sensitive fields
   */
  async encryptMedicalRecord(medicalData: MedicalDataEncryption): Promise<Record<string, EncryptedField>> {
    const encryptedRecord: Record<string, EncryptedField> = {}
    const keyId = await this.getCurrentEncryptionKeyId()
    
    // Encrypt each sensitive field
    if (medicalData.diagnosisCodes) {
      encryptedRecord.diagnosisCodes = await this.encryptMedicalField(medicalData.diagnosisCodes, keyId)
    }
    
    if (medicalData.medicalHistory) {
      encryptedRecord.medicalHistory = await this.encryptMedicalField(medicalData.medicalHistory, keyId)
    }
    
    if (medicalData.medications) {
      encryptedRecord.medications = await this.encryptMedicalField(medicalData.medications, keyId)
    }
    
    if (medicalData.allergies) {
      encryptedRecord.allergies = await this.encryptMedicalField(medicalData.allergies, keyId)
    }
    
    if (medicalData.treatmentNotes) {
      encryptedRecord.treatmentNotes = await this.encryptMedicalField(medicalData.treatmentNotes, keyId)
    }
    
    if (medicalData.labResults) {
      encryptedRecord.labResults = await this.encryptMedicalField(medicalData.labResults, keyId)
    }
    
    if (medicalData.imagingResults) {
      encryptedRecord.imagingResults = await this.encryptMedicalField(medicalData.imagingResults, keyId)
    }
    
    if (medicalData.emergencyProtocol) {
      encryptedRecord.emergencyProtocol = await this.encryptMedicalField(medicalData.emergencyProtocol, keyId)
    }
    
    if (medicalData.contraindications) {
      encryptedRecord.contraindications = await this.encryptMedicalField(medicalData.contraindications, keyId)
    }
    
    return encryptedRecord
  }
  
  /**
   * Decrypts a complete medical record with all sensitive fields
   */
  async decryptMedicalRecord(encryptedRecord: Record<string, EncryptedField>): Promise<MedicalDataEncryption> {
    const decryptedData: MedicalDataEncryption = {}
    
    // Decrypt each field if present
    if (encryptedRecord.diagnosisCodes) {
      decryptedData.diagnosisCodes = await this.decryptMedicalField(encryptedRecord.diagnosisCodes) as string[]
    }
    
    if (encryptedRecord.medicalHistory) {
      decryptedData.medicalHistory = await this.decryptMedicalField(encryptedRecord.medicalHistory) as Record<string, any>
    }
    
    if (encryptedRecord.medications) {
      decryptedData.medications = await this.decryptMedicalField(encryptedRecord.medications) as Record<string, any>
    }
    
    if (encryptedRecord.allergies) {
      decryptedData.allergies = await this.decryptMedicalField(encryptedRecord.allergies) as string[]
    }
    
    if (encryptedRecord.treatmentNotes) {
      decryptedData.treatmentNotes = await this.decryptMedicalField(encryptedRecord.treatmentNotes) as string
    }
    
    if (encryptedRecord.labResults) {
      decryptedData.labResults = await this.decryptMedicalField(encryptedRecord.labResults) as Record<string, any>
    }
    
    if (encryptedRecord.imagingResults) {
      decryptedData.imagingResults = await this.decryptMedicalField(encryptedRecord.imagingResults) as Record<string, any>
    }
    
    if (encryptedRecord.emergencyProtocol) {
      decryptedData.emergencyProtocol = await this.decryptMedicalField(encryptedRecord.emergencyProtocol) as string
    }
    
    if (encryptedRecord.contraindications) {
      decryptedData.contraindications = await this.decryptMedicalField(encryptedRecord.contraindications) as string
    }
    
    return decryptedData
  }
  
  /**
   * Generates a new encryption key and stores it securely
   */
  async generateEncryptionKey(): Promise<EncryptionKeyMetadata> {
    try {
      const { data: keyData, error } = await supabase
        .rpc('generate_encryption_key', {
          algorithm: this.ENCRYPTION_ALGORITHM
        })
      
      if (error) {
        throw new Error(`Key generation failed: ${error.message}`)
      }
      
      return {
        keyId: keyData.key_id,
        algorithm: this.ENCRYPTION_ALGORITHM,
        keyVersion: keyData.key_version,
        createdAt: new Date(keyData.created_at),
        status: 'active'
      }
    } catch (error) {
      console.error('Key generation error:', error)
      throw new Error('Failed to generate encryption key')
    }
  }
  
  /**
   * Rotates encryption keys for enhanced security
   */
  async rotateEncryptionKey(oldKeyId: string): Promise<EncryptionKeyMetadata> {
    try {
      // Generate new key
      const newKey = await this.generateEncryptionKey()
      
      // Mark old key as deprecated
      await supabase
        .rpc('deprecate_encryption_key', {
          key_id: oldKeyId
        })
      
      // TODO: Re-encrypt all data using old key with new key
      // This should be done in batches to avoid performance impact
      
      return newKey
    } catch (error) {
      console.error('Key rotation error:', error)
      throw new Error('Failed to rotate encryption key')
    }
  }
  
  /**
   * Gets the current active encryption key ID
   */
  private async getCurrentEncryptionKeyId(): Promise<string> {
    try {
      const { data: keyData, error } = await supabase
        .rpc('get_current_encryption_key')
      
      if (error) {
        throw new Error(`Failed to get current key: ${error.message}`)
      }
      
      return keyData.key_id
    } catch (error) {
      console.error('Get current key error:', error)
      throw new Error('Failed to get current encryption key')
    }
  }
  
  /**
   * Validates that user can access encrypted data
   */
  async validateEncryptionAccess(userId: string, dataType: string): Promise<boolean> {
    try {
      const { data: accessResult, error } = await supabase
        .rpc('can_access_encrypted_data', {
          record_id: userId,
          data_type: dataType
        })
      
      if (error) {
        throw new Error(`Access validation failed: ${error.message}`)
      }
      
      return accessResult
    } catch (error) {
      console.error('Access validation error:', error)
      return false
    }
  }
  
  /**
   * Performance test for encryption/decryption operations
   */
  async testEncryptionPerformance(testDataSize: 'small' | 'medium' | 'large' = 'medium'): Promise<{
    encryptionTime: number
    decryptionTime: number
    dataSize: number
  }> {
    const testData = this.generateTestData(testDataSize)
    
    // Test encryption performance
    const encryptStart = performance.now()
    const encrypted = await this.encryptMedicalField(testData)
    const encryptionTime = performance.now() - encryptStart
    
    // Test decryption performance
    const decryptStart = performance.now()
    await this.decryptMedicalField(encrypted)
    const decryptionTime = performance.now() - decryptStart
    
    return {
      encryptionTime,
      decryptionTime,
      dataSize: JSON.stringify(testData).length
    }
  }
  
  /**
   * Generates test data for performance testing
   */
  private generateTestData(size: 'small' | 'medium' | 'large'): Record<string, any> {
    const baseData = {
      patientId: 'TEST-123',
      diagnosis: 'Test diagnosis',
      medications: ['Med1', 'Med2'],
      notes: 'Test medical notes'
    }
    
    switch (size) {
      case 'small':
        return baseData
        
      case 'medium':
        return {
          ...baseData,
          medicalHistory: Array(100).fill('Medical history entry').join(' '),
          labResults: Object.fromEntries(
            Array(50).fill(0).map((_, i) => [`test${i}`, `result${i}`])
          )
        }
        
      case 'large':
        return {
          ...baseData,
          medicalHistory: Array(1000).fill('Medical history entry').join(' '),
          labResults: Object.fromEntries(
            Array(500).fill(0).map((_, i) => [`test${i}`, `result${i}`])
          ),
          imagingData: Array(100).fill('Imaging data entry').join(' ')
        }
        
      default:
        return baseData
    }
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService()

export default encryptionService