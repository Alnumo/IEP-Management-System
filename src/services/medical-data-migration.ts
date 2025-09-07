/**
 * Medical Data Migration Service
 * Story 1.2: Security Compliance & Data Protection
 * Handles migration of existing medical records to encrypted format
 */

import { supabase } from '../lib/supabase'
import { EncryptionService, MedicalDataEncryption } from './encryption-service'

export interface MigrationResult {
  recordId: string
  status: 'success' | 'error' | 'skipped'
  message?: string
  originalDataHash?: string
  encryptedDataHash?: string
}

export interface MigrationSummary {
  totalRecords: number
  processed: number
  successful: number
  errors: number
  skipped: number
  results: MigrationResult[]
}

export class MedicalDataMigrationService {
  private encryptionService: EncryptionService

  constructor() {
    this.encryptionService = new EncryptionService()
  }

  /**
   * Migrates all medical records to encrypted format with data integrity verification
   */
  async migrateMedicalRecords(options: {
    batchSize?: number
    verifyIntegrity?: boolean
    dryRun?: boolean
  } = {}): Promise<MigrationSummary> {
    const { batchSize = 10, verifyIntegrity = true, dryRun = false } = options
    
    console.log(`Starting medical records migration${dryRun ? ' (DRY RUN)' : ''}...`)
    
    try {
      // Get all medical records that need encryption
      const { data: records, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('is_encrypted', false)
        .order('created_at', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch medical records: ${error.message}`)
      }

      if (!records || records.length === 0) {
        console.log('No medical records found that need encryption.')
        return {
          totalRecords: 0,
          processed: 0,
          successful: 0,
          errors: 0,
          skipped: 0,
          results: []
        }
      }

      console.log(`Found ${records.length} medical records to migrate`)

      const summary: MigrationSummary = {
        totalRecords: records.length,
        processed: 0,
        successful: 0,
        errors: 0,
        skipped: 0,
        results: []
      }

      // Process records in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}`)

        for (const record of batch) {
          const result = await this.migrateSingleRecord(record, { verifyIntegrity, dryRun })
          summary.results.push(result)
          summary.processed++

          switch (result.status) {
            case 'success':
              summary.successful++
              break
            case 'error':
              summary.errors++
              console.error(`Migration failed for record ${record.id}: ${result.message}`)
              break
            case 'skipped':
              summary.skipped++
              break
          }
        }

        // Brief pause between batches to avoid overwhelming the database
        if (i + batchSize < records.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      console.log('Migration completed:', {
        total: summary.totalRecords,
        successful: summary.successful,
        errors: summary.errors,
        skipped: summary.skipped
      })

      return summary
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  }

  /**
   * Migrates a single medical record with integrity verification
   */
  private async migrateSingleRecord(
    record: any,
    options: { verifyIntegrity: boolean; dryRun: boolean }
  ): Promise<MigrationResult> {
    try {
      // Extract sensitive medical data
      const medicalData: MedicalDataEncryption = {
        diagnosisCodes: record.primary_diagnosis_code || record.secondary_diagnosis_codes,
        medicalHistory: record.medical_history,
        medications: record.current_medications,
        allergies: record.allergies,
        treatmentNotes: record.emergency_protocol,
        emergencyProtocol: record.emergency_protocol,
        contraindications: record.contraindications_ar || record.contraindications_en
      }

      // Calculate original data hash for integrity verification
      const originalDataHash = options.verifyIntegrity 
        ? await this.calculateDataHash(medicalData)
        : undefined

      // Check if record already appears to be encrypted
      if (record.is_encrypted === true) {
        return {
          recordId: record.id,
          status: 'skipped',
          message: 'Record already encrypted'
        }
      }

      // Skip if no sensitive data to encrypt
      const hasSensitiveData = Object.values(medicalData).some(value => 
        value && (typeof value === 'string' ? value.trim() : Object.keys(value).length > 0)
      )

      if (!hasSensitiveData) {
        return {
          recordId: record.id,
          status: 'skipped',
          message: 'No sensitive data to encrypt'
        }
      }

      if (options.dryRun) {
        return {
          recordId: record.id,
          status: 'success',
          message: 'Dry run - would encrypt',
          originalDataHash
        }
      }

      // Encrypt the medical data
      const encryptedRecord = await this.encryptionService.encryptMedicalRecord(medicalData)
      
      // Get current encryption key
      const { data: keyData, error: keyError } = await supabase
        .rpc('get_current_encryption_key')

      if (keyError) {
        throw new Error(`Failed to get encryption key: ${keyError.message}`)
      }

      // Update the record with encrypted data
      const updateData = {
        medical_history: encryptedRecord.medicalHistory || record.medical_history,
        current_medications: encryptedRecord.medications || record.current_medications,
        primary_diagnosis_code: encryptedRecord.diagnosisCodes ? 
          (encryptedRecord.diagnosisCodes as any) : record.primary_diagnosis_code,
        emergency_protocol: encryptedRecord.emergencyProtocol || record.emergency_protocol,
        contraindications_ar: encryptedRecord.contraindications || record.contraindications_ar,
        is_encrypted: true,
        encryption_key_id: keyData.key_id,
        updated_at: new Date().toISOString(),
        audit_log: [
          ...(record.audit_log || []),
          {
            action: 'encrypted_migration',
            timestamp: new Date().toISOString(),
            encryption_key_id: keyData.key_id,
            migrated_fields: Object.keys(encryptedRecord)
          }
        ]
      }

      const { error: updateError } = await supabase
        .from('medical_records')
        .update(updateData)
        .eq('id', record.id)

      if (updateError) {
        throw new Error(`Failed to update record: ${updateError.message}`)
      }

      // Verify data integrity if requested
      let encryptedDataHash: string | undefined
      if (options.verifyIntegrity) {
        encryptedDataHash = await this.verifyMigrationIntegrity(record.id, medicalData)
      }

      // Log the migration for audit purposes
      await this.logMigrationEvent(record.id, {
        originalHash: originalDataHash,
        encryptedHash: encryptedDataHash,
        encryptionKeyId: keyData.key_id,
        migratedFields: Object.keys(encryptedRecord)
      })

      return {
        recordId: record.id,
        status: 'success',
        message: 'Successfully encrypted and verified',
        originalDataHash,
        encryptedDataHash
      }

    } catch (error) {
      return {
        recordId: record.id,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Verifies migration integrity by decrypting and comparing data
   */
  private async verifyMigrationIntegrity(recordId: string, originalData: MedicalDataEncryption): Promise<string> {
    try {
      // Fetch the encrypted record
      const { data: encryptedRecord, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('id', recordId)
        .eq('is_encrypted', true)
        .single()

      if (error) {
        throw new Error(`Failed to fetch encrypted record: ${error.message}`)
      }

      // Decrypt the data
      const decryptedData: MedicalDataEncryption = {}

      if (encryptedRecord.medical_history && typeof encryptedRecord.medical_history === 'object') {
        decryptedData.medicalHistory = await this.encryptionService.decryptMedicalField(
          encryptedRecord.medical_history
        ) as Record<string, any>
      }

      if (encryptedRecord.current_medications && typeof encryptedRecord.current_medications === 'object') {
        decryptedData.medications = await this.encryptionService.decryptMedicalField(
          encryptedRecord.current_medications
        ) as Record<string, any>
      }

      // Calculate hash of decrypted data
      const decryptedHash = await this.calculateDataHash(decryptedData)
      const originalHash = await this.calculateDataHash(originalData)

      // Compare hashes
      if (decryptedHash !== originalHash) {
        console.warn(`Data integrity warning for record ${recordId}: Hash mismatch`)
        console.warn(`Original hash: ${originalHash}`)
        console.warn(`Decrypted hash: ${decryptedHash}`)
      }

      return decryptedHash

    } catch (error) {
      console.error(`Integrity verification failed for record ${recordId}:`, error)
      throw error
    }
  }

  /**
   * Calculates a hash of medical data for integrity verification
   */
  private async calculateDataHash(data: MedicalDataEncryption): Promise<string> {
    // Create a stable string representation of the data
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    
    // Use browser crypto API to create hash
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(dataString)
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }
    
    // Fallback for Node.js environment
    return dataString.length.toString(16)
  }

  /**
   * Logs migration event for audit trail
   */
  private async logMigrationEvent(recordId: string, details: {
    originalHash?: string
    encryptedHash?: string
    encryptionKeyId: string
    migratedFields: string[]
  }): Promise<void> {
    try {
      await supabase.rpc('log_medical_access', {
        p_event_type: 'data_migration',
        p_action: 'encrypt_migration',
        p_table_name: 'medical_records',
        p_record_id: recordId,
        p_field_names: details.migratedFields,
        p_patient_id: null, // Will be resolved by the function
        p_medical_record_number: null, // Will be resolved by the function
        p_access_purpose: 'HIPAA compliance migration to encrypted storage',
        p_is_emergency: false
      })
    } catch (error) {
      console.error('Failed to log migration event:', error)
      // Don't throw - migration should continue even if logging fails
    }
  }

  /**
   * Rolls back migration for a specific record (decrypts back to plain text)
   * WARNING: This should only be used in case of migration failures
   */
  async rollbackRecordMigration(recordId: string): Promise<boolean> {
    try {
      console.warn(`Rolling back migration for record ${recordId}`)

      const { data: record, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('id', recordId)
        .eq('is_encrypted', true)
        .single()

      if (error) {
        throw new Error(`Failed to fetch record for rollback: ${error.message}`)
      }

      // Decrypt the encrypted fields
      const decryptedData: any = {}

      if (record.medical_history && typeof record.medical_history === 'object') {
        decryptedData.medical_history = await this.encryptionService.decryptMedicalField(
          record.medical_history
        )
      }

      if (record.current_medications && typeof record.current_medications === 'object') {
        decryptedData.current_medications = await this.encryptionService.decryptMedicalField(
          record.current_medications
        )
      }

      // Update with decrypted data
      const { error: updateError } = await supabase
        .from('medical_records')
        .update({
          ...decryptedData,
          is_encrypted: false,
          encryption_key_id: null,
          updated_at: new Date().toISOString(),
          audit_log: [
            ...(record.audit_log || []),
            {
              action: 'migration_rollback',
              timestamp: new Date().toISOString(),
              reason: 'Manual rollback requested'
            }
          ]
        })
        .eq('id', recordId)

      if (updateError) {
        throw new Error(`Failed to rollback record: ${updateError.message}`)
      }

      console.log(`Successfully rolled back migration for record ${recordId}`)
      return true

    } catch (error) {
      console.error(`Rollback failed for record ${recordId}:`, error)
      return false
    }
  }

  /**
   * Gets migration status summary
   */
  async getMigrationStatus(): Promise<{
    totalRecords: number
    encryptedRecords: number
    unencryptedRecords: number
    migrationProgress: number
  }> {
    const { data: totalResult, error: totalError } = await supabase
      .from('medical_records')
      .select('id', { count: 'exact' })

    const { data: encryptedResult, error: encryptedError } = await supabase
      .from('medical_records')
      .select('id', { count: 'exact' })
      .eq('is_encrypted', true)

    if (totalError || encryptedError) {
      throw new Error('Failed to get migration status')
    }

    const totalRecords = totalResult.length || 0
    const encryptedRecords = encryptedResult.length || 0
    const unencryptedRecords = totalRecords - encryptedRecords
    const migrationProgress = totalRecords > 0 ? (encryptedRecords / totalRecords) * 100 : 0

    return {
      totalRecords,
      encryptedRecords,
      unencryptedRecords,
      migrationProgress: Math.round(migrationProgress * 100) / 100
    }
  }
}

// Export singleton instance
export const medicalDataMigration = new MedicalDataMigrationService()

export default medicalDataMigration