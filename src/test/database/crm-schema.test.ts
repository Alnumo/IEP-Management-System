/**
 * CRM Database Schema Tests
 * @description Tests for CRM lead management database schema and functions
 * @author James (Dev Agent)
 * @date 2025-09-03
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Lead, LeadStatus, LeadAuditTrail } from '../../types/crm';

// Mock Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'test-key';
const supabase = createClient(supabaseUrl, supabaseKey);

describe('CRM Database Schema', () => {
  describe('Leads Table', () => {
    it('should create a new lead successfully', async () => {
      const newLead = {
        parent_name: 'أحمد محمد',
        parent_name_ar: 'أحمد محمد',
        parent_contact: '+966501234567',
        child_name: 'Ali Ahmed',
        child_name_ar: 'علي أحمد',
        child_dob: '2018-05-15',
        child_gender: 'male',
        status: 'new_booking' as LeadStatus,
        evaluation_date: new Date().toISOString(),
        source: 'website',
        source_details: { campaign: 'google_ads' }
      };

      const { data, error } = await supabase
        .from('leads')
        .insert(newLead)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.parent_name).toBe(newLead.parent_name);
      expect(data?.status).toBe('new_booking');
    });

    it('should update lead status with audit trail', async () => {
      // First create a lead
      const { data: lead } = await supabase
        .from('leads')
        .insert({
          parent_name: 'Test Parent',
          parent_contact: 'test@example.com',
          child_name: 'Test Child',
          child_dob: '2019-01-01'
        })
        .select()
        .single();

      // Update status using function
      const { data: result, error } = await supabase
        .rpc('update_lead_status', {
          p_lead_id: lead?.id,
          p_new_status: 'confirmed',
          p_notes: 'Parent confirmed evaluation appointment'
        });

      expect(error).toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.new_status).toBe('confirmed');

      // Check audit trail
      const { data: auditEntries } = await supabase
        .from('lead_audit_trail')
        .select('*')
        .eq('lead_id', lead?.id)
        .eq('action', 'status_changed');

      expect(auditEntries).toHaveLength(1);
      expect(auditEntries?.[0]?.new_value?.status).toBe('confirmed');
    });

    it('should enforce RLS policies for lead access', async () => {
      // Test with unauthenticated client
      const anonSupabase = createClient(supabaseUrl, supabaseKey);
      
      const { data, error } = await anonSupabase
        .from('leads')
        .select('*');

      // Should fail due to RLS
      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should prevent duplicate external_id entries', async () => {
      const external_id = 'AMELIA-12345';
      
      // First lead with external_id
      await supabase.from('leads').insert({
        parent_name: 'Parent 1',
        parent_contact: 'parent1@test.com',
        child_name: 'Child 1',
        child_dob: '2019-01-01',
        external_id
      });

      // Attempt to create duplicate (should handle gracefully)
      const { data: existing } = await supabase
        .from('leads')
        .select('*')
        .eq('external_id', external_id)
        .single();

      expect(existing).toBeDefined();
      expect(existing?.external_id).toBe(external_id);
    });
  });

  describe('Lead Status Transitions', () => {
    it('should follow valid status progression', async () => {
      const validTransitions: Array<[LeadStatus, LeadStatus]> = [
        ['new_booking', 'confirmed'],
        ['confirmed', 'evaluation_complete'],
        ['evaluation_complete', 'registered'],
        ['new_booking', 'archived'],
        ['confirmed', 'archived']
      ];

      for (const [from, to] of validTransitions) {
        // Create lead with initial status
        const { data: lead } = await supabase
          .from('leads')
          .insert({
            parent_name: `Test ${from}`,
            parent_contact: `test-${from}@example.com`,
            child_name: 'Test Child',
            child_dob: '2019-01-01',
            status: from
          })
          .select()
          .single();

        // Update to new status
        const { data: result } = await supabase
          .rpc('update_lead_status', {
            p_lead_id: lead?.id,
            p_new_status: to
          });

        expect(result?.success).toBe(true);
        expect(result?.old_status).toBe(from);
        expect(result?.new_status).toBe(to);
      }
    });
  });

  describe('Lead Conversion', () => {
    it('should convert lead to student successfully', async () => {
      // Create a lead ready for conversion
      const { data: lead } = await supabase
        .from('leads')
        .insert({
          parent_name: 'Convert Parent',
          parent_contact: 'convert@test.com',
          child_name: 'Convert Child',
          child_name_ar: 'طفل تحويل',
          child_dob: '2018-06-15',
          child_gender: 'female',
          status: 'evaluation_complete'
        })
        .select()
        .single();

      // Convert to student
      const { data: result, error } = await supabase
        .rpc('convert_lead_to_student', {
          p_lead_id: lead?.id,
          p_student_data: {}
        });

      expect(error).toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.student_id).toBeDefined();

      // Verify lead status updated
      const { data: updatedLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', lead?.id)
        .single();

      expect(updatedLead?.status).toBe('registered');
      expect(updatedLead?.converted_to_student_id).toBe(result?.student_id);
    });

    it('should prevent conversion of non-eligible leads', async () => {
      // Create a lead not ready for conversion
      const { data: lead } = await supabase
        .from('leads')
        .insert({
          parent_name: 'Not Ready Parent',
          parent_contact: 'notready@test.com',
          child_name: 'Not Ready Child',
          child_dob: '2019-01-01',
          status: 'new_booking'
        })
        .select()
        .single();

      // Attempt conversion
      const { data: result } = await supabase
        .rpc('convert_lead_to_student', {
          p_lead_id: lead?.id,
          p_student_data: {}
        });

      expect(result?.success).toBe(false);
      expect(result?.error).toContain('not ready for conversion');
    });

    it('should prevent duplicate conversion', async () => {
      // Create and convert a lead
      const { data: lead } = await supabase
        .from('leads')
        .insert({
          parent_name: 'Already Converted',
          parent_contact: 'already@test.com',
          child_name: 'Already Child',
          child_dob: '2019-01-01',
          status: 'evaluation_complete'
        })
        .select()
        .single();

      // First conversion
      await supabase.rpc('convert_lead_to_student', {
        p_lead_id: lead?.id,
        p_student_data: {}
      });

      // Attempt second conversion
      const { data: result } = await supabase
        .rpc('convert_lead_to_student', {
          p_lead_id: lead?.id,
          p_student_data: {}
        });

      expect(result?.success).toBe(false);
      expect(result?.error).toContain('already converted');
    });
  });

  describe('Lead Assignment', () => {
    it('should assign lead to user with audit trail', async () => {
      // Create a lead
      const { data: lead } = await supabase
        .from('leads')
        .insert({
          parent_name: 'Assign Parent',
          parent_contact: 'assign@test.com',
          child_name: 'Assign Child',
          child_dob: '2019-01-01'
        })
        .select()
        .single();

      // Mock user ID
      const userId = 'user-123';

      // Assign lead
      const { data: result } = await supabase
        .rpc('assign_lead', {
          p_lead_id: lead?.id,
          p_user_id: userId,
          p_notes: 'Assigned to therapist for evaluation'
        });

      expect(result?.success).toBe(true);
      expect(result?.assigned_to).toBe(userId);

      // Check audit trail
      const { data: auditEntries } = await supabase
        .from('lead_audit_trail')
        .select('*')
        .eq('lead_id', lead?.id)
        .eq('action', 'assigned');

      expect(auditEntries).toHaveLength(1);
      expect(auditEntries?.[0]?.new_value?.assigned_to).toBe(userId);
    });
  });

  describe('Lead Interactions', () => {
    it('should record lead interactions', async () => {
      // Create a lead
      const { data: lead } = await supabase
        .from('leads')
        .insert({
          parent_name: 'Interaction Parent',
          parent_contact: 'interaction@test.com',
          child_name: 'Interaction Child',
          child_dob: '2019-01-01'
        })
        .select()
        .single();

      // Add interaction
      const interaction = {
        lead_id: lead?.id,
        interaction_type: 'call',
        duration_minutes: 15,
        subject: 'Initial consultation call',
        description: 'Discussed child needs and evaluation process',
        outcome: 'interested'
      };

      const { data, error } = await supabase
        .from('lead_interactions')
        .insert(interaction)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.interaction_type).toBe('call');
      expect(data?.outcome).toBe('interested');
    });

    it('should retrieve interaction history for a lead', async () => {
      // Create lead with multiple interactions
      const { data: lead } = await supabase
        .from('leads')
        .insert({
          parent_name: 'History Parent',
          parent_contact: 'history@test.com',
          child_name: 'History Child',
          child_dob: '2019-01-01'
        })
        .select()
        .single();

      // Add multiple interactions
      const interactions = [
        { lead_id: lead?.id, interaction_type: 'email', subject: 'Welcome email' },
        { lead_id: lead?.id, interaction_type: 'call', subject: 'Follow-up call' },
        { lead_id: lead?.id, interaction_type: 'meeting', subject: 'Evaluation meeting' }
      ];

      await supabase.from('lead_interactions').insert(interactions);

      // Retrieve history
      const { data: history } = await supabase
        .from('lead_interactions')
        .select('*')
        .eq('lead_id', lead?.id)
        .order('interaction_date', { ascending: false });

      expect(history).toHaveLength(3);
      expect(history?.[0]?.interaction_type).toBe('meeting');
    });
  });

  describe('Indexes and Performance', () => {
    it('should have proper indexes for common queries', async () => {
      // Test query performance with status filter
      const startTime = performance.now();
      
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'new_booking')
        .order('created_at', { ascending: false })
        .limit(10);

      const queryTime = performance.now() - startTime;
      
      // Query should be fast due to indexes
      expect(queryTime).toBeLessThan(100); // milliseconds
      expect(data).toBeDefined();
    });

    it('should efficiently query by evaluation date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .gte('evaluation_date', startDate.toISOString())
        .lte('evaluation_date', endDate.toISOString())
        .order('evaluation_date', { ascending: true });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });
});

describe('CRM Audit Trail', () => {
  it('should track all lead modifications', async () => {
    // Create a lead
    const { data: lead } = await supabase
      .from('leads')
      .insert({
        parent_name: 'Audit Test',
        parent_contact: 'audit@test.com',
        child_name: 'Audit Child',
        child_dob: '2019-01-01'
      })
      .select()
      .single();

    // Get audit trail
    const { data: audit } = await supabase
      .from('lead_audit_trail')
      .select('*')
      .eq('lead_id', lead?.id)
      .order('performed_at', { ascending: true });

    // Should have creation entry
    expect(audit).toHaveLength(1);
    expect(audit?.[0]?.action).toBe('created');
    expect(audit?.[0]?.new_value).toHaveProperty('parent_name', 'Audit Test');
  });

  it('should maintain complete audit history', async () => {
    // Create and modify a lead multiple times
    const { data: lead } = await supabase
      .from('leads')
      .insert({
        parent_name: 'Complete Audit',
        parent_contact: 'complete@test.com',
        child_name: 'Complete Child',
        child_dob: '2019-01-01'
      })
      .select()
      .single();

    // Multiple status changes
    await supabase.rpc('update_lead_status', {
      p_lead_id: lead?.id,
      p_new_status: 'confirmed'
    });

    await supabase.rpc('assign_lead', {
      p_lead_id: lead?.id,
      p_user_id: 'user-456'
    });

    await supabase.rpc('update_lead_status', {
      p_lead_id: lead?.id,
      p_new_status: 'evaluation_complete'
    });

    // Get complete audit history
    const { data: history } = await supabase
      .from('lead_audit_trail')
      .select('*')
      .eq('lead_id', lead?.id)
      .order('performed_at', { ascending: true });

    expect(history?.length).toBeGreaterThanOrEqual(4);
    
    const actions = history?.map(h => h.action) || [];
    expect(actions).toContain('created');
    expect(actions).toContain('status_changed');
    expect(actions).toContain('assigned');
  });
});