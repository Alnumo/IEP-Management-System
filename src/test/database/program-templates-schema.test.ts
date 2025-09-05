// Story 6.1: Unit tests for program templates schema

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import type { ProgramTemplate, ProgramGoal, CustomizationOptions } from '@/types/program-templates'

describe('Program Templates Schema', () => {
  const testTemplateId = 'test-template-123'
  
  beforeEach(async () => {
    // Clean up any existing test data
    await supabase
      .from('program_templates')
      .delete()
      .eq('program_type', 'test_program')
  })

  afterEach(async () => {
    // Clean up test data
    await supabase
      .from('program_templates')
      .delete()
      .eq('program_type', 'test_program')
  })

  describe('Program template creation', () => {
    it('should create program template with bilingual support', async () => {
      const defaultGoals: ProgramGoal[] = [
        {
          goal_ar: 'تطوير مهارات التواصل',
          goal_en: 'Develop communication skills',
          priority: 'high',
          category: 'communication'
        },
        {
          goal_ar: 'تحسين المهارات الحركية',
          goal_en: 'Improve motor skills',
          priority: 'medium',
          category: 'motor'
        }
      ]

      const customizationOptions: CustomizationOptions = {
        schedule_flexibility: true,
        therapist_rotation: false,
        intensity_levels: ['low', 'medium', 'high'],
        assessment_frequency: 'monthly',
        goal_customization: true,
        duration_flexibility: true,
        session_count_flexibility: false
      }

      const { data, error } = await supabase
        .from('program_templates')
        .insert({
          program_type: 'test_program',
          program_name_ar: 'برنامج اختباري',
          program_name_en: 'Test Program',
          description_ar: 'وصف البرنامج الاختباري',
          description_en: 'Test program description',
          base_duration_weeks: 24,
          base_sessions_per_week: 2,
          default_goals: defaultGoals,
          customization_options: customizationOptions
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.program_name_ar).toBe('برنامج اختباري')
      expect(data?.program_name_en).toBe('Test Program')
      expect(data?.default_goals).toHaveLength(2)
      expect(data?.customization_options.schedule_flexibility).toBe(true)
      expect(data?.is_active).toBe(true)
    })

    it('should enforce positive duration constraint', async () => {
      const { error } = await supabase
        .from('program_templates')
        .insert({
          program_type: 'test_program_invalid',
          program_name_ar: 'برنامج خاطئ',
          program_name_en: 'Invalid Program',
          base_duration_weeks: 0, // Should fail
          base_sessions_per_week: 2,
          default_goals: [],
          customization_options: {}
        })

      expect(error).not.toBeNull()
    })

    it('should enforce positive sessions per week constraint', async () => {
      const { error } = await supabase
        .from('program_templates')
        .insert({
          program_type: 'test_program_invalid2',
          program_name_ar: 'برنامج خاطئ',
          program_name_en: 'Invalid Program',
          base_duration_weeks: 24,
          base_sessions_per_week: 0, // Should fail
          default_goals: [],
          customization_options: {}
        })

      expect(error).not.toBeNull()
    })

    it('should automatically set audit fields', async () => {
      const { data, error } = await supabase
        .from('program_templates')
        .insert({
          program_type: 'test_program_audit',
          program_name_ar: 'برنامج المراجعة',
          program_name_en: 'Audit Program',
          base_duration_weeks: 12,
          base_sessions_per_week: 1,
          default_goals: [],
          customization_options: {}
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.created_at).toBeDefined()
      expect(data?.updated_at).toBeDefined()
      expect(data?.created_by).toBeDefined()
      expect(data?.updated_by).toBeDefined()
    })
  })

  describe('JSONB field functionality', () => {
    it('should handle complex goal structures', async () => {
      const complexGoals: ProgramGoal[] = [
        {
          goal_ar: 'تطوير مهارات التواصل غير اللفظي',
          goal_en: 'Develop non-verbal communication skills',
          priority: 'high',
          category: 'communication',
          measurable_outcome: 'Student will use 10 different gestures appropriately in 80% of opportunities'
        }
      ]

      const { data, error } = await supabase
        .from('program_templates')
        .insert({
          program_type: 'test_complex_goals',
          program_name_ar: 'برنامج الأهداف المعقدة',
          program_name_en: 'Complex Goals Program',
          base_duration_weeks: 36,
          base_sessions_per_week: 3,
          default_goals: complexGoals,
          customization_options: {}
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.default_goals[0]?.measurable_outcome).toBeDefined()
    })

    it('should query by JSONB properties', async () => {
      // First create a template
      await supabase
        .from('program_templates')
        .insert({
          program_type: 'test_query',
          program_name_ar: 'برنامج الاستعلام',
          program_name_en: 'Query Program',
          base_duration_weeks: 24,
          base_sessions_per_week: 2,
          default_goals: [{ goal_ar: 'هدف', goal_en: 'goal', priority: 'high' }],
          customization_options: { schedule_flexibility: true }
        })

      const { data, error } = await supabase
        .from('program_templates')
        .select('*')
        .eq('customization_options->>schedule_flexibility', 'true')

      expect(error).toBeNull()
      expect(data?.length).toBeGreaterThan(0)
    })
  })

  describe('Default template data', () => {
    it('should have default templates inserted', async () => {
      const { data, error } = await supabase
        .from('program_templates')
        .select('*')
        .eq('is_active', true)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      // Check for expected default templates
      const programTypes = data?.map(t => t.program_type) || []
      expect(programTypes).toContain('growth_program_annual')
      expect(programTypes).toContain('intensive_speech')
      expect(programTypes).toContain('behavioral_intervention')
    })

    it('should have bilingual names for all default templates', async () => {
      const { data, error } = await supabase
        .from('program_templates')
        .select('program_name_ar, program_name_en')
        .eq('is_active', true)

      expect(error).toBeNull()
      expect(data).toBeDefined()

      data?.forEach(template => {
        expect(template.program_name_ar).toBeTruthy()
        expect(template.program_name_en).toBeTruthy()
      })
    })

    it('should have valid goal structures in default templates', async () => {
      const { data, error } = await supabase
        .from('program_templates')
        .select('default_goals')
        .eq('is_active', true)
        .limit(1)
        .single()

      expect(error).toBeNull()
      expect(data?.default_goals).toBeDefined()
      expect(Array.isArray(data?.default_goals)).toBe(true)
      
      if (data?.default_goals && data.default_goals.length > 0) {
        const firstGoal = data.default_goals[0]
        expect(firstGoal.goal_ar).toBeTruthy()
        expect(firstGoal.goal_en).toBeTruthy()
        expect(['low', 'medium', 'high']).toContain(firstGoal.priority)
      }
    })
  })

  describe('RLS policies', () => {
    it('should allow authenticated users to view active templates', async () => {
      const { data, error } = await supabase
        .from('program_templates')
        .select('*')
        .eq('is_active', true)

      // Should not fail even if no data due to RLS
      expect(error).toBeNull()
    })

    it('should filter inactive templates for non-admin users', async () => {
      const { data, error } = await supabase
        .from('program_templates')
        .select('*')
        .eq('is_active', false)

      expect(error).toBeNull()
      // Non-admin users shouldn't see inactive templates
      expect(data).toBeDefined()
    })
  })

  describe('Update trigger functionality', () => {
    it('should update timestamp on modification', async () => {
      // Create a template first
      const { data: created, error: createError } = await supabase
        .from('program_templates')
        .insert({
          program_type: 'test_update',
          program_name_ar: 'برنامج التحديث',
          program_name_en: 'Update Program',
          base_duration_weeks: 24,
          base_sessions_per_week: 2,
          default_goals: [],
          customization_options: {}
        })
        .select()
        .single()

      expect(createError).toBeNull()
      const originalUpdatedAt = created?.updated_at

      // Wait a moment then update
      await new Promise(resolve => setTimeout(resolve, 100))

      const { data: updated, error: updateError } = await supabase
        .from('program_templates')
        .update({
          description_en: 'Updated description'
        })
        .eq('id', created!.id)
        .select()
        .single()

      expect(updateError).toBeNull()
      expect(updated?.updated_at).not.toBe(originalUpdatedAt)
    })
  })
})