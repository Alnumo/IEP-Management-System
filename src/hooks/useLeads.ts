/**
 * Lead Management Hooks
 * @description TanStack Query hooks for CRM lead management operations
 * @author James (Dev Agent)
 * @date 2025-09-03
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { supabase } from '../lib/supabase';
import type { 
  Lead, 
  LeadStatus, 
  LeadFilterOptions, 
  LeadStatistics,
  CreateLeadInput,
  UpdateLeadInput,
  UpdateLeadStatusInput,
  AssignLeadInput,
  ConvertLeadInput,
  CreateInteractionInput
} from '../types/crm';

// Query keys for cache management
export const leadQueryKeys = {
  all: ['leads'] as const,
  lists: () => [...leadQueryKeys.all, 'list'] as const,
  list: (filters: LeadFilterOptions) => [...leadQueryKeys.lists(), filters] as const,
  details: () => [...leadQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadQueryKeys.details(), id] as const,
  stats: () => [...leadQueryKeys.all, 'stats'] as const,
  interactions: (leadId: string) => [...leadQueryKeys.all, 'interactions', leadId] as const,
};

/**
 * Hook to fetch leads with filtering and real-time updates
 */
export function useLeads(filters: LeadFilterOptions = {}) {
  const supabaseClient = useSupabaseClient();

  return useQuery({
    queryKey: leadQueryKeys.list(filters),
    queryFn: async () => {
      let query = supabaseClient
        .from('leads')
        .select(`
          *,
          assigned_user:assigned_to(id, email, raw_user_meta_data),
          interactions:lead_interactions(count)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters.source?.length) {
        query = query.in('source', filters.source);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.search) {
        query = query.or(`parent_name.ilike.%${filters.search}%,child_name.ilike.%${filters.search}%,parent_contact.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Lead[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch a single lead with full details
 */
export function useLead(leadId: string) {
  const supabaseClient = useSupabaseClient();

  return useQuery({
    queryKey: leadQueryKeys.detail(leadId),
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('leads')
        .select(`
          *,
          assigned_user:assigned_to(id, email, raw_user_meta_data),
          audit_trail:lead_audit_trail(*),
          interactions:lead_interactions(*)
        `)
        .eq('id', leadId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as Lead;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!leadId,
  });
}

/**
 * Hook to fetch lead statistics for dashboard
 */
export function useLeadStatistics() {
  const supabaseClient = useSupabaseClient();

  return useQuery({
    queryKey: leadQueryKeys.stats(),
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('leads')
        .select('status, created_at, conversion_date')
        .is('deleted_at', null);

      if (error) throw error;

      const statusCounts = data.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<LeadStatus, number>);

      const totalLeads = data.length;
      const registered = statusCounts.registered || 0;
      const conversionRate = totalLeads > 0 ? (registered / totalLeads) * 100 : 0;

      // Calculate average conversion time
      const convertedLeads = data.filter(lead => lead.conversion_date && lead.created_at);
      const avgConversionTime = convertedLeads.length > 0 
        ? convertedLeads.reduce((sum, lead) => {
            const created = new Date(lead.created_at);
            const converted = new Date(lead.conversion_date!);
            return sum + (converted.getTime() - created.getTime());
          }, 0) / convertedLeads.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      return {
        total_leads: totalLeads,
        new_bookings: statusCounts.new_booking || 0,
        confirmed: statusCounts.confirmed || 0,
        evaluation_complete: statusCounts.evaluation_complete || 0,
        registered,
        archived: statusCounts.archived || 0,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        average_conversion_time_days: Math.round(avgConversionTime * 10) / 10,
      } as LeadStatistics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new lead
 */
export function useCreateLead() {
  const queryClient = useQueryClient();
  const supabaseClient = useSupabaseClient();

  return useMutation({
    mutationFn: async (leadData: CreateLeadInput) => {
      const { data, error } = await supabaseClient
        .from('leads')
        .insert(leadData)
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => {
      // Invalidate and refetch lead lists and stats
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.stats() });
    },
  });
}

/**
 * Hook to update lead details
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();
  const supabaseClient = useSupabaseClient();

  return useMutation({
    mutationFn: async ({ leadId, updates }: { leadId: string; updates: UpdateLeadInput }) => {
      const { data, error } = await supabaseClient
        .from('leads')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: (data) => {
      // Update specific lead in cache
      queryClient.setQueryData(leadQueryKeys.detail(data.id), data);
      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.lists() });
    },
  });
}

/**
 * Hook to update lead status with audit trail
 */
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  const supabaseClient = useSupabaseClient();

  return useMutation({
    mutationFn: async ({ leadId, status, notes }: { leadId: string; status: LeadStatus; notes?: string }) => {
      const { data, error } = await supabaseClient
        .rpc('update_lead_status', {
          p_lead_id: leadId,
          p_new_status: status,
          p_notes: notes
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { leadId }) => {
      // Invalidate lead detail to refetch with updated status and audit trail
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.detail(leadId) });
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.stats() });
    },
  });
}

/**
 * Hook to assign lead to a user
 */
export function useAssignLead() {
  const queryClient = useQueryClient();
  const supabaseClient = useSupabaseClient();

  return useMutation({
    mutationFn: async ({ leadId, userId, notes }: { leadId: string; userId: string; notes?: string }) => {
      const { data, error } = await supabaseClient
        .rpc('assign_lead', {
          p_lead_id: leadId,
          p_user_id: userId,
          p_notes: notes
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.detail(leadId) });
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.lists() });
    },
  });
}

/**
 * Hook to convert lead to student
 */
export function useConvertLead() {
  const queryClient = useQueryClient();
  const supabaseClient = useSupabaseClient();

  return useMutation({
    mutationFn: async ({ leadId, studentData }: { leadId: string; studentData?: Record<string, any> }) => {
      const { data, error } = await supabaseClient
        .rpc('convert_lead_to_student', {
          p_lead_id: leadId,
          p_student_data: studentData || {}
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.detail(leadId) });
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.stats() });
    },
  });
}

/**
 * Hook to create lead interaction
 */
export function useCreateInteraction() {
  const queryClient = useQueryClient();
  const supabaseClient = useSupabaseClient();

  return useMutation({
    mutationFn: async (interactionData: CreateInteractionInput) => {
      const { data, error } = await supabaseClient
        .from('lead_interactions')
        .insert(interactionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate lead details to refresh interactions
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.detail(data.lead_id) });
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.interactions(data.lead_id) });
    },
  });
}

/**
 * Hook to set up real-time subscriptions for leads
 */
export function useLeadsRealtimeSubscription(filters: LeadFilterOptions = {}) {
  const queryClient = useQueryClient();
  const supabaseClient = useSupabaseClient();

  React.useEffect(() => {
    const channel = supabaseClient
      .channel('leads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('Lead change detected:', payload);

          // Invalidate relevant queries based on change type
          if (payload.eventType === 'INSERT') {
            queryClient.invalidateQueries({ queryKey: leadQueryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: leadQueryKeys.stats() });
          } else if (payload.eventType === 'UPDATE') {
            const leadId = payload.new?.id || payload.old?.id;
            if (leadId) {
              queryClient.invalidateQueries({ queryKey: leadQueryKeys.detail(leadId) });
            }
            queryClient.invalidateQueries({ queryKey: leadQueryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: leadQueryKeys.stats() });
          } else if (payload.eventType === 'DELETE') {
            queryClient.invalidateQueries({ queryKey: leadQueryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: leadQueryKeys.stats() });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient, supabaseClient]);
}

/**
 * Hook to export leads data
 */
export function useExportLeads() {
  const supabaseClient = useSupabaseClient();

  return useMutation({
    mutationFn: async (filters: LeadFilterOptions = {}) => {
      let query = supabaseClient
        .from('leads')
        .select(`
          id,
          parent_name,
          parent_contact,
          child_name,
          child_dob,
          status,
          evaluation_date,
          source,
          assigned_to,
          created_at,
          conversion_date
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters (same as useLeads)
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters.source?.length) {
        query = query.in('source', filters.source);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.search) {
        query = query.or(`parent_name.ilike.%${filters.search}%,child_name.ilike.%${filters.search}%,parent_contact.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    },
  });
}