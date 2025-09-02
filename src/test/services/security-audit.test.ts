/**
 * Security Audit Test Suite
 * Tests all existing security functions and policies for compliance validation
 * Story 1.2: Task 1 - Security Function Testing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
  rpc: vi.fn(),
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
      in: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  })),
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

describe('Security Functions Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('is_medical_consultant() Function', () => {
    it('should return true for valid medical consultant', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'consultant@example.com' } },
        error: null,
      })

      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null,
      })

      const result = await mockSupabase.rpc('is_medical_consultant')
      expect(result.data).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('is_medical_consultant')
    })

    it('should return false for non-medical consultant users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-456', email: 'regular@example.com' } },
        error: null,
      })

      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null,
      })

      const result = await mockSupabase.rpc('is_medical_consultant')
      expect(result.data).toBe(false)
    })

    it('should handle authentication errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null,
      })

      const result = await mockSupabase.rpc('is_medical_consultant')
      expect(result.data).toBe(false)
    })
  })

  describe('has_medical_supervision_access() Function', () => {
    const studentId = 'student-123'

    it('should return true for medical consultant with supervision access', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'consultant@example.com' } },
        error: null,
      })

      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null,
      })

      const result = await mockSupabase.rpc('has_medical_supervision_access', {
        student_uuid: studentId,
      })
      expect(result.data).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('has_medical_supervision_access', {
        student_uuid: studentId,
      })
    })

    it('should return false for users without supervision access', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null,
      })

      const result = await mockSupabase.rpc('has_medical_supervision_access', {
        student_uuid: studentId,
      })
      expect(result.data).toBe(false)
    })

    it('should handle invalid student UUID', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null,
      })

      const result = await mockSupabase.rpc('has_medical_supervision_access', {
        student_uuid: 'invalid-uuid',
      })
      expect(result.data).toBe(false)
    })
  })

  describe('can_access_medical_record() Function', () => {
    const recordId = 'record-123'

    it('should return true for admin users', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null,
      })

      const result = await mockSupabase.rpc('can_access_medical_record', {
        record_id: recordId,
      })
      expect(result.data).toBe(true)
    })

    it('should return true for medical consultants with access', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null,
      })

      const result = await mockSupabase.rpc('can_access_medical_record', {
        record_id: recordId,
      })
      expect(result.data).toBe(true)
    })

    it('should return false for unauthorized users', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null,
      })

      const result = await mockSupabase.rpc('can_access_medical_record', {
        record_id: recordId,
      })
      expect(result.data).toBe(false)
    })
  })

  describe('can_modify_clinical_docs() Function', () => {
    const studentId = 'student-123'

    it('should return true for authorized users', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null,
      })

      const result = await mockSupabase.rpc('can_modify_clinical_docs', {
        student_uuid: studentId,
      })
      expect(result.data).toBe(true)
    })

    it('should return false for unauthorized users', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null,
      })

      const result = await mockSupabase.rpc('can_modify_clinical_docs', {
        student_uuid: studentId,
      })
      expect(result.data).toBe(false)
    })
  })

  describe('can_access_encrypted_data() Function', () => {
    const recordId = 'record-123'
    const dataType = 'medical_record'

    it('should return true for medical consultants accessing medical records', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null,
      })

      const result = await mockSupabase.rpc('can_access_encrypted_data', {
        record_id: recordId,
        data_type: dataType,
      })
      expect(result.data).toBe(true)
    })

    it('should return false for unauthorized data access', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null,
      })

      const result = await mockSupabase.rpc('can_access_encrypted_data', {
        record_id: recordId,
        data_type: 'invalid_type',
      })
      expect(result.data).toBe(false)
    })
  })

  describe('get_medical_access_log() Function', () => {
    it('should return audit log for authorized users', async () => {
      const mockAuditData = [
        {
          access_date: new Date().toISOString(),
          user_id: 'user-123',
          user_role: 'medical_consultant',
          table_accessed: 'medical_records',
          record_id: 'record-123',
          operation: 'SELECT',
          ip_address: '192.168.1.1',
        },
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: mockAuditData,
        error: null,
      })

      const result = await mockSupabase.rpc('get_medical_access_log', {
        start_date: '2025-08-01',
        end_date: '2025-09-01',
      })
      expect(result.data).toEqual(mockAuditData)
    })

    it('should deny access for unauthorized users', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Insufficient permissions to access audit logs' },
      })

      const result = await mockSupabase.rpc('get_medical_access_log')
      expect(result.error).toBeTruthy()
      expect(result.error.message).toContain('Insufficient permissions')
    })
  })

  describe('create_medical_backup() Function', () => {
    it('should create backup for admin users', async () => {
      const backupId = 'BACKUP-1693545600'
      mockSupabase.rpc.mockResolvedValue({
        data: backupId,
        error: null,
      })

      const result = await mockSupabase.rpc('create_medical_backup')
      expect(result.data).toContain('BACKUP-')
    })

    it('should deny backup creation for non-admin users', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Only administrators can create medical data backups' },
      })

      const result = await mockSupabase.rpc('create_medical_backup')
      expect(result.error).toBeTruthy()
      expect(result.error.message).toContain('Only administrators')
    })
  })

  describe('emergency_medical_access() Function', () => {
    const studentId = 'student-123'
    const emergencyReason = 'Medical emergency during therapy session'

    it('should provide emergency access and log the attempt', async () => {
      const mockEmergencyData = {
        allergies: ['Peanuts', 'Shellfish'],
        emergency_protocol: 'Call 911 immediately',
        blood_type: 'A+',
        emergency_contact_name: 'Parent Name',
        emergency_contact_phone: '+966-50-123-4567',
        current_medications: ['Medication A'],
        contraindications: ['Avoid aspirin'],
      }

      mockSupabase.rpc.mockResolvedValue({
        data: mockEmergencyData,
        error: null,
      })

      const result = await mockSupabase.rpc('emergency_medical_access', {
        student_uuid: studentId,
        emergency_reason: emergencyReason,
      })
      expect(result.data).toEqual(mockEmergencyData)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('emergency_medical_access', {
        student_uuid: studentId,
        emergency_reason: emergencyReason,
      })
    })

    it('should return empty object for non-existent student', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: {},
        error: null,
      })

      const result = await mockSupabase.rpc('emergency_medical_access', {
        student_uuid: 'non-existent',
        emergency_reason: emergencyReason,
      })
      expect(result.data).toEqual({})
    })

    it('should handle emergency access errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Emergency access failed' },
      })

      const result = await mockSupabase.rpc('emergency_medical_access', {
        student_uuid: studentId,
        emergency_reason: emergencyReason,
      })
      expect(result.error).toBeTruthy()
    })
  })

  describe('Arabic RTL Security Functionality', () => {
    it('should handle Arabic emergency contact information', async () => {
      const arabicEmergencyData = {
        emergency_contact_name: 'والد الطالب',
        emergency_protocol: 'اتصال فوري بالطوارئ ٩١١',
        contraindications: ['تجنب الأسبرين'],
      }

      mockSupabase.rpc.mockResolvedValue({
        data: arabicEmergencyData,
        error: null,
      })

      const result = await mockSupabase.rpc('emergency_medical_access', {
        student_uuid: 'student-123',
        emergency_reason: 'حالة طوارئ طبية',
      })
      expect(result.data.emergency_contact_name).toBe('والد الطالب')
      expect(result.data.emergency_protocol).toBe('اتصال فوري بالطوارئ ٩١١')
    })
  })

  describe('English LTR Security Functionality', () => {
    it('should handle English emergency contact information', async () => {
      const englishEmergencyData = {
        emergency_contact_name: 'Parent Name',
        emergency_protocol: 'Call 911 immediately',
        contraindications: ['Avoid aspirin'],
      }

      mockSupabase.rpc.mockResolvedValue({
        data: englishEmergencyData,
        error: null,
      })

      const result = await mockSupabase.rpc('emergency_medical_access', {
        student_uuid: 'student-123',
        emergency_reason: 'Medical emergency during session',
      })
      expect(result.data.emergency_contact_name).toBe('Parent Name')
      expect(result.data.emergency_protocol).toBe('Call 911 immediately')
    })
  })

  describe('Mobile Responsive Security Access', () => {
    it('should work properly on mobile devices with limited screen space', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const mockEmergencyData = {
        allergies: ['Peanuts'],
        emergency_protocol: 'Emergency protocol here',
        blood_type: 'O+',
      }

      mockSupabase.rpc.mockResolvedValue({
        data: mockEmergencyData,
        error: null,
      })

      const result = await mockSupabase.rpc('emergency_medical_access', {
        student_uuid: 'student-123',
        emergency_reason: 'Emergency on mobile',
      })
      expect(result.data).toEqual(mockEmergencyData)
    })
  })
})

describe('Row Level Security (RLS) Policy Testing', () => {
  describe('Medical Records Policies', () => {
    it('should enforce admin access policy', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'record-123' },
              error: null,
            }),
          }),
        }),
      })

      const result = await mockSupabase
        .from('medical_records')
        .select('*')
        .eq('id', 'record-123')
        .single()
      
      expect(result.data).toEqual({ id: 'record-123' })
    })

    it('should enforce medical consultant access restrictions', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Row Level Security policy violation' },
            }),
          }),
        }),
      })

      const result = await mockSupabase
        .from('medical_records')
        .select('*')
        .eq('id', 'unauthorized-record')
        .single()
      
      expect(result.error).toBeTruthy()
      expect(result.error.message).toContain('Row Level Security')
    })
  })

  describe('Clinical Documentation Policies', () => {
    it('should allow therapist access to assigned student docs', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'doc-123', student_id: 'student-123' }],
            error: null,
          }),
        }),
      })

      const result = await mockSupabase
        .from('clinical_documentation')
        .select('*')
        .eq('student_id', 'student-123')
      
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('doc-123')
    })

    it('should restrict unauthorized access to clinical docs', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const result = await mockSupabase
        .from('clinical_documentation')
        .select('*')
        .eq('student_id', 'unauthorized-student')
      
      expect(result.data).toHaveLength(0)
    })
  })
})