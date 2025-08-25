import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface AttendanceRecord {
  id: string
  student_id: string
  student_name: string
  session_id?: string
  session_type: string
  check_in_time: string
  check_out_time?: string
  room_number?: string
  therapist_id?: string
  therapist_name?: string
  status: 'checked_in' | 'in_session' | 'checked_out'
  qr_data?: any
  created_at: string
  updated_at: string
}

export interface TherapistAttendance {
  id: string
  therapist_id: string
  therapist_name: string
  check_in_time: string
  check_out_time?: string
  session_ids: string[]
  status: 'checked_in' | 'in_session' | 'checked_out'
  created_at: string
  updated_at: string
}

export interface RoomUtilization {
  id: string
  room_number: string
  start_time: string
  end_time?: string
  session_id?: string
  therapist_id?: string
  student_id?: string
  purpose: string
  status: 'occupied' | 'available' | 'maintenance'
  created_at: string
  updated_at: string
}

export interface AttendanceStats {
  totalStudents: number
  presentStudents: number
  inSession: number
  checkedOut: number
  attendanceRate: number
  activeTherapists: number
  occupiedRooms: number
}

export interface CreateAttendanceData {
  student_id: string
  student_name: string
  session_type: string
  room_number?: string
  therapist_id?: string
  therapist_name?: string
  qr_data?: any
}

export interface UpdateAttendanceData {
  id: string
  status?: 'checked_in' | 'in_session' | 'checked_out'
  check_out_time?: string
  session_id?: string
  room_number?: string
  therapist_id?: string
  therapist_name?: string
}

// Mock data for development
const mockAttendanceRecords: AttendanceRecord[] = [
  {
    id: '1',
    student_id: 'std-001',
    student_name: 'أحمد محمد الأحمد',
    session_id: 'sess-001',
    session_type: 'ABA Therapy',
    check_in_time: '2025-01-22T09:00:00Z',
    room_number: 'A-101',
    therapist_id: 'th-001',
    therapist_name: 'د. سارة أحمد',
    status: 'in_session',
    created_at: '2025-01-22T09:00:00Z',
    updated_at: '2025-01-22T09:15:00Z'
  },
  {
    id: '2',
    student_id: 'std-002',
    student_name: 'فاطمة علي السالم',
    session_id: 'sess-002',
    session_type: 'Speech Therapy',
    check_in_time: '2025-01-22T10:30:00Z',
    check_out_time: '2025-01-22T11:15:00Z',
    room_number: 'B-205',
    therapist_id: 'th-002',
    therapist_name: 'أ. نور الدين',
    status: 'checked_out',
    created_at: '2025-01-22T10:30:00Z',
    updated_at: '2025-01-22T11:15:00Z'
  },
  {
    id: '3',
    student_id: 'std-003',
    student_name: 'محمد أحمد',
    session_type: 'Occupational Therapy',
    check_in_time: '2025-01-22T11:00:00Z',
    room_number: 'C-301',
    status: 'checked_in',
    created_at: '2025-01-22T11:00:00Z',
    updated_at: '2025-01-22T11:00:00Z'
  }
]

const mockTherapistAttendance: TherapistAttendance[] = [
  {
    id: '1',
    therapist_id: 'th-001',
    therapist_name: 'د. سارة أحمد',
    check_in_time: '2025-01-22T08:30:00Z',
    session_ids: ['sess-001', 'sess-003'],
    status: 'in_session',
    created_at: '2025-01-22T08:30:00Z',
    updated_at: '2025-01-22T09:15:00Z'
  },
  {
    id: '2',
    therapist_id: 'th-002',
    therapist_name: 'أ. نور الدين',
    check_in_time: '2025-01-22T09:00:00Z',
    check_out_time: '2025-01-22T11:30:00Z',
    session_ids: ['sess-002'],
    status: 'checked_out',
    created_at: '2025-01-22T09:00:00Z',
    updated_at: '2025-01-22T11:30:00Z'
  }
]

const mockRoomUtilization: RoomUtilization[] = [
  {
    id: '1',
    room_number: 'A-101',
    start_time: '2025-01-22T09:00:00Z',
    session_id: 'sess-001',
    therapist_id: 'th-001',
    student_id: 'std-001',
    purpose: 'ABA Therapy Session',
    status: 'occupied',
    created_at: '2025-01-22T09:00:00Z',
    updated_at: '2025-01-22T09:00:00Z'
  },
  {
    id: '2',
    room_number: 'B-205',
    start_time: '2025-01-22T10:30:00Z',
    end_time: '2025-01-22T11:15:00Z',
    session_id: 'sess-002',
    therapist_id: 'th-002',
    student_id: 'std-002',
    purpose: 'Speech Therapy Session',
    status: 'available',
    created_at: '2025-01-22T10:30:00Z',
    updated_at: '2025-01-22T11:15:00Z'
  },
  {
    id: '3',
    room_number: 'C-301',
    start_time: '2025-01-22T11:00:00Z',
    student_id: 'std-003',
    purpose: 'Occupational Therapy',
    status: 'occupied',
    created_at: '2025-01-22T11:00:00Z',
    updated_at: '2025-01-22T11:00:00Z'
  }
]

export const useAttendanceRecords = () => {
  return useQuery({
    queryKey: ['attendance', 'records'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      return mockAttendanceRecords
    }
  })
}

export const useTherapistAttendance = () => {
  return useQuery({
    queryKey: ['attendance', 'therapists'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      return mockTherapistAttendance
    }
  })
}

export const useRoomUtilization = () => {
  return useQuery({
    queryKey: ['attendance', 'rooms'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      return mockRoomUtilization
    }
  })
}

export const useAttendanceStats = () => {
  return useQuery({
    queryKey: ['attendance', 'stats'],
    queryFn: async (): Promise<AttendanceStats> => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const totalStudents = 50
      const presentStudents = mockAttendanceRecords.filter(r => r.status !== 'checked_out').length
      const inSession = mockAttendanceRecords.filter(r => r.status === 'in_session').length
      const checkedOut = mockAttendanceRecords.filter(r => r.status === 'checked_out').length
      const activeTherapists = mockTherapistAttendance.filter(t => t.status !== 'checked_out').length
      const occupiedRooms = mockRoomUtilization.filter(r => r.status === 'occupied').length
      
      return {
        totalStudents,
        presentStudents,
        inSession,
        checkedOut,
        attendanceRate: Math.round((presentStudents / totalStudents) * 100),
        activeTherapists,
        occupiedRooms
      }
    }
  })
}

export const useCreateAttendance = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateAttendanceData) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        student_id: data.student_id,
        student_name: data.student_name,
        session_type: data.session_type,
        check_in_time: new Date().toISOString(),
        room_number: data.room_number,
        therapist_id: data.therapist_id,
        therapist_name: data.therapist_name,
        status: 'checked_in',
        qr_data: data.qr_data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      return newRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (error) => {
      console.error('Error creating attendance:', error)
    }
  })
}

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: UpdateAttendanceData) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const updatedRecord = {
        ...data,
        updated_at: new Date().toISOString()
      }
      
      return updatedRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (error) => {
      console.error('Error updating attendance:', error)
    }
  })
}

export const useCheckInStudent = () => {
  const createMutation = useCreateAttendance()
  const updateMutation = useUpdateAttendance()
  
  return useMutation({
    mutationFn: async (qrData: any) => {
      const existingRecord = mockAttendanceRecords.find(r => 
        r.student_id === qrData.studentId && 
        r.status !== 'checked_out'
      )
      
      if (existingRecord) {
        // Check out
        return await updateMutation.mutateAsync({
          id: existingRecord.id,
          status: 'checked_out',
          check_out_time: new Date().toISOString()
        })
      } else {
        // Check in
        return await createMutation.mutateAsync({
          student_id: qrData.studentId,
          student_name: qrData.studentName,
          session_type: qrData.sessionType || 'General',
          room_number: qrData.roomNumber,
          therapist_id: qrData.therapistId,
          therapist_name: qrData.therapistName,
          qr_data: qrData
        })
      }
    }
  })
}

export const useStartSession = () => {
  const updateMutation = useUpdateAttendance()
  
  return useMutation({
    mutationFn: async (qrData: any) => {
      const record = mockAttendanceRecords.find(r => 
        r.student_id === qrData.studentId
      )
      
      if (record) {
        return await updateMutation.mutateAsync({
          id: record.id,
          status: 'in_session',
          session_id: qrData.sessionId,
          therapist_id: qrData.therapistId,
          therapist_name: qrData.therapistName,
          room_number: qrData.roomNumber
        })
      }
      
      throw new Error('Student not found or not checked in')
    }
  })
}

export const useRealTimeAttendance = () => {
  const [liveUpdates, setLiveUpdates] = useState<AttendanceRecord[]>([])
  
  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      // Add random attendance updates
      const randomUpdate: AttendanceRecord = {
        id: Date.now().toString(),
        student_id: `std-${Math.floor(Math.random() * 100)}`,
        student_name: `طالب ${Math.floor(Math.random() * 100)}`,
        session_type: ['ABA Therapy', 'Speech Therapy', 'OT'][Math.floor(Math.random() * 3)],
        check_in_time: new Date().toISOString(),
        status: 'checked_in',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setLiveUpdates(prev => [randomUpdate, ...prev.slice(0, 9)])
    }, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  return liveUpdates
}