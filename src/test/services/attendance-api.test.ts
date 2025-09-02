import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  StudentAttendanceAPI, 
  QRCodeAPI, 
  NotificationAPI, 
  RealtimeAttendanceAPI,
  type StudentAttendance,
  type CreateStudentAttendanceData,
  type UpdateStudentAttendanceData,
  type AttendanceStats,
  type QRCodeLog,
  type AttendanceNotification
} from '@/services/attendance-api'

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockSupabaseQuery = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    filter: vi.fn().mockReturnThis(),
    channel: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn()
  }

  return {
    supabase: {
      from: vi.fn(() => mockSupabaseQuery),
      auth: {
        getUser: vi.fn()
      },
      channel: vi.fn(() => mockSupabaseQuery)
    }
  }
})

// Mock crypto.subtle for QR hash generation
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  }
})

// Mock TextEncoder
global.TextEncoder = class {
  encode(input: string) {
    return new Uint8Array(Buffer.from(input, 'utf8'))
  }
}

describe('StudentAttendanceAPI', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  const mockStudentAttendance: StudentAttendance = {
    id: 'attendance-123',
    student_id: 'student-123',
    session_id: 'session-123',
    course_id: 'course-123',
    enrollment_id: 'enrollment-123',
    check_in_time: '2024-01-15T09:00:00Z',
    check_out_time: '2024-01-15T10:00:00Z',
    duration_minutes: 60,
    room_number: 'R101',
    session_type: 'speech_therapy',
    attendance_mode: 'qr_scan',
    status: 'checked_out',
    qr_scan_data: { device: 'tablet-01' },
    qr_scan_device: 'tablet-01',
    qr_scan_location: 'lobby',
    checked_in_by: 'user-123',
    checked_out_by: 'user-123',
    therapist_id: 'therapist-123',
    notes: 'Regular session',
    is_late: false,
    late_minutes: 0,
    early_departure: false,
    early_departure_minutes: 0,
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    student_name: 'أحمد محمد',
    therapist_name: 'د. سارة أحمد'
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mocked supabase instance
    const { supabase } = await import('@/lib/supabase')
    
    // Set up auth mock
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAttendanceRecords', () => {
    it('should fetch attendance records without filters', async () => {
      const mockData = [
        { ...mockStudentAttendance, students: { name: 'أحمد محمد' }, therapists: { name: 'د. سارة أحمد' } }
      ]

      mockSupabaseQuery.single = vi.fn()
      mockSupabase.from.mockReturnValue({
        ...mockSupabaseQuery,
        select: vi.fn().mockResolvedValue({ data: mockData, error: null })
      })

      const result = await StudentAttendanceAPI.getAttendanceRecords()

      expect(mockSupabase.from).toHaveBeenCalledWith('student_attendance')
      expect(result).toHaveLength(1)
      expect(result[0].student_name).toBe('أحمد محمد')
      expect(result[0].therapist_name).toBe('د. سارة أحمد')
    })

    it('should apply filters correctly', async () => {
      const mockData = [mockStudentAttendance]
      const mockQuery = {
        ...mockSupabaseQuery,
        select: vi.fn().mockResolvedValue({ data: mockData, error: null })
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      const filters = {
        studentId: 'student-123',
        date: '2024-01-15',
        status: 'checked_in',
        sessionType: 'speech_therapy',
        therapistId: 'therapist-123',
        roomNumber: 'R101',
        limit: 10,
        offset: 0
      }

      await StudentAttendanceAPI.getAttendanceRecords(filters)

      expect(mockQuery.eq).toHaveBeenCalledWith('student_id', 'student-123')
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'checked_in')
      expect(mockQuery.eq).toHaveBeenCalledWith('session_type', 'speech_therapy')
      expect(mockQuery.eq).toHaveBeenCalledWith('therapist_id', 'therapist-123')
      expect(mockQuery.eq).toHaveBeenCalledWith('room_number', 'R101')
      expect(mockQuery.gte).toHaveBeenCalledWith('check_in_time', '2024-01-15T00:00:00.000Z')
      expect(mockQuery.lt).toHaveBeenCalledWith('check_in_time', '2024-01-15T23:59:59.999Z')
      expect(mockQuery.limit).toHaveBeenCalledWith(10)
      expect(mockQuery.range).toHaveBeenCalledWith(0, 9)
    })

    it('should handle database errors', async () => {
      const mockError = new Error('Database connection failed')
      const mockQuery = {
        ...mockSupabaseQuery,
        select: vi.fn().mockResolvedValue({ data: null, error: mockError })
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      await expect(StudentAttendanceAPI.getAttendanceRecords()).rejects.toThrow(
        'Failed to fetch attendance records: Database connection failed'
      )
    })
  })

  describe('getTodaysAttendance', () => {
    it('should fetch attendance records for today', async () => {
      const today = new Date().toISOString().split('T')[0]
      const mockData = [mockStudentAttendance]
      const mockQuery = {
        ...mockSupabaseQuery,
        select: vi.fn().mockResolvedValue({ data: mockData, error: null })
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await StudentAttendanceAPI.getTodaysAttendance()

      expect(mockQuery.gte).toHaveBeenCalledWith('check_in_time', `${today}T00:00:00.000Z`)
      expect(mockQuery.lt).toHaveBeenCalledWith('check_in_time', `${today}T23:59:59.999Z`)
      expect(result).toHaveLength(1)
    })
  })

  describe('getRealtimeAttendance', () => {
    it('should fetch limited recent attendance records', async () => {
      const mockData = [mockStudentAttendance]
      const mockQuery = {
        ...mockSupabaseQuery,
        select: vi.fn().mockResolvedValue({ data: mockData, error: null })
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await StudentAttendanceAPI.getRealtimeAttendance()

      expect(mockQuery.limit).toHaveBeenCalledWith(10)
      expect(result).toHaveLength(1)
    })
  })

  describe('checkInStudent', () => {
    const checkInData: CreateStudentAttendanceData = {
      student_id: 'student-123',
      session_id: 'session-123',
      course_id: 'course-123',
      enrollment_id: 'enrollment-123',
      room_number: 'R101',
      session_type: 'speech_therapy',
      attendance_mode: 'qr_scan',
      qr_scan_data: { device: 'tablet-01' },
      qr_scan_device: 'tablet-01',
      qr_scan_location: 'lobby',
      therapist_id: 'therapist-123',
      notes: 'Regular session'
    }

    it('should successfully check in a student', async () => {
      // Mock no existing record
      const mockExistingQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }

      // Mock successful insert
      const mockInsertQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ 
          data: { 
            ...mockStudentAttendance, 
            status: 'checked_in',
            students: { name: 'أحمد محمد' },
            therapists: { name: 'د. سارة أحمد' }
          }, 
          error: null 
        })
      }

      mockSupabase.from
        .mockReturnValueOnce(mockExistingQuery)  // Check existing
        .mockReturnValueOnce(mockInsertQuery)   // Insert new

      const result = await StudentAttendanceAPI.checkInStudent(checkInData)

      expect(result.status).toBe('checked_in')
      expect(result.student_name).toBe('أحمد محمد')
      expect(mockSupabase.from).toHaveBeenCalledWith('student_attendance')
    })

    it('should prevent duplicate check-ins', async () => {
      const mockExistingQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ 
          data: { ...mockStudentAttendance, status: 'checked_in' }, 
          error: null 
        })
      }

      mockSupabase.from.mockReturnValue(mockExistingQuery)

      await expect(StudentAttendanceAPI.checkInStudent(checkInData)).rejects.toThrow(
        'Student is already checked in'
      )
    })

    it('should handle check-in errors', async () => {
      // Mock no existing record
      const mockExistingQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }

      // Mock insert error
      const mockInsertQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: new Error('Insert failed') 
        })
      }

      mockSupabase.from
        .mockReturnValueOnce(mockExistingQuery)
        .mockReturnValueOnce(mockInsertQuery)

      await expect(StudentAttendanceAPI.checkInStudent(checkInData)).rejects.toThrow(
        'Failed to check in student: Insert failed'
      )
    })
  })

  describe('checkOutStudent', () => {
    it('should successfully check out a student', async () => {
      const mockQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ 
          data: { 
            ...mockStudentAttendance, 
            status: 'checked_out',
            students: { name: 'أحمد محمد' },
            therapists: { name: 'د. سارة أحمد' }
          }, 
          error: null 
        })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await StudentAttendanceAPI.checkOutStudent('attendance-123', 'Session completed')

      expect(result.status).toBe('checked_out')
      expect(mockQuery.update).toHaveBeenCalledWith({
        check_out_time: expect.any(String),
        status: 'checked_out',
        checked_out_by: 'user-123',
        notes: 'Session completed'
      })
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'attendance-123')
    })

    it('should handle check-out errors', async () => {
      const mockQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: new Error('Update failed') 
        })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      await expect(StudentAttendanceAPI.checkOutStudent('attendance-123')).rejects.toThrow(
        'Failed to check out student: Update failed'
      )
    })
  })

  describe('startSession', () => {
    it('should successfully start a session', async () => {
      const mockQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ 
          data: { 
            ...mockStudentAttendance, 
            status: 'in_session',
            students: { name: 'أحمد محمد' },
            therapists: { name: 'د. سارة أحمد' }
          }, 
          error: null 
        })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await StudentAttendanceAPI.startSession('attendance-123', 'session-456', 'therapist-789')

      expect(result.status).toBe('in_session')
      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'in_session',
        session_id: 'session-456',
        therapist_id: 'therapist-789'
      })
    })

    it('should handle optional parameters', async () => {
      const mockQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ 
          data: { ...mockStudentAttendance, status: 'in_session' }, 
          error: null 
        })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      await StudentAttendanceAPI.startSession('attendance-123')

      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'in_session'
      })
    })
  })

  describe('updateAttendance', () => {
    it('should successfully update attendance record', async () => {
      const updateData: UpdateStudentAttendanceData = {
        id: 'attendance-123',
        status: 'checked_out',
        room_number: 'R102',
        notes: 'Updated notes'
      }

      const mockQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ 
          data: { 
            ...mockStudentAttendance,
            ...updateData,
            students: { name: 'أحمد محمد' },
            therapists: { name: 'د. سارة أحمد' }
          }, 
          error: null 
        })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await StudentAttendanceAPI.updateAttendance(updateData)

      expect(result.status).toBe('checked_out')
      expect(result.room_number).toBe('R102')
      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'checked_out',
        room_number: 'R102',
        notes: 'Updated notes'
      })
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'attendance-123')
    })
  })

  describe('getTodaysStats', () => {
    it('should calculate attendance statistics correctly', async () => {
      const today = new Date().toISOString().split('T')[0]
      
      // Mock attendance records
      const attendanceRecords = [
        { ...mockStudentAttendance, status: 'checked_in', is_late: true, duration_minutes: 45 },
        { ...mockStudentAttendance, status: 'in_session', early_departure: true, duration_minutes: 55 },
        { ...mockStudentAttendance, status: 'checked_out', duration_minutes: 60 }
      ]

      // Mock therapist records
      const therapistRecords = [
        { id: 'therapist-1', status: 'checked_in' },
        { id: 'therapist-2', status: 'in_session' }
      ]

      // Mock room records
      const roomRecords = [
        { id: 'room-1', status: 'occupied' },
        { id: 'room-2', status: 'occupied' }
      ]

      // Mock enrollment count
      const enrollmentCount = 50

      mockSupabase.from
        .mockImplementationOnce(() => ({ // student_attendance
          select: vi.fn().mockResolvedValue({ data: attendanceRecords, error: null })
        }))
        .mockImplementationOnce(() => ({ // therapist_attendance
          select: vi.fn().mockResolvedValue({ data: therapistRecords, error: null })
        }))
        .mockImplementationOnce(() => ({ // room_utilization
          select: vi.fn().mockResolvedValue({ data: roomRecords, error: null })
        }))
        .mockImplementationOnce(() => ({ // enrollments count
          select: vi.fn().mockResolvedValue({ count: enrollmentCount, error: null })
        }))

      const result = await StudentAttendanceAPI.getTodaysStats()

      const expectedStats: AttendanceStats = {
        totalStudents: 50,
        presentStudents: 3, // All 3 records are not 'absent'
        inSession: 1, // 1 record with status 'in_session'
        checkedOut: 1, // 1 record with status 'checked_out'
        attendanceRate: Math.round((3 / 50) * 100), // 6%
        activeTherapists: 2,
        occupiedRooms: 2,
        avgSessionDuration: Math.round((45 + 55 + 60) / 3), // 53 minutes
        lateArrivals: 1,
        earlyDepartures: 1
      }

      expect(result).toEqual(expectedStats)
    })

    it('should handle missing data gracefully', async () => {
      mockSupabase.from
        .mockImplementationOnce(() => ({ // student_attendance
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
        .mockImplementationOnce(() => ({ // therapist_attendance
          select: vi.fn().mockResolvedValue({ data: null, error: new Error('No data') })
        }))
        .mockImplementationOnce(() => ({ // room_utilization
          select: vi.fn().mockResolvedValue({ data: null, error: new Error('No data') })
        }))
        .mockImplementationOnce(() => ({ // enrollments count
          select: vi.fn().mockResolvedValue({ count: null, error: new Error('No data') })
        }))

      const result = await StudentAttendanceAPI.getTodaysStats()

      expect(result.totalStudents).toBe(0)
      expect(result.presentStudents).toBe(0)
      expect(result.activeTherapists).toBe(0)
      expect(result.occupiedRooms).toBe(0)
      expect(result.avgSessionDuration).toBe(0)
    })
  })
})

describe('QRCodeAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } }
    })

    // Mock crypto.subtle.digest to return a consistent hash
    const mockHash = new Uint8Array(32).fill(65) // All 'A's in hex
    Object.defineProperty(global.crypto.subtle, 'digest', {
      value: vi.fn().mockResolvedValue(mockHash.buffer)
    })
  })

  describe('generateQRCode', () => {
    it('should generate and log QR code successfully', async () => {
      const qrData = {
        qr_type: 'student' as const,
        data: { student_id: 'student-123', timestamp: Date.now() },
        student_id: 'student-123',
        description: 'Student check-in QR',
        tags: ['check-in', 'student']
      }

      const mockResult = {
        id: 'qr-123',
        qr_type: 'student',
        qr_data: qrData.data,
        qr_hash: '4141414141414141414141414141414141414141414141414141414141414141',
        student_id: 'student-123',
        generated_by: 'user-123',
        description: 'Student check-in QR',
        tags: ['check-in', 'student'],
        is_active: true,
        scan_count: 0
      }

      const mockQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ data: mockResult, error: null })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await QRCodeAPI.generateQRCode(qrData)

      expect(mockSupabase.from).toHaveBeenCalledWith('qr_code_generation_log')
      expect(mockQuery.insert).toHaveBeenCalledWith({
        qr_type: 'student',
        qr_data: qrData.data,
        qr_hash: '4141414141414141414141414141414141414141414141414141414141414141',
        student_id: 'student-123',
        session_id: undefined,
        therapist_id: undefined,
        course_id: undefined,
        generated_by: 'user-123',
        expires_at: undefined,
        is_single_use: false,
        max_scans: undefined,
        description: 'Student check-in QR',
        tags: ['check-in', 'student']
      })
      expect(result).toEqual(mockResult)
    })

    it('should handle generation errors', async () => {
      const mockQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: new Error('Insert failed') 
        })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const qrData = {
        qr_type: 'student' as const,
        data: { student_id: 'student-123' }
      }

      await expect(QRCodeAPI.generateQRCode(qrData)).rejects.toThrow(
        'Failed to generate QR code: Insert failed'
      )
    })
  })

  describe('validateQRScan', () => {
    const mockQRRecord = {
      id: 'qr-123',
      qr_hash: 'test-hash',
      expires_at: null,
      max_scans: null,
      scan_count: 0,
      is_single_use: false,
      is_active: true
    }

    it('should validate active QR code successfully', async () => {
      const mockSelectQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ data: mockQRRecord, error: null })
      }

      const mockUpdateQuery = {
        ...mockSupabaseQuery,
        eq: vi.fn().mockResolvedValue({ error: null })
      }

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery)  // Select QR record
        .mockReturnValueOnce(mockUpdateQuery)  // Update scan count

      const result = await QRCodeAPI.validateQRScan('test-hash', { scanned_by: 'user-123' })

      expect(result.valid).toBe(true)
      expect(result.qrRecord).toEqual(mockQRRecord)
      expect(result.message).toBe('QR code is valid')
    })

    it('should reject inactive QR code', async () => {
      const mockQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await QRCodeAPI.validateQRScan('invalid-hash')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('QR code not found or inactive')
    })

    it('should reject expired QR code', async () => {
      const expiredQRRecord = {
        ...mockQRRecord,
        expires_at: '2024-01-01T00:00:00Z' // Past date
      }

      const mockQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ data: expiredQRRecord, error: null })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await QRCodeAPI.validateQRScan('expired-hash')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('QR code has expired')
    })

    it('should reject QR code that exceeded scan limit', async () => {
      const maxedOutQRRecord = {
        ...mockQRRecord,
        max_scans: 3,
        scan_count: 3
      }

      const mockQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ data: maxedOutQRRecord, error: null })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await QRCodeAPI.validateQRScan('maxed-hash')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('QR code scan limit exceeded')
    })

    it('should deactivate single-use QR code after scan', async () => {
      const singleUseQRRecord = {
        ...mockQRRecord,
        is_single_use: true
      }

      const mockSelectQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ data: singleUseQRRecord, error: null })
      }

      const mockUpdateQuery = {
        ...mockSupabaseQuery,
        eq: vi.fn().mockResolvedValue({ error: null })
      }

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery)

      await QRCodeAPI.validateQRScan('single-use-hash')

      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        scan_count: 1,
        last_scanned_at: expect.any(String),
        last_scanned_by: 'user-123',
        is_active: false  // Should be deactivated
      })
    })
  })

  describe('getQRHistory', () => {
    it('should fetch QR history with filters', async () => {
      const mockHistory = [
        { id: 'qr-1', qr_type: 'student', generated_at: '2024-01-15T09:00:00Z' },
        { id: 'qr-2', qr_type: 'student', generated_at: '2024-01-15T10:00:00Z' }
      ]

      const mockQuery = {
        ...mockSupabaseQuery
      }

      // Mock the final query result
      Object.defineProperty(mockQuery, 'then', {
        value: vi.fn().mockResolvedValue({ data: mockHistory, error: null })
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await QRCodeAPI.getQRHistory({
        qr_type: 'student',
        limit: 10
      })

      expect(result).toEqual(mockHistory)
      expect(mockQuery.eq).toHaveBeenCalledWith('qr_type', 'student')
      expect(mockQuery.limit).toHaveBeenCalledWith(10)
      expect(mockQuery.order).toHaveBeenCalledWith('generated_at', { ascending: false })
    })

    it('should handle history fetch errors', async () => {
      const mockQuery = {
        ...mockSupabaseQuery
      }

      Object.defineProperty(mockQuery, 'then', {
        value: vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') })
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      await expect(QRCodeAPI.getQRHistory()).rejects.toThrow(
        'Failed to fetch QR history: Fetch failed'
      )
    })
  })
})

describe('NotificationAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const notificationData = {
        recipient_type: 'parent' as const,
        recipient_id: 'parent-123',
        notification_type: 'check_in',
        title: 'Student Check-in',
        message: 'Your child has checked in',
        priority: 'medium' as const,
        student_id: 'student-123',
        attendance_record_id: 'attendance-123',
        session_id: 'session-123'
      }

      const mockResult = {
        id: 'notification-123',
        ...notificationData,
        send_email: true,
        send_sms: false,
        send_whatsapp: true,
        send_push: true
      }

      const mockQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ data: mockResult, error: null })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await NotificationAPI.createNotification(notificationData)

      expect(mockSupabase.from).toHaveBeenCalledWith('attendance_notifications')
      expect(mockQuery.insert).toHaveBeenCalledWith({
        ...notificationData,
        send_email: true,
        send_sms: false,
        send_whatsapp: true,
        send_push: true
      })
      expect(result).toEqual(mockResult)
    })

    it('should handle creation errors', async () => {
      const mockQuery = {
        ...mockSupabaseQuery,
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: new Error('Insert failed') 
        })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const notificationData = {
        recipient_type: 'parent' as const,
        recipient_id: 'parent-123',
        notification_type: 'check_in',
        title: 'Test',
        message: 'Test message'
      }

      await expect(NotificationAPI.createNotification(notificationData)).rejects.toThrow(
        'Failed to create notification: Insert failed'
      )
    })
  })

  describe('getUnreadNotifications', () => {
    it('should fetch unread notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', title: 'Check-in', is_read: false },
        { id: 'notif-2', title: 'Session', is_read: false }
      ]

      const mockQuery = {
        ...mockSupabaseQuery
      }

      Object.defineProperty(mockQuery, 'then', {
        value: vi.fn().mockResolvedValue({ data: mockNotifications, error: null })
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await NotificationAPI.getUnreadNotifications('parent-123', 'parent')

      expect(result).toEqual(mockNotifications)
      expect(mockQuery.eq).toHaveBeenCalledWith('recipient_id', 'parent-123')
      expect(mockQuery.eq).toHaveBeenCalledWith('recipient_type', 'parent')
      expect(mockQuery.eq).toHaveBeenCalledWith('is_read', false)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockQuery = {
        ...mockSupabaseQuery,
        eq: vi.fn().mockResolvedValue({ error: null })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      await NotificationAPI.markAsRead('notification-123')

      expect(mockQuery.update).toHaveBeenCalledWith({
        is_read: true,
        read_at: expect.any(String)
      })
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'notification-123')
    })

    it('should handle mark as read errors', async () => {
      const mockQuery = {
        ...mockSupabaseQuery,
        eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      await expect(NotificationAPI.markAsRead('notification-123')).rejects.toThrow(
        'Failed to mark notification as read: Update failed'
      )
    })
  })
})

describe('RealtimeAttendanceAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('subscribeToAttendanceUpdates', () => {
    it('should subscribe to attendance changes', () => {
      const mockCallback = vi.fn()
      const mockSubscribe = vi.fn()

      mockSupabaseQuery.subscribe = mockSubscribe
      mockSupabase.channel.mockReturnValue(mockSupabaseQuery)

      RealtimeAttendanceAPI.subscribeToAttendanceUpdates(mockCallback)

      expect(mockSupabase.channel).toHaveBeenCalledWith('attendance_changes')
      expect(mockSupabaseQuery.on).toHaveBeenCalledWith(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'student_attendance' 
        },
        mockCallback
      )
      expect(mockSubscribe).toHaveBeenCalled()
    })

    it('should apply student filter when provided', () => {
      const mockCallback = vi.fn()

      mockSupabase.channel.mockReturnValue(mockSupabaseQuery)

      RealtimeAttendanceAPI.subscribeToAttendanceUpdates(mockCallback, {
        studentId: 'student-123'
      })

      expect(mockSupabaseQuery.filter).toHaveBeenCalledWith('student_id', 'eq', 'student-123')
    })
  })

  describe('subscribeToNotifications', () => {
    it('should subscribe to notification changes', () => {
      const mockCallback = vi.fn()
      const mockSubscribe = vi.fn()

      mockSupabaseQuery.subscribe = mockSubscribe
      mockSupabase.channel.mockReturnValue(mockSupabaseQuery)

      RealtimeAttendanceAPI.subscribeToNotifications('parent-123', mockCallback)

      expect(mockSupabase.channel).toHaveBeenCalledWith('notification_changes')
      expect(mockSupabaseQuery.on).toHaveBeenCalledWith(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'attendance_notifications',
          filter: 'recipient_id=eq.parent-123'
        },
        mockCallback
      )
      expect(mockSubscribe).toHaveBeenCalled()
    })
  })
})

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle network errors gracefully', async () => {
    const networkError = new Error('Network request failed')
    const mockQuery = {
      ...mockSupabaseQuery,
      select: vi.fn().mockRejectedValue(networkError)
    }

    mockSupabase.from.mockReturnValue(mockQuery)

    await expect(StudentAttendanceAPI.getAttendanceRecords()).rejects.toThrow(networkError)
  })

  it('should handle malformed data gracefully', async () => {
    const malformedData = [
      { ...mockStudentAttendance, students: null, therapists: undefined }
    ]

    const mockQuery = {
      ...mockSupabaseQuery,
      select: vi.fn().mockResolvedValue({ data: malformedData, error: null })
    }

    mockSupabase.from.mockReturnValue(mockQuery)

    const result = await StudentAttendanceAPI.getAttendanceRecords()

    expect(result).toHaveLength(1)
    expect(result[0].student_name).toBeUndefined()
    expect(result[0].therapist_name).toBeUndefined()
  })

  it('should handle authentication errors', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Unauthorized')
    })

    const checkInData: CreateStudentAttendanceData = {
      student_id: 'student-123',
      session_type: 'speech_therapy'
    }

    // Mock existing record check
    const mockExistingQuery = {
      ...mockSupabaseQuery,
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    }

    mockSupabase.from.mockReturnValue(mockExistingQuery)

    // This should still work as the auth check happens during insert
    // but the checked_in_by field would be undefined
    expect(mockSupabase.auth.getUser).toHaveBeenCalled()
  })
})