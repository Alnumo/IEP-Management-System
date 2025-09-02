/**
 * Scheduling Types Test Suite
 * Story 3.1: Automated Scheduling Engine
 * 
 * Tests for TypeScript type definitions and enums
 * Validates type safety and enum integrity
 */

import { describe, it, expect } from 'vitest'

// Import all types and enums for testing
import {
  SchedulePattern,
  SessionCategory,
  SessionStatus,
  ConflictType,
  ConflictSeverity,
  ConflictResolution,
  TemplateType,
  PriorityLevel,
  type TimeSlot,
  type DateTimeSlot,
  type BilingualText,
  type TherapistAvailability,
  type ScheduleTemplate,
  type ScheduledSession,
  type ScheduleConflict,
  type SchedulingRequest,
  type SchedulingResult,
  type CalendarEvent,
  type BulkReschedulingRequest,
  type SchedulingMetrics
} from '../../types/scheduling'

describe('Scheduling Enums', () => {
  it('should have correct SchedulePattern values', () => {
    expect(SchedulePattern.DAILY).toBe('daily')
    expect(SchedulePattern.WEEKLY).toBe('weekly')
    expect(SchedulePattern.BIWEEKLY).toBe('biweekly')
    expect(SchedulePattern.MONTHLY).toBe('monthly')
    
    // Ensure all expected values exist
    const patterns = Object.values(SchedulePattern)
    expect(patterns).toHaveLength(4)
    expect(patterns).toContain('daily')
    expect(patterns).toContain('weekly')
    expect(patterns).toContain('biweekly')
    expect(patterns).toContain('monthly')
  })

  it('should have correct SessionCategory values', () => {
    expect(SessionCategory.THERAPY).toBe('therapy')
    expect(SessionCategory.ASSESSMENT).toBe('assessment')
    expect(SessionCategory.CONSULTATION).toBe('consultation')
    expect(SessionCategory.GROUP_SESSION).toBe('group_session')
    expect(SessionCategory.EVALUATION).toBe('evaluation')
    
    const categories = Object.values(SessionCategory)
    expect(categories).toHaveLength(5)
  })

  it('should have correct SessionStatus values', () => {
    const statuses = Object.values(SessionStatus)
    expect(statuses).toContain('scheduled')
    expect(statuses).toContain('confirmed')
    expect(statuses).toContain('in_progress')
    expect(statuses).toContain('completed')
    expect(statuses).toContain('cancelled')
    expect(statuses).toContain('no_show')
    expect(statuses).toContain('rescheduled')
    expect(statuses).toHaveLength(7)
  })

  it('should have correct ConflictType values', () => {
    expect(ConflictType.THERAPIST_DOUBLE_BOOKING).toBe('therapist_double_booking')
    expect(ConflictType.ROOM_UNAVAILABLE).toBe('room_unavailable')
    expect(ConflictType.EQUIPMENT_CONFLICT).toBe('equipment_conflict')
    expect(ConflictType.STUDENT_UNAVAILABLE).toBe('student_unavailable')
    expect(ConflictType.TIME_CONSTRAINT).toBe('time_constraint')
    
    const conflictTypes = Object.values(ConflictType)
    expect(conflictTypes).toHaveLength(5)
  })

  it('should have correct PriorityLevel numeric values', () => {
    expect(PriorityLevel.LOW).toBe(1)
    expect(PriorityLevel.MEDIUM).toBe(2)
    expect(PriorityLevel.HIGH).toBe(3)
    expect(PriorityLevel.URGENT).toBe(4)
    expect(PriorityLevel.CRITICAL).toBe(5)
    
    // Ensure they are ordered correctly
    expect(PriorityLevel.LOW < PriorityLevel.MEDIUM).toBe(true)
    expect(PriorityLevel.MEDIUM < PriorityLevel.HIGH).toBe(true)
    expect(PriorityLevel.HIGH < PriorityLevel.URGENT).toBe(true)
    expect(PriorityLevel.URGENT < PriorityLevel.CRITICAL).toBe(true)
  })
})

describe('Basic Type Interfaces', () => {
  it('should validate TimeSlot interface structure', () => {
    const timeSlot: TimeSlot = {
      start_time: '09:00',
      end_time: '10:00',
      duration_minutes: 60
    }

    // Type checking happens at compile time, but we can test the structure
    expect(timeSlot).toHaveProperty('start_time')
    expect(timeSlot).toHaveProperty('end_time')
    expect(timeSlot).toHaveProperty('duration_minutes')
    
    expect(typeof timeSlot.start_time).toBe('string')
    expect(typeof timeSlot.end_time).toBe('string')
    expect(typeof timeSlot.duration_minutes).toBe('number')
  })

  it('should validate DateTimeSlot extends TimeSlot', () => {
    const dateTimeSlot: DateTimeSlot = {
      start_time: '09:00',
      end_time: '10:00',
      duration_minutes: 60,
      date: '2025-09-01',
      datetime_start: new Date('2025-09-01T09:00:00'),
      datetime_end: new Date('2025-09-01T10:00:00')
    }

    // Should have all TimeSlot properties
    expect(dateTimeSlot).toHaveProperty('start_time')
    expect(dateTimeSlot).toHaveProperty('end_time')
    expect(dateTimeSlot).toHaveProperty('duration_minutes')
    
    // Plus additional DateTime properties
    expect(dateTimeSlot).toHaveProperty('date')
    expect(dateTimeSlot).toHaveProperty('datetime_start')
    expect(dateTimeSlot).toHaveProperty('datetime_end')
    
    expect(dateTimeSlot.datetime_start).toBeInstanceOf(Date)
    expect(dateTimeSlot.datetime_end).toBeInstanceOf(Date)
  })

  it('should validate BilingualText interface', () => {
    const bilingualText: BilingualText = {
      en: 'Therapy Session',
      ar: 'جلسة العلاج'
    }

    expect(bilingualText).toHaveProperty('en')
    expect(bilingualText).toHaveProperty('ar')
    expect(typeof bilingualText.en).toBe('string')
    expect(typeof bilingualText.ar).toBe('string')
    
    // Ensure Arabic text is present
    expect(bilingualText.ar).toMatch(/[\u0600-\u06FF]/)
  })
})

describe('TherapistAvailability Interface', () => {
  it('should validate complete TherapistAvailability object', () => {
    const availability: TherapistAvailability = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      therapist_id: '123e4567-e89b-12d3-a456-426614174001',
      day_of_week: 1, // Monday
      start_time: '09:00',
      end_time: '17:00',
      is_available: true,
      is_recurring: true,
      max_sessions_per_slot: 8,
      current_bookings: 3,
      is_time_off: false,
      created_at: '2025-09-01T08:00:00Z',
      updated_at: '2025-09-01T08:00:00Z'
    }

    // Required properties
    expect(availability.id).toBeDefined()
    expect(availability.therapist_id).toBeDefined()
    expect(availability.day_of_week).toBeGreaterThanOrEqual(0)
    expect(availability.day_of_week).toBeLessThanOrEqual(6)
    expect(availability.start_time).toMatch(/^\d{2}:\d{2}$/)
    expect(availability.end_time).toMatch(/^\d{2}:\d{2}$/)
    
    // Capacity validation
    expect(availability.max_sessions_per_slot).toBeGreaterThan(0)
    expect(availability.current_bookings).toBeGreaterThanOrEqual(0)
    expect(availability.current_bookings).toBeLessThanOrEqual(availability.max_sessions_per_slot)
    
    // Boolean flags
    expect(typeof availability.is_available).toBe('boolean')
    expect(typeof availability.is_recurring).toBe('boolean')
    expect(typeof availability.is_time_off).toBe('boolean')
  })

  it('should handle optional computed properties', () => {
    const availability: TherapistAvailability = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      therapist_id: '123e4567-e89b-12d3-a456-426614174001',
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      is_available: true,
      is_recurring: true,
      max_sessions_per_slot: 8,
      current_bookings: 3,
      is_time_off: false,
      created_at: '2025-09-01T08:00:00Z',
      updated_at: '2025-09-01T08:00:00Z',
      // Optional computed properties
      available_slots: 5,
      utilization_rate: 37.5
    }

    expect(availability.available_slots).toBe(5)
    expect(availability.utilization_rate).toBe(37.5)
    
    // Computed values should be consistent
    const expectedAvailableSlots = availability.max_sessions_per_slot - availability.current_bookings
    expect(availability.available_slots).toBe(expectedAvailableSlots)
    
    const expectedUtilization = (availability.current_bookings / availability.max_sessions_per_slot) * 100
    expect(availability.utilization_rate).toBe(expectedUtilization)
  })
})

describe('ScheduleTemplate Interface', () => {
  it('should validate complete ScheduleTemplate object', () => {
    const template: ScheduleTemplate = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'Weekly Therapy Sessions',
      name_ar: 'جلسات العلاج الأسبوعية',
      template_type: TemplateType.PROGRAM_BASED,
      is_active: true,
      session_duration: 60,
      sessions_per_week: 2,
      preferred_times: [
        { start_time: '09:00', end_time: '10:00', duration_minutes: 60 },
        { start_time: '14:00', end_time: '15:00', duration_minutes: 60 }
      ],
      scheduling_pattern: SchedulePattern.WEEKLY,
      pattern_config: {
        preferred_days: [1, 3], // Monday, Wednesday
        max_sessions_per_day: 1
      },
      required_equipment: ['assessment_tools', 'therapy_materials'],
      allow_back_to_back: false,
      max_gap_between_sessions: 120,
      created_at: '2025-09-01T08:00:00Z',
      updated_at: '2025-09-01T08:00:00Z'
    }

    // Required properties
    expect(template.id).toBeDefined()
    expect(template.name).toBeDefined()
    expect(template.name_ar).toBeDefined()
    expect(Object.values(TemplateType)).toContain(template.template_type)
    expect(Object.values(SchedulePattern)).toContain(template.scheduling_pattern)
    
    // Session configuration
    expect(template.session_duration).toBeGreaterThan(0)
    expect(template.sessions_per_week).toBeGreaterThan(0)
    expect(Array.isArray(template.preferred_times)).toBe(true)
    expect(Array.isArray(template.required_equipment)).toBe(true)
    
    // Validate TimeSlot objects in preferred_times
    template.preferred_times.forEach(timeSlot => {
      expect(timeSlot).toHaveProperty('start_time')
      expect(timeSlot).toHaveProperty('end_time') 
      expect(timeSlot).toHaveProperty('duration_minutes')
    })

    // Pattern configuration
    expect(typeof template.pattern_config).toBe('object')
    expect(template.pattern_config).not.toBeNull()
    
    // Bilingual support
    expect(template.name_ar).toMatch(/[\u0600-\u06FF]/)
  })
})

describe('ScheduledSession Interface', () => {
  it('should validate complete ScheduledSession object', () => {
    const session: ScheduledSession = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      session_number: 'SS-2025-001',
      student_subscription_id: '123e4567-e89b-12d3-a456-426614174004',
      therapist_id: '123e4567-e89b-12d3-a456-426614174001',
      scheduled_date: '2025-09-15',
      start_time: '10:00',
      end_time: '11:00',
      duration_minutes: 60,
      session_category: SessionCategory.THERAPY,
      priority_level: PriorityLevel.MEDIUM,
      status: SessionStatus.SCHEDULED,
      has_conflicts: false,
      conflict_details: [],
      resolution_status: ConflictResolution.PENDING,
      equipment_ids: ['eq1', 'eq2'],
      reschedule_count: 0,
      is_billable: true,
      parent_notification_sent: false,
      created_at: '2025-09-01T08:00:00Z',
      updated_at: '2025-09-01T08:00:00Z'
    }

    // Required properties
    expect(session.id).toBeDefined()
    expect(session.session_number).toBeDefined()
    expect(session.student_subscription_id).toBeDefined()
    expect(session.therapist_id).toBeDefined()
    
    // Date and time validation
    expect(session.scheduled_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(session.start_time).toMatch(/^\d{2}:\d{2}$/)
    expect(session.end_time).toMatch(/^\d{2}:\d{2}$/)
    expect(session.duration_minutes).toBeGreaterThan(0)
    
    // Enum validations
    expect(Object.values(SessionCategory)).toContain(session.session_category)
    expect(Object.values(PriorityLevel)).toContain(session.priority_level)
    expect(Object.values(SessionStatus)).toContain(session.status)
    expect(Object.values(ConflictResolution)).toContain(session.resolution_status)
    
    // Array properties
    expect(Array.isArray(session.conflict_details)).toBe(true)
    expect(Array.isArray(session.equipment_ids)).toBe(true)
    
    // Numeric constraints
    expect(session.reschedule_count).toBeGreaterThanOrEqual(0)
    
    // Boolean properties
    expect(typeof session.has_conflicts).toBe('boolean')
    expect(typeof session.is_billable).toBe('boolean')
    expect(typeof session.parent_notification_sent).toBe('boolean')
  })
})

describe('SchedulingRequest Interface', () => {
  it('should validate SchedulingRequest object', () => {
    const request: SchedulingRequest = {
      student_subscription_id: '123e4567-e89b-12d3-a456-426614174004',
      preferred_times: [
        { start_time: '09:00', end_time: '10:00', duration_minutes: 60 }
      ],
      start_date: '2025-09-01',
      end_date: '2025-12-31',
      total_sessions: 24,
      sessions_per_week: 2,
      session_duration: 60,
      priority_level: PriorityLevel.MEDIUM,
      flexibility_score: 75
    }

    // Required properties
    expect(request.student_subscription_id).toBeDefined()
    expect(Array.isArray(request.preferred_times)).toBe(true)
    expect(request.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(request.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    
    // Numeric validations
    expect(request.total_sessions).toBeGreaterThan(0)
    expect(request.sessions_per_week).toBeGreaterThan(0)
    expect(request.session_duration).toBeGreaterThan(0)
    expect(request.flexibility_score).toBeGreaterThanOrEqual(0)
    expect(request.flexibility_score).toBeLessThanOrEqual(100)
    
    // Enum validation
    expect(Object.values(PriorityLevel)).toContain(request.priority_level)
  })
})

describe('Type Consistency and Integration', () => {
  it('should ensure enum values match database constraints', () => {
    // These should match the CHECK constraints in the database schema
    const sessionStatuses = Object.values(SessionStatus)
    expect(sessionStatuses).toContain('scheduled')
    expect(sessionStatuses).toContain('confirmed')
    expect(sessionStatuses).toContain('completed')
    expect(sessionStatuses).toContain('cancelled')
    
    const conflictTypes = Object.values(ConflictType)
    expect(conflictTypes).toContain('therapist_double_booking')
    expect(conflictTypes).toContain('room_unavailable')
    expect(conflictTypes).toContain('equipment_conflict')
  })

  it('should validate bilingual text consistency', () => {
    const arabicTextPattern = /[\u0600-\u06FF]/
    
    const bilingualSample: BilingualText = {
      en: 'Therapy Session',
      ar: 'جلسة العلاج'
    }

    // English should not contain Arabic characters
    expect(bilingualSample.en).not.toMatch(arabicTextPattern)
    
    // Arabic should contain Arabic characters
    expect(bilingualSample.ar).toMatch(arabicTextPattern)
    
    // Both should be non-empty strings
    expect(bilingualSample.en.trim().length).toBeGreaterThan(0)
    expect(bilingualSample.ar.trim().length).toBeGreaterThan(0)
  })

  it('should validate time format consistency', () => {
    const timeFormatPattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    
    const validTimes = ['09:00', '13:30', '08:15', '17:45']
    const invalidTimes = ['25:00', '12:60', 'abc']
    
    validTimes.forEach(time => {
      expect(time).toMatch(timeFormatPattern)
    })
    
    invalidTimes.forEach(time => {
      expect(time).not.toMatch(timeFormatPattern)
    })
  })

  it('should validate date format consistency', () => {
    const dateFormatPattern = /^\d{4}-\d{2}-\d{2}$/
    
    const validDates = ['2025-09-01', '2025-12-31', '2025-01-01']
    const invalidDates = ['2025/09/01', '25-09-01', '2025-9-1']
    
    validDates.forEach(date => {
      expect(date).toMatch(dateFormatPattern)
    })
    
    invalidDates.forEach(date => {
      expect(date).not.toMatch(dateFormatPattern)
    })
  })
})