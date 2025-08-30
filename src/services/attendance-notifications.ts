/**
 * Attendance Notification Service
 * Handles automated notifications for attendance events
 */

import { NotificationAPI } from './attendance-api'
import type { StudentAttendance } from './attendance-api'

// =====================================================
// NOTIFICATION TEMPLATES
// =====================================================

export const NotificationTemplates = {
  // Student check-in notifications
  STUDENT_CHECKIN: {
    ar: {
      title: 'تسجيل وصول الطالب',
      message: (studentName: string, sessionType: string, time: string, room?: string) =>
        `وصل ${studentName} بأمان إلى المركز في ${time}${room ? ` في الغرفة ${room}` : ''} لحضور جلسة ${sessionType}.`
    },
    en: {
      title: 'Student Check-in',
      message: (studentName: string, sessionType: string, time: string, room?: string) =>
        `${studentName} has arrived safely at ${time}${room ? ` in room ${room}` : ''} for their ${sessionType} session.`
    }
  },

  // Student check-out notifications
  STUDENT_CHECKOUT: {
    ar: {
      title: 'انتهاء جلسة الطالب',
      message: (studentName: string, sessionType: string, time: string, duration: number) =>
        `انتهت جلسة ${sessionType} للطالب ${studentName} في ${time}. مدة الجلسة: ${duration} دقيقة.`
    },
    en: {
      title: 'Student Session Complete',
      message: (studentName: string, sessionType: string, time: string, duration: number) =>
        `${studentName}'s ${sessionType} session has ended at ${time}. Session duration: ${duration} minutes.`
    }
  },

  // Late arrival notifications
  STUDENT_LATE: {
    ar: {
      title: 'تأخير في الوصول',
      message: (studentName: string, lateMinutes: number, sessionType: string) =>
        `وصل الطالب ${studentName} متأخراً ${lateMinutes} دقيقة عن موعد جلسة ${sessionType}.`
    },
    en: {
      title: 'Late Arrival',
      message: (studentName: string, lateMinutes: number, sessionType: string) =>
        `${studentName} arrived ${lateMinutes} minutes late for their ${sessionType} session.`
    }
  },

  // Session start notifications
  SESSION_STARTED: {
    ar: {
      title: 'بدء الجلسة العلاجية',
      message: (studentName: string, sessionType: string, therapistName: string, room?: string) =>
        `بدأت جلسة ${sessionType} للطالب ${studentName} مع ${therapistName}${room ? ` في الغرفة ${room}` : ''}.`
    },
    en: {
      title: 'Therapy Session Started',
      message: (studentName: string, sessionType: string, therapistName: string, room?: string) =>
        `${sessionType} session has started for ${studentName} with ${therapistName}${room ? ` in room ${room}` : ''}.`
    }
  },

  // Absence notifications
  STUDENT_ABSENT: {
    ar: {
      title: 'غياب الطالب',
      message: (studentName: string, sessionType: string, scheduledTime: string) =>
        `لم يحضر الطالب ${studentName} لجلسة ${sessionType} المقررة في ${scheduledTime}.`
    },
    en: {
      title: 'Student Absence',
      message: (studentName: string, sessionType: string, scheduledTime: string) =>
        `${studentName} did not attend their scheduled ${sessionType} session at ${scheduledTime}.`
    }
  },

  // Emergency notifications
  EMERGENCY_CONTACT: {
    ar: {
      title: 'اتصال طوارئ',
      message: (studentName: string, reason: string, contactInfo: string) =>
        `يرجى الاتصال بالمركز فوراً بخصوص الطالب ${studentName}. السبب: ${reason}. رقم الاتصال: ${contactInfo}`
    },
    en: {
      title: 'Emergency Contact',
      message: (studentName: string, reason: string, contactInfo: string) =>
        `Please contact the center immediately regarding ${studentName}. Reason: ${reason}. Contact: ${contactInfo}`
    }
  }
}

// =====================================================
// NOTIFICATION SERVICE CLASS
// =====================================================

export class AttendanceNotificationService {
  
  /**
   * Send check-in notification to parents
   */
  static async sendCheckInNotification(
    attendanceRecord: StudentAttendance,
    parentContacts: Array<{id: string, contact_type: string, is_primary: boolean}>,
    language: 'ar' | 'en' = 'ar'
  ) {
    const template = NotificationTemplates.STUDENT_CHECKIN[language]
    const checkInTime = new Date(attendanceRecord.check_in_time).toLocaleTimeString(
      language === 'ar' ? 'ar-SA' : 'en-US'
    )
    
    const message = template.message(
      attendanceRecord.student_name || 'Student',
      attendanceRecord.session_type,
      checkInTime,
      attendanceRecord.room_number
    )

    // Send to all parent contacts
    const notifications = parentContacts.map(contact => 
      NotificationAPI.createNotification({
        recipient_type: 'parent',
        recipient_id: contact.id,
        notification_type: 'student_check_in',
        title: template.title,
        message,
        priority: attendanceRecord.is_late ? 'high' : 'medium',
        student_id: attendanceRecord.student_id,
        attendance_record_id: attendanceRecord.id,
        session_id: attendanceRecord.session_id,
        send_email: true,
        send_sms: contact.is_primary,
        send_whatsapp: true,
        send_push: true
      })
    )

    try {
      await Promise.all(notifications)
      console.log(`Check-in notifications sent for student ${attendanceRecord.student_id}`)
    } catch (error) {
      console.error('Error sending check-in notifications:', error)
    }

    // Send late arrival notification if applicable
    if (attendanceRecord.is_late && attendanceRecord.late_minutes > 0) {
      await this.sendLateArrivalNotification(attendanceRecord, parentContacts, language)
    }
  }

  /**
   * Send check-out notification to parents
   */
  static async sendCheckOutNotification(
    attendanceRecord: StudentAttendance,
    parentContacts: Array<{id: string, contact_type: string, is_primary: boolean}>,
    language: 'ar' | 'en' = 'ar'
  ) {
    if (!attendanceRecord.check_out_time) return

    const template = NotificationTemplates.STUDENT_CHECKOUT[language]
    const checkOutTime = new Date(attendanceRecord.check_out_time).toLocaleTimeString(
      language === 'ar' ? 'ar-SA' : 'en-US'
    )
    
    const message = template.message(
      attendanceRecord.student_name || 'Student',
      attendanceRecord.session_type,
      checkOutTime,
      attendanceRecord.duration_minutes || 0
    )

    const notifications = parentContacts.map(contact => 
      NotificationAPI.createNotification({
        recipient_type: 'parent',
        recipient_id: contact.id,
        notification_type: 'student_check_out',
        title: template.title,
        message,
        priority: 'medium',
        student_id: attendanceRecord.student_id,
        attendance_record_id: attendanceRecord.id,
        session_id: attendanceRecord.session_id,
        send_email: true,
        send_sms: contact.is_primary,
        send_whatsapp: true,
        send_push: true
      })
    )

    try {
      await Promise.all(notifications)
      console.log(`Check-out notifications sent for student ${attendanceRecord.student_id}`)
    } catch (error) {
      console.error('Error sending check-out notifications:', error)
    }
  }

  /**
   * Send late arrival notification
   */
  static async sendLateArrivalNotification(
    attendanceRecord: StudentAttendance,
    parentContacts: Array<{id: string, contact_type: string, is_primary: boolean}>,
    language: 'ar' | 'en' = 'ar'
  ) {
    const template = NotificationTemplates.STUDENT_LATE[language]
    const message = template.message(
      attendanceRecord.student_name || 'Student',
      attendanceRecord.late_minutes,
      attendanceRecord.session_type
    )

    const notifications = parentContacts.map(contact => 
      NotificationAPI.createNotification({
        recipient_type: 'parent',
        recipient_id: contact.id,
        notification_type: 'student_late_arrival',
        title: template.title,
        message,
        priority: 'high',
        student_id: attendanceRecord.student_id,
        attendance_record_id: attendanceRecord.id,
        session_id: attendanceRecord.session_id,
        send_email: true,
        send_sms: true, // Always send SMS for late notifications
        send_whatsapp: true,
        send_push: true
      })
    )

    try {
      await Promise.all(notifications)
      console.log(`Late arrival notifications sent for student ${attendanceRecord.student_id}`)
    } catch (error) {
      console.error('Error sending late arrival notifications:', error)
    }
  }

  /**
   * Send session start notification
   */
  static async sendSessionStartNotification(
    attendanceRecord: StudentAttendance,
    therapistName: string,
    parentContacts: Array<{id: string, contact_type: string, is_primary: boolean}>,
    language: 'ar' | 'en' = 'ar'
  ) {
    const template = NotificationTemplates.SESSION_STARTED[language]
    const message = template.message(
      attendanceRecord.student_name || 'Student',
      attendanceRecord.session_type,
      therapistName,
      attendanceRecord.room_number
    )

    const notifications = parentContacts.map(contact => 
      NotificationAPI.createNotification({
        recipient_type: 'parent',
        recipient_id: contact.id,
        notification_type: 'session_started',
        title: template.title,
        message,
        priority: 'medium',
        student_id: attendanceRecord.student_id,
        attendance_record_id: attendanceRecord.id,
        session_id: attendanceRecord.session_id,
        send_email: false, // Only WhatsApp and push for session updates
        send_sms: false,
        send_whatsapp: true,
        send_push: true
      })
    )

    try {
      await Promise.all(notifications)
      console.log(`Session start notifications sent for student ${attendanceRecord.student_id}`)
    } catch (error) {
      console.error('Error sending session start notifications:', error)
    }
  }

  /**
   * Send absence notification (called by scheduled job)
   */
  static async sendAbsenceNotification(
    studentId: string,
    studentName: string,
    sessionType: string,
    scheduledTime: string,
    parentContacts: Array<{id: string, contact_type: string, is_primary: boolean}>,
    language: 'ar' | 'en' = 'ar'
  ) {
    const template = NotificationTemplates.STUDENT_ABSENT[language]
    const message = template.message(studentName, sessionType, scheduledTime)

    const notifications = parentContacts.map(contact => 
      NotificationAPI.createNotification({
        recipient_type: 'parent',
        recipient_id: contact.id,
        notification_type: 'student_absent',
        title: template.title,
        message,
        priority: 'high',
        student_id: studentId,
        send_email: true,
        send_sms: contact.is_primary,
        send_whatsapp: true,
        send_push: true
      })
    )

    try {
      await Promise.all(notifications)
      console.log(`Absence notifications sent for student ${studentId}`)
    } catch (error) {
      console.error('Error sending absence notifications:', error)
    }
  }

  /**
   * Send emergency notification
   */
  static async sendEmergencyNotification(
    studentId: string,
    studentName: string,
    reason: string,
    contactInfo: string,
    parentContacts: Array<{id: string, contact_type: string, is_primary: boolean}>,
    language: 'ar' | 'en' = 'ar'
  ) {
    const template = NotificationTemplates.EMERGENCY_CONTACT[language]
    const message = template.message(studentName, reason, contactInfo)

    const notifications = parentContacts.map(contact => 
      NotificationAPI.createNotification({
        recipient_type: 'parent',
        recipient_id: contact.id,
        notification_type: 'emergency_contact',
        title: template.title,
        message,
        priority: 'urgent',
        student_id: studentId,
        send_email: true,
        send_sms: true, // Always send SMS for emergencies
        send_whatsapp: true,
        send_push: true
      })
    )

    try {
      await Promise.all(notifications)
      console.log(`Emergency notifications sent for student ${studentId}`)
    } catch (error) {
      console.error('Error sending emergency notifications:', error)
    }
  }

  /**
   * Send therapist notification
   */
  static async sendTherapistNotification(
    therapistId: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    studentId?: string,
    attendanceRecordId?: string
  ) {
    try {
      await NotificationAPI.createNotification({
        recipient_type: 'therapist',
        recipient_id: therapistId,
        notification_type: 'therapist_update',
        title,
        message,
        priority,
        student_id: studentId,
        attendance_record_id: attendanceRecordId,
        send_email: false,
        send_sms: false,
        send_whatsapp: false,
        send_push: true // Only push notifications for therapists
      })
      
      console.log(`Therapist notification sent to ${therapistId}`)
    } catch (error) {
      console.error('Error sending therapist notification:', error)
    }
  }

  /**
   * Send admin notification
   */
  static async sendAdminNotification(
    adminId: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    studentId?: string,
    attendanceRecordId?: string
  ) {
    try {
      await NotificationAPI.createNotification({
        recipient_type: 'admin',
        recipient_id: adminId,
        notification_type: 'admin_alert',
        title,
        message,
        priority,
        student_id: studentId,
        attendance_record_id: attendanceRecordId,
        send_email: priority === 'urgent',
        send_sms: false,
        send_whatsapp: false,
        send_push: true
      })
      
      console.log(`Admin notification sent to ${adminId}`)
    } catch (error) {
      console.error('Error sending admin notification:', error)
    }
  }
}

// =====================================================
// WHATSAPP BUSINESS API INTEGRATION
// =====================================================

export class WhatsAppService {
  private static readonly API_ENDPOINT = process.env.VITE_WHATSAPP_API_ENDPOINT || 'https://graph.facebook.com/v17.0'
  private static readonly BUSINESS_ID = process.env.VITE_WHATSAPP_BUSINESS_ID
  private static readonly ACCESS_TOKEN = process.env.VITE_WHATSAPP_ACCESS_TOKEN
  private static readonly PHONE_NUMBER_ID = process.env.VITE_WHATSAPP_PHONE_NUMBER_ID

  /**
   * Send WhatsApp message using Business API
   */
  static async sendWhatsAppMessage(
    to: string, // Phone number
    templateName: string,
    templateParams: string[],
    language: 'ar' | 'en' = 'ar'
  ) {
    if (!this.ACCESS_TOKEN || !this.PHONE_NUMBER_ID) {
      console.warn('WhatsApp credentials not configured')
      return false
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''), // Remove non-digits
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: language === 'ar' ? 'ar' : 'en'
        },
        components: [{
          type: 'body',
          parameters: templateParams.map(param => ({
            type: 'text',
            text: param
          }))
        }]
      }
    }

    try {
      const response = await fetch(
        `${this.API_ENDPOINT}/${this.PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )

      const result = await response.json()
      
      if (response.ok) {
        console.log('WhatsApp message sent successfully:', result)
        return true
      } else {
        console.error('WhatsApp API error:', result)
        return false
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error)
      return false
    }
  }

  /**
   * Send simple text message (for development)
   */
  static async sendTextMessage(to: string, message: string) {
    if (!this.ACCESS_TOKEN || !this.PHONE_NUMBER_ID) {
      console.warn('WhatsApp credentials not configured')
      return false
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''),
      type: 'text',
      text: { body: message }
    }

    try {
      const response = await fetch(
        `${this.API_ENDPOINT}/${this.PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )

      const result = await response.json()
      return response.ok
    } catch (error) {
      console.error('Error sending WhatsApp text message:', error)
      return false
    }
  }
}

// Export everything
export default AttendanceNotificationService