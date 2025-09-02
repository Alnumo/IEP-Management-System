import { supabase } from '../lib/supabase'

// Types for data retention system
export interface DataRetentionPolicy {
  id: string
  table_name: string
  retention_period_days: number
  auto_delete_enabled: boolean
  encryption_required: boolean
  backup_before_deletion: boolean
  compliance_framework: string
  policy_description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  last_applied: string | null
}

export interface BackupRecord {
  id: string
  backup_type: string
  backup_scope: string
  target_table: string | null
  backup_location: string
  backup_size_bytes: number | null
  encryption_key_id: string | null
  compression_ratio: number | null
  backup_status: string
  backup_started_at: string
  backup_completed_at: string | null
  backup_expires_at: string | null
  checksum_sha256: string | null
  metadata: Record<string, any>
  created_by: string | null
  created_at: string
}

export interface LifecycleEvent {
  id: string
  event_type: string
  table_name: string
  record_id: string | null
  event_status: string
  event_details: Record<string, any>
  scheduled_for: string | null
  executed_at: string | null
  error_message: string | null
  created_by: string | null
  created_at: string
}

export interface RetentionComplianceResult {
  table_name: string
  total_records: number
  expired_records: number
  compliance_percentage: number
  retention_period_days: number
  oldest_record_age_days: number
}

export interface ExpiredRecord {
  record_id: string
  created_at: string
  days_expired: number
}

export interface DeletionResult {
  table_name: string
  expired_records_found: number
  records_deleted: number
  dry_run: boolean
  backup_created: boolean
  backup_id: string | null
  retention_policy: DataRetentionPolicy
}

export class DataRetentionService {
  // Get all data retention policies
  static async getRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    const { data, error } = await supabase
      .from('data_retention_policies')
      .select('*')
      .order('table_name')

    if (error) {
      console.error('Error fetching retention policies:', error)
      throw new Error('Failed to fetch retention policies')
    }

    return data || []
  }

  // Get retention policy for specific table
  static async getRetentionPolicy(tableName: string): Promise<DataRetentionPolicy | null> {
    const { data, error } = await supabase
      .from('data_retention_policies')
      .select('*')
      .eq('table_name', tableName)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No policy found
        return null
      }
      console.error('Error fetching retention policy:', error)
      throw new Error(`Failed to fetch retention policy for ${tableName}`)
    }

    return data
  }

  // Update retention policy
  static async updateRetentionPolicy(
    tableName: string,
    updates: Partial<DataRetentionPolicy>
  ): Promise<DataRetentionPolicy> {
    const { data, error } = await supabase
      .from('data_retention_policies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('table_name', tableName)
      .select()
      .single()

    if (error) {
      console.error('Error updating retention policy:', error)
      throw new Error(`Failed to update retention policy for ${tableName}`)
    }

    return data
  }

  // Check retention compliance for a table
  static async checkRetentionCompliance(tableName: string): Promise<RetentionComplianceResult> {
    const { data, error } = await supabase
      .rpc('check_data_retention_compliance', { target_table_name: tableName })
      .single()

    if (error) {
      console.error('Error checking retention compliance:', error)
      throw new Error(`Failed to check retention compliance for ${tableName}`)
    }

    return data
  }

  // Get expired records for a table
  static async getExpiredRecords(tableName: string): Promise<ExpiredRecord[]> {
    const { data, error } = await supabase
      .rpc('identify_expired_records', { target_table_name: tableName })

    if (error) {
      console.error('Error identifying expired records:', error)
      throw new Error(`Failed to identify expired records for ${tableName}`)
    }

    return data || []
  }

  // Delete expired records (with dry run option)
  static async deleteExpiredRecords(
    tableName: string,
    dryRun: boolean = true
  ): Promise<DeletionResult> {
    const { data, error } = await supabase
      .rpc('secure_delete_expired_records', {
        target_table_name: tableName,
        dry_run: dryRun
      })

    if (error) {
      console.error('Error deleting expired records:', error)
      throw new Error(`Failed to delete expired records for ${tableName}`)
    }

    return data
  }

  // Create table backup
  static async createTableBackup(
    tableName: string,
    reason: string = 'MANUAL'
  ): Promise<string> {
    const { data, error } = await supabase
      .rpc('create_table_backup', {
        target_table_name: tableName,
        backup_reason: reason
      })

    if (error) {
      console.error('Error creating table backup:', error)
      throw new Error(`Failed to create backup for ${tableName}`)
    }

    return data
  }

  // Create comprehensive medical backup
  static async createMedicalBackup(
    scope: string = 'ALL_MEDICAL',
    includeDeleted: boolean = false
  ): Promise<string> {
    const { data, error } = await supabase
      .rpc('create_medical_backup', {
        backup_scope: scope,
        include_deleted: includeDeleted
      })

    if (error) {
      console.error('Error creating medical backup:', error)
      throw new Error('Failed to create medical backup')
    }

    return data
  }

  // Run automated retention policy check
  static async runRetentionPolicyCheck(): Promise<{
    status: string
    tables_checked: number
    results: any[]
    timestamp: string
  }> {
    const { data, error } = await supabase
      .rpc('run_retention_policy_check')

    if (error) {
      console.error('Error running retention policy check:', error)
      throw new Error('Failed to run retention policy check')
    }

    return data
  }

  // Get all backups
  static async getBackups(
    limit: number = 50,
    tableName?: string
  ): Promise<BackupRecord[]> {
    let query = supabase
      .from('data_backup_registry')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (tableName) {
      query = query.eq('target_table', tableName)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching backups:', error)
      throw new Error('Failed to fetch backup records')
    }

    return data || []
  }

  // Get backup by ID
  static async getBackup(backupId: string): Promise<BackupRecord | null> {
    const { data, error } = await supabase
      .from('data_backup_registry')
      .select('*')
      .eq('id', backupId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching backup:', error)
      throw new Error(`Failed to fetch backup ${backupId}`)
    }

    return data
  }

  // Get lifecycle events
  static async getLifecycleEvents(
    limit: number = 50,
    tableName?: string,
    eventType?: string
  ): Promise<LifecycleEvent[]> {
    let query = supabase
      .from('data_lifecycle_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (tableName) {
      query = query.eq('table_name', tableName)
    }

    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching lifecycle events:', error)
      throw new Error('Failed to fetch lifecycle events')
    }

    return data || []
  }

  // Get retention compliance overview for all tables
  static async getComplianceOverview(): Promise<RetentionComplianceResult[]> {
    const policies = await this.getRetentionPolicies()
    const results: RetentionComplianceResult[] = []

    for (const policy of policies) {
      try {
        const compliance = await this.checkRetentionCompliance(policy.table_name)
        results.push(compliance)
      } catch (error) {
        console.error(`Error checking compliance for ${policy.table_name}:`, error)
        // Continue with other tables
      }
    }

    return results
  }

  // Schedule retention policy enforcement
  static async scheduleRetentionEnforcement(tableName: string): Promise<LifecycleEvent> {
    const policy = await this.getRetentionPolicy(tableName)
    if (!policy) {
      throw new Error(`No retention policy found for ${tableName}`)
    }

    const { data, error } = await supabase
      .from('data_lifecycle_events')
      .insert({
        event_type: 'SCHEDULED_RETENTION_CHECK',
        table_name: tableName,
        event_status: 'SCHEDULED',
        event_details: {
          retention_period_days: policy.retention_period_days,
          auto_delete_enabled: policy.auto_delete_enabled
        },
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error scheduling retention enforcement:', error)
      throw new Error(`Failed to schedule retention enforcement for ${tableName}`)
    }

    return data
  }

  // Get retention statistics
  static async getRetentionStatistics(): Promise<{
    total_policies: number
    auto_delete_enabled: number
    total_backups: number
    recent_deletions: number
    compliance_score: number
  }> {
    // Get policy statistics
    const { data: policyStats, error: policyError } = await supabase
      .from('data_retention_policies')
      .select('auto_delete_enabled', { count: 'exact' })

    if (policyError) {
      throw new Error('Failed to get policy statistics')
    }

    const totalPolicies = policyStats?.length || 0
    const autoDeleteEnabled = policyStats?.filter(p => p.auto_delete_enabled).length || 0

    // Get backup statistics
    const { count: totalBackups, error: backupError } = await supabase
      .from('data_backup_registry')
      .select('*', { count: 'exact', head: true })

    if (backupError) {
      throw new Error('Failed to get backup statistics')
    }

    // Get recent deletion statistics
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: recentDeletions, error: deletionError } = await supabase
      .from('data_lifecycle_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'BULK_DELETE_EXPIRED')
      .gte('created_at', oneDayAgo)

    if (deletionError) {
      throw new Error('Failed to get deletion statistics')
    }

    // Calculate overall compliance score
    const complianceResults = await this.getComplianceOverview()
    const complianceScore = complianceResults.length > 0 
      ? complianceResults.reduce((sum, result) => sum + result.compliance_percentage, 0) / complianceResults.length
      : 100

    return {
      total_policies: totalPolicies,
      auto_delete_enabled: autoDeleteEnabled,
      total_backups: totalBackups || 0,
      recent_deletions: recentDeletions || 0,
      compliance_score: Math.round(complianceScore * 100) / 100
    }
  }

  // Validate retention policy settings
  static validateRetentionPolicy(policy: Partial<DataRetentionPolicy>): string[] {
    const errors: string[] = []

    if (policy.retention_period_days !== undefined) {
      if (policy.retention_period_days < 1) {
        errors.push('Retention period must be at least 1 day')
      }
      if (policy.retention_period_days > 10950) { // ~30 years
        errors.push('Retention period cannot exceed 30 years')
      }
    }

    if (policy.compliance_framework) {
      const validFrameworks = ['HIPAA', 'FERPA', 'GDPR', 'PDPL', 'TAX', 'OPERATIONAL', 'COMPLIANCE']
      if (!validFrameworks.includes(policy.compliance_framework)) {
        errors.push('Invalid compliance framework')
      }
    }

    if (policy.auto_delete_enabled && policy.backup_before_deletion === false) {
      errors.push('Auto-delete requires backup before deletion to be enabled')
    }

    return errors
  }

  // Get backup storage usage
  static async getBackupStorageUsage(): Promise<{
    total_backups: number
    total_size_bytes: number
    total_size_gb: number
    oldest_backup: string | null
    newest_backup: string | null
  }> {
    const { data, error } = await supabase
      .from('data_backup_registry')
      .select('backup_size_bytes, created_at')
      .not('backup_size_bytes', 'is', null)
      .order('created_at')

    if (error) {
      throw new Error('Failed to get backup storage usage')
    }

    const totalSize = data.reduce((sum, backup) => sum + (backup.backup_size_bytes || 0), 0)
    const totalSizeGB = totalSize / (1024 * 1024 * 1024)

    return {
      total_backups: data.length,
      total_size_bytes: totalSize,
      total_size_gb: Math.round(totalSizeGB * 100) / 100,
      oldest_backup: data.length > 0 ? data[0].created_at : null,
      newest_backup: data.length > 0 ? data[data.length - 1].created_at : null
    }
  }
}

// Export individual functions for easier importing
export const {
  getRetentionPolicies,
  getRetentionPolicy,
  updateRetentionPolicy,
  checkRetentionCompliance,
  getExpiredRecords,
  deleteExpiredRecords,
  createTableBackup,
  createMedicalBackup,
  runRetentionPolicyCheck,
  getBackups,
  getBackup,
  getLifecycleEvents,
  getComplianceOverview,
  scheduleRetentionEnforcement,
  getRetentionStatistics,
  validateRetentionPolicy,
  getBackupStorageUsage
} = DataRetentionService

export default DataRetentionService