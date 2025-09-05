import { supabase } from '@/lib/supabase'
import { errorMonitoring } from '@/lib/error-monitoring'
import { requireAuth } from '@/lib/auth-utils'
import { addDays, parseISO, format, differenceInDays } from 'date-fns'
import type {
  StudentSubscription,
  BillingCycle,
  TimelineAdjustment,
  NotificationTemplate,
  ProgramTimeline
} from '@/types/scheduling'

/**
 * Program Timeline Management Service
 * 
 * Handles program timeline adjustments when subscriptions are frozen:
 * - Calculates new program end dates based on freeze duration
 * - Adjusts billing cycles to account for frozen periods
 * - Manages notification delivery to students and parents
 * - Provides timeline visualization data
 */

interface TimelineCalculationOptions {
  include_weekends?: boolean
  exclude_holidays?: string[]
  billing_adjustment_strategy?: 'proportional' | 'defer' | 'credit'
}

interface BillingAdjustmentResult {
  original_amount: number
  adjusted_amount: number
  credit_issued: number
  next_billing_date: string
  adjustment_type: 'credit' | 'defer' | 'proportional'
}

interface NotificationDeliveryResult {
  notifications_sent: number
  delivery_failures: Array<{
    recipient_id: string
    recipient_type: 'student' | 'parent' | 'therapist'
    error: string
  }>
}

export class ProgramTimelineManager {
  
  /**
   * Calculate new program end date after freeze period
   */
  async calculateNewEndDate(
    subscriptionId: string,
    freezeDays: number,
    options: TimelineCalculationOptions = {}
  ): Promise<TimelineAdjustment> {
    console.log('📅 Calculating new end date for subscription:', subscriptionId)

    try {
      const user = await requireAuth()

      // Fetch current subscription details
      const { data: subscription, error: subError } = await supabase
        .from('student_subscriptions')
        .select(`
          *,
          therapy_program:therapy_programs(
            id, name_ar, name_en, 
            billing_cycle, session_frequency,
            exclude_weekends, holiday_schedule
          )
        `)
        .eq('id', subscriptionId)
        .single()

      if (subError) throw subError

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`)
      }

      // Calculate business days vs calendar days based on program settings
      const originalEndDate = parseISO(subscription.end_date)
      let adjustmentDays = freezeDays

      // Adjust for weekends if program excludes them
      if (subscription.therapy_program?.exclude_weekends) {
        adjustmentDays = this.calculateBusinessDaysAdjustment(freezeDays)
      }

      // Adjust for holidays if specified
      if (options.exclude_holidays?.length) {
        adjustmentDays += this.calculateHolidayAdjustment(
          subscription.end_date,
          adjustmentDays,
          options.exclude_holidays
        )
      }

      const newEndDate = addDays(originalEndDate, adjustmentDays)

      // Calculate program extension details
      const totalProgramDays = differenceInDays(
        parseISO(subscription.end_date),
        parseISO(subscription.start_date)
      )

      const extensionPercentage = (adjustmentDays / totalProgramDays) * 100

      const adjustment: TimelineAdjustment = {
        subscription_id: subscriptionId,
        original_end_date: subscription.end_date,
        new_end_date: format(newEndDate, 'yyyy-MM-dd'),
        freeze_days: freezeDays,
        adjustment_days: adjustmentDays,
        extension_percentage: Math.round(extensionPercentage * 100) / 100,
        calculation_method: options.exclude_holidays?.length 
          ? 'business_days_holidays_excluded'
          : subscription.therapy_program?.exclude_weekends
          ? 'business_days_only'
          : 'calendar_days',
        calculated_at: new Date().toISOString(),
        calculated_by: user.id
      }

      console.log('✅ New end date calculated:', adjustment)
      return adjustment

    } catch (error) {
      console.error('❌ Failed to calculate new end date:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'ProgramTimelineManager',
        action: 'calculateNewEndDate',
        subscriptionId,
        freezeDays
      })
      throw error
    }
  }

  /**
   * Adjust billing cycles for frozen periods
   */
  async adjustBillingCycle(
    subscriptionId: string,
    freezeStartDate: string,
    freezeEndDate: string,
    strategy: 'proportional' | 'defer' | 'credit' = 'proportional'
  ): Promise<BillingAdjustmentResult> {
    console.log('💰 Adjusting billing cycle for subscription:', subscriptionId)

    try {
      const user = await requireAuth()

      // Fetch subscription and current billing information
      const { data: subscription, error: subError } = await supabase
        .from('student_subscriptions')
        .select(`
          *,
          therapy_program:therapy_programs(
            id, billing_cycle, price_per_session, 
            monthly_price, total_sessions
          ),
          billing_records:billing_records(
            id, amount, billing_date, payment_status,
            billing_period_start, billing_period_end
          )
        `)
        .eq('id', subscriptionId)
        .single()

      if (subError) throw subError

      const freezeDays = differenceInDays(
        parseISO(freezeEndDate),
        parseISO(freezeStartDate)
      ) + 1

      // Calculate billing adjustment based on strategy
      let adjustmentResult: BillingAdjustmentResult

      switch (strategy) {
        case 'credit':
          adjustmentResult = await this.calculateCreditAdjustment(
            subscription, freezeDays
          )
          break
        case 'defer':
          adjustmentResult = await this.calculateDeferralAdjustment(
            subscription, freezeDays
          )
          break
        case 'proportional':
        default:
          adjustmentResult = await this.calculateProportionalAdjustment(
            subscription, freezeDays
          )
          break
      }

      // Record the billing adjustment
      const { error: recordError } = await supabase
        .from('billing_adjustments')
        .insert({
          subscription_id: subscriptionId,
          adjustment_type: strategy,
          original_amount: adjustmentResult.original_amount,
          adjusted_amount: adjustmentResult.adjusted_amount,
          credit_issued: adjustmentResult.credit_issued,
          freeze_days: freezeDays,
          created_by: user.id,
          metadata: {
            freeze_start_date: freezeStartDate,
            freeze_end_date: freezeEndDate,
            calculation_details: adjustmentResult
          }
        })

      if (recordError) throw recordError

      console.log('✅ Billing adjustment calculated:', adjustmentResult)
      return adjustmentResult

    } catch (error) {
      console.error('❌ Failed to adjust billing cycle:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'ProgramTimelineManager',
        action: 'adjustBillingCycle',
        subscriptionId,
        strategy
      })
      throw error
    }
  }

  /**
   * Send notifications about timeline updates
   */
  async sendTimelineUpdateNotifications(
    subscriptionId: string,
    adjustment: TimelineAdjustment,
    billingAdjustment?: BillingAdjustmentResult
  ): Promise<NotificationDeliveryResult> {
    console.log('📬 Sending timeline update notifications')

    try {
      const user = await requireAuth()

      // Fetch subscription and related contacts
      const { data: subscription, error: subError } = await supabase
        .from('student_subscriptions')
        .select(`
          *,
          student:students(
            id, name_ar, name_en, parent_phone, parent_email
          ),
          therapist:therapists(
            id, name_ar, name_en, phone, email
          ),
          therapy_program:therapy_programs(
            id, name_ar, name_en
          )
        `)
        .eq('id', subscriptionId)
        .single()

      if (subError) throw subError

      const notifications: Array<{
        recipient_id: string
        recipient_type: 'student' | 'parent' | 'therapist'
        method: 'sms' | 'email' | 'whatsapp'
        template: string
        data: any
      }> = []

      // Prepare notification data
      const notificationData = {
        student_name: subscription.student.name_ar,
        program_name: subscription.therapy_program.name_ar,
        original_end_date: adjustment.original_end_date,
        new_end_date: adjustment.new_end_date,
        extension_days: adjustment.adjustment_days,
        freeze_reason: 'Subscription freeze period',
        billing_adjustment: billingAdjustment
      }

      // Parent notifications
      if (subscription.student.parent_phone) {
        notifications.push({
          recipient_id: subscription.student.id,
          recipient_type: 'parent',
          method: 'whatsapp',
          template: 'timeline_update_parent_whatsapp',
          data: notificationData
        })
      }

      if (subscription.student.parent_email) {
        notifications.push({
          recipient_id: subscription.student.id,
          recipient_type: 'parent',
          method: 'email',
          template: 'timeline_update_parent_email',
          data: notificationData
        })
      }

      // Therapist notifications
      if (subscription.therapist?.email) {
        notifications.push({
          recipient_id: subscription.therapist.id,
          recipient_type: 'therapist',
          method: 'email',
          template: 'timeline_update_therapist_email',
          data: notificationData
        })
      }

      // Send notifications using the notification service
      let sentCount = 0
      const failures: Array<{
        recipient_id: string
        recipient_type: 'student' | 'parent' | 'therapist'
        error: string
      }> = []

      for (const notification of notifications) {
        try {
          await this.sendNotification(notification)
          sentCount++
        } catch (error) {
          failures.push({
            recipient_id: notification.recipient_id,
            recipient_type: notification.recipient_type,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      const result: NotificationDeliveryResult = {
        notifications_sent: sentCount,
        delivery_failures: failures
      }

      console.log('✅ Notifications delivery completed:', result)
      return result

    } catch (error) {
      console.error('❌ Failed to send timeline update notifications:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'ProgramTimelineManager',
        action: 'sendTimelineUpdateNotifications',
        subscriptionId
      })
      throw error
    }
  }

  /**
   * Generate program timeline visualization data
   */
  async generateTimelineVisualization(subscriptionId: string): Promise<ProgramTimeline> {
    console.log('📊 Generating timeline visualization for subscription:', subscriptionId)

    try {
      // Fetch comprehensive subscription data
      const { data: subscription, error: subError } = await supabase
        .from('student_subscriptions')
        .select(`
          *,
          student:students(id, name_ar, name_en),
          therapy_program:therapy_programs(id, name_ar, name_en),
          freeze_history:subscription_freeze_history(
            id, operation_type, start_date, end_date,
            freeze_days, created_at, reason
          ),
          sessions:therapy_sessions(
            id, session_date, time_start, time_end,
            status, attendance_status
          )
        `)
        .eq('id', subscriptionId)
        .single()

      if (subError) throw subError

      // Build timeline events
      const timelineEvents = []

      // Add subscription start/end events
      timelineEvents.push({
        date: subscription.start_date,
        type: 'subscription_start',
        title: 'Program Started',
        description: `Started ${subscription.therapy_program.name_ar} program`,
        status: 'completed'
      })

      // Add freeze events
      subscription.freeze_history?.forEach((freeze: any) => {
        if (freeze.operation_type === 'freeze') {
          timelineEvents.push({
            date: freeze.start_date,
            type: 'freeze_start',
            title: 'Freeze Started',
            description: freeze.reason || 'Subscription frozen',
            status: 'completed',
            duration: freeze.freeze_days
          })

          timelineEvents.push({
            date: freeze.end_date,
            type: 'freeze_end',
            title: 'Freeze Ended',
            description: 'Subscription resumed',
            status: 'completed'
          })
        }
      })

      // Add major session milestones
      const completedSessions = subscription.sessions?.filter(
        (s: any) => s.attendance_status === 'present'
      ).length || 0

      const totalSessions = subscription.sessions_total || 0

      if (completedSessions > 0) {
        const milestones = [0.25, 0.5, 0.75, 1.0]
        milestones.forEach(milestone => {
          const targetSessions = Math.floor(totalSessions * milestone)
          if (completedSessions >= targetSessions) {
            timelineEvents.push({
              date: subscription.sessions?.
                filter((s: any) => s.attendance_status === 'present')
                .sort((a: any, b: any) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())
                [targetSessions - 1]?.session_date,
              type: 'milestone',
              title: `${Math.round(milestone * 100)}% Complete`,
              description: `Completed ${targetSessions} of ${totalSessions} sessions`,
              status: 'completed'
            })
          }
        })
      }

      // Add end date (current or projected)
      timelineEvents.push({
        date: subscription.end_date,
        type: 'subscription_end',
        title: 'Program End',
        description: `${subscription.therapy_program.name_ar} program completion`,
        status: new Date(subscription.end_date) > new Date() ? 'upcoming' : 'completed'
      })

      // Sort events by date
      timelineEvents.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      const timeline: ProgramTimeline = {
        subscription_id: subscriptionId,
        student_name: subscription.student.name_ar,
        program_name: subscription.therapy_program.name_ar,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        original_end_date: subscription.original_end_date,
        total_freeze_days: subscription.freeze_days_used,
        completion_percentage: totalSessions > 0 
          ? Math.round((completedSessions / totalSessions) * 100) 
          : 0,
        events: timelineEvents,
        generated_at: new Date().toISOString()
      }

      console.log('✅ Timeline visualization generated:', timeline)
      return timeline

    } catch (error) {
      console.error('❌ Failed to generate timeline visualization:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'ProgramTimelineManager',
        action: 'generateTimelineVisualization',
        subscriptionId
      })
      throw error
    }
  }

  /**
   * Private helper methods
   */
  private calculateBusinessDaysAdjustment(calendarDays: number): number {
    // Approximate business days calculation (5/7 ratio)
    return Math.ceil(calendarDays * (7 / 5))
  }

  private calculateHolidayAdjustment(
    endDate: string,
    adjustmentDays: number,
    holidays: string[]
  ): number {
    const adjustedEndDate = addDays(parseISO(endDate), adjustmentDays)
    const holidaysInPeriod = holidays.filter(holiday => {
      const holidayDate = parseISO(holiday)
      return holidayDate >= parseISO(endDate) && holidayDate <= adjustedEndDate
    })
    return holidaysInPeriod.length
  }

  private async calculateProportionalAdjustment(
    subscription: any,
    freezeDays: number
  ): Promise<BillingAdjustmentResult> {
    const totalProgramDays = differenceInDays(
      parseISO(subscription.end_date),
      parseISO(subscription.start_date)
    )
    
    const freezePercentage = freezeDays / totalProgramDays
    const monthlyPrice = subscription.therapy_program.monthly_price || 0
    const creditAmount = monthlyPrice * freezePercentage

    return {
      original_amount: monthlyPrice,
      adjusted_amount: monthlyPrice - creditAmount,
      credit_issued: creditAmount,
      next_billing_date: addDays(parseISO(subscription.end_date), freezeDays).toISOString().split('T')[0],
      adjustment_type: 'proportional'
    }
  }

  private async calculateCreditAdjustment(
    subscription: any,
    freezeDays: number
  ): Promise<BillingAdjustmentResult> {
    const dailyRate = (subscription.therapy_program.monthly_price || 0) / 30
    const creditAmount = dailyRate * freezeDays

    return {
      original_amount: subscription.therapy_program.monthly_price || 0,
      adjusted_amount: 0,
      credit_issued: creditAmount,
      next_billing_date: subscription.end_date,
      adjustment_type: 'credit'
    }
  }

  private async calculateDeferralAdjustment(
    subscription: any,
    freezeDays: number
  ): Promise<BillingAdjustmentResult> {
    return {
      original_amount: subscription.therapy_program.monthly_price || 0,
      adjusted_amount: subscription.therapy_program.monthly_price || 0,
      credit_issued: 0,
      next_billing_date: addDays(parseISO(subscription.end_date), freezeDays).toISOString().split('T')[0],
      adjustment_type: 'defer'
    }
  }

  private async sendNotification(notification: any): Promise<void> {
    // This would integrate with the existing notification service
    // Implementation depends on the notification system architecture
    console.log('Sending notification:', notification.template, 'to', notification.recipient_type)
    
    // Simulate notification sending
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (Math.random() < 0.05) { // 5% failure rate for simulation
      throw new Error('Notification delivery failed')
    }
  }
}

// Export singleton instance
export const programTimelineManager = new ProgramTimelineManager()