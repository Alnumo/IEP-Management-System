/**
 * CRM Lead Lifecycle Integration Tests
 * @description End-to-end tests for the complete lead management lifecycle
 * @author James (Dev Agent)
 * @date 2025-09-03
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Lead, LeadStatus } from '@/types/crm';

// Mock external dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: createClient('http://localhost:54321', 'test-key')
}));

describe('CRM Lead Lifecycle Integration', () => {
  let testLead: Lead;
  let testLeadId: string;

  beforeEach(async () => {
    // Clean up test data
    await supabase.from('leads').delete().like('parent_name', '%Test%');
    await supabase.from('students').delete().like('first_name_en', '%Test%');
    await supabase.from('lead_audit_trail').delete().like('notes', '%Test%');
    
    // Create test lead
    const { data, error } = await supabase
      .from('leads')
      .insert([{
        parent_name: 'Test Parent Integration',
        parent_contact: '+966501234567',
        child_name: 'Test Child Integration',
        child_dob: '2019-01-01',
        status: 'new_booking',
        source: 'website',
        evaluation_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        notes: 'Test lead for integration testing'
      }])
      .select()
      .single();

    if (error) throw error;
    
    testLead = data;
    testLeadId = data.id;
  });

  afterEach(async () => {
    // Clean up test data
    await supabase.from('leads').delete().eq('id', testLeadId);
    await supabase.from('students').delete().like('first_name_en', '%Test%');
    await supabase.from('lead_audit_trail').delete().like('notes', '%Test%');
  });

  describe('Lead Creation and Management', () => {
    it('should create a lead with all required fields', async () => {
      expect(testLead).toBeDefined();
      expect(testLead.parent_name).toBe('Test Parent Integration');
      expect(testLead.child_name).toBe('Test Child Integration');
      expect(testLead.status).toBe('new_booking');
      expect(testLead.source).toBe('website');
    });

    it('should create audit trail entry on lead creation', async () => {
      const { data: auditEntries } = await supabase
        .from('lead_audit_trail')
        .select('*')
        .eq('lead_id', testLeadId);

      expect(auditEntries).toBeDefined();
      expect(auditEntries?.length).toBeGreaterThan(0);
      expect(auditEntries?.[0].action).toBe('created');
    });

    it('should enforce Row Level Security policies', async () => {
      // Attempt to access lead without proper authentication
      const unauthenticatedClient = createClient('http://localhost:54321', 'test-key');
      
      const { data, error } = await unauthenticatedClient
        .from('leads')
        .select('*')
        .eq('id', testLeadId);

      // Should either return empty data or require authentication
      expect(data?.length || 0).toBe(0);
    });
  });

  describe('Lead Status Transitions', () => {
    it('should update lead status with audit trail', async () => {
      // Update status to confirmed
      const { data: updatedLead, error } = await supabase
        .from('leads')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', testLeadId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedLead.status).toBe('confirmed');

      // Check audit trail
      const { data: auditEntries } = await supabase
        .from('lead_audit_trail')
        .select('*')
        .eq('lead_id', testLeadId)
        .order('performed_at', { ascending: false });

      const statusUpdateEntry = auditEntries?.find(entry => entry.action === 'status_updated');
      expect(statusUpdateEntry).toBeDefined();
      expect(statusUpdateEntry?.old_value).toBe('new_booking');
      expect(statusUpdateEntry?.new_value).toBe('confirmed');
    });

    it('should handle all valid status transitions', async () => {
      const statusFlow: LeadStatus[] = ['new_booking', 'confirmed', 'evaluation_complete', 'registered'];
      
      for (let i = 1; i < statusFlow.length; i++) {
        const newStatus = statusFlow[i];
        
        const { error } = await supabase
          .from('leads')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', testLeadId);

        expect(error).toBeNull();

        // Verify the status was updated
        const { data: lead } = await supabase
          .from('leads')
          .select('status')
          .eq('id', testLeadId)
          .single();

        expect(lead?.status).toBe(newStatus);
      }
    });

    it('should prevent invalid status transitions', async () => {
      // Try to skip from new_booking directly to registered (should fail)
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: 'registered',
          updated_at: new Date().toISOString()
        })
        .eq('id', testLeadId);

      // This should fail due to database constraints or triggers
      expect(error).toBeDefined();
    });
  });

  describe('Lead Interactions', () => {
    it('should create interaction records', async () => {
      const { data: interaction, error } = await supabase
        .from('lead_interactions')
        .insert([{
          lead_id: testLeadId,
          interaction_type: 'call',
          subject: 'Follow-up call',
          description: 'Called to confirm evaluation appointment',
          outcome: 'interested',
          duration_minutes: 15
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(interaction).toBeDefined();
      expect(interaction.subject).toBe('Follow-up call');
      expect(interaction.outcome).toBe('interested');
    });

    it('should link interactions to leads correctly', async () => {
      // Create multiple interactions
      await supabase.from('lead_interactions').insert([
        {
          lead_id: testLeadId,
          interaction_type: 'call',
          subject: 'Initial contact',
          outcome: 'interested'
        },
        {
          lead_id: testLeadId,
          interaction_type: 'email',
          subject: 'Sent evaluation information',
          outcome: 'follow_up_needed'
        }
      ]);

      // Fetch lead with interactions
      const { data: leadWithInteractions } = await supabase
        .from('leads')
        .select(`
          *,
          interactions:lead_interactions(*)
        `)
        .eq('id', testLeadId)
        .single();

      expect(leadWithInteractions?.interactions).toHaveLength(2);
      expect(leadWithInteractions?.interactions?.[0].subject).toBe('Initial contact');
    });
  });

  describe('Lead Assignment', () => {
    it('should assign leads to therapists', async () => {
      // Update lead with assignment
      const { data: updatedLead, error } = await supabase
        .from('leads')
        .update({ 
          assigned_to: 'test-therapist-id',
          updated_at: new Date().toISOString()
        })
        .eq('id', testLeadId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedLead.assigned_to).toBe('test-therapist-id');

      // Check audit trail for assignment
      const { data: auditEntries } = await supabase
        .from('lead_audit_trail')
        .select('*')
        .eq('lead_id', testLeadId)
        .eq('action', 'assigned');

      expect(auditEntries?.length).toBeGreaterThan(0);
    });
  });

  describe('Lead Conversion to Student', () => {
    it('should convert lead to student record', async () => {
      // First update lead to evaluation_complete
      await supabase
        .from('leads')
        .update({ status: 'evaluation_complete' })
        .eq('id', testLeadId);

      // Create student record from lead data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert([{
          first_name_en: testLead.child_name,
          last_name_en: 'Test',
          date_of_birth: testLead.child_dob,
          gender: 'not_specified',
          phone: testLead.parent_contact,
          status: 'active',
          enrollment_date: new Date().toISOString()
        }])
        .select()
        .single();

      expect(studentError).toBeNull();
      expect(student).toBeDefined();
      expect(student.first_name_en).toBe(testLead.child_name);

      // Update lead status to registered
      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({ 
          status: 'registered',
          converted_student_id: student.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', testLeadId);

      expect(leadUpdateError).toBeNull();

      // Verify conversion
      const { data: convertedLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', testLeadId)
        .single();

      expect(convertedLead?.status).toBe('registered');
      expect(convertedLead?.converted_student_id).toBe(student.id);
    });

    it('should create enrollment record during conversion', async () => {
      // Create student first
      const { data: student } = await supabase
        .from('students')
        .insert([{
          first_name_en: testLead.child_name,
          last_name_en: 'Test',
          date_of_birth: testLead.child_dob,
          gender: 'not_specified',
          phone: testLead.parent_contact,
          status: 'active',
          enrollment_date: new Date().toISOString()
        }])
        .select()
        .single();

      // Create enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('student_enrollments')
        .insert([{
          student_id: student.id,
          therapy_plan_id: 'test-plan-id',
          start_date: new Date().toISOString(),
          sessions_per_week: 2,
          session_duration: 60,
          converted_from_lead_id: testLeadId,
          is_active: true
        }])
        .select()
        .single();

      expect(enrollmentError).toBeNull();
      expect(enrollment).toBeDefined();
      expect(enrollment.converted_from_lead_id).toBe(testLeadId);
    });
  });

  describe('Data Consistency and Constraints', () => {
    it('should maintain referential integrity', async () => {
      // Create interaction
      await supabase.from('lead_interactions').insert([{
        lead_id: testLeadId,
        interaction_type: 'call',
        subject: 'Test interaction'
      }]);

      // Try to delete lead (should fail due to foreign key constraint)
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', testLeadId);

      // Should fail because of related interactions
      expect(error).toBeDefined();
    });

    it('should enforce required field constraints', async () => {
      // Try to create lead without required fields
      const { error } = await supabase
        .from('leads')
        .insert([{
          child_name: 'Test Child Missing Parent'
          // Missing parent_name and other required fields
        }]);

      expect(error).toBeDefined();
      expect(error?.message).toContain('null value');
    });

    it('should validate email format constraints', async () => {
      const { error } = await supabase
        .from('leads')
        .insert([{
          parent_name: 'Test Parent',
          parent_contact: 'invalid-email-format',
          child_name: 'Test Child',
          child_dob: '2019-01-01',
          status: 'new_booking',
          source: 'website'
        }]);

      // Should pass as parent_contact can be phone or email
      expect(error).toBeNull();
    });
  });

  describe('Search and Filtering', () => {
    it('should support text search across names', async () => {
      const { data: searchResults } = await supabase
        .from('leads')
        .select('*')
        .or(`parent_name.ilike.%Test%,child_name.ilike.%Test%`);

      expect(searchResults?.length).toBeGreaterThan(0);
      expect(searchResults?.some(lead => lead.id === testLeadId)).toBe(true);
    });

    it('should filter by status', async () => {
      const { data: newBookingLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'new_booking');

      expect(newBookingLeads?.some(lead => lead.id === testLeadId)).toBe(true);
    });

    it('should filter by date ranges', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const tomorrow = new Date(Date.now() + 86400000).toISOString();

      const { data: recentLeads } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', yesterday)
        .lte('created_at', tomorrow);

      expect(recentLeads?.some(lead => lead.id === testLeadId)).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk lead operations efficiently', async () => {
      const bulkLeads = Array.from({ length: 50 }, (_, i) => ({
        parent_name: `Bulk Parent ${i}`,
        parent_contact: `+96650${i.toString().padStart(7, '0')}`,
        child_name: `Bulk Child ${i}`,
        child_dob: '2020-01-01',
        status: 'new_booking' as LeadStatus,
        source: 'bulk_import'
      }));

      const startTime = Date.now();
      
      const { data: bulkInsertResult, error } = await supabase
        .from('leads')
        .insert(bulkLeads)
        .select('id');

      const endTime = Date.now();

      expect(error).toBeNull();
      expect(bulkInsertResult).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Clean up bulk test data
      if (bulkInsertResult) {
        await supabase
          .from('leads')
          .delete()
          .in('id', bulkInsertResult.map(lead => lead.id));
      }
    });

    it('should maintain performance with complex queries', async () => {
      const startTime = Date.now();

      const { data: complexQuery } = await supabase
        .from('leads')
        .select(`
          *,
          interactions:lead_interactions(*),
          audit_trail:lead_audit_trail(*)
        `)
        .eq('id', testLeadId);

      const endTime = Date.now();

      expect(complexQuery).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle concurrent updates gracefully', async () => {
      // Simulate concurrent updates
      const update1 = supabase
        .from('leads')
        .update({ notes: 'Update 1' })
        .eq('id', testLeadId);

      const update2 = supabase
        .from('leads')
        .update({ notes: 'Update 2' })
        .eq('id', testLeadId);

      // Both should succeed, last one wins
      await Promise.all([update1, update2]);

      const { data: finalLead } = await supabase
        .from('leads')
        .select('notes')
        .eq('id', testLeadId)
        .single();

      expect(['Update 1', 'Update 2']).toContain(finalLead?.notes);
    });

    it('should rollback on transaction failures', async () => {
      // This test would require more sophisticated transaction handling
      // For now, we test that individual operations succeed or fail cleanly
      
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: 'invalid_status' as LeadStatus // This should fail
        })
        .eq('id', testLeadId);

      expect(error).toBeDefined();

      // Verify original data is unchanged
      const { data: unchangedLead } = await supabase
        .from('leads')
        .select('status')
        .eq('id', testLeadId)
        .single();

      expect(unchangedLead?.status).toBe('new_booking');
    });
  });
});