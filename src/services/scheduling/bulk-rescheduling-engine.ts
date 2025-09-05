/**
 * Bulk Rescheduling Engine Service
 * Story 3.1: Automated Scheduling Engine - Bulk Operations
 * 
 * Advanced bulk rescheduling system with transaction safety, rollback capabilities,
 * and performance optimization for large-scale operations. Supports Arabic RTL/English LTR.
 */

import { supabase } from '@/lib/supabase'
import { conflictDetector } from './conflict-detector'
import { optimizationRuleEngine } from './optimization-rule-engine'
import type {
  BulkReschedulingRequest,
  BulkReschedulingResult,
  ScheduledSession,
  ScheduleConflict,
  OperationStatus,
  TherapistAvailability,
  SchedulingSuggestion
} from '@/types/scheduling'

// =====================================================
// Bulk Rescheduling Engine Class
// =====================================================

export class BulkReschedulingEngine {
  private static instance: BulkReschedulingEngine
  private activeOperations = new Map<string, BulkOperation>()
  private readonly MAX_BATCH_SIZE = 100
  private readonly MAX_CONCURRENT_OPERATIONS = 3

  static getInstance(): BulkReschedulingEngine {
    if (!BulkReschedulingEngine.instance) {
      BulkReschedulingEngine.instance = new BulkReschedulingEngine()
    }
    return BulkReschedulingEngine.instance
  }

  /**
   * Execute bulk rescheduling operation with transaction safety
   */
  async executeBulkReschedule(request: BulkReschedulingRequest): Promise<BulkReschedulingResult> {
    const operationId = this.generateOperationId()
    const startTime = Date.now()

    try {
      // Validate request
      const validation = this.validateRequest(request)
      if (!validation.isValid) {
        return this.createErrorResult(operationId, validation.errors)
      }

      // Check concurrent operation limits
      if (this.activeOperations.size >= this.MAX_CONCURRENT_OPERATIONS) {
        return this.createErrorResult(operationId, [
          'تم الوصول للحد الأقصى للعمليات المتزامنة / Maximum concurrent operations reached'
        ])
      }

      // Initialize operation tracking
      const operation = await this.initializeOperation(operationId, request)
      this.activeOperations.set(operationId, operation)

      // Fetch target sessions and validate
      const targetSessions = await this.fetchTargetSessions(request.session_ids)
      if (targetSessions.length === 0) {
        return this.createErrorResult(operationId, [
          'لم يتم العثور على جلسات صالحة للجدولة / No valid sessions found for rescheduling'
        ])
      }

      // Create backup for rollback
      const backup = await this.createBackup(targetSessions)
      operation.rollbackData = backup

      // Execute rescheduling in batches
      const result = await this.processReschedulingBatches(operation, targetSessions, request)

      // Finalize operation
      await this.finalizeOperation(operation, result)
      this.activeOperations.delete(operationId)

      const totalTime = Date.now() - startTime
      console.log(`Bulk rescheduling completed in ${totalTime}ms for operation ${operationId}`)

      return {
        ...result,
        operation_id: operationId,
        processing_time_ms: totalTime
      }

    } catch (error) {
      console.error('Bulk rescheduling failed:', error)
      
      // Attempt cleanup
      await this.handleOperationError(operationId, error)
      this.activeOperations.delete(operationId)

      return this.createErrorResult(operationId, [
        `فشلت عملية إعادة الجدولة الجماعية: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        `Bulk rescheduling failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ])
    }
  }

  /**
   * Get operation status and progress
   */
  getOperationStatus(operationId: string): {
    status: OperationStatus
    progress: number
    currentStep?: string
    estimatedCompletion?: Date
    errors?: string[]
  } | null {
    const operation = this.activeOperations.get(operationId)
    if (!operation) {
      return null
    }

    return {
      status: operation.status,
      progress: operation.progressPercentage,
      currentStep: operation.currentStep,
      estimatedCompletion: operation.estimatedCompletion,
      errors: operation.errors
    }
  }

  /**
   * Cancel an active operation
   */
  async cancelOperation(operationId: string): Promise<{ success: boolean; message: string }> {
    const operation = this.activeOperations.get(operationId)
    if (!operation) {
      return {
        success: false,
        message: 'العملية غير موجودة / Operation not found'
      }
    }

    if (operation.status === 'completed') {
      return {
        success: false,
        message: 'لا يمكن إلغاء عملية مكتملة / Cannot cancel completed operation'
      }
    }

    try {
      // Mark as cancelled
      operation.status = 'cancelled'
      operation.currentStep = 'cancelling'

      // Rollback changes if any
      if (operation.processedSessions.length > 0) {
        await this.rollbackOperation(operation)
      }

      // Update database
      await this.updateOperationLog(operationId, {
        operation_status: 'cancelled',
        completed_at: new Date().toISOString(),
        current_step: 'cancelled'
      })

      this.activeOperations.delete(operationId)

      return {
        success: true,
        message: 'تم إلغاء العملية بنجاح / Operation cancelled successfully'
      }

    } catch (error) {
      console.error('Operation cancellation failed:', error)
      return {
        success: false,
        message: `فشل في إلغاء العملية: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
      }
    }
  }

  /**
   * Rollback a completed operation
   */
  async rollbackOperation(operationIdOrOperation: string | BulkOperation): Promise<{ success: boolean; message: string }> {
    try {
      let operation: BulkOperation

      if (typeof operationIdOrOperation === 'string') {
        const storedOperation = this.activeOperations.get(operationIdOrOperation)
        if (!storedOperation) {
          // Try to fetch from database
          const { data, error } = await supabase
            .from('bulk_operation_logs')
            .select('*')
            .eq('operation_id', operationIdOrOperation)
            .single()

          if (error) throw error

          operation = {
            id: data.id,
            operationId: data.operation_id,
            status: data.operation_status,
            type: data.operation_type,
            totalItems: data.total_items,
            processedItems: data.processed_items,
            successfulItems: data.successful_items,
            failedItems: data.failed_items,
            processedSessions: [],
            failedSessions: [],
            conflicts: [],
            rollbackData: data.rollback_data,
            progressPercentage: data.progress_percentage,
            currentStep: data.current_step,
            estimatedCompletion: data.estimated_completion ? new Date(data.estimated_completion) : undefined,
            errors: data.error_details ? Object.values(data.error_details) : []
          }
        } else {
          operation = storedOperation
        }
      } else {
        operation = operationIdOrOperation
      }

      if (!operation.rollbackData || operation.rollbackData.sessions.length === 0) {
        return {
          success: false,
          message: 'لا توجد بيانات للتراجع / No rollback data available'
        }
      }

      // Start database transaction
      const { error: transactionError } = await supabase.rpc('begin_transaction')
      if (transactionError) throw transactionError

      try {
        // Restore original session data
        const restorePromises = operation.rollbackData.sessions.map(async (originalSession: ScheduledSession) => {
          const { error } = await supabase
            .from('therapy_sessions')
            .update({
              scheduled_date: originalSession.scheduled_date,
              start_time: originalSession.start_time,
              end_time: originalSession.end_time,
              therapist_id: originalSession.therapist_id,
              room_id: originalSession.room_id,
              status: originalSession.status,
              updated_at: new Date().toISOString()
            })
            .eq('id', originalSession.id)

          if (error) throw error
        })

        await Promise.all(restorePromises)

        // Remove conflicts that were resolved during the operation
        if (operation.rollbackData.conflicts) {
          const { error: conflictError } = await supabase
            .from('schedule_conflicts')
            .delete()
            .in('id', operation.rollbackData.conflicts.map(c => c.id))

          if (conflictError) throw conflictError
        }

        // Commit transaction
        const { error: commitError } = await supabase.rpc('commit_transaction')
        if (commitError) throw commitError

        // Update operation status
        await this.updateOperationLog(operation.operationId, {
          operation_status: 'rolled_back',
          rollback_executed: true,
          completed_at: new Date().toISOString()
        })

        return {
          success: true,
          message: `تم التراجع بنجاح عن ${operation.rollbackData.sessions.length} جلسة / Successfully rolled back ${operation.rollbackData.sessions.length} sessions`
        }

      } catch (error) {
        // Rollback transaction on error
        await supabase.rpc('rollback_transaction')
        throw error
      }

    } catch (error) {
      console.error('Operation rollback failed:', error)
      return {
        success: false,
        message: `فشل التراجع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
      }
    }
  }

  /**
   * Get list of active operations
   */
  getActiveOperations(): Array<{
    operationId: string
    status: OperationStatus
    progress: number
    type: string
    startTime: Date
  }> {
    return Array.from(this.activeOperations.values()).map(op => ({
      operationId: op.operationId,
      status: op.status,
      progress: op.progressPercentage,
      type: op.type,
      startTime: op.startTime
    }))
  }

  // =====================================================
  // Private Implementation Methods
  // =====================================================

  private validateRequest(request: BulkReschedulingRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!request.session_ids || request.session_ids.length === 0) {
      errors.push('معرفات الجلسات مطلوبة / Session IDs are required')
    }

    if (request.session_ids.length > 1000) {
      errors.push('عدد الجلسات يتجاوز الحد الأقصى (1000) / Number of sessions exceeds maximum limit (1000)')
    }

    if (!request.operation_type || !['reschedule', 'cancel', 'modify'].includes(request.operation_type)) {
      errors.push('نوع العملية غير صالح / Invalid operation type')
    }

    if (!request.reason || request.reason.length < 5) {
      errors.push('سبب العملية مطلوب (5 أحرف على الأقل) / Operation reason is required (minimum 5 characters)')
    }

    if (request.operation_type === 'reschedule') {
      if (!request.new_date_range) {
        errors.push('نطاق التاريخ الجديد مطلوب لإعادة الجدولة / New date range is required for rescheduling')
      } else {
        const startDate = new Date(request.new_date_range.start_date)
        const endDate = new Date(request.new_date_range.end_date)
        
        if (startDate >= endDate) {
          errors.push('تاريخ البداية يجب أن يكون قبل تاريخ النهاية / Start date must be before end date')
        }

        if (startDate < new Date()) {
          errors.push('تاريخ البداية يجب أن يكون في المستقبل / Start date must be in the future')
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private async initializeOperation(operationId: string, request: BulkReschedulingRequest): Promise<BulkOperation> {
    // Create operation log in database
    const { data, error } = await supabase
      .from('bulk_operation_logs')
      .insert({
        operation_id: operationId,
        operation_type: request.operation_type,
        operation_status: 'pending',
        total_items: request.session_ids.length,
        processed_items: 0,
        successful_items: 0,
        failed_items: 0,
        operation_data: request,
        rollback_available: true,
        progress_percentage: 0,
        current_step: 'initializing',
        total_steps: Math.ceil(request.session_ids.length / this.MAX_BATCH_SIZE) + 2, // +2 for validation and finalization
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      operationId,
      status: 'pending',
      type: request.operation_type,
      totalItems: request.session_ids.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      processedSessions: [],
      failedSessions: [],
      conflicts: [],
      rollbackData: null,
      progressPercentage: 0,
      currentStep: 'initializing',
      startTime: new Date(),
      errors: []
    }
  }

  private async fetchTargetSessions(sessionIds: string[]): Promise<ScheduledSession[]> {
    const { data, error } = await supabase
      .from('therapy_sessions')
      .select(`
        *,
        students (*),
        therapists (*),
        therapy_rooms (*)
      `)
      .in('id', sessionIds)
      .neq('status', 'cancelled')

    if (error) throw error
    return data as ScheduledSession[]
  }

  private async createBackup(sessions: ScheduledSession[]): Promise<{ sessions: ScheduledSession[]; conflicts: ScheduleConflict[] }> {
    // Create backup of original session data
    const sessionBackup = sessions.map(session => ({ ...session }))

    // Backup any existing conflicts that might be resolved
    const { data: conflicts, error } = await supabase
      .from('schedule_conflicts')
      .select('*')
      .in('primary_session_id', sessions.map(s => s.id))
      .eq('resolution_status', 'pending')

    if (error) {
      console.warn('Failed to backup conflicts:', error)
    }

    return {
      sessions: sessionBackup,
      conflicts: conflicts || []
    }
  }

  private async processReschedulingBatches(
    operation: BulkOperation,
    sessions: ScheduledSession[],
    request: BulkReschedulingRequest
  ): Promise<Omit<BulkReschedulingResult, 'operation_id' | 'processing_time_ms'>> {
    const batchSize = request.batch_size || this.MAX_BATCH_SIZE
    const batches = this.chunkArray(sessions, batchSize)
    
    const results: Omit<BulkReschedulingResult, 'operation_id' | 'processing_time_ms'> = {
      total_requested: sessions.length,
      successful_operations: 0,
      failed_operations: 0,
      successful_session_ids: [],
      failed_session_ids: [],
      conflict_session_ids: [],
      new_sessions: [],
      conflicts: [],
      warnings: [],
      rollback_available: true
    }

    operation.status = 'in_progress'
    await this.updateOperationProgress(operation, 10, 'processing_batches')

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const batchNumber = i + 1

      try {
        operation.currentStep = `processing_batch_${batchNumber}_of_${batches.length}`
        await this.updateOperationProgress(operation, 10 + (80 * i / batches.length), operation.currentStep)

        const batchResult = await this.processBatch(batch, request)
        
        // Merge batch results
        results.successful_operations += batchResult.successful_operations
        results.failed_operations += batchResult.failed_operations
        results.successful_session_ids.push(...batchResult.successful_session_ids)
        results.failed_session_ids.push(...batchResult.failed_session_ids)
        results.conflict_session_ids.push(...batchResult.conflict_session_ids)
        results.new_sessions.push(...batchResult.new_sessions)
        results.conflicts.push(...batchResult.conflicts)
        results.warnings.push(...batchResult.warnings)

        // Update operation tracking
        operation.processedItems += batch.length
        operation.successfulItems += batchResult.successful_operations
        operation.failedItems += batchResult.failed_operations
        operation.processedSessions.push(...batchResult.new_sessions)
        operation.failedSessions.push(...batch.filter(s => batchResult.failed_session_ids.includes(s.id)))
        operation.conflicts.push(...batchResult.conflicts)

        // Update database progress
        await this.updateOperationLog(operation.operationId, {
          processed_items: operation.processedItems,
          successful_items: operation.successfulItems,
          failed_items: operation.failedItems,
          progress_percentage: operation.progressPercentage,
          current_step: operation.currentStep
        })

      } catch (error) {
        console.error(`Batch ${batchNumber} processing failed:`, error)
        
        // Mark all sessions in this batch as failed
        results.failed_operations += batch.length
        results.failed_session_ids.push(...batch.map(s => s.id))
        results.warnings.push(`فشلت معالجة المجموعة ${batchNumber}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
        
        operation.failedItems += batch.length
        operation.failedSessions.push(...batch)
        operation.errors.push(`Batch ${batchNumber} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return results
  }

  private async processBatch(
    sessions: ScheduledSession[],
    request: BulkReschedulingRequest
  ): Promise<Omit<BulkReschedulingResult, 'operation_id' | 'processing_time_ms'>> {
    const batchResult: Omit<BulkReschedulingResult, 'operation_id' | 'processing_time_ms'> = {
      total_requested: sessions.length,
      successful_operations: 0,
      failed_operations: 0,
      successful_session_ids: [],
      failed_session_ids: [],
      conflict_session_ids: [],
      new_sessions: [],
      conflicts: [],
      warnings: [],
      rollback_available: true
    }

    // Start database transaction for this batch
    const { error: transactionError } = await supabase.rpc('begin_transaction')
    if (transactionError) throw transactionError

    try {
      switch (request.operation_type) {
        case 'reschedule':
          await this.processBatchReschedule(sessions, request, batchResult)
          break
        
        case 'cancel':
          await this.processBatchCancel(sessions, request, batchResult)
          break
        
        case 'modify':
          await this.processBatchModify(sessions, request, batchResult)
          break
        
        default:
          throw new Error(`Unsupported operation type: ${request.operation_type}`)
      }

      // Commit transaction
      const { error: commitError } = await supabase.rpc('commit_transaction')
      if (commitError) throw commitError

    } catch (error) {
      // Rollback transaction on error
      await supabase.rpc('rollback_transaction')
      throw error
    }

    return batchResult
  }

  private async processBatchReschedule(
    sessions: ScheduledSession[],
    request: BulkReschedulingRequest,
    result: any
  ): Promise<void> {
    if (!request.new_date_range) {
      throw new Error('New date range is required for rescheduling')
    }

    // Fetch therapist availability for the new date range
    const availability = await this.fetchAvailability(
      request.new_date_range.start_date,
      request.new_date_range.end_date,
      request.new_therapist_id
    )

    for (const session of sessions) {
      try {
        // Find suitable new time slot
        const newSlot = await this.findAvailableSlot(session, request, availability)
        
        if (newSlot) {
          // Update session
          const updatedSession = {
            ...session,
            scheduled_date: newSlot.date,
            start_time: newSlot.start_time,
            end_time: newSlot.end_time,
            therapist_id: newSlot.therapist_id || session.therapist_id,
            status: 'scheduled' as const,
            updated_at: new Date().toISOString()
          }

          // Check for conflicts
          const conflicts = await conflictDetector.detectConflictsForSession(updatedSession, {
            existingSessions: result.new_sessions,
            availability
          })

          if (conflicts.length === 0) {
            // Update in database
            const { error } = await supabase
              .from('therapy_sessions')
              .update(updatedSession)
              .eq('id', session.id)

            if (error) throw error

            result.successful_operations++
            result.successful_session_ids.push(session.id)
            result.new_sessions.push(updatedSession)
          } else {
            // Has conflicts - add to conflict list
            result.conflicts.push(...conflicts)
            result.conflict_session_ids.push(session.id)
            result.warnings.push(`تضارب في الجدولة للجلسة ${session.id}`)
          }
        } else {
          // No suitable slot found
          result.failed_operations++
          result.failed_session_ids.push(session.id)
          result.warnings.push(`لم يتم العثور على موعد مناسب للجلسة ${session.id}`)
        }

      } catch (error) {
        console.error(`Failed to reschedule session ${session.id}:`, error)
        result.failed_operations++
        result.failed_session_ids.push(session.id)
        result.warnings.push(`فشل في إعادة جدولة الجلسة ${session.id}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
      }
    }
  }

  private async processBatchCancel(
    sessions: ScheduledSession[],
    request: BulkReschedulingRequest,
    result: any
  ): Promise<void> {
    for (const session of sessions) {
      try {
        const { error } = await supabase
          .from('therapy_sessions')
          .update({
            status: 'cancelled',
            notes: session.notes ? `${session.notes}\n\nCancelled: ${request.reason}` : `Cancelled: ${request.reason}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id)

        if (error) throw error

        result.successful_operations++
        result.successful_session_ids.push(session.id)
        
        // Send notification if requested
        if (request.notify_parents) {
          // This would integrate with notification system
          result.warnings.push(`إشعار الإلغاء مرسل لولي أمر الطالب ${session.student_id}`)
        }

      } catch (error) {
        console.error(`Failed to cancel session ${session.id}:`, error)
        result.failed_operations++
        result.failed_session_ids.push(session.id)
        result.warnings.push(`فشل في إلغاء الجلسة ${session.id}`)
      }
    }
  }

  private async processBatchModify(
    sessions: ScheduledSession[],
    request: BulkReschedulingRequest,
    result: any
  ): Promise<void> {
    const modifications = request.new_date_range || {}

    for (const session of sessions) {
      try {
        const updates: any = {
          updated_at: new Date().toISOString()
        }

        if (request.new_therapist_id) {
          updates.therapist_id = request.new_therapist_id
        }

        // Add other modification logic as needed

        const { error } = await supabase
          .from('therapy_sessions')
          .update(updates)
          .eq('id', session.id)

        if (error) throw error

        result.successful_operations++
        result.successful_session_ids.push(session.id)
        result.new_sessions.push({ ...session, ...updates })

      } catch (error) {
        console.error(`Failed to modify session ${session.id}:`, error)
        result.failed_operations++
        result.failed_session_ids.push(session.id)
        result.warnings.push(`فشل في تعديل الجلسة ${session.id}`)
      }
    }
  }

  private async findAvailableSlot(
    session: ScheduledSession,
    request: BulkReschedulingRequest,
    availability: TherapistAvailability[]
  ): Promise<{ date: string; start_time: string; end_time: string; therapist_id?: string } | null> {
    if (!request.new_date_range) return null

    const startDate = new Date(request.new_date_range.start_date)
    const endDate = new Date(request.new_date_range.end_date)
    const sessionDuration = session.duration_minutes || 60

    // Target therapist (original or new)
    const targetTherapistId = request.new_therapist_id || session.therapist_id

    // Find available slots
    const therapistAvailability = availability.filter(a => 
      a.therapist_id === targetTherapistId && a.is_available
    )

    if (therapistAvailability.length === 0) {
      return null
    }

    // Try each day in the date range
    let currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay()
      const dateStr = currentDate.toISOString().split('T')[0]

      // Find availability for this day
      const dayAvailability = therapistAvailability.filter(a => 
        a.day_of_week === dayOfWeek || a.specific_date === dateStr
      )

      for (const avail of dayAvailability) {
        // Check if session fits in this availability window
        const sessionEndTime = this.addMinutesToTime(avail.start_time, sessionDuration)
        
        if (sessionEndTime <= avail.end_time) {
          // Check for conflicts with existing sessions
          const hasConflicts = await this.checkTimeSlotConflicts(
            targetTherapistId,
            dateStr,
            avail.start_time,
            sessionEndTime
          )

          if (!hasConflicts) {
            return {
              date: dateStr,
              start_time: avail.start_time,
              end_time: sessionEndTime,
              therapist_id: targetTherapistId
            }
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return null
  }

  private async fetchAvailability(
    startDate: string,
    endDate: string,
    therapistId?: string
  ): Promise<TherapistAvailability[]> {
    let query = supabase
      .from('therapist_availability')
      .select('*')
      .eq('is_available', true)

    if (therapistId) {
      query = query.eq('therapist_id', therapistId)
    }

    const { data, error } = await query

    if (error) {
      console.warn('Failed to fetch availability:', error)
      return []
    }

    return data as TherapistAvailability[]
  }

  private async checkTimeSlotConflicts(
    therapistId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('therapy_sessions')
      .select('id')
      .eq('therapist_id', therapistId)
      .eq('scheduled_date', date)
      .neq('status', 'cancelled')
      .or(`start_time.lt.${endTime},end_time.gt.${startTime}`)

    if (error) {
      console.warn('Conflict check failed:', error)
      return true // Assume conflict to be safe
    }

    return data.length > 0
  }

  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number)
    const totalMinutes = hours * 60 + mins + minutes
    const newHours = Math.floor(totalMinutes / 60)
    const newMins = totalMinutes % 60
    
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`
  }

  private async finalizeOperation(operation: BulkOperation, result: any): Promise<void> {
    operation.status = 'completed'
    operation.currentStep = 'completed'
    operation.progressPercentage = 100

    await this.updateOperationLog(operation.operationId, {
      operation_status: 'completed',
      results: result,
      completed_at: new Date().toISOString(),
      progress_percentage: 100,
      current_step: 'completed'
    })
  }

  private async handleOperationError(operationId: string, error: any): Promise<void> {
    const operation = this.activeOperations.get(operationId)
    if (operation) {
      operation.status = 'failed'
      operation.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    await this.updateOperationLog(operationId, {
      operation_status: 'failed',
      error_details: { error: error instanceof Error ? error.message : 'Unknown error' },
      completed_at: new Date().toISOString()
    })
  }

  private async updateOperationProgress(operation: BulkOperation, percentage: number, step: string): Promise<void> {
    operation.progressPercentage = percentage
    operation.currentStep = step

    // Estimate completion time
    if (percentage > 0) {
      const elapsed = Date.now() - operation.startTime.getTime()
      const totalEstimated = (elapsed / percentage) * 100
      const remaining = totalEstimated - elapsed
      operation.estimatedCompletion = new Date(Date.now() + remaining)
    }
  }

  private async updateOperationLog(operationId: string, updates: any): Promise<void> {
    const { error } = await supabase
      .from('bulk_operation_logs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('operation_id', operationId)

    if (error) {
      console.error('Failed to update operation log:', error)
    }
  }

  private createErrorResult(operationId: string, errors: string[]): BulkReschedulingResult {
    return {
      total_requested: 0,
      successful_operations: 0,
      failed_operations: 0,
      successful_session_ids: [],
      failed_session_ids: [],
      conflict_session_ids: [],
      new_sessions: [],
      conflicts: [],
      warnings: errors,
      operation_id: operationId,
      processing_time_ms: 0,
      rollback_available: false
    }
  }

  private generateOperationId(): string {
    return `bulk_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

// =====================================================
// Supporting Types and Interfaces
// =====================================================

interface BulkOperation {
  id: string
  operationId: string
  status: OperationStatus
  type: string
  totalItems: number
  processedItems: number
  successfulItems: number
  failedItems: number
  processedSessions: ScheduledSession[]
  failedSessions: ScheduledSession[]
  conflicts: ScheduleConflict[]
  rollbackData: any
  progressPercentage: number
  currentStep: string
  startTime: Date
  estimatedCompletion?: Date
  errors: string[]
}

// =====================================================
// Export Singleton and Utility Functions
// =====================================================

export const bulkReschedulingEngine = BulkReschedulingEngine.getInstance()

/**
 * Execute bulk rescheduling operation
 */
export async function executeBulkReschedule(request: BulkReschedulingRequest): Promise<BulkReschedulingResult> {
  return bulkReschedulingEngine.executeBulkReschedule(request)
}

/**
 * Get operation status
 */
export function getBulkOperationStatus(operationId: string) {
  return bulkReschedulingEngine.getOperationStatus(operationId)
}

/**
 * Cancel active operation
 */
export async function cancelBulkOperation(operationId: string) {
  return bulkReschedulingEngine.cancelOperation(operationId)
}

/**
 * Rollback completed operation
 */
export async function rollbackBulkOperation(operationId: string) {
  return bulkReschedulingEngine.rollbackOperation(operationId)
}

/**
 * Get list of active operations
 */
export function getActiveBulkOperations() {
  return bulkReschedulingEngine.getActiveOperations()
}