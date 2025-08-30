/**
 * Session Reminder Service
 * Handles automated session reminders and appointment notifications
 */

import { supabase } from '@/lib/supabase'
import { notificationService, type NotificationType } from './notification-service'
import { errorMonitoring } from '@/lib/error-monitoring'

interface SessionReminder {
  id: string
  session_id: string
  student_id: string
  therapist_id: string
  session_date: string
  session_time: string
  session_type: string
  reminder_type: 'advance' | 'day_before' | 'hour_before' | 'now'
  reminder_minutes: number // Minutes before session
  sent_at?: string
  created_at: string
}

interface SessionData {
  id: string
  student_id: string
  therapist_id: string
  course_id: string
  session_date: string
  session_time: string
  session_type: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  duration_minutes: number
  room_number?: string
  notes?: string
  
  // Related data
  student?: {
    id: string
    first_name_ar: string
    last_name_ar: string
    first_name_en: string
    last_name_en: string
    parent_phone?: string
    parent_email?: string
  }
  
  therapist?: {
    id: string
    name_ar: string
    name_en: string
    phone?: string
    email?: string
  }
}

class SessionReminderService {
  private static instance: SessionReminderService
  private reminderInterval: NodeJS.Timeout | null = null

  private constructor() {}

  static getInstance(): SessionReminderService {
    if (!SessionReminderService.instance) {
      SessionReminderService.instance = new SessionReminderService()
    }
    return SessionReminderService.instance
  }

  /**
   * Initialize the reminder service
   */
  initialize() {
    // Start the reminder check interval (every 5 minutes)
    this.reminderInterval = setInterval(() => {
      this.processReminders()
    }, 5 * 60 * 1000)

    console.log('📅 Session Reminder Service initialized')
  }

  /**
   * Stop the reminder service
   */
  stop() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval)
      this.reminderInterval = null
    }
    console.log('📅 Session Reminder Service stopped')
  }

  /**
   * Schedule reminders for a session
   */
  async scheduleSessionReminders(sessionId: string): Promise<void> {
    try {
      const session = await this.getSessionData(sessionId)
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      // Skip if session is not scheduled
      if (session.status !== 'scheduled') {
        return
      }

      const sessionDateTime = new Date(`${session.session_date}T${session.session_time}`)
      const now = new Date()

      // Skip if session is in the past
      if (sessionDateTime <= now) {
        return
      }

      // Define reminder schedules
      const reminderSchedules = [
        { type: 'day_before', minutes: 24 * 60 }, // 1 day before
        { type: 'hour_before', minutes: 60 },     // 1 hour before
        { type: 'now', minutes: 0 }               // At session time
      ]

      // Create reminder records
      const reminders: Partial<SessionReminder>[] = reminderSchedules.map(schedule => ({
        session_id: sessionId,
        student_id: session.student_id,
        therapist_id: session.therapist_id,
        session_date: session.session_date,
        session_time: session.session_time,
        session_type: session.session_type,
        reminder_type: schedule.type as any,
        reminder_minutes: schedule.minutes
      }))

      // Save reminders to database
      const { error } = await supabase
        .from('session_reminders')
        .insert(reminders)

      if (error) {
        throw error
      }

      console.log(`📅 Scheduled ${reminders.length} reminders for session ${sessionId}`)
    } catch (error) {
      console.error('Failed to schedule session reminders:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'SessionReminderService',
        action: 'scheduleSessionReminders',
        metadata: { sessionId }
      })
    }
  }

  /**
   * Cancel reminders for a session
   */
  async cancelSessionReminders(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('session_reminders')
        .delete()
        .eq('session_id', sessionId)
        .is('sent_at', null)

      if (error) {
        throw error
      }

      console.log(`📅 Cancelled reminders for session ${sessionId}`)
    } catch (error) {
      console.error('Failed to cancel session reminders:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'SessionReminderService',
        action: 'cancelSessionReminders',
        metadata: { sessionId }
      })
    }
  }

  /**
   * Process due reminders
   */
  private async processReminders(): Promise<void> {
    try {
      const dueReminders = await this.getDueReminders()
      
      for (const reminder of dueReminders) {
        await this.sendReminder(reminder)
      }

      if (dueReminders.length > 0) {
        console.log(`📅 Processed ${dueReminders.length} session reminders`)
      }
    } catch (error) {
      console.error('Error processing reminders:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'SessionReminderService',
        action: 'processReminders'
      })
    }
  }

  /**
   * Get reminders that are due to be sent
   */
  private async getDueReminders(): Promise<SessionReminder[]> {
    const now = new Date()
    
    const { data, error } = await supabase
      .from('session_reminders')
      .select('*')
      .is('sent_at', null)
      .lte('reminder_datetime', now.toISOString())

    if (error) {
      throw error
    }

    return data || []
  }

  /**
   * Send a reminder notification
   */
  private async sendReminder(reminder: SessionReminder): Promise<void> {
    try {
      const session = await this.getSessionData(reminder.session_id)
      if (!session) {
        console.warn(`Session not found for reminder: ${reminder.id}`)
        return
      }

      // Skip if session was cancelled or completed
      if (session.status !== 'scheduled') {
        await this.markReminderAsSent(reminder.id)
        return
      }

      // Send notifications to different recipients
      await this.sendReminderNotifications(reminder, session)
      
      // Mark reminder as sent
      await this.markReminderAsSent(reminder.id)

    } catch (error) {
      console.error('Failed to send reminder:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'SessionReminderService',
        action: 'sendReminder',
        metadata: { reminderId: reminder.id }
      })
    }
  }

  /**
   * Send reminder notifications to relevant parties
   */
  private async sendReminderNotifications(
    reminder: SessionReminder, 
    session: SessionData
  ): Promise<void> {
    const sessionDateTime = new Date(`${session.session_date}T${session.session_time}`)
    const studentName = session.student 
      ? `${session.student.first_name_ar} ${session.student.last_name_ar}`
      : 'Unknown Student'
    const therapistName = session.therapist?.name_ar || 'Unknown Therapist'

    const notificationData = {
      student_name: studentName,
      therapist_name: therapistName,
      session_type: session.session_type,
      time: sessionDateTime.toLocaleTimeString('ar-SA', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      date: sessionDateTime.toLocaleDateString('ar-SA'),
      room: session.room_number,
      duration: session.duration_minutes
    }

    let notificationType: NotificationType
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'

    // Determine notification type and priority based on reminder type
    switch (reminder.reminder_type) {
      case 'day_before':
        notificationType = 'session_reminder'
        priority = 'medium'
        break
      case 'hour_before':
        notificationType = 'session_reminder'
        priority = 'high'
        break
      case 'now':
        notificationType = 'session_started'
        priority = 'high'
        break
      default:
        notificationType = 'session_reminder'
        priority = 'medium'
    }

    // Send to parent/guardian (if student is minor)
    if (session.student) {
      await notificationService.sendNotification(
        session.student_id,
        'parent',
        notificationType,
        notificationData,
        {
          priority,
          channels: ['in_app', 'sms', 'email'],
          language: 'ar'
        }
      )
    }

    // Send to therapist
    if (session.therapist) {
      await notificationService.sendNotification(
        session.therapist_id,
        'therapist',
        notificationType,
        notificationData,
        {
          priority,
          channels: ['in_app', 'push'],
          language: 'ar'
        }
      )
    }

    // Send to admin for urgent reminders
    if (reminder.reminder_type === 'now') {
      await notificationService.sendNotification(
        'admin',
        'admin',
        'session_started',
        notificationData,
        {
          priority: 'high',
          channels: ['in_app'],
          language: 'ar'
        }
      )
    }
  }

  /**
   * Mark reminder as sent
   */
  private async markReminderAsSent(reminderId: string): Promise<void> {
    const { error } = await supabase
      .from('session_reminders')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', reminderId)

    if (error) {
      throw error
    }
  }

  /**
   * Get session data with related information
   */
  private async getSessionData(sessionId: string): Promise<SessionData | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        student:students!sessions_student_id_fkey (
          id,
          first_name_ar,
          last_name_ar,
          first_name_en,
          last_name_en,
          parent_phone,
          parent_email
        ),
        therapist:therapists!sessions_therapist_id_fkey (
          id,
          name_ar,
          name_en,
          phone,
          email
        )
      `)
      .eq('id', sessionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Session not found
      }
      throw error
    }

    return data
  }

  /**
   * Reschedule reminders when session time changes
   */
  async rescheduleReminders(sessionId: string): Promise<void> {
    try {
      // Cancel existing reminders
      await this.cancelSessionReminders(sessionId)
      
      // Schedule new reminders
      await this.scheduleSessionReminders(sessionId)
      
      console.log(`📅 Rescheduled reminders for session ${sessionId}`)
    } catch (error) {
      console.error('Failed to reschedule reminders:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'SessionReminderService',
        action: 'rescheduleReminders',
        metadata: { sessionId }
      })
    }
  }

  /**
   * Get upcoming sessions that need reminders
   */
  async getUpcomingSessions(): Promise<SessionData[]> {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        student:students!sessions_student_id_fkey (
          id,
          first_name_ar,
          last_name_ar,
          first_name_en,
          last_name_en
        ),
        therapist:therapists!sessions_therapist_id_fkey (
          id,
          name_ar,
          name_en
        )
      `)
      .eq('status', 'scheduled')
      .gte('session_date', new Date().toISOString().split('T')[0])
      .lte('session_date', tomorrow.toISOString().split('T')[0])
      .order('session_date', { ascending: true })
      .order('session_time', { ascending: true })

    if (error) {
      throw error
    }

    return data || []
  }

  /**
   * Manually trigger reminder for a session
   */
  async sendManualReminder(
    sessionId: string, 
    reminderType: 'advance' | 'day_before' | 'hour_before' | 'now'
  ): Promise<void> {
    try {
      const session = await this.getSessionData(sessionId)
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      const reminder: SessionReminder = {
        id: `manual_${Date.now()}`,
        session_id: sessionId,
        student_id: session.student_id,
        therapist_id: session.therapist_id,
        session_date: session.session_date,
        session_time: session.session_time,
        session_type: session.session_type,
        reminder_type: reminderType,
        reminder_minutes: 0,
        created_at: new Date().toISOString()
      }

      await this.sendReminderNotifications(reminder, session)
      
      console.log(`📅 Manual reminder sent for session ${sessionId}`)
    } catch (error) {
      console.error('Failed to send manual reminder:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'SessionReminderService',
        action: 'sendManualReminder',
        metadata: { sessionId, reminderType }
      })
      throw error
    }
  }
}

// Export singleton instance
export const sessionReminderService = SessionReminderService.getInstance()

// Auto-initialize in production
if (process.env.NODE_ENV === 'production') {
  sessionReminderService.initialize()
}

export default sessionReminderService