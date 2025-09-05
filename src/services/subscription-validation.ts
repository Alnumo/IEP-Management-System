import { supabase } from '@/lib/supabase'
import { errorMonitoring } from '@/lib/error-monitoring'
import { parseISO, differenceInDays, isAfter, isBefore, addDays } from 'date-fns'
import type {
  StudentSubscription,
  FreezeRequest,
  ValidationResult,
  BusinessRule,
  SubscriptionStatus
} from '@/types/scheduling'

/**
 * Subscription Validation and Business Logic Service
 * 
 * Provides comprehensive validation for subscription operations:
 * - Freeze request validation with business rules
 * - Subscription state validation
 * - Date range and duration validations
 * - Cross-system consistency checks
 */

interface ValidationContext {
  subscription: StudentSubscription
  currentUser: any
  systemSettings?: {
    max_freeze_duration: number
    min_freeze_duration: number
    freeze_advance_notice_days: number
    weekend_freeze_allowed: boolean
  }
}

interface ValidationError {
  field: string
  code: string
  message: string
  severity: 'error' | 'warning'
}

interface BusinessRuleResult {
  rule_name: string
  passed: boolean
  message?: string
  suggested_action?: string
}

export class SubscriptionValidationService {
  private readonly DEFAULT_SETTINGS = {
    max_freeze_duration: 30, // Maximum 30 days per freeze request
    min_freeze_duration: 1,  // Minimum 1 day
    freeze_advance_notice_days: 1, // Must be requested at least 1 day in advance
    weekend_freeze_allowed: true
  }

  /**
   * Comprehensive freeze request validation
   */
  async validateFreezeRequest(
    request: FreezeRequest,
    context: ValidationContext
  ): Promise<ValidationResult> {
    console.log('🔍 Validating freeze request:', request.subscription_id)

    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const businessRules: BusinessRuleResult[] = []

    try {
      // 1. Basic field validation
      this.validateBasicFields(request, errors)

      // 2. Date validation
      await this.validateDateRange(request, context, errors, warnings)

      // 3. Subscription state validation
      await this.validateSubscriptionState(context.subscription, errors)

      // 4. Freeze days validation
      await this.validateFreezeDays(request, context.subscription, errors)

      // 5. Business rules validation
      const businessRuleResults = await this.validateBusinessRules(request, context)
      businessRules.push(...businessRuleResults)

      // 6. Cross-system consistency checks
      await this.validateSystemConsistency(request, context, warnings)

      const isValid = errors.length === 0
      const hasWarnings = warnings.length > 0

      const result: ValidationResult = {
        valid: isValid,
        errors,
        warnings,
        business_rules: businessRules,
        can_proceed: isValid && businessRules.every(rule => rule.passed || rule.rule_name.includes('warning')),
        validation_summary: this.generateValidationSummary(isValid, errors.length, warnings.length)
      }

      console.log('✅ Freeze request validation completed:', {
        valid: result.valid,
        errors: errors.length,
        warnings: warnings.length
      })

      return result

    } catch (error) {
      console.error('❌ Validation failed:', error)
      
      errorMonitoring.reportError(error as Error, {
        component: 'SubscriptionValidationService',
        action: 'validateFreezeRequest',
        subscriptionId: request.subscription_id
      })

      return {
        valid: false,
        errors: [{
          field: 'system',
          code: 'VALIDATION_ERROR',
          message: 'Validation system error occurred',
          severity: 'error'
        }],
        warnings: [],
        business_rules: [],
        can_proceed: false,
        validation_summary: 'Validation failed due to system error'
      }
    }
  }

  /**
   * Validate subscription can be unfrozen
   */
  async validateUnfreezeRequest(
    subscriptionId: string,
    userId: string
  ): Promise<ValidationResult> {
    console.log('🔍 Validating unfreeze request:', subscriptionId)

    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    try {
      // Fetch current subscription
      const { data: subscription, error: subError } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single()

      if (subError || !subscription) {
        errors.push({
          field: 'subscription_id',
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: 'Subscription not found',
          severity: 'error'
        })
      } else {
        // Check if subscription is currently frozen
        if (subscription.status !== 'frozen') {
          errors.push({
            field: 'status',
            code: 'NOT_FROZEN',
            message: 'Subscription is not currently frozen',
            severity: 'error'
          })
        }

        // Check if there are pending sessions that need to be handled
        const { data: pendingSessions } = await supabase
          .from('therapy_sessions')
          .select('id, session_date')
          .eq('student_id', subscription.student_id)
          .eq('status', 'rescheduled')
          .gte('session_date', new Date().toISOString().split('T')[0])

        if (pendingSessions && pendingSessions.length > 0) {
          warnings.push({
            field: 'sessions',
            code: 'PENDING_RESCHEDULES',
            message: `${pendingSessions.length} rescheduled sessions need confirmation`,
            severity: 'warning'
          })
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        business_rules: [],
        can_proceed: errors.length === 0,
        validation_summary: errors.length === 0 
          ? 'Unfreeze request is valid' 
          : `${errors.length} validation errors found`
      }

    } catch (error) {
      console.error('❌ Unfreeze validation failed:', error)
      
      return {
        valid: false,
        errors: [{
          field: 'system',
          code: 'VALIDATION_ERROR',
          message: 'Validation system error',
          severity: 'error'
        }],
        warnings: [],
        business_rules: [],
        can_proceed: false,
        validation_summary: 'Validation failed'
      }
    }
  }

  /**
   * Validate basic required fields
   */
  private validateBasicFields(request: FreezeRequest, errors: ValidationError[]): void {
    if (!request.subscription_id?.trim()) {
      errors.push({
        field: 'subscription_id',
        code: 'REQUIRED',
        message: 'Subscription ID is required',
        severity: 'error'
      })
    }

    if (!request.start_date) {
      errors.push({
        field: 'start_date',
        code: 'REQUIRED',
        message: 'Start date is required',
        severity: 'error'
      })
    }

    if (!request.end_date) {
      errors.push({
        field: 'end_date',
        code: 'REQUIRED',
        message: 'End date is required',
        severity: 'error'
      })
    }

    if (!request.reason?.trim()) {
      errors.push({
        field: 'reason',
        code: 'REQUIRED',
        message: 'Reason is required',
        severity: 'error'
      })
    } else if (request.reason.length < 10) {
      errors.push({
        field: 'reason',
        code: 'TOO_SHORT',
        message: 'Reason must be at least 10 characters',
        severity: 'error'
      })
    } else if (request.reason.length > 500) {
      errors.push({
        field: 'reason',
        code: 'TOO_LONG',
        message: 'Reason cannot exceed 500 characters',
        severity: 'error'
      })
    }
  }

  /**
   * Validate date range and duration
   */
  private async validateDateRange(
    request: FreezeRequest,
    context: ValidationContext,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): Promise<void> {
    if (!request.start_date || !request.end_date) return

    const startDate = parseISO(request.start_date)
    const endDate = parseISO(request.end_date)
    const now = new Date()
    const settings = context.systemSettings || this.DEFAULT_SETTINGS

    // Check if dates are valid
    if (isNaN(startDate.getTime())) {
      errors.push({
        field: 'start_date',
        code: 'INVALID_DATE',
        message: 'Invalid start date format',
        severity: 'error'
      })
      return
    }

    if (isNaN(endDate.getTime())) {
      errors.push({
        field: 'end_date',
        code: 'INVALID_DATE',
        message: 'Invalid end date format',
        severity: 'error'
      })
      return
    }

    // Check date order
    if (isAfter(startDate, endDate)) {
      errors.push({
        field: 'end_date',
        code: 'INVALID_RANGE',
        message: 'End date must be after start date',
        severity: 'error'
      })
      return
    }

    // Check advance notice
    const advanceNoticeDays = differenceInDays(startDate, now)
    if (advanceNoticeDays < settings.freeze_advance_notice_days) {
      if (advanceNoticeDays < 0) {
        errors.push({
          field: 'start_date',
          code: 'DATE_IN_PAST',
          message: 'Start date cannot be in the past',
          severity: 'error'
        })
      } else {
        warnings.push({
          field: 'start_date',
          code: 'INSUFFICIENT_NOTICE',
          message: `Freeze requests typically require ${settings.freeze_advance_notice_days} day(s) advance notice`,
          severity: 'warning'
        })
      }
    }

    // Check duration limits
    const duration = differenceInDays(endDate, startDate) + 1
    
    if (duration < settings.min_freeze_duration) {
      errors.push({
        field: 'duration',
        code: 'TOO_SHORT',
        message: `Minimum freeze duration is ${settings.min_freeze_duration} day(s)`,
        severity: 'error'
      })
    }

    if (duration > settings.max_freeze_duration) {
      errors.push({
        field: 'duration',
        code: 'TOO_LONG',
        message: `Maximum freeze duration is ${settings.max_freeze_duration} days per request`,
        severity: 'error'
      })
    }

    // Check if freeze extends beyond subscription end date
    const subscriptionEndDate = parseISO(context.subscription.end_date)
    if (isAfter(endDate, subscriptionEndDate)) {
      errors.push({
        field: 'end_date',
        code: 'BEYOND_SUBSCRIPTION',
        message: 'Freeze end date cannot be beyond subscription end date',
        severity: 'error'
      })
    }

    // Weekend validation
    if (!settings.weekend_freeze_allowed) {
      const startDay = startDate.getDay()
      const endDay = endDate.getDay()
      if (startDay === 0 || startDay === 6 || endDay === 0 || endDay === 6) {
        warnings.push({
          field: 'date_range',
          code: 'WEEKEND_FREEZE',
          message: 'Weekend freezes may require special approval',
          severity: 'warning'
        })
      }
    }
  }

  /**
   * Validate subscription state
   */
  private async validateSubscriptionState(
    subscription: StudentSubscription,
    errors: ValidationError[]
  ): Promise<void> {
    // Check subscription status
    if (subscription.status !== 'active') {
      errors.push({
        field: 'status',
        code: 'INVALID_STATUS',
        message: `Only active subscriptions can be frozen. Current status: ${subscription.status}`,
        severity: 'error'
      })
    }

    // Check if subscription is expired
    const subscriptionEndDate = parseISO(subscription.end_date)
    if (isBefore(subscriptionEndDate, new Date())) {
      errors.push({
        field: 'end_date',
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Cannot freeze expired subscription',
        severity: 'error'
      })
    }
  }

  /**
   * Validate freeze days allocation
   */
  private async validateFreezeDays(
    request: FreezeRequest,
    subscription: StudentSubscription,
    errors: ValidationError[]
  ): Promise<void> {
    const requestedDays = request.freeze_days
    const usedDays = subscription.freeze_days_used || 0
    const allowedDays = subscription.freeze_days_allowed || 0
    const availableDays = allowedDays - usedDays

    if (requestedDays > availableDays) {
      errors.push({
        field: 'freeze_days',
        code: 'INSUFFICIENT_FREEZE_DAYS',
        message: `Insufficient freeze days. Available: ${availableDays}, Requested: ${requestedDays}`,
        severity: 'error'
      })
    }

    // Check if this would exceed annual limits (if applicable)
    if (allowedDays > 0) {
      const utilizationPercentage = ((usedDays + requestedDays) / allowedDays) * 100
      if (utilizationPercentage > 80) {
        // Warning when using more than 80% of allowed freeze days
        errors.push({
          field: 'freeze_days',
          code: 'HIGH_UTILIZATION',
          message: `This request will use ${Math.round(utilizationPercentage)}% of your annual freeze allowance`,
          severity: 'warning'
        })
      }
    }
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    request: FreezeRequest,
    context: ValidationContext
  ): Promise<BusinessRuleResult[]> {
    const rules: BusinessRuleResult[] = []

    try {
      // Rule 1: Check for existing freezes in the date range
      const { data: existingFreezes } = await supabase
        .from('subscription_freeze_history')
        .select('*')
        .eq('subscription_id', request.subscription_id)
        .eq('operation_type', 'freeze')
        .gte('end_date', request.start_date)
        .lte('start_date', request.end_date)

      rules.push({
        rule_name: 'no_overlapping_freezes',
        passed: !existingFreezes || existingFreezes.length === 0,
        message: existingFreezes && existingFreezes.length > 0 
          ? 'Overlapping freeze periods detected' 
          : undefined
      })

      // Rule 2: Check for recent freeze activity
      const thirtyDaysAgo = addDays(new Date(), -30).toISOString().split('T')[0]
      const { data: recentFreezes } = await supabase
        .from('subscription_freeze_history')
        .select('*')
        .eq('subscription_id', request.subscription_id)
        .eq('operation_type', 'freeze')
        .gte('created_at', thirtyDaysAgo)

      rules.push({
        rule_name: 'frequent_freeze_warning',
        passed: !recentFreezes || recentFreezes.length < 3,
        message: recentFreezes && recentFreezes.length >= 3 
          ? 'Multiple freeze requests in the past 30 days' 
          : undefined
      })

      // Rule 3: Check for scheduled sessions in freeze period
      const { data: scheduledSessions } = await supabase
        .from('therapy_sessions')
        .select('id, session_date')
        .eq('student_id', context.subscription.student_id)
        .gte('session_date', request.start_date)
        .lte('session_date', request.end_date)
        .eq('status', 'scheduled')

      rules.push({
        rule_name: 'sessions_require_rescheduling',
        passed: true, // This is informational
        message: scheduledSessions && scheduledSessions.length > 0 
          ? `${scheduledSessions.length} scheduled sessions will need rescheduling`
          : 'No sessions affected by freeze period'
      })

    } catch (error) {
      console.error('❌ Business rules validation failed:', error)
      rules.push({
        rule_name: 'business_rules_error',
        passed: false,
        message: 'Unable to validate business rules'
      })
    }

    return rules
  }

  /**
   * Cross-system consistency checks
   */
  private async validateSystemConsistency(
    request: FreezeRequest,
    context: ValidationContext,
    warnings: ValidationError[]
  ): Promise<void> {
    try {
      // Check for pending billing that might be affected
      const { data: pendingBilling } = await supabase
        .from('billing_records')
        .select('*')
        .eq('subscription_id', request.subscription_id)
        .eq('payment_status', 'pending')
        .gte('billing_date', request.start_date)

      if (pendingBilling && pendingBilling.length > 0) {
        warnings.push({
          field: 'billing',
          code: 'PENDING_BILLING_AFFECTED',
          message: `${pendingBilling.length} pending billing records may be affected`,
          severity: 'warning'
        })
      }

      // Check therapist availability for rescheduling
      const { data: therapistAvailability } = await supabase
        .from('therapist_availability')
        .select('*')
        .eq('therapist_id', context.subscription.student?.therapist_id)
        .gte('date', request.end_date)
        .eq('is_available', true)
        .limit(10)

      if (!therapistAvailability || therapistAvailability.length < 5) {
        warnings.push({
          field: 'rescheduling',
          code: 'LIMITED_AVAILABILITY',
          message: 'Limited therapist availability for rescheduling affected sessions',
          severity: 'warning'
        })
      }

    } catch (error) {
      console.warn('⚠️ System consistency check failed:', error)
    }
  }

  /**
   * Generate validation summary
   */
  private generateValidationSummary(
    isValid: boolean,
    errorCount: number,
    warningCount: number
  ): string {
    if (isValid) {
      if (warningCount > 0) {
        return `Validation passed with ${warningCount} warning(s)`
      }
      return 'All validations passed successfully'
    } else {
      return `Validation failed with ${errorCount} error(s)${warningCount > 0 ? ` and ${warningCount} warning(s)` : ''}`
    }
  }
}

// Export singleton instance
export const subscriptionValidationService = new SubscriptionValidationService()