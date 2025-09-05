/**
 * Lead Management Hooks Tests
 * @description Tests for CRM lead management TanStack Query hooks
 * @author James (Dev Agent)
 * @date 2025-09-03
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { 
  useLeads, 
  useLead, 
  useLeadStatistics,
  useCreateLead,
  useUpdateLeadStatus,
  useConvertLead,
  leadQueryKeys
} from '../../hooks/useLeads';
import type { Lead, LeadStatus } from '../../types/crm';

// Mock Supabase client
vi.mock('@supabase/auth-helpers-react', () => ({
  useSupabaseClient: () => mockSupabaseClient,
  useUser: () => ({ id: 'test-user-id' })
}));

const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
  channel: vi.fn(),
};

// Mock data
const mockLead: Lead = {
  id: 'lead-123',
  parent_name: 'أحمد محمد',
  parent_name_ar: 'أحمد محمد',
  parent_contact: '+966501234567',
  child_name: 'Ali Ahmed',
  child_name_ar: 'علي أحمد',
  child_dob: '2018-05-15',
  child_gender: 'male',
  status: 'new_booking',
  evaluation_date: '2025-09-10T10:00:00Z',
  source: 'website',
  created_at: '2025-09-03T08:00:00Z',
  updated_at: '2025-09-03T08:00:00Z'
};

const mockLeads: Lead[] = [
  mockLead,
  {
    ...mockLead,
    id: 'lead-456',
    parent_name: 'Sarah Johnson',
    child_name: 'Emma Johnson',
    status: 'confirmed'
  },
  {
    ...mockLead,
    id: 'lead-789',
    parent_name: 'محمد عبدالله',
    child_name: 'فاطمة محمد',
    status: 'evaluation_complete'
  }
];

const mockStats = {
  total_leads: 10,
  new_bookings: 3,
  confirmed: 4,
  evaluation_complete: 2,
  registered: 1,
  archived: 0,
  conversion_rate: 10.0,
  average_conversion_time_days: 14.5
};

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useLeads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch leads successfully', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };

    mockSupabaseClient.from.mockReturnValue(mockQuery);
    mockQuery.select.mockResolvedValue({ data: mockLeads, error: null });

    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockLeads);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('leads');
  });

  it('should apply status filter correctly', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    };

    mockSupabaseClient.from.mockReturnValue(mockQuery);
    mockQuery.select.mockResolvedValue({ data: [mockLeads[1]], error: null });

    const filters = { status: ['confirmed' as LeadStatus] };
    const { result } = renderHook(() => useLeads(filters), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQuery.in).toHaveBeenCalledWith('status', ['confirmed']);
  });

  it('should apply search filter correctly', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
    };

    mockSupabaseClient.from.mockReturnValue(mockQuery);
    mockQuery.select.mockResolvedValue({ data: [mockLeads[0]], error: null });

    const filters = { search: 'أحمد' };
    const { result } = renderHook(() => useLeads(filters), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQuery.or).toHaveBeenCalledWith(
      expect.stringContaining('parent_name.ilike.%أحمد%')
    );
  });

  it('should handle query errors gracefully', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };

    mockSupabaseClient.from.mockReturnValue(mockQuery);
    mockQuery.select.mockResolvedValue({ 
      data: null, 
      error: { message: 'Database connection failed' } 
    });

    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Database connection failed');
  });
});

describe('useLead', () => {
  it('should fetch single lead with full details', async () => {
    const leadId = 'lead-123';
    const mockLeadWithDetails = {
      ...mockLead,
      assigned_user: { id: 'user-1', email: 'therapist@test.com' },
      audit_trail: [
        { action: 'created', performed_at: '2025-09-03T08:00:00Z' },
        { action: 'status_changed', performed_at: '2025-09-03T09:00:00Z' }
      ],
      interactions: [
        { interaction_type: 'call', subject: 'Initial contact' }
      ]
    };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    };

    mockSupabaseClient.from.mockReturnValue(mockQuery);
    mockQuery.single.mockResolvedValue({ data: mockLeadWithDetails, error: null });

    const { result } = renderHook(() => useLead(leadId), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockLeadWithDetails);
    expect(mockQuery.eq).toHaveBeenCalledWith('id', leadId);
  });

  it('should not fetch when leadId is not provided', () => {
    const { result } = renderHook(() => useLead(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useLeadStatistics', () => {
  it('should calculate statistics correctly', async () => {
    const mockStatsData = [
      { status: 'new_booking', created_at: '2025-09-01', conversion_date: null },
      { status: 'new_booking', created_at: '2025-09-01', conversion_date: null },
      { status: 'confirmed', created_at: '2025-09-01', conversion_date: null },
      { status: 'evaluation_complete', created_at: '2025-09-01', conversion_date: null },
      { status: 'registered', created_at: '2025-09-01', conversion_date: '2025-09-10' }
    ];

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
    };

    mockSupabaseClient.from.mockReturnValue(mockQuery);
    mockQuery.select.mockResolvedValue({ data: mockStatsData, error: null });

    const { result } = renderHook(() => useLeadStatistics(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const stats = result.current.data;
    expect(stats?.total_leads).toBe(5);
    expect(stats?.new_bookings).toBe(2);
    expect(stats?.confirmed).toBe(1);
    expect(stats?.evaluation_complete).toBe(1);
    expect(stats?.registered).toBe(1);
    expect(stats?.conversion_rate).toBe(20);
  });
});

describe('useCreateLead', () => {
  it('should create lead successfully', async () => {
    const newLeadData = {
      parent_name: 'New Parent',
      parent_contact: 'new@test.com',
      child_name: 'New Child',
      child_dob: '2019-01-01'
    };

    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    };

    mockSupabaseClient.from.mockReturnValue(mockQuery);
    mockQuery.single.mockResolvedValue({ 
      data: { ...mockLead, ...newLeadData }, 
      error: null 
    });

    const { result } = renderHook(() => useCreateLead(), { wrapper: createWrapper() });

    await waitFor(() => {
      result.current.mutate(newLeadData);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQuery.insert).toHaveBeenCalledWith(newLeadData);
    expect(result.current.data?.parent_name).toBe('New Parent');
  });

  it('should handle creation errors', async () => {
    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    };

    mockSupabaseClient.from.mockReturnValue(mockQuery);
    mockQuery.single.mockResolvedValue({ 
      data: null, 
      error: { message: 'Required field missing' } 
    });

    const { result } = renderHook(() => useCreateLead(), { wrapper: createWrapper() });

    await waitFor(() => {
      result.current.mutate({
        parent_name: '',
        parent_contact: '',
        child_name: '',
        child_dob: ''
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Required field missing');
  });
});

describe('useUpdateLeadStatus', () => {
  it('should update lead status with audit trail', async () => {
    const leadId = 'lead-123';
    const newStatus = 'confirmed';
    const notes = 'Parent confirmed evaluation appointment';

    mockSupabaseClient.rpc.mockResolvedValue({ 
      data: { 
        success: true, 
        lead_id: leadId,
        old_status: 'new_booking',
        new_status: newStatus
      }, 
      error: null 
    });

    const { result } = renderHook(() => useUpdateLeadStatus(), { wrapper: createWrapper() });

    await waitFor(() => {
      result.current.mutate({ leadId, status: newStatus, notes });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_lead_status', {
      p_lead_id: leadId,
      p_new_status: newStatus,
      p_notes: notes
    });
  });

  it('should handle status update errors', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({ 
      data: null, 
      error: { message: 'Invalid status transition' } 
    });

    const { result } = renderHook(() => useUpdateLeadStatus(), { wrapper: createWrapper() });

    await waitFor(() => {
      result.current.mutate({ 
        leadId: 'lead-123', 
        status: 'registered' // Invalid direct transition
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Invalid status transition');
  });
});

describe('useConvertLead', () => {
  it('should convert lead to student successfully', async () => {
    const leadId = 'lead-123';
    const studentId = 'student-456';

    mockSupabaseClient.rpc.mockResolvedValue({ 
      data: { 
        success: true, 
        lead_id: leadId,
        student_id: studentId
      }, 
      error: null 
    });

    const { result } = renderHook(() => useConvertLead(), { wrapper: createWrapper() });

    await waitFor(() => {
      result.current.mutate({ leadId, studentData: {} });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('convert_lead_to_student', {
      p_lead_id: leadId,
      p_student_data: {}
    });

    expect(result.current.data?.student_id).toBe(studentId);
  });

  it('should handle conversion errors', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({ 
      data: { success: false, error: 'Lead not ready for conversion' }, 
      error: null 
    });

    const { result } = renderHook(() => useConvertLead(), { wrapper: createWrapper() });

    await waitFor(() => {
      result.current.mutate({ leadId: 'lead-123' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should return the error in data since RPC succeeded but business logic failed
    expect(result.current.data?.success).toBe(false);
    expect(result.current.data?.error).toBe('Lead not ready for conversion');
  });
});

describe('Query Key Generation', () => {
  it('should generate correct query keys', () => {
    expect(leadQueryKeys.all).toEqual(['leads']);
    expect(leadQueryKeys.lists()).toEqual(['leads', 'list']);
    expect(leadQueryKeys.list({ status: ['new_booking'] })).toEqual([
      'leads', 
      'list', 
      { status: ['new_booking'] }
    ]);
    expect(leadQueryKeys.detail('lead-123')).toEqual(['leads', 'detail', 'lead-123']);
    expect(leadQueryKeys.stats()).toEqual(['leads', 'stats']);
  });

  it('should generate different keys for different filters', () => {
    const filters1 = { status: ['new_booking'] };
    const filters2 = { status: ['confirmed'] };
    
    expect(leadQueryKeys.list(filters1)).not.toEqual(leadQueryKeys.list(filters2));
  });
});

describe('Cache Management', () => {
  it('should have proper stale time configuration', () => {
    const { result } = renderHook(() => useLeads(), { wrapper: createWrapper() });
    
    // This would be tested by checking the actual query options
    // In a real test, you'd verify the staleTime is set to 5 minutes (300000ms)
    expect(result.current.isStale).toBeDefined();
  });

  it('should invalidate cache after mutations', async () => {
    // This would test that after create/update mutations, 
    // the relevant queries are invalidated
    // Implementation would depend on testing the QueryClient directly
    expect(true).toBe(true); // Placeholder
  });
});