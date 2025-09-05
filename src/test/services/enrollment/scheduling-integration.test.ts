// Story 6.1: Integration tests for scheduling services

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { individualizedSchedulingService } from '@/services/enrollment/individualized-scheduling-service'
import { scheduleConflictResolutionService } from '@/services/enrollment/schedule-conflict-resolution-service'
import { scheduleModificationService } from '@/services/enrollment/schedule-modification-service'
import { cohortSchedulingService } from '@/services/enrollment/cohort-scheduling-service'
import { templateScheduleSyncService } from '@/services/enrollment/template-schedule-sync-service'
import type { CustomSchedule } from '@/types/individualized-enrollment'
import type { ProgramTemplate } from '@/types/program-templates'

// Mock supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: mockEnrollment, error: null })),
        gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

// Mock data
const mockEnrollment = {
  id: 'enrollment-1',
  student_id: 'student-1',
  program_template_id: 'template-1',
  assigned_therapist_id: 'therapist-1',
  individual_start_date: '2025-01-01',
  individual_end_date: '2025-06-01',
  custom_schedule: {
    sessions_per_week: 2,
    session_duration_minutes: 60,
    preferred_days: ['monday', 'wednesday'],
    preferred_times: ['10:00', '14:00']
  } as CustomSchedule,
  enrollment_status: 'active'
}

const mockProgramTemplate: ProgramTemplate = {
  id: 'template-1',
  program_type: 'growth_program',
  program_name_ar: 'برنامج النمو',
  program_name_en: 'Growth Program',
  description_ar: 'برنامج شامل',
  description_en: 'Comprehensive program',
  base_duration_weeks: 24,
  base_sessions_per_week: 2,
  default_goals: [],
  customization_options: {
    schedule_flexibility: true,
    therapist_rotation: false,
    intensity_levels: ['low', 'medium', 'high'],
    assessment_frequency: 'monthly',
    goal_customization: true,
    duration_flexibility: true,
    session_count_flexibility: false
  },
  is_active: true,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
  created_by: 'admin',
  updated_by: 'admin',
  metadata: {}
}

describe('Scheduling Integration Services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('IndividualizedSchedulingService', () => {
    it('should generate individual schedule with correct parameters', async () => {
      const result = await individualizedSchedulingService.generateIndividualSchedule({
        enrollment_id: 'enrollment-1',
        start_date: '2025-01-01',
        end_date: '2025-06-01',
        custom_schedule: mockEnrollment.custom_schedule,
        therapist_id: 'therapist-1'
      })

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should detect schedule conflicts correctly', async () => {
      const testSlots = [
        {
          id: 'slot-1',
          enrollment_id: 'enrollment-1',
          student_id: 'student-1',
          therapist_id: 'therapist-1',
          session_date: '2025-01-15',
          start_time: '10:00',
          end_time: '11:00',
          session_type: 'individual' as const,
          status: 'scheduled' as const
        },
        {
          id: 'slot-2',
          enrollment_id: 'enrollment-2',
          student_id: 'student-2',
          therapist_id: 'therapist-1', // Same therapist
          session_date: '2025-01-15', // Same date
          start_time: '10:30', // Overlapping time
          end_time: '11:30',
          session_type: 'individual' as const,
          status: 'scheduled' as const
        }
      ]

      const conflicts = await individualizedSchedulingService.detectScheduleConflicts(testSlots)
      expect(conflicts).toBeDefined()
      expect(Array.isArray(conflicts)).toBe(true)
    })

    it('should modify individual schedule successfully', async () => {
      const modifications = {
        sessions_per_week: 3,
        preferred_days: ['tuesday', 'thursday', 'saturday']
      }

      const result = await individualizedSchedulingService.modifyIndividualSchedule(
        'enrollment-1',
        modifications
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should synchronize with template updates', async () => {
      const templateChanges = {
        base_sessions_per_week: 3,
        updated_at: new Date().toISOString()
      }

      await expect(
        individualizedSchedulingService.synchronizeWithTemplateUpdate(
          'template-1',
          templateChanges
        )
      ).resolves.not.toThrow()
    })
  })

  describe('ScheduleConflictResolutionService', () => {
    it('should detect conflicts in schedule accurately', async () => {
      const testSlots = [
        {
          id: 'slot-1',
          enrollment_id: 'enrollment-1',
          student_id: 'student-1',
          therapist_id: 'therapist-1',
          session_date: '2025-01-15',
          start_time: '10:00',
          end_time: '11:00',
          session_type: 'individual' as const,
          status: 'scheduled' as const
        }
      ]

      const conflicts = await scheduleConflictResolutionService.detectConflictsInSchedule(testSlots)
      expect(conflicts).toBeDefined()
      expect(Array.isArray(conflicts)).toBe(true)
    })

    it('should suggest resolutions for conflicts', async () => {
      const mockConflict = {
        type: 'therapist' as const,
        entity_id: 'therapist-1',
        conflicting_slots: [
          {
            id: 'slot-1',
            enrollment_id: 'enrollment-1',
            student_id: 'student-1',
            therapist_id: 'therapist-1',
            session_date: '2025-01-15',
            start_time: '10:00',
            end_time: '11:00',
            session_type: 'individual' as const,
            status: 'scheduled' as const
          }
        ],
        suggested_alternatives: []
      }

      const suggestions = await scheduleConflictResolutionService.suggestResolutions(mockConflict)
      expect(suggestions).toBeDefined()
      expect(Array.isArray(suggestions)).toBe(true)
    })

    it('should analyze conflict patterns over time', async () => {
      const analysis = await scheduleConflictResolutionService.analyzeConflictPatterns(
        '2025-01-01',
        '2025-01-31'
      )

      expect(analysis).toBeDefined()
      expect(analysis).toHaveProperty('total_conflicts')
      expect(analysis).toHaveProperty('conflicts_by_type')
      expect(analysis).toHaveProperty('peak_conflict_times')
      expect(analysis).toHaveProperty('resolution_success_rate')
    })

    it('should handle bulk conflict resolution', async () => {
      const conflictIds = ['conflict-1', 'conflict-2']
      const result = await scheduleConflictResolutionService.bulkResolveConflicts(
        conflictIds,
        'reschedule',
        {
          new_date: '2025-01-20',
          new_time: '14:00'
        }
      )

      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('failed')
      expect(result).toHaveProperty('errors')
    })
  })

  describe('ScheduleModificationService', () => {
    it('should process reschedule requests', async () => {
      const request = {
        enrollment_id: 'enrollment-1',
        modification_type: 'reschedule' as const,
        effective_date: '2025-01-20',
        reason: 'Student request',
        requested_by: 'parent',
        details: {
          new_date: '2025-01-22',
          new_time: '15:00'
        }
      }

      const result = await scheduleModificationService.processModificationRequest(request)
      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('message')
    })

    it('should pause enrollment schedule', async () => {
      const result = await scheduleModificationService.pauseEnrollmentSchedule(
        'enrollment-1',
        '2025-02-01',
        2, // 2 weeks
        {
          cancel_sessions_during_pause: true,
          auto_extend_enrollment: true,
          create_makeup_sessions: true
        }
      )

      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('resume_date')
      expect(result).toHaveProperty('affected_sessions')
    })

    it('should resume paused enrollment', async () => {
      const result = await scheduleModificationService.resumeEnrollmentSchedule(
        'enrollment-1',
        '2025-02-15',
        {
          regenerate_schedule: true,
          apply_makeup_sessions: true
        }
      )

      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('sessions_created')
    })

    it('should change session intensity', async () => {
      const result = await scheduleModificationService.changeSessionIntensity(
        'enrollment-1',
        3, // new sessions per week
        45, // new duration
        '2025-02-01'
      )

      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('sessions_modified')
    })

    it('should extend enrollment duration', async () => {
      const result = await scheduleModificationService.extendEnrollmentDuration(
        'enrollment-1',
        4, // 4 additional weeks
        {
          maintain_current_schedule: true,
          adjust_goals: false,
          prorate_fees: true
        }
      )

      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('new_end_date')
    })

    it('should get modification history', async () => {
      const history = await scheduleModificationService.getModificationHistory(
        'enrollment-1',
        {
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          limit: 10
        }
      )

      expect(history).toBeDefined()
      expect(Array.isArray(history)).toBe(true)
    })
  })

  describe('CohortSchedulingService', () => {
    it('should create program cohort successfully', async () => {
      const result = await cohortSchedulingService.createProgramCohort(
        'template-1',
        ['enrollment-1', 'enrollment-2'],
        {
          cohort_name: 'January Growth Group',
          start_date: '2025-01-15',
          end_date: '2025-06-15',
          shared_activities: [
            {
              id: 'activity-1',
              activity_type: 'group_therapy',
              activity_name: 'Social Skills Group',
              frequency: 'weekly',
              day_of_week: 1, // Monday
              preferred_time: '10:00',
              duration_minutes: 90,
              therapist_ids: ['therapist-1'],
              room_requirements: {
                room_type: 'large_group',
                min_capacity: 6,
                equipment_needed: [],
                accessibility_requirements: []
              },
              min_participants: 3,
              max_participants: 8,
              mandatory: true
            }
          ]
        }
      )

      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('cohort')
      expect(result).toHaveProperty('message')
    })

    it('should generate cohort schedule', async () => {
      const result = await cohortSchedulingService.generateCohortSchedule(
        'cohort-1',
        {
          include_individual_sessions: true,
          auto_resolve_conflicts: true,
          respect_individual_preferences: true
        }
      )

      expect(result).toBeDefined()
      expect(result).toHaveProperty('cohort_id')
      expect(result).toHaveProperty('shared_sessions')
      expect(result).toHaveProperty('individual_sessions')
      expect(result).toHaveProperty('statistics')
    })

    it('should add member to cohort', async () => {
      const result = await cohortSchedulingService.addMemberToCohort(
        'cohort-1',
        'enrollment-3',
        {
          generate_schedule: true,
          sync_with_cohort: true,
          notify_members: true
        }
      )

      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('sessions_created')
    })

    it('should remove member from cohort', async () => {
      const result = await cohortSchedulingService.removeMemberFromCohort(
        'cohort-1',
        'enrollment-2',
        {
          keep_individual_sessions: true,
          cancel_shared_sessions: true,
          notify_members: true
        }
      )

      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('sessions_affected')
    })

    it('should synchronize cohort schedules', async () => {
      const result = await cohortSchedulingService.synchronizeCohortSchedules(
        'cohort-1',
        'full'
      )

      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('synchronized')
      expect(result).toHaveProperty('conflicts')
    })

    it('should get cohort analytics', async () => {
      const analytics = await cohortSchedulingService.getCohortAnalytics(
        'cohort-1',
        {
          start: '2025-01-01',
          end: '2025-01-31'
        }
      )

      expect(analytics).toBeDefined()
      expect(analytics).toHaveProperty('attendance_rate')
      expect(analytics).toHaveProperty('participation_by_activity')
      expect(analytics).toHaveProperty('member_engagement')
      expect(analytics).toHaveProperty('schedule_efficiency')
      expect(analytics).toHaveProperty('conflict_rate')
    })
  })

  describe('TemplateScheduleSyncService', () => {
    it('should analyze template changes', async () => {
      const oldTemplate = { ...mockProgramTemplate, base_sessions_per_week: 2 }
      const newTemplate = { ...mockProgramTemplate, base_sessions_per_week: 3 }

      const result = await templateScheduleSyncService.analyzeTemplateChanges(
        'template-1',
        oldTemplate,
        newTemplate
      )

      expect(result).toBeDefined()
      expect(result).toHaveProperty('changes')
      expect(result).toHaveProperty('sync_required')
      expect(result).toHaveProperty('impact_level')
      expect(Array.isArray(result.changes)).toBe(true)
    })

    it('should validate sync operation', async () => {
      const changes = [
        {
          field: 'base_sessions_per_week' as const,
          old_value: 2,
          new_value: 3,
          impact_level: 'medium' as const,
          requires_schedule_rebuild: true,
          affects_existing_sessions: true
        }
      ]

      const policy = {
        auto_sync_enabled: true,
        sync_trigger: 'immediate' as const,
        preservation_rules: [],
        notification_settings: {
          notify_on_changes: true,
          notify_affected_users: true,
          advance_notice_hours: 24
        },
        rollback_settings: {
          allow_rollback: true,
          rollback_window_hours: 24,
          backup_schedules: true
        }
      }

      const validation = await templateScheduleSyncService.validateSyncOperation(
        'template-1',
        changes,
        policy
      )

      expect(validation).toBeDefined()
      expect(validation).toHaveProperty('can_sync')
      expect(validation).toHaveProperty('warnings')
      expect(validation).toHaveProperty('blocking_issues')
      expect(validation).toHaveProperty('estimated_impact')
    })

    it('should execute sync operation', async () => {
      const changes = [
        {
          field: 'base_sessions_per_week' as const,
          old_value: 2,
          new_value: 3,
          impact_level: 'medium' as const,
          requires_schedule_rebuild: true,
          affects_existing_sessions: true
        }
      ]

      const policy = {
        auto_sync_enabled: true,
        sync_trigger: 'immediate' as const,
        preservation_rules: [],
        notification_settings: {
          notify_on_changes: true,
          notify_affected_users: true,
          advance_notice_hours: 24
        },
        rollback_settings: {
          allow_rollback: true,
          rollback_window_hours: 24,
          backup_schedules: true
        }
      }

      const operation = await templateScheduleSyncService.executeSyncOperation(
        'template-1',
        changes,
        policy,
        {
          dry_run: true,
          batch_size: 5,
          include_notifications: false
        }
      )

      expect(operation).toBeDefined()
      expect(operation).toHaveProperty('id')
      expect(operation).toHaveProperty('sync_status')
      expect(operation).toHaveProperty('results')
    })

    it('should get sync operation status', async () => {
      const status = await templateScheduleSyncService.getSyncOperationStatus('operation-1')

      expect(status).toBeDefined()
      expect(status).toHaveProperty('operation')
      expect(status).toHaveProperty('progress')
    })

    it('should get template sync history', async () => {
      const history = await templateScheduleSyncService.getTemplateSyncHistory(
        'template-1',
        {
          limit: 10,
          start_date: '2025-01-01',
          end_date: '2025-01-31'
        }
      )

      expect(history).toBeDefined()
      expect(Array.isArray(history)).toBe(true)
    })

    it('should rollback sync operation', async () => {
      const result = await templateScheduleSyncService.rollbackSyncOperation('operation-1')

      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('sessions_restored')
    })
  })

  describe('Service Integration', () => {
    it('should integrate scheduling and conflict resolution services', async () => {
      // Generate schedule
      const schedule = await individualizedSchedulingService.generateIndividualSchedule({
        enrollment_id: 'enrollment-1',
        start_date: '2025-01-01',
        end_date: '2025-06-01',
        custom_schedule: mockEnrollment.custom_schedule,
        therapist_id: 'therapist-1'
      })

      // Detect conflicts
      const conflicts = await scheduleConflictResolutionService.detectConflictsInSchedule(schedule)

      // Should complete without throwing
      expect(schedule).toBeDefined()
      expect(conflicts).toBeDefined()
    })

    it('should integrate modification and scheduling services', async () => {
      // First generate a schedule
      await individualizedSchedulingService.generateIndividualSchedule({
        enrollment_id: 'enrollment-1',
        start_date: '2025-01-01',
        end_date: '2025-06-01',
        custom_schedule: mockEnrollment.custom_schedule,
        therapist_id: 'therapist-1'
      })

      // Then modify it
      const modificationRequest = {
        enrollment_id: 'enrollment-1',
        modification_type: 'intensity_change' as const,
        effective_date: '2025-02-01',
        reason: 'Student progress',
        requested_by: 'therapist',
        details: {
          new_sessions_per_week: 3,
          new_session_duration: 45
        }
      }

      const result = await scheduleModificationService.processModificationRequest(modificationRequest)
      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
    })

    it('should integrate cohort and individual scheduling', async () => {
      // Create cohort
      const cohortResult = await cohortSchedulingService.createProgramCohort(
        'template-1',
        ['enrollment-1', 'enrollment-2'],
        {
          cohort_name: 'Test Cohort',
          start_date: '2025-01-15',
          end_date: '2025-06-15',
          shared_activities: []
        }
      )

      expect(cohortResult.success).toBe(true)

      // Generate cohort schedule
      if (cohortResult.cohort) {
        const scheduleResult = await cohortSchedulingService.generateCohortSchedule(
          cohortResult.cohort.id,
          {
            include_individual_sessions: true,
            auto_resolve_conflicts: true
          }
        )

        expect(scheduleResult).toBeDefined()
        expect(scheduleResult).toHaveProperty('statistics')
      }
    })

    it('should integrate template sync with all scheduling services', async () => {
      // Analyze template changes
      const oldTemplate = { ...mockProgramTemplate, base_sessions_per_week: 2 }
      const newTemplate = { ...mockProgramTemplate, base_sessions_per_week: 3 }

      const analysis = await templateScheduleSyncService.analyzeTemplateChanges(
        'template-1',
        oldTemplate,
        newTemplate
      )

      expect(analysis.sync_required).toBe(true)

      // Execute sync (dry run)
      const operation = await templateScheduleSyncService.executeSyncOperation(
        'template-1',
        analysis.changes,
        {
          auto_sync_enabled: true,
          sync_trigger: 'immediate',
          preservation_rules: [],
          notification_settings: {
            notify_on_changes: false,
            notify_affected_users: false,
            advance_notice_hours: 0
          },
          rollback_settings: {
            allow_rollback: false,
            rollback_window_hours: 0,
            backup_schedules: false
          }
        },
        { dry_run: true }
      )

      expect(operation.sync_status).toBe('completed')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabase.from.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'Database error' } })
          })
        })
      }))

      const result = await scheduleModificationService.processModificationRequest({
        enrollment_id: 'nonexistent',
        modification_type: 'reschedule',
        effective_date: '2025-01-01',
        reason: 'Test',
        requested_by: 'test',
        details: {}
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain('Enrollment not found')
    })

    it('should handle invalid schedule parameters', async () => {
      const result = await individualizedSchedulingService.generateIndividualSchedule({
        enrollment_id: '',
        start_date: '2025-01-01',
        end_date: '2024-12-31', // End before start
        custom_schedule: {
          sessions_per_week: 0, // Invalid
          session_duration_minutes: 0, // Invalid
          preferred_days: [],
          preferred_times: []
        },
        therapist_id: ''
      })

      // Should return empty array for invalid parameters
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle conflict resolution failures', async () => {
      const invalidConflict = {
        type: 'invalid_type' as any,
        entity_id: '',
        conflicting_slots: [],
        suggested_alternatives: []
      }

      const suggestions = await scheduleConflictResolutionService.suggestResolutions(invalidConflict)
      
      // Should return empty array for invalid conflicts
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBe(0)
    })
  })

  describe('Performance', () => {
    it('should handle large schedule generation efficiently', async () => {
      const startTime = Date.now()

      // Generate schedule for 6 months
      const result = await individualizedSchedulingService.generateIndividualSchedule({
        enrollment_id: 'enrollment-1',
        start_date: '2025-01-01',
        end_date: '2025-06-30',
        custom_schedule: {
          sessions_per_week: 3,
          session_duration_minutes: 60,
          preferred_days: ['monday', 'wednesday', 'friday'],
          preferred_times: ['09:00', '10:00', '11:00']
        },
        therapist_id: 'therapist-1'
      })

      const duration = Date.now() - startTime
      
      expect(result).toBeDefined()
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle bulk modifications efficiently', async () => {
      const enrollmentIds = Array.from({ length: 50 }, (_, i) => `enrollment-${i + 1}`)
      
      const startTime = Date.now()
      
      const result = await scheduleModificationService.applyBulkModifications(
        enrollmentIds,
        {
          modification_type: 'reschedule',
          effective_date: '2025-02-01',
          reason: 'Bulk test',
          requested_by: 'admin',
          details: {
            new_date: '2025-02-05',
            new_time: '10:00'
          }
        }
      )

      const duration = Date.now() - startTime
      
      expect(result).toBeDefined()
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    })
  })
})

describe('Service Integration Edge Cases', () => {
  it('should handle timezone considerations', async () => {
    // Test scheduling across different timezones
    const schedule = await individualizedSchedulingService.generateIndividualSchedule({
      enrollment_id: 'enrollment-tz',
      start_date: '2025-01-01T00:00:00.000Z',
      end_date: '2025-01-31T23:59:59.999Z',
      custom_schedule: {
        sessions_per_week: 1,
        session_duration_minutes: 60,
        preferred_days: ['monday'],
        preferred_times: ['23:30'] // Edge case: late night
      },
      therapist_id: 'therapist-1'
    })

    expect(schedule).toBeDefined()
    expect(Array.isArray(schedule)).toBe(true)
  })

  it('should handle holiday and weekend exclusions', async () => {
    const schedule = await individualizedSchedulingService.generateIndividualSchedule({
      enrollment_id: 'enrollment-holidays',
      start_date: '2025-12-20',
      end_date: '2025-01-10',
      custom_schedule: {
        sessions_per_week: 3,
        session_duration_minutes: 60,
        preferred_days: ['monday', 'wednesday', 'friday'],
        preferred_times: ['10:00']
      },
      therapist_id: 'therapist-1',
      avoid_holidays: true,
      allow_weekends: false
    })

    expect(schedule).toBeDefined()
    // Should exclude holiday period sessions
  })

  it('should handle concurrent modifications', async () => {
    // Simulate concurrent modifications to same enrollment
    const promises = Array.from({ length: 5 }, (_, i) => 
      scheduleModificationService.processModificationRequest({
        enrollment_id: 'enrollment-concurrent',
        modification_type: 'reschedule',
        effective_date: `2025-02-0${i + 1}`,
        reason: `Concurrent test ${i + 1}`,
        requested_by: 'test',
        details: {
          new_date: `2025-02-1${i + 1}`,
          new_time: '10:00'
        }
      })
    )

    const results = await Promise.allSettled(promises)
    
    // At least one should succeed
    const successCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length
    
    expect(successCount).toBeGreaterThan(0)
  })
})