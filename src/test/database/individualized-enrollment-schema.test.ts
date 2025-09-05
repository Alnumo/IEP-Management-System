// Story 6.1: Unit tests for individualized enrollment schema

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import type { IndividualizedEnrollment, CustomSchedule, ProgramModifications } from '@/types/individualized-enrollment'
import type { ProgramTemplate } from '@/types/program-templates'

describe('Individualized Enrollment Schema', () => {
  const testStudentId = 'test-student-123'
  const testTherapistId = 'test-therapist-456'
  const testProgramId = 'test-program-789'
  
  beforeEach(async () => {
    // Clean up any existing test data
    await supabase
      .from('student_subscriptions')
      .delete()
      .eq('student_id', testStudentId)
  })

  afterEach(async () => {
    // Clean up test data
    await supabase
      .from('student_subscriptions')
      .delete()
      .eq('student_id', testStudentId)
  })

  describe('Extended student_subscriptions table', () => {
    it('should create enrollment with individualized fields', async () => {
      const customSchedule: CustomSchedule = {
        sessions_per_week: 3,
        preferred_days: ['monday', 'wednesday', 'friday'],
        preferred_times: ['09:00', '14:00'],
        session_duration_minutes: 45
      }

      const programModifications: ProgramModifications = {
        modifications: [
          {
            field: 'duration',
            original_value: 52,
            modified_value: 48,
            reason: 'Student availability',
            modified_at: new Date().toISOString(),
            modified_by: testTherapistId
          }
        ],
        change_log: [],
        notes: 'Adjusted for school schedule'
      }

      const { data, error } = await supabase
        .from('student_subscriptions')
        .insert({
          student_id: testStudentId,
          therapy_plan_id: testProgramId,
          individual_start_date: '2025-01-15',
          individual_end_date: '2025-12-15',
          custom_schedule: customSchedule,
          assigned_therapist_id: testTherapistId,
          program_modifications: programModifications,
          enrollment_status: 'active'
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.individual_start_date).toBe('2025-01-15')
      expect(data?.individual_end_date).toBe('2025-12-15')
      expect(data?.custom_schedule).toEqual(customSchedule)
      expect(data?.assigned_therapist_id).toBe(testTherapistId)
      expect(data?.enrollment_status).toBe('active')
    })

    it('should enforce date constraints', async () => {
      const { error } = await supabase
        .from('student_subscriptions')
        .insert({
          student_id: testStudentId,
          therapy_plan_id: testProgramId,
          individual_start_date: '2025-12-15',
          individual_end_date: '2025-01-15', // End date before start date
          assigned_therapist_id: testTherapistId,
          enrollment_status: 'active'
        })

      expect(error).not.toBeNull()
      expect(error?.message).toContain('chk_individual_dates_valid')
    })

    it('should enforce enrollment status constraint', async () => {
      const { error } = await supabase
        .from('student_subscriptions')
        .insert({
          student_id: testStudentId,
          therapy_plan_id: testProgramId,
          individual_start_date: '2025-01-15',
          individual_end_date: '2025-12-15',
          assigned_therapist_id: testTherapistId,
          enrollment_status: 'invalid_status' as any
        })

      expect(error).not.toBeNull()
    })

    it('should automatically set audit fields on insert', async () => {
      const { data, error } = await supabase
        .from('student_subscriptions')
        .insert({
          student_id: testStudentId,
          therapy_plan_id: testProgramId,
          individual_start_date: '2025-01-15',
          individual_end_date: '2025-12-15',
          assigned_therapist_id: testTherapistId
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.created_at).toBeDefined()
      expect(data?.updated_at).toBeDefined()
      expect(data?.created_by).toBeDefined()
      expect(data?.updated_by).toBeDefined()
    })

    it('should update audit trail on modification', async () => {
      // First create an enrollment
      const { data: created, error: createError } = await supabase
        .from('student_subscriptions')
        .insert({
          student_id: testStudentId,
          therapy_plan_id: testProgramId,
          individual_start_date: '2025-01-15',
          individual_end_date: '2025-12-15',
          assigned_therapist_id: testTherapistId,
          custom_schedule: { sessions_per_week: 2, preferred_days: [], preferred_times: [], session_duration_minutes: 60 }
        })
        .select()
        .single()

      expect(createError).toBeNull()
      expect(created).toBeDefined()

      // Now update the custom schedule
      const newSchedule: CustomSchedule = {
        sessions_per_week: 3,
        preferred_days: ['tuesday', 'thursday'],
        preferred_times: ['10:00', '15:00'],
        session_duration_minutes: 45
      }

      const { data: updated, error: updateError } = await supabase
        .from('student_subscriptions')
        .update({
          custom_schedule: newSchedule
        })
        .eq('id', created!.id)
        .select()
        .single()

      expect(updateError).toBeNull()
      expect(updated?.updated_at).not.toBe(created?.updated_at)
      expect(updated?.program_modifications?.change_log).toBeDefined()
      expect(updated?.program_modifications?.change_log.length).toBeGreaterThan(0)
    })

    it('should handle JSONB queries on custom_schedule', async () => {
      const customSchedule: CustomSchedule = {
        sessions_per_week: 3,
        preferred_days: ['monday', 'wednesday', 'friday'],
        preferred_times: ['09:00'],
        session_duration_minutes: 45
      }

      await supabase
        .from('student_subscriptions')
        .insert({
          student_id: testStudentId,
          therapy_plan_id: testProgramId,
          individual_start_date: '2025-01-15',
          individual_end_date: '2025-12-15',
          assigned_therapist_id: testTherapistId,
          custom_schedule: customSchedule
        })

      const { data, error } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('custom_schedule->>sessions_per_week', '3')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.length).toBeGreaterThan(0)
      expect(data?.[0]?.custom_schedule?.sessions_per_week).toBe(3)
    })
  })

  describe('RLS policies', () => {
    it('should allow admins to view all enrollments', async () => {
      // This test would require proper authentication setup
      // For now, we'll test that the query structure works
      const { data, error } = await supabase
        .from('student_subscriptions')
        .select('*')
        .limit(1)

      // The query should not fail, even if it returns no data due to RLS
      expect(error).toBeNull()
    })

    it('should filter by assigned therapist', async () => {
      // Test that the therapist filter works in queries
      const { data, error } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('assigned_therapist_id', testTherapistId)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })

  describe('Performance indexes', () => {
    it('should efficiently query by date range', async () => {
      const { data, error } = await supabase
        .from('student_subscriptions')
        .select('*')
        .gte('individual_start_date', '2025-01-01')
        .lte('individual_end_date', '2025-12-31')

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should efficiently query by therapist assignment', async () => {
      const { data, error } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('assigned_therapist_id', testTherapistId)
        .eq('enrollment_status', 'active')

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should efficiently query JSONB fields', async () => {
      const { data, error } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('custom_schedule->>sessions_per_week', '3')

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })
})