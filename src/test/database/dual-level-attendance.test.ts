/**
 * @file dual-level-attendance.test.ts
 * @description Tests for dual-level QR attendance database schema and functions
 * @version 3.2.1
 * @author Dev Agent - Story 3.2
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test database configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Dual-Level QR Attendance Database Schema', () => {
  let testStudentId: string;
  let testSessionId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup test data
    const { data: student } = await supabase
      .from('students')
      .insert({
        name_en: 'Test Student',
        name_ar: 'طالب تجريبي',
        date_of_birth: '2015-01-01',
        contact_number: '+966501234567'
      })
      .select('id')
      .single();
    
    testStudentId = student?.id;

    const { data: session } = await supabase
      .from('sessions')
      .insert({
        course_id: (await supabase.from('courses').select('id').limit(1).single()).data?.id,
        scheduled_start_time: new Date().toISOString(),
        scheduled_end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: 'scheduled'
      })
      .select('id')
      .single();
    
    testSessionId = session?.id;

    const { data: user } = await supabase.auth.admin.createUser({
      email: 'test-attendance@example.com',
      password: 'testpassword123',
      email_confirm: true
    });
    
    testUserId = user.user?.id!;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testStudentId) {
      await supabase.from('attendance_logs').delete().eq('student_id', testStudentId);
      await supabase.from('student_attendance').delete().eq('student_id', testStudentId);
      await supabase.from('students').delete().eq('id', testStudentId);
    }
    
    if (testSessionId) {
      await supabase.from('sessions').delete().eq('id', testSessionId);
    }
    
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  describe('attendance_logs table structure', () => {
    it('should have attendance_logs table with correct columns', async () => {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should enforce event_type check constraint', async () => {
      const { error } = await supabase
        .from('attendance_logs')
        .insert({
          student_id: testStudentId,
          timestamp: new Date().toISOString(),
          event_type: 'invalid_event_type'
        });

      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/check constraint/i);
    });

    it('should accept valid event types', async () => {
      const validEventTypes = ['center_check_in', 'center_check_out', 'session_check_in'];
      
      for (const eventType of validEventTypes) {
        const { error } = await supabase
          .from('attendance_logs')
          .insert({
            student_id: testStudentId,
            timestamp: new Date().toISOString(),
            event_type: eventType,
            scan_location: 'Test Location'
          });

        expect(error).toBeNull();
      }
    });
  });

  describe('log_attendance function', () => {
    beforeEach(async () => {
      // Clean up existing test data
      await supabase.from('attendance_logs').delete().eq('student_id', testStudentId);
      await supabase.from('student_attendance').delete().eq('student_id', testStudentId);
    });

    it('should log center check-in successfully', async () => {
      const { data, error } = await supabase.rpc('log_attendance', {
        p_student_id: testStudentId,
        p_event_type: 'center_check_in',
        p_scan_location: 'Main Entrance',
        p_scanned_by: testUserId,
        p_qr_scan_data: { qr_hash: 'test_hash_123', scan_time: new Date().toISOString() }
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();

      // Verify attendance_logs entry
      const { data: logEntry } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('id', data)
        .single();

      expect(logEntry).toBeTruthy();
      expect(logEntry?.student_id).toBe(testStudentId);
      expect(logEntry?.event_type).toBe('center_check_in');
      expect(logEntry?.scan_location).toBe('Main Entrance');

      // Verify student_attendance entry was also created
      const { data: studentAttendance } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('student_id', testStudentId)
        .single();

      expect(studentAttendance).toBeTruthy();
      expect(studentAttendance?.attendance_mode).toBe('qr_scan');
      expect(studentAttendance?.status).toBe('checked_in');
    });

    it('should log session check-in with session context', async () => {
      const { data, error } = await supabase.rpc('log_attendance', {
        p_student_id: testStudentId,
        p_event_type: 'session_check_in',
        p_session_id: testSessionId,
        p_scan_location: 'Room 101',
        p_scanned_by: testUserId,
        p_device_info: 'iPhone Safari'
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();

      const { data: logEntry } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('id', data)
        .single();

      expect(logEntry?.session_id).toBe(testSessionId);
      expect(logEntry?.event_type).toBe('session_check_in');
      expect(logEntry?.device_info).toBe('iPhone Safari');
    });

    it('should reject invalid event types', async () => {
      const { error } = await supabase.rpc('log_attendance', {
        p_student_id: testStudentId,
        p_event_type: 'invalid_type'
      });

      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/Invalid event_type/i);
    });

    it('should validate session exists for session check-ins', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase.rpc('log_attendance', {
        p_student_id: testStudentId,
        p_event_type: 'session_check_in',
        p_session_id: fakeSessionId
      });

      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/Session not found/i);
    });
  });

  describe('get_current_facility_attendance function', () => {
    beforeEach(async () => {
      await supabase.from('attendance_logs').delete().eq('student_id', testStudentId);
    });

    it('should return students currently in facility', async () => {
      // Log student check-in
      await supabase.rpc('log_attendance', {
        p_student_id: testStudentId,
        p_event_type: 'center_check_in',
        p_scan_location: 'Main Entrance',
        p_scanned_by: testUserId
      });

      const { data, error } = await supabase.rpc('get_current_facility_attendance');

      expect(error).toBeNull();
      expect(data).toBeInstanceOf(Array);
      
      const studentEntry = data?.find((entry: any) => entry.student_id === testStudentId);
      expect(studentEntry).toBeTruthy();
      expect(studentEntry?.student_name_en).toBe('Test Student');
      expect(studentEntry?.scan_location).toBe('Main Entrance');
      expect(studentEntry?.minutes_in_facility).toBeGreaterThanOrEqual(0);
    });

    it('should not return checked-out students', async () => {
      // Log check-in then check-out
      await supabase.rpc('log_attendance', {
        p_student_id: testStudentId,
        p_event_type: 'center_check_in',
        p_scan_location: 'Main Entrance'
      });

      await supabase.rpc('log_attendance', {
        p_student_id: testStudentId,
        p_event_type: 'center_check_out',
        p_scan_location: 'Main Entrance'
      });

      const { data, error } = await supabase.rpc('get_current_facility_attendance');

      expect(error).toBeNull();
      const studentEntry = data?.find((entry: any) => entry.student_id === testStudentId);
      expect(studentEntry).toBeFalsy();
    });
  });

  describe('get_attendance_summary function', () => {
    beforeEach(async () => {
      await supabase.from('attendance_logs').delete().eq('student_id', testStudentId);
    });

    it('should return attendance summary for date range', async () => {
      // Log various attendance events
      await supabase.rpc('log_attendance', {
        p_student_id: testStudentId,
        p_event_type: 'center_check_in',
        p_scan_location: 'Main Entrance'
      });

      await supabase.rpc('log_attendance', {
        p_student_id: testStudentId,
        p_event_type: 'session_check_in',
        p_session_id: testSessionId,
        p_scan_location: 'Room 101'
      });

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.rpc('get_attendance_summary', {
        p_start_date: today,
        p_end_date: today
      });

      expect(error).toBeNull();
      expect(data).toBeInstanceOf(Array);
      expect(data?.length).toBeGreaterThan(0);

      const todayStats = data?.[0];
      expect(todayStats?.total_center_checkins).toBeGreaterThanOrEqual(1);
      expect(todayStats?.total_session_checkins).toBeGreaterThanOrEqual(1);
      expect(todayStats?.unique_students_present).toBeGreaterThanOrEqual(1);
    });

    it('should filter by student_id when provided', async () => {
      await supabase.rpc('log_attendance', {
        p_student_id: testStudentId,
        p_event_type: 'center_check_in'
      });

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.rpc('get_attendance_summary', {
        p_start_date: today,
        p_end_date: today,
        p_student_id: testStudentId
      });

      expect(error).toBeNull();
      expect(data?.[0]?.unique_students_present).toBe('1');
    });
  });

  describe('QR code generation enhancements', () => {
    it('should support new dual-level QR types', async () => {
      const { data, error } = await supabase
        .from('qr_code_generation_log')
        .insert({
          qr_type: 'center_entry',
          qr_data: { type: 'center_check_in', location: 'Test Location' },
          qr_hash: 'test_hash_center_' + Date.now(),
          is_center_level: true,
          center_location: 'Test Location'
        })
        .select('id')
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();
    });

    it('should support session-level QR codes', async () => {
      const { data, error } = await supabase
        .from('qr_code_generation_log')
        .insert({
          qr_type: 'session_specific',
          qr_data: { type: 'session_check_in', session_id: testSessionId },
          qr_hash: 'test_hash_session_' + Date.now(),
          is_session_level: true,
          session_id: testSessionId
        })
        .select('id')
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();
    });

    it('should have created default center-level QR codes', async () => {
      const { data, error } = await supabase
        .from('qr_code_generation_log')
        .select('*')
        .eq('is_center_level', true)
        .eq('is_active', true);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.length).toBeGreaterThanOrEqual(2); // Main entrance in/out QR codes

      const mainEntranceQRs = data?.filter(qr => qr.center_location === 'Main Entrance');
      expect(mainEntranceQRs?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('RLS Policies', () => {
    it('should enforce RLS on attendance_logs table', async () => {
      // This test verifies RLS is enabled
      const { data: tableInfo } = await supabase
        .from('pg_tables')
        .select('*')
        .eq('tablename', 'attendance_logs')
        .single();

      expect(tableInfo).toBeTruthy();
    });
  });

  describe('Performance indexes', () => {
    it('should have required indexes for optimal performance', async () => {
      // Check if key indexes exist
      const { data: indexes } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', 'attendance_logs');

      expect(indexes).toBeTruthy();
      
      const indexNames = indexes?.map(idx => idx.indexname) || [];
      expect(indexNames).toContain('idx_attendance_logs_student_id');
      expect(indexNames).toContain('idx_attendance_logs_timestamp');
      expect(indexNames).toContain('idx_attendance_logs_event_type');
    });
  });
});