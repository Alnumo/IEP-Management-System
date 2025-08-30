/**
 * Attendance Validation Service
 * Handles business logic validation for attendance operations
 */

import { StudentAttendanceAPI } from './attendance-api'
import type { StudentAttendance, CreateStudentAttendanceData } from './attendance-api'

// =====================================================
// VALIDATION RULES INTERFACE
// =====================================================

export interface AttendanceValidationRules {
  maxDailyCheckIns: number
  maxSessionDuration: number // minutes
  minSessionDuration: number // minutes
  allowEarlyCheckIn: number // minutes before scheduled time
  allowLateCheckIn: number // minutes after scheduled time
  autoCheckOutAfter: number // hours
  requireTherapistPresent: boolean
  requireRoomAvailability: boolean
  allowWeekendSessions: boolean
  allowHolidaySessions: boolean
  maxStudentsPerRoom: number
  maxStudentsPerTherapist: number
}

// Default validation rules
const defaultRules: AttendanceValidationRules = {
  maxDailyCheckIns: 5,
  maxSessionDuration: 180, // 3 hours
  minSessionDuration: 15, // 15 minutes
  allowEarlyCheckIn: 30, // 30 minutes early
  allowLateCheckIn: 60, // 1 hour late
  autoCheckOutAfter: 8, // 8 hours
  requireTherapistPresent: false, // Allow flexible check-ins
  requireRoomAvailability: false, // Allow room sharing
  allowWeekendSessions: true,
  allowHolidaySessions: false,
  maxStudentsPerRoom: 10,
  maxStudentsPerTherapist: 20
}

// =====================================================
// VALIDATION RESULT TYPES
// =====================================================

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  metadata?: Record<string, any>
}

export interface ValidationError {
  code: string
  message: string
  field?: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  code: string
  message: string
  field?: string
  suggestion?: string
}

// =====================================================
// ATTENDANCE VALIDATION SERVICE
// =====================================================

export class AttendanceValidationService {
  private static rules: AttendanceValidationRules = defaultRules

  /**
   * Update validation rules
   */
  static updateRules(newRules: Partial<AttendanceValidationRules>) {
    this.rules = { ...this.rules, ...newRules }
  }

  /**
   * Get current validation rules
   */
  static getRules(): AttendanceValidationRules {
    return { ...this.rules }
  }

  /**
   * Validate student check-in request
   */
  static async validateCheckIn(
    checkInData: CreateStudentAttendanceData,
    existingRecords?: StudentAttendance[]
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const metadata: Record<string, any> = {}

    try {
      // Get today's attendance records if not provided
      if (!existingRecords) {
        existingRecords = await StudentAttendanceAPI.getTodaysAttendance()
      }

      // 1. Check daily check-in limits
      const studentTodayRecords = existingRecords.filter(r => 
        r.student_id === checkInData.student_id
      )

      if (studentTodayRecords.length >= this.rules.maxDailyCheckIns) {
        errors.push({
          code: 'MAX_DAILY_CHECKINS_EXCEEDED',
          message: `Maximum daily check-ins (${this.rules.maxDailyCheckIns}) exceeded`,
          field: 'student_id',
          severity: 'error'
        })
      }

      // 2. Check for duplicate active check-ins
      const activeRecord = studentTodayRecords.find(r => 
        r.status === 'checked_in' || r.status === 'in_session'
      )

      if (activeRecord) {
        errors.push({
          code: 'ALREADY_CHECKED_IN',
          message: 'Student is already checked in and has not checked out',
          field: 'student_id',
          severity: 'error'
        })
        metadata.existingRecord = activeRecord
      }

      // 3. Check timing constraints
      const now = new Date()
      const currentHour = now.getHours()
      
      // Business hours check (7 AM to 8 PM)
      if (currentHour < 7 || currentHour > 20) {
        warnings.push({
          code: 'OUTSIDE_BUSINESS_HOURS',
          message: 'Check-in outside normal business hours (7 AM - 8 PM)',
          suggestion: 'Consider if this is an emergency or special session'
        })
      }

      // Weekend check
      const dayOfWeek = now.getDay()
      if (!this.rules.allowWeekendSessions && (dayOfWeek === 0 || dayOfWeek === 6)) {
        warnings.push({
          code: 'WEEKEND_SESSION',
          message: 'Check-in on weekend',
          suggestion: 'Verify this is a scheduled weekend session'
        })
      }

      // 4. Room capacity validation (if room specified)
      if (checkInData.room_number) {
        const roomOccupancy = existingRecords.filter(r => 
          r.room_number === checkInData.room_number &&
          r.status !== 'checked_out'
        ).length

        if (roomOccupancy >= this.rules.maxStudentsPerRoom) {
          warnings.push({
            code: 'ROOM_CAPACITY_WARNING',
            message: `Room ${checkInData.room_number} is at or near capacity (${roomOccupancy}/${this.rules.maxStudentsPerRoom})`,
            suggestion: 'Consider alternative room assignment'
          })
        }

        metadata.roomOccupancy = roomOccupancy
      }

      // 5. Therapist workload validation (if therapist specified)
      if (checkInData.therapist_id) {
        const therapistStudents = existingRecords.filter(r => 
          r.therapist_id === checkInData.therapist_id &&
          r.status !== 'checked_out'
        ).length

        if (therapistStudents >= this.rules.maxStudentsPerTherapist) {
          warnings.push({
            code: 'THERAPIST_WORKLOAD_WARNING',
            message: `Therapist has many active students (${therapistStudents}/${this.rules.maxStudentsPerTherapist})`,
            suggestion: 'Consider workload distribution'
          })
        }

        metadata.therapistWorkload = therapistStudents
      }

      // 6. Session type validation
      if (!this.isValidSessionType(checkInData.session_type)) {
        warnings.push({
          code: 'UNRECOGNIZED_SESSION_TYPE',
          message: `Unrecognized session type: ${checkInData.session_type}`,
          suggestion: 'Verify session type is correct'
        })
      }

      // 7. QR code validation (if QR data provided)
      if (checkInData.qr_scan_data) {
        const qrValidation = await this.validateQRData(checkInData.qr_scan_data)
        if (!qrValidation.isValid) {
          errors.push(...qrValidation.errors)
          warnings.push(...qrValidation.warnings)
        }
      }

    } catch (error) {
      console.error('Error during check-in validation:', error)
      errors.push({
        code: 'VALIDATION_ERROR',
        message: 'Unexpected error during validation',
        severity: 'error'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata
    }
  }

  /**
   * Validate student check-out request
   */
  static async validateCheckOut(
    attendanceId: string,
    existingRecord?: StudentAttendance
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const metadata: Record<string, any> = {}

    try {
      // Get attendance record if not provided
      if (!existingRecord) {
        const records = await StudentAttendanceAPI.getAttendanceRecords({ limit: 1 })
        existingRecord = records.find(r => r.id === attendanceId)
      }

      if (!existingRecord) {
        errors.push({
          code: 'RECORD_NOT_FOUND',
          message: 'Attendance record not found',
          severity: 'error'
        })
        return { isValid: false, errors, warnings }
      }

      // 1. Check if already checked out
      if (existingRecord.status === 'checked_out') {
        errors.push({
          code: 'ALREADY_CHECKED_OUT',
          message: 'Student is already checked out',
          severity: 'error'
        })
      }

      // 2. Check session duration
      const checkInTime = new Date(existingRecord.check_in_time)
      const now = new Date()
      const sessionDuration = Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60))

      if (sessionDuration < this.rules.minSessionDuration) {
        warnings.push({
          code: 'SHORT_SESSION',
          message: `Very short session duration: ${sessionDuration} minutes`,
          suggestion: 'Verify if early check-out is intentional'
        })
      }

      if (sessionDuration > this.rules.maxSessionDuration) {
        warnings.push({
          code: 'LONG_SESSION',
          message: `Extended session duration: ${sessionDuration} minutes`,
          suggestion: 'Consider if this is an extended therapy session'
        })
      }

      metadata.sessionDuration = sessionDuration

      // 3. Check if session was properly started
      if (existingRecord.status === 'checked_in') {
        warnings.push({
          code: 'SESSION_NOT_STARTED',
          message: 'Student checking out without session being marked as started',
          suggestion: 'Verify if therapy session took place'
        })
      }

    } catch (error) {
      console.error('Error during check-out validation:', error)
      errors.push({
        code: 'VALIDATION_ERROR',
        message: 'Unexpected error during validation',
        severity: 'error'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata
    }
  }

  /**
   * Validate session start request
   */
  static async validateSessionStart(
    attendanceId: string,
    sessionData: {
      sessionId?: string
      therapistId?: string
      roomNumber?: string
    },
    existingRecord?: StudentAttendance
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const metadata: Record<string, any> = {}

    try {
      // Get attendance record if not provided
      if (!existingRecord) {
        const records = await StudentAttendanceAPI.getAttendanceRecords({ limit: 1 })
        existingRecord = records.find(r => r.id === attendanceId)
      }

      if (!existingRecord) {
        errors.push({
          code: 'RECORD_NOT_FOUND',
          message: 'Attendance record not found',
          severity: 'error'
        })
        return { isValid: false, errors, warnings }
      }

      // 1. Check if student is checked in
      if (existingRecord.status !== 'checked_in') {
        errors.push({
          code: 'INVALID_STATUS_FOR_SESSION_START',
          message: `Cannot start session. Current status: ${existingRecord.status}`,
          severity: 'error'
        })
      }

      // 2. Check session timing
      const checkInTime = new Date(existingRecord.check_in_time)
      const now = new Date()
      const waitTime = Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60))

      if (waitTime > 30) {
        warnings.push({
          code: 'LONG_WAIT_TIME',
          message: `Student waited ${waitTime} minutes before session started`,
          suggestion: 'Consider optimizing scheduling'
        })
      }

      metadata.waitTime = waitTime

      // 3. Validate therapist assignment
      if (sessionData.therapistId && this.rules.requireTherapistPresent) {
        // Here you would check if therapist is actually present/available
        // This would require integration with therapist attendance system
      }

      // 4. Validate room assignment
      if (sessionData.roomNumber && this.rules.requireRoomAvailability) {
        // Check room availability
        const todayRecords = await StudentAttendanceAPI.getTodaysAttendance()
        const roomConflicts = todayRecords.filter(r => 
          r.room_number === sessionData.roomNumber &&
          r.status === 'in_session' &&
          r.id !== attendanceId
        )

        if (roomConflicts.length > 0) {
          warnings.push({
            code: 'ROOM_CONFLICT',
            message: `Room ${sessionData.roomNumber} has other active sessions`,
            suggestion: 'Verify room sharing is acceptable'
          })
        }
      }

    } catch (error) {
      console.error('Error during session start validation:', error)
      errors.push({
        code: 'VALIDATION_ERROR',
        message: 'Unexpected error during validation',
        severity: 'error'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata
    }
  }

  /**
   * Validate QR code data
   */
  private static async validateQRData(qrData: any): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      // 1. Check required QR fields
      if (!qrData.studentId && !qrData.sessionId && !qrData.therapistId) {
        errors.push({
          code: 'INVALID_QR_DATA',
          message: 'QR code must contain at least one identifier',
          severity: 'error'
        })
      }

      // 2. Check QR data freshness
      if (qrData.timestamp) {
        const qrTime = new Date(qrData.timestamp)
        const now = new Date()
        const ageMinutes = Math.floor((now.getTime() - qrTime.getTime()) / (1000 * 60))

        if (ageMinutes > 60) { // QR code older than 1 hour
          warnings.push({
            code: 'OLD_QR_CODE',
            message: `QR code is ${ageMinutes} minutes old`,
            suggestion: 'Consider generating a fresh QR code'
          })
        }
      }

      // 3. Check QR data integrity
      const requiredFields = ['type', 'timestamp']
      for (const field of requiredFields) {
        if (!qrData[field]) {
          warnings.push({
            code: 'MISSING_QR_FIELD',
            message: `QR code missing field: ${field}`,
            suggestion: 'QR code may be damaged or incomplete'
          })
        }
      }

    } catch (error) {
      errors.push({
        code: 'QR_VALIDATION_ERROR',
        message: 'Error validating QR code data',
        severity: 'error'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Check if session type is valid
   */
  private static isValidSessionType(sessionType: string): boolean {
    const validTypes = [
      'ABA Therapy',
      'Speech Therapy',
      'Occupational Therapy',
      'Physical Therapy',
      'Behavioral Intervention',
      'Social Skills Training',
      'Music Therapy',
      'Art Therapy',
      'Assessment',
      'Consultation',
      'Parent Training',
      'Group Therapy',
      'Individual Therapy'
    ]

    return validTypes.includes(sessionType) || 
           validTypes.some(type => type.toLowerCase().includes(sessionType.toLowerCase()))
  }

  /**
   * Batch validate multiple attendance records
   */
  static async batchValidateAttendance(
    attendanceRecords: StudentAttendance[]
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>()

    for (const record of attendanceRecords) {
      const validationResult = await this.validateAttendanceRecord(record)
      results.set(record.id, validationResult)
    }

    return results
  }

  /**
   * Validate individual attendance record for consistency
   */
  static async validateAttendanceRecord(
    record: StudentAttendance
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const metadata: Record<string, any> = {}

    try {
      // 1. Check time consistency
      if (record.check_in_time && record.check_out_time) {
        const checkIn = new Date(record.check_in_time)
        const checkOut = new Date(record.check_out_time)

        if (checkOut <= checkIn) {
          errors.push({
            code: 'INVALID_TIME_SEQUENCE',
            message: 'Check-out time must be after check-in time',
            severity: 'error'
          })
        }
      }

      // 2. Check status consistency
      if (record.status === 'checked_out' && !record.check_out_time) {
        errors.push({
          code: 'INCONSISTENT_STATUS',
          message: 'Record marked as checked out but no check-out time recorded',
          severity: 'error'
        })
      }

      if (record.status !== 'checked_out' && record.check_out_time) {
        warnings.push({
          code: 'STATUS_TIME_MISMATCH',
          message: 'Check-out time exists but status is not checked_out',
          suggestion: 'Verify record status is correct'
        })
      }

      // 3. Check duration consistency
      if (record.duration_minutes && record.check_in_time && record.check_out_time) {
        const checkIn = new Date(record.check_in_time)
        const checkOut = new Date(record.check_out_time)
        const calculatedDuration = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60))

        if (Math.abs(calculatedDuration - record.duration_minutes) > 2) { // Allow 2-minute tolerance
          warnings.push({
            code: 'DURATION_MISMATCH',
            message: `Recorded duration (${record.duration_minutes}min) doesn't match calculated duration (${calculatedDuration}min)`,
            suggestion: 'Duration may need recalculation'
          })
        }
      }

      // 4. Check late arrival consistency
      if (record.is_late && record.late_minutes === 0) {
        warnings.push({
          code: 'LATE_FLAG_INCONSISTENCY',
          message: 'Record marked as late but late_minutes is 0',
          suggestion: 'Verify late arrival calculation'
        })
      }

      // 5. Validate required fields
      if (!record.student_id) {
        errors.push({
          code: 'MISSING_STUDENT_ID',
          message: 'Student ID is required',
          severity: 'error'
        })
      }

      if (!record.session_type) {
        errors.push({
          code: 'MISSING_SESSION_TYPE',
          message: 'Session type is required',
          severity: 'error'
        })
      }

    } catch (error) {
      console.error('Error during record validation:', error)
      errors.push({
        code: 'VALIDATION_ERROR',
        message: 'Unexpected error during record validation',
        severity: 'error'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata
    }
  }
}

// Export validation service
export default AttendanceValidationService