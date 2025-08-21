export interface Session {
  id: string
  course_id: string
  course?: {
    id: string
    name_ar: string
    name_en?: string
    course_code: string
    instructor_name?: string
  }
  session_number: number
  session_date: string
  session_time: string
  duration_minutes: number
  topic_ar?: string
  topic_en?: string
  objectives: string[]
  materials_needed: string[]
  homework_assigned?: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  completion_notes?: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface SessionBooking {
  id: string
  session_id: string
  student_id: string
  student?: {
    id: string
    first_name_ar: string
    last_name_ar: string
    first_name_en?: string
    last_name_en?: string
    registration_number: string
  }
  booking_date: string
  booking_status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  attendance_status?: 'present' | 'absent' | 'late' | 'excused'
  arrival_time?: string
  departure_time?: string
  notes?: string
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded'
  amount_due: number
  amount_paid: number
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface TimeSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  available_slots: number
  booked_slots: number
  instructor_id?: string
  instructor_name?: string
  location?: string
  status: 'available' | 'fully_booked' | 'unavailable'
}

export interface SessionAvailability {
  date: string
  day_of_week: string
  time_slots: TimeSlot[]
  total_available: number
  total_booked: number
}

// Form and API types
export interface CreateSessionData {
  course_id: string
  session_number: number
  session_date: string
  session_time: string
  duration_minutes?: number
  topic_ar?: string
  topic_en?: string
  objectives?: string[]
  materials_needed?: string[]
  homework_assigned?: string
}

export interface UpdateSessionData extends Partial<CreateSessionData> {
  status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  completion_notes?: string
}

export interface CreateSessionBookingData {
  session_id: string
  student_id: string
  booking_date?: string
  notes?: string
  amount_due?: number
}

export interface UpdateSessionBookingData extends Partial<CreateSessionBookingData> {
  booking_status?: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  attendance_status?: 'present' | 'absent' | 'late' | 'excused'
  arrival_time?: string
  departure_time?: string
  payment_status?: 'pending' | 'paid' | 'partial' | 'refunded'
  amount_paid?: number
}

export interface CreateTimeSlotData {
  date: string
  start_time: string
  end_time: string
  available_slots: number
  instructor_id?: string
  instructor_name?: string
  location?: string
}

export interface UpdateTimeSlotData extends Partial<CreateTimeSlotData> {
  status?: 'available' | 'fully_booked' | 'unavailable'
}

// Filter and search types
export interface SessionFilters {
  course_id?: string
  instructor_id?: string
  date_from?: string
  date_to?: string
  status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  search?: string
}

export interface SessionBookingFilters {
  student_id?: string
  session_id?: string
  course_id?: string
  booking_status?: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  attendance_status?: 'present' | 'absent' | 'late' | 'excused'
  payment_status?: 'pending' | 'paid' | 'partial' | 'refunded'
  date_from?: string
  date_to?: string
  search?: string
}

export interface AvailabilityFilters {
  date_from: string
  date_to: string
  instructor_id?: string
  location?: string
  min_duration?: number
}

// Statistics and reporting types
export interface SessionStats {
  total_sessions: number
  scheduled_sessions: number
  completed_sessions: number
  cancelled_sessions: number
  rescheduled_sessions: number
  total_bookings: number
  confirmed_bookings: number
  pending_bookings: number
  attendance_rate: number
  revenue_generated: number
  revenue_pending: number
}

export interface BookingStats {
  total_bookings: number
  confirmed_bookings: number
  pending_bookings: number
  cancelled_bookings: number
  completed_bookings: number
  attendance_rate: number
  payment_completion_rate: number
  average_booking_value: number
}

// Calendar and scheduling types
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource?: {
    session_id?: string
    booking_id?: string
    course_id?: string
    student_id?: string
    instructor_id?: string
  }
  color?: string
  type: 'session' | 'booking' | 'availability' | 'break'
  status: string
  description?: string
}

export interface ScheduleConflict {
  type: 'instructor_double_booking' | 'student_double_booking' | 'location_conflict' | 'time_overlap'
  message: string
  conflicting_sessions: string[]
  suggested_alternatives?: TimeSlot[]
}

// Sort options
export interface SessionSortOptions {
  field: 'session_date' | 'session_time' | 'course_name' | 'status' | 'created_at'
  direction: 'asc' | 'desc'
}

export interface BookingSortOptions {
  field: 'booking_date' | 'session_date' | 'student_name' | 'booking_status' | 'payment_status'
  direction: 'asc' | 'desc'
}