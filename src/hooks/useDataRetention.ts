import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  DataRetentionService, 
  DataRetentionPolicy,
  RetentionComplianceResult,
  DeletionResult,
  BackupRecord,
  LifecycleEvent 
} from '../services/data-retention-service'
import { useAuth } from '../components/auth/AuthGuard'
import { useLanguage } from '../contexts/LanguageContext'
import { toast } from 'sonner'

export interface UseDataRetentionOptions {
  enabled?: boolean
  autoRefresh?: boolean
}

export const useDataRetention = (options: UseDataRetentionOptions = {}) => {
  const { enabled = true, autoRefresh = false } = options
  const { user } = useAuth()
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  // Query: Get all retention policies
  const {
    data: retentionPolicies,
    isLoading: isPoliciesLoading,
    error: policiesError
  } = useQuery({
    queryKey: ['retention-policies'],
    queryFn: DataRetentionService.getRetentionPolicies,
    enabled: enabled && !!user,
    staleTime: autoRefresh ? 1 * 60 * 1000 : 5 * 60 * 1000, // 1 or 5 minutes
  })

  // Query: Get compliance overview
  const {
    data: complianceOverview,
    isLoading: isComplianceLoading,
    refetch: refetchCompliance
  } = useQuery({
    queryKey: ['compliance-overview'],
    queryFn: DataRetentionService.getComplianceOverview,
    enabled: enabled && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Query: Get retention statistics
  const {
    data: retentionStats,
    isLoading: isStatsLoading
  } = useQuery({
    queryKey: ['retention-statistics'],
    queryFn: DataRetentionService.getRetentionStatistics,
    enabled: enabled && !!user,
    staleTime: 5 * 60 * 1000,
  })

  // Query: Get backup records
  const {
    data: backupRecords,
    isLoading: isBackupsLoading
  } = useQuery({
    queryKey: ['backup-records'],
    queryFn: () => DataRetentionService.getBackups(50),
    enabled: enabled && !!user,
    staleTime: 2 * 60 * 1000,
  })

  // Query: Get lifecycle events
  const {
    data: lifecycleEvents,
    isLoading: isEventsLoading
  } = useQuery({
    queryKey: ['lifecycle-events'],
    queryFn: () => DataRetentionService.getLifecycleEvents(50),
    enabled: enabled && !!user,
    staleTime: 1 * 60 * 1000,
  })

  // Query: Get backup storage usage
  const {
    data: storageUsage,
    isLoading: isStorageLoading
  } = useQuery({
    queryKey: ['backup-storage-usage'],
    queryFn: DataRetentionService.getBackupStorageUsage,
    enabled: enabled && !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Mutation: Update retention policy
  const updatePolicyMutation = useMutation({
    mutationFn: ({ tableName, updates }: { tableName: string, updates: Partial<DataRetentionPolicy> }) =>
      DataRetentionService.updateRetentionPolicy(tableName, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['retention-policies'] })
      queryClient.invalidateQueries({ queryKey: ['compliance-overview'] })
      toast.success(t('retention.policy.updated', 'Retention policy updated successfully'))
      return data
    },
    onError: (error: any) => {
      console.error('Error updating retention policy:', error)
      toast.error(error.message || t('retention.policy.update.error', 'Failed to update retention policy'))
    }
  })

  // Mutation: Check retention compliance
  const checkComplianceMutation = useMutation({
    mutationFn: (tableName: string) => DataRetentionService.checkRetentionCompliance(tableName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-overview'] })
      toast.success(t('retention.compliance.checked', 'Compliance check completed'))
    },
    onError: (error: any) => {
      console.error('Error checking compliance:', error)
      toast.error(error.message || t('retention.compliance.error', 'Failed to check compliance'))
    }
  })

  // Mutation: Delete expired records
  const deleteExpiredMutation = useMutation({
    mutationFn: ({ tableName, dryRun }: { tableName: string, dryRun?: boolean }) =>
      DataRetentionService.deleteExpiredRecords(tableName, dryRun),
    onSuccess: (result: DeletionResult) => {
      queryClient.invalidateQueries({ queryKey: ['compliance-overview'] })
      queryClient.invalidateQueries({ queryKey: ['lifecycle-events'] })
      queryClient.invalidateQueries({ queryKey: ['retention-statistics'] })
      
      if (result.dry_run) {
        toast.info(
          t('retention.delete.dry_run', `Dry run: ${result.expired_records_found} records would be deleted`)
        )
      } else {
        toast.success(
          t('retention.delete.success', `Successfully deleted ${result.records_deleted} expired records`)
        )
      }
      return result
    },
    onError: (error: any) => {
      console.error('Error deleting expired records:', error)
      toast.error(error.message || t('retention.delete.error', 'Failed to delete expired records'))
    }
  })

  // Mutation: Create table backup
  const createBackupMutation = useMutation({
    mutationFn: ({ tableName, reason }: { tableName: string, reason?: string }) =>
      DataRetentionService.createTableBackup(tableName, reason),
    onSuccess: (backupId) => {
      queryClient.invalidateQueries({ queryKey: ['backup-records'] })
      queryClient.invalidateQueries({ queryKey: ['backup-storage-usage'] })
      queryClient.invalidateQueries({ queryKey: ['lifecycle-events'] })
      toast.success(t('backup.created', `Backup created successfully: ${backupId}`))
      return backupId
    },
    onError: (error: any) => {
      console.error('Error creating backup:', error)
      toast.error(error.message || t('backup.create.error', 'Failed to create backup'))
    }
  })

  // Mutation: Create medical backup
  const createMedicalBackupMutation = useMutation({
    mutationFn: ({ scope, includeDeleted }: { scope?: string, includeDeleted?: boolean }) =>
      DataRetentionService.createMedicalBackup(scope, includeDeleted),
    onSuccess: (backupId) => {
      queryClient.invalidateQueries({ queryKey: ['backup-records'] })
      queryClient.invalidateQueries({ queryKey: ['backup-storage-usage'] })
      queryClient.invalidateQueries({ queryKey: ['lifecycle-events'] })
      toast.success(t('backup.medical.created', `Medical backup created: ${backupId}`))
      return backupId
    },
    onError: (error: any) => {
      console.error('Error creating medical backup:', error)
      toast.error(error.message || t('backup.medical.error', 'Failed to create medical backup'))
    }
  })

  // Mutation: Run retention policy check
  const runRetentionCheckMutation = useMutation({
    mutationFn: DataRetentionService.runRetentionPolicyCheck,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['compliance-overview'] })
      queryClient.invalidateQueries({ queryKey: ['lifecycle-events'] })
      queryClient.invalidateQueries({ queryKey: ['retention-statistics'] })
      toast.success(
        t('retention.check.completed', `Retention check completed: ${result.tables_checked} tables checked`)
      )
      return result
    },
    onError: (error: any) => {
      console.error('Error running retention check:', error)
      toast.error(error.message || t('retention.check.error', 'Failed to run retention check'))
    }
  })

  // Mutation: Schedule retention enforcement
  const scheduleRetentionMutation = useMutation({
    mutationFn: (tableName: string) => DataRetentionService.scheduleRetentionEnforcement(tableName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-events'] })
      toast.success(t('retention.scheduled', 'Retention enforcement scheduled'))
    },
    onError: (error: any) => {
      console.error('Error scheduling retention enforcement:', error)
      toast.error(error.message || t('retention.schedule.error', 'Failed to schedule retention enforcement'))
    }
  })

  // Helper functions
  const updateRetentionPolicy = (tableName: string, updates: Partial<DataRetentionPolicy>) => {
    const validationErrors = DataRetentionService.validateRetentionPolicy(updates)
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0])
      return Promise.reject(new Error(validationErrors[0]))
    }
    return updatePolicyMutation.mutateAsync({ tableName, updates })
  }

  const checkCompliance = (tableName: string) => {
    return checkComplianceMutation.mutateAsync(tableName)
  }

  const deleteExpiredRecords = (tableName: string, dryRun: boolean = true) => {
    return deleteExpiredMutation.mutateAsync({ tableName, dryRun })
  }

  const createBackup = (tableName: string, reason?: string) => {
    return createBackupMutation.mutateAsync({ tableName, reason })
  }

  const createMedicalBackup = (scope?: string, includeDeleted?: boolean) => {
    return createMedicalBackupMutation.mutateAsync({ scope, includeDeleted })
  }

  const runRetentionCheck = () => {
    return runRetentionCheckMutation.mutateAsync()
  }

  const scheduleRetention = (tableName: string) => {
    return scheduleRetentionMutation.mutateAsync(tableName)
  }

  // Get policy for specific table
  const getTablePolicy = (tableName: string): DataRetentionPolicy | undefined => {
    return retentionPolicies?.find(policy => policy.table_name === tableName)
  }

  // Get compliance for specific table
  const getTableCompliance = (tableName: string): RetentionComplianceResult | undefined => {
    return complianceOverview?.find(compliance => compliance.table_name === tableName)
  }

  // Check if table has expired records
  const hasExpiredRecords = (tableName: string): boolean => {
    const compliance = getTableCompliance(tableName)
    return (compliance?.expired_records || 0) > 0
  }

  // Get compliance status color
  const getComplianceStatusColor = (compliance: number): string => {
    if (compliance >= 95) return 'green'
    if (compliance >= 85) return 'yellow'
    if (compliance >= 70) return 'orange'
    return 'red'
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format retention period
  const formatRetentionPeriod = (days: number): string => {
    if (days < 30) {
      return t('retention.period.days', `${days} days`)
    } else if (days < 365) {
      const months = Math.round(days / 30)
      return t('retention.period.months', `${months} months`)
    } else {
      const years = Math.round(days / 365)
      return t('retention.period.years', `${years} years`)
    }
  }

  return {
    // Data
    retentionPolicies: retentionPolicies || [],
    complianceOverview: complianceOverview || [],
    retentionStats,
    backupRecords: backupRecords || [],
    lifecycleEvents: lifecycleEvents || [],
    storageUsage,

    // Loading states
    isLoading: isPoliciesLoading || isComplianceLoading,
    isPoliciesLoading,
    isComplianceLoading,
    isStatsLoading,
    isBackupsLoading,
    isEventsLoading,
    isStorageLoading,
    isUpdatingPolicy: updatePolicyMutation.isPending,
    isCheckingCompliance: checkComplianceMutation.isPending,
    isDeletingRecords: deleteExpiredMutation.isPending,
    isCreatingBackup: createBackupMutation.isPending,
    isCreatingMedicalBackup: createMedicalBackupMutation.isPending,
    isRunningRetentionCheck: runRetentionCheckMutation.isPending,
    isSchedulingRetention: scheduleRetentionMutation.isPending,

    // Actions
    updateRetentionPolicy,
    checkCompliance,
    deleteExpiredRecords,
    createBackup,
    createMedicalBackup,
    runRetentionCheck,
    scheduleRetention,
    refetchCompliance,

    // Helper functions
    getTablePolicy,
    getTableCompliance,
    hasExpiredRecords,
    getComplianceStatusColor,
    formatFileSize,
    formatRetentionPeriod,

    // Errors
    error: policiesError,
    updateError: updatePolicyMutation.error,
    complianceError: checkComplianceMutation.error,
    deleteError: deleteExpiredMutation.error,
    backupError: createBackupMutation.error,
    medicalBackupError: createMedicalBackupMutation.error,
    retentionCheckError: runRetentionCheckMutation.error,
    scheduleError: scheduleRetentionMutation.error,
  }
}

export default useDataRetention