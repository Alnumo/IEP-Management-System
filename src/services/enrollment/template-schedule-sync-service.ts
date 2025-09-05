// Story 6.1: Template schedule synchronization service for program template updates

import { supabase } from '@/lib/supabase'
import type { ProgramTemplate } from '@/types/program-templates'
import type { ScheduleSlot } from './individualized-scheduling-service'
import type { IndividualizedEnrollment } from '@/types/individualized-enrollment'

export interface TemplateSyncOperation {
  id: string
  template_id: string
  template_version: string
  sync_type: 'full_rebuild' | 'partial_update' | 'validation_only'
  affected_enrollments: string[]
  changes_detected: TemplateChange[]
  sync_status: 'pending' | 'in_progress' | 'completed' | 'failed'
  started_at?: string
  completed_at?: string
  results: SyncResults
}

export interface TemplateChange {
  field: keyof ProgramTemplate
  old_value: any
  new_value: any
  impact_level: 'low' | 'medium' | 'high'
  requires_schedule_rebuild: boolean
  affects_existing_sessions: boolean
}

export interface SyncResults {
  enrollments_processed: number
  schedules_rebuilt: number
  sessions_modified: number
  sessions_cancelled: number
  conflicts_detected: number
  conflicts_resolved: number
  errors: string[]
}

export interface SyncPolicy {
  auto_sync_enabled: boolean
  sync_trigger: 'immediate' | 'scheduled' | 'manual'
  preservation_rules: PreservationRule[]
  notification_settings: {
    notify_on_changes: boolean
    notify_affected_users: boolean
    advance_notice_hours: number
  }
  rollback_settings: {
    allow_rollback: boolean
    rollback_window_hours: number
    backup_schedules: boolean
  }
}

export interface PreservationRule {
  condition: 'completed_sessions' | 'upcoming_sessions' | 'critical_dates' | 'custom'
  action: 'preserve' | 'modify' | 'replace' | 'require_approval'
  threshold_days?: number
  custom_logic?: string
}

export interface SyncValidation {
  can_sync: boolean
  warnings: string[]
  blocking_issues: string[]
  estimated_impact: {
    affected_enrollments: number
    sessions_to_cancel: number
    sessions_to_modify: number
    schedule_rebuilds_needed: number
  }
}

class TemplateScheduleSyncService {
  /**
   * Analyze template changes and determine sync requirements
   */
  async analyzeTemplateChanges(
    template_id: string,
    old_template: ProgramTemplate,
    new_template: ProgramTemplate
  ): Promise<{ changes: TemplateChange[]; sync_required: boolean; impact_level: 'low' | 'medium' | 'high' }> {
    const changes: TemplateChange[] = []

    // Compare template fields
    const fieldsToCheck: Array<keyof ProgramTemplate> = [
      'base_duration_weeks',
      'base_sessions_per_week',
      'default_goals',
      'customization_options'
    ]

    for (const field of fieldsToCheck) {
      if (JSON.stringify(old_template[field]) !== JSON.stringify(new_template[field])) {
        changes.push({
          field,
          old_value: old_template[field],
          new_value: new_template[field],
          impact_level: this.assessChangeImpact(field, old_template[field], new_template[field]),
          requires_schedule_rebuild: this.requiresScheduleRebuild(field),
          affects_existing_sessions: this.affectsExistingSessions(field)
        })
      }
    }

    const sync_required = changes.some(change => 
      change.requires_schedule_rebuild || change.affects_existing_sessions
    )

    const impact_level = changes.some(c => c.impact_level === 'high') ? 'high' :
                        changes.some(c => c.impact_level === 'medium') ? 'medium' : 'low'

    return { changes, sync_required, impact_level }
  }

  /**
   * Validate if synchronization can be performed
   */
  async validateSyncOperation(
    template_id: string,
    changes: TemplateChange[],
    policy: SyncPolicy
  ): Promise<SyncValidation> {
    const validation: SyncValidation = {
      can_sync: true,
      warnings: [],
      blocking_issues: [],
      estimated_impact: {
        affected_enrollments: 0,
        sessions_to_cancel: 0,
        sessions_to_modify: 0,
        schedule_rebuilds_needed: 0
      }
    }

    try {
      // Get affected enrollments
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('program_template_id', template_id)
        .eq('enrollment_status', 'active')

      if (enrollmentError) {
        validation.blocking_issues.push(`Error fetching enrollments: ${enrollmentError.message}`)
        validation.can_sync = false
        return validation
      }

      validation.estimated_impact.affected_enrollments = enrollments?.length || 0

      if (!enrollments || enrollments.length === 0) {
        validation.warnings.push('No active enrollments found for this template')
        return validation
      }

      // Check each enrollment for impact
      for (const enrollment of enrollments) {
        const impact = await this.calculateEnrollmentImpact(enrollment, changes, policy)
        
        validation.estimated_impact.sessions_to_cancel += impact.sessions_to_cancel
        validation.estimated_impact.sessions_to_modify += impact.sessions_to_modify
        
        if (impact.needs_rebuild) {
          validation.estimated_impact.schedule_rebuilds_needed++
        }

        // Check for blocking conditions
        if (impact.has_conflicts) {
          validation.blocking_issues.push(
            `Enrollment ${enrollment.id} has scheduling conflicts that must be resolved`
          )
        }

        if (impact.has_critical_sessions && !policy.rollback_settings.allow_rollback) {
          validation.warnings.push(
            `Enrollment ${enrollment.id} has critical sessions that may be affected`
          )
        }
      }

      // Check preservation rules
      for (const rule of policy.preservation_rules) {
        const ruleViolations = await this.checkPreservationRule(rule, enrollments, changes)
        validation.warnings.push(...ruleViolations)
      }

      // Final validation checks
      if (validation.blocking_issues.length > 0) {
        validation.can_sync = false
      }

      return validation
    } catch (error) {
      validation.blocking_issues.push(`Validation error: ${error}`)
      validation.can_sync = false
      return validation
    }
  }

  /**
   * Execute template synchronization
   */
  async executeSyncOperation(
    template_id: string,
    changes: TemplateChange[],
    policy: SyncPolicy,
    options?: {
      dry_run?: boolean
      batch_size?: number
      include_notifications?: boolean
    }
  ): Promise<TemplateSyncOperation> {
    const operation: TemplateSyncOperation = {
      id: crypto.randomUUID(),
      template_id,
      template_version: new Date().toISOString(),
      sync_type: this.determineSyncType(changes),
      affected_enrollments: [],
      changes_detected: changes,
      sync_status: 'pending',
      results: {
        enrollments_processed: 0,
        schedules_rebuilt: 0,
        sessions_modified: 0,
        sessions_cancelled: 0,
        conflicts_detected: 0,
        conflicts_resolved: 0,
        errors: []
      }
    }

    try {
      // Mark operation as in progress
      operation.sync_status = 'in_progress'
      operation.started_at = new Date().toISOString()

      // Get affected enrollments
      const { data: enrollments, error } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('program_template_id', template_id)
        .eq('enrollment_status', 'active')

      if (error) {
        throw new Error(`Failed to fetch enrollments: ${error.message}`)
      }

      if (!enrollments || enrollments.length === 0) {
        operation.sync_status = 'completed'
        operation.completed_at = new Date().toISOString()
        return operation
      }

      operation.affected_enrollments = enrollments.map(e => e.id)

      // Process enrollments in batches
      const batchSize = options?.batch_size || 10
      const batches = this.createBatches(enrollments, batchSize)

      for (const batch of batches) {
        if (!options?.dry_run) {
          const batchResults = await this.processBatch(batch, changes, policy)
          
          // Aggregate results
          operation.results.enrollments_processed += batchResults.enrollments_processed
          operation.results.schedules_rebuilt += batchResults.schedules_rebuilt
          operation.results.sessions_modified += batchResults.sessions_modified
          operation.results.sessions_cancelled += batchResults.sessions_cancelled
          operation.results.conflicts_detected += batchResults.conflicts_detected
          operation.results.conflicts_resolved += batchResults.conflicts_resolved
          operation.results.errors.push(...batchResults.errors)
        } else {
          // Dry run - just count what would be affected
          operation.results.enrollments_processed += batch.length
        }
      }

      // Send notifications if requested
      if (options?.include_notifications && policy.notification_settings.notify_affected_users) {
        await this.sendSyncNotifications(operation, enrollments)
      }

      operation.sync_status = 'completed'
      operation.completed_at = new Date().toISOString()

      // Log the operation
      await this.logSyncOperation(operation)

    } catch (error) {
      operation.sync_status = 'failed'
      operation.results.errors.push(`Sync failed: ${error}`)
      await this.logSyncOperation(operation)
    }

    return operation
  }

  /**
   * Rollback a synchronization operation
   */
  async rollbackSyncOperation(
    operation_id: string
  ): Promise<{ success: boolean; message: string; sessions_restored: number }> {
    try {
      // Get operation details
      const { data: operation, error } = await supabase
        .from('template_sync_operations')
        .select('*')
        .eq('id', operation_id)
        .single()

      if (error || !operation) {
        return { success: false, message: 'Sync operation not found', sessions_restored: 0 }
      }

      // Check if rollback is allowed
      const rollbackDeadline = new Date(operation.completed_at)
      rollbackDeadline.setHours(rollbackDeadline.getHours() + 24) // 24 hour window

      if (new Date() > rollbackDeadline) {
        return { success: false, message: 'Rollback window expired', sessions_restored: 0 }
      }

      // Get backup schedules
      const { data: backups } = await supabase
        .from('schedule_backups')
        .select('*')
        .eq('sync_operation_id', operation_id)

      if (!backups || backups.length === 0) {
        return { success: false, message: 'No backup schedules found', sessions_restored: 0 }
      }

      let sessionsRestored = 0

      // Restore from backups
      for (const backup of backups) {
        const { data: currentSessions } = await supabase
          .from('schedule_slots')
          .select('*')
          .eq('enrollment_id', backup.enrollment_id)
          .eq('status', 'scheduled')

        // Delete current sessions
        if (currentSessions && currentSessions.length > 0) {
          await supabase
            .from('schedule_slots')
            .delete()
            .in('id', currentSessions.map(s => s.id))
        }

        // Restore backup sessions
        if (backup.schedule_data && backup.schedule_data.length > 0) {
          await supabase
            .from('schedule_slots')
            .insert(backup.schedule_data.map((s: any) => ({
              ...s,
              id: crypto.randomUUID(), // New IDs
              notes: `${s.notes || ''} [Restored from backup]`
            })))

          sessionsRestored += backup.schedule_data.length
        }
      }

      // Mark rollback as completed
      await supabase
        .from('template_sync_operations')
        .update({
          rollback_completed_at: new Date().toISOString(),
          rollback_sessions_restored: sessionsRestored
        })
        .eq('id', operation_id)

      return { 
        success: true, 
        message: `Rollback completed successfully`, 
        sessions_restored: sessionsRestored 
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Rollback failed: ${error}`, 
        sessions_restored: 0 
      }
    }
  }

  /**
   * Monitor sync operations
   */
  async getSyncOperationStatus(
    operation_id: string
  ): Promise<{
    operation: TemplateSyncOperation | null
    progress: number
    estimated_completion?: string
  }> {
    try {
      const { data: operation, error } = await supabase
        .from('template_sync_operations')
        .select('*')
        .eq('id', operation_id)
        .single()

      if (error || !operation) {
        return { operation: null, progress: 0 }
      }

      // Calculate progress
      const totalEnrollments = operation.affected_enrollments.length
      const processed = operation.results.enrollments_processed
      const progress = totalEnrollments > 0 ? (processed / totalEnrollments) * 100 : 0

      // Estimate completion time if in progress
      let estimated_completion
      if (operation.sync_status === 'in_progress' && operation.started_at && progress > 0) {
        const elapsed = new Date().getTime() - new Date(operation.started_at).getTime()
        const estimated_total = (elapsed / progress) * 100
        const remaining = estimated_total - elapsed
        estimated_completion = new Date(new Date().getTime() + remaining).toISOString()
      }

      return {
        operation,
        progress,
        estimated_completion
      }
    } catch (error) {
      console.error('Error getting sync operation status:', error)
      return { operation: null, progress: 0 }
    }
  }

  /**
   * Get sync history for a template
   */
  async getTemplateSyncHistory(
    template_id: string,
    options?: {
      limit?: number
      start_date?: string
      end_date?: string
    }
  ): Promise<TemplateSyncOperation[]> {
    try {
      let query = supabase
        .from('template_sync_operations')
        .select('*')
        .eq('template_id', template_id)
        .order('started_at', { ascending: false })

      if (options?.start_date) {
        query = query.gte('started_at', options.start_date)
      }

      if (options?.end_date) {
        query = query.lte('started_at', options.end_date)
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error getting sync history:', error)
      return []
    }
  }

  // Helper methods

  private assessChangeImpact(
    field: keyof ProgramTemplate,
    oldValue: any,
    newValue: any
  ): 'low' | 'medium' | 'high' {
    switch (field) {
      case 'base_duration_weeks':
        const durationChange = Math.abs((newValue as number) - (oldValue as number))
        return durationChange > 8 ? 'high' : durationChange > 4 ? 'medium' : 'low'
      
      case 'base_sessions_per_week':
        const sessionChange = Math.abs((newValue as number) - (oldValue as number))
        return sessionChange > 2 ? 'high' : sessionChange > 1 ? 'medium' : 'low'
      
      case 'default_goals':
        const goalChanges = this.compareArrays(oldValue, newValue)
        return goalChanges > 50 ? 'high' : goalChanges > 25 ? 'medium' : 'low'
      
      case 'customization_options':
        return 'medium' // Schedule flexibility changes always medium impact
      
      default:
        return 'low'
    }
  }

  private requiresScheduleRebuild(field: keyof ProgramTemplate): boolean {
    return ['base_duration_weeks', 'base_sessions_per_week'].includes(field)
  }

  private affectsExistingSessions(field: keyof ProgramTemplate): boolean {
    return ['base_sessions_per_week', 'customization_options'].includes(field)
  }

  private async calculateEnrollmentImpact(
    enrollment: IndividualizedEnrollment,
    changes: TemplateChange[],
    policy: SyncPolicy
  ): Promise<{
    sessions_to_cancel: number
    sessions_to_modify: number
    needs_rebuild: boolean
    has_conflicts: boolean
    has_critical_sessions: boolean
  }> {
    const impact = {
      sessions_to_cancel: 0,
      sessions_to_modify: 0,
      needs_rebuild: false,
      has_conflicts: false,
      has_critical_sessions: false
    }

    // Get existing sessions
    const { data: sessions } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('enrollment_id', enrollment.id)
      .eq('status', 'scheduled')
      .gte('session_date', new Date().toISOString())

    if (!sessions || sessions.length === 0) {
      return impact
    }

    // Check if rebuild is needed
    impact.needs_rebuild = changes.some(change => change.requires_schedule_rebuild)

    if (impact.needs_rebuild) {
      impact.sessions_to_cancel = sessions.length
    } else {
      // Check individual sessions for modifications needed
      for (const session of sessions) {
        const needsModification = changes.some(change => 
          change.affects_existing_sessions && this.sessionAffectedByChange(session, change)
        )
        
        if (needsModification) {
          impact.sessions_to_modify++
        }
      }
    }

    // Check for critical sessions (within preservation window)
    const criticalWindow = new Date()
    criticalWindow.setDate(criticalWindow.getDate() + 7) // 7 days ahead
    
    impact.has_critical_sessions = sessions.some(session => 
      new Date(session.session_date) <= criticalWindow
    )

    return impact
  }

  private async checkPreservationRule(
    rule: PreservationRule,
    enrollments: IndividualizedEnrollment[],
    changes: TemplateChange[]
  ): Promise<string[]> {
    const warnings: string[] = []

    switch (rule.condition) {
      case 'completed_sessions':
        // Check if there are completed sessions that might be affected
        for (const enrollment of enrollments) {
          const { data: completedSessions } = await supabase
            .from('schedule_slots')
            .select('id')
            .eq('enrollment_id', enrollment.id)
            .eq('status', 'completed')

          if (completedSessions && completedSessions.length > 0 && rule.action === 'preserve') {
            warnings.push(`Enrollment ${enrollment.id} has completed sessions that will be preserved`)
          }
        }
        break

      case 'upcoming_sessions':
        // Check for upcoming sessions within threshold
        const thresholdDate = new Date()
        thresholdDate.setDate(thresholdDate.getDate() + (rule.threshold_days || 7))

        for (const enrollment of enrollments) {
          const { data: upcomingSessions } = await supabase
            .from('schedule_slots')
            .select('id')
            .eq('enrollment_id', enrollment.id)
            .eq('status', 'scheduled')
            .lte('session_date', thresholdDate.toISOString())

          if (upcomingSessions && upcomingSessions.length > 0) {
            if (rule.action === 'require_approval') {
              warnings.push(`Enrollment ${enrollment.id} has upcoming sessions requiring approval for changes`)
            } else if (rule.action === 'preserve') {
              warnings.push(`Enrollment ${enrollment.id} has upcoming sessions that will be preserved`)
            }
          }
        }
        break
    }

    return warnings
  }

  private determineSyncType(changes: TemplateChange[]): 'full_rebuild' | 'partial_update' | 'validation_only' {
    if (changes.some(change => change.requires_schedule_rebuild)) {
      return 'full_rebuild'
    } else if (changes.some(change => change.affects_existing_sessions)) {
      return 'partial_update'
    } else {
      return 'validation_only'
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private async processBatch(
    enrollments: IndividualizedEnrollment[],
    changes: TemplateChange[],
    policy: SyncPolicy
  ): Promise<SyncResults> {
    const results: SyncResults = {
      enrollments_processed: 0,
      schedules_rebuilt: 0,
      sessions_modified: 0,
      sessions_cancelled: 0,
      conflicts_detected: 0,
      conflicts_resolved: 0,
      errors: []
    }

    for (const enrollment of enrollments) {
      try {
        // Backup current schedule if policy allows
        if (policy.rollback_settings.backup_schedules) {
          await this.backupEnrollmentSchedule(enrollment.id)
        }

        // Process enrollment based on changes
        const needsRebuild = changes.some(change => change.requires_schedule_rebuild)
        
        if (needsRebuild) {
          const rebuildResult = await this.rebuildEnrollmentSchedule(enrollment, changes)
          results.schedules_rebuilt++
          results.sessions_cancelled += rebuildResult.sessions_cancelled
          results.conflicts_detected += rebuildResult.conflicts_detected
          results.conflicts_resolved += rebuildResult.conflicts_resolved
        } else {
          const updateResult = await this.updateEnrollmentSchedule(enrollment, changes)
          results.sessions_modified += updateResult.sessions_modified
          results.conflicts_detected += updateResult.conflicts_detected
          results.conflicts_resolved += updateResult.conflicts_resolved
        }

        results.enrollments_processed++
      } catch (error) {
        results.errors.push(`Error processing enrollment ${enrollment.id}: ${error}`)
      }
    }

    return results
  }

  private async backupEnrollmentSchedule(enrollment_id: string): Promise<void> {
    const { data: sessions } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('enrollment_id', enrollment_id)
      .eq('status', 'scheduled')

    if (sessions && sessions.length > 0) {
      await supabase
        .from('schedule_backups')
        .insert({
          enrollment_id,
          backup_date: new Date().toISOString(),
          schedule_data: sessions
        })
    }
  }

  private async rebuildEnrollmentSchedule(
    enrollment: IndividualizedEnrollment,
    changes: TemplateChange[]
  ): Promise<{
    sessions_cancelled: number
    conflicts_detected: number
    conflicts_resolved: number
  }> {
    // Get current sessions
    const { data: currentSessions } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('enrollment_id', enrollment.id)
      .eq('status', 'scheduled')
      .gte('session_date', new Date().toISOString())

    const sessionsCancelled = currentSessions?.length || 0

    // Cancel current sessions
    if (currentSessions && currentSessions.length > 0) {
      await supabase
        .from('schedule_slots')
        .update({
          status: 'cancelled',
          notes: 'Template update - schedule rebuilt'
        })
        .in('id', currentSessions.map(s => s.id))
    }

    // Generate new schedule
    const { individualizedSchedulingService } = await import('./individualized-scheduling-service')
    
    await individualizedSchedulingService.generateIndividualSchedule({
      enrollment_id: enrollment.id,
      start_date: new Date().toISOString(),
      end_date: enrollment.individual_end_date,
      custom_schedule: enrollment.custom_schedule,
      therapist_id: enrollment.assigned_therapist_id
    })

    return {
      sessions_cancelled: sessionsCancelled,
      conflicts_detected: 0, // Would be detected by scheduling service
      conflicts_resolved: 0
    }
  }

  private async updateEnrollmentSchedule(
    enrollment: IndividualizedEnrollment,
    changes: TemplateChange[]
  ): Promise<{
    sessions_modified: number
    conflicts_detected: number
    conflicts_resolved: number
  }> {
    // Get sessions that need modification
    const { data: sessions } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('enrollment_id', enrollment.id)
      .eq('status', 'scheduled')
      .gte('session_date', new Date().toISOString())

    if (!sessions || sessions.length === 0) {
      return { sessions_modified: 0, conflicts_detected: 0, conflicts_resolved: 0 }
    }

    let sessionsModified = 0

    for (const session of sessions) {
      const needsUpdate = changes.some(change => 
        this.sessionAffectedByChange(session, change)
      )

      if (needsUpdate) {
        // Apply changes to session
        const updatedSession = this.applyChangesToSession(session, changes)
        
        await supabase
          .from('schedule_slots')
          .update(updatedSession)
          .eq('id', session.id)

        sessionsModified++
      }
    }

    return {
      sessions_modified: sessionsModified,
      conflicts_detected: 0,
      conflicts_resolved: 0
    }
  }

  private sessionAffectedByChange(session: ScheduleSlot, change: TemplateChange): boolean {
    // Determine if specific session is affected by template change
    switch (change.field) {
      case 'base_sessions_per_week':
        return true // All future sessions might be affected
      case 'customization_options':
        return true // Schedule flexibility changes might affect sessions
      default:
        return false
    }
  }

  private applyChangesToSession(session: ScheduleSlot, changes: TemplateChange[]): Partial<ScheduleSlot> {
    const updates: Partial<ScheduleSlot> = {
      notes: `${session.notes || ''} [Updated by template sync]`,
      updated_at: new Date().toISOString()
    }

    // Apply specific changes based on template modifications
    for (const change of changes) {
      // This would contain logic to apply specific changes
      // Implementation depends on the specific change type
    }

    return updates
  }

  private async sendSyncNotifications(
    operation: TemplateSyncOperation,
    enrollments: IndividualizedEnrollment[]
  ): Promise<void> {
    // Send notifications to affected users
    const notifications = enrollments.map(enrollment => ({
      type: 'template_sync',
      enrollment_id: enrollment.id,
      message: `Program template has been updated. ${operation.results.sessions_modified} sessions affected.`,
      created_at: new Date().toISOString()
    }))

    await supabase
      .from('notifications')
      .insert(notifications)
  }

  private async logSyncOperation(operation: TemplateSyncOperation): Promise<void> {
    await supabase
      .from('template_sync_operations')
      .upsert(operation)
  }

  private compareArrays(arr1: any[], arr2: any[]): number {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return 0
    
    const set1 = new Set(arr1.map(item => JSON.stringify(item)))
    const set2 = new Set(arr2.map(item => JSON.stringify(item)))
    
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return union.size > 0 ? ((union.size - intersection.size) / union.size) * 100 : 0
  }
}

export const templateScheduleSyncService = new TemplateScheduleSyncService()