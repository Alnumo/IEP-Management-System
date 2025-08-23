// Parent Portal Types - Phase 5 Implementation

export interface ParentUser {
  id: string
  parentId: string
  email: string
  phoneNumber: string
  firstName: string
  lastName: string
  relationship: 'father' | 'mother' | 'guardian' | 'caregiver'
  preferredLanguage: 'ar' | 'en'
  timezone: string
  notificationPreferences: NotificationPreferences
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface NotificationPreferences {
  sessionReminders: boolean
  progressUpdates: boolean
  homeProgramUpdates: boolean
  appointmentChanges: boolean
  emergencyAlerts: boolean
  weeklyReports: boolean
  communicationMethod: 'email' | 'whatsapp' | 'sms' | 'app'
  reminderTiming: number // hours before session
}

export interface ChildProgress {
  childId: string
  childName: string
  profilePhoto?: string
  currentPrograms: TherapyProgramProgress[]
  recentAchievements: Achievement[]
  upcomingGoals: string[]
  weeklyProgress: WeeklyProgress[]
  overallProgressScore: number
  lastSessionDate: string
  nextSessionDate: string
  totalSessionsCompleted: number
  attendanceRate: number
}

export interface TherapyProgramProgress {
  programId: string
  programName: string
  programType: 'ABA' | 'SPEECH' | 'OT' | 'PT' | 'BEHAVIORAL'
  therapistName: string
  startDate: string
  currentLevel: string
  progressPercentage: number
  weeklySessionsCompleted: number
  weeklySessionsTarget: number
  recentNotes: string
  nextMilestone: string
  estimatedCompletionDate: string
}

export interface Achievement {
  id: string
  childId: string
  title: string
  description: string
  category: 'social' | 'communication' | 'motor' | 'cognitive' | 'behavioral' | 'academic'
  achievedAt: string
  therapistId: string
  therapistName: string
  programId: string
  significance: 'minor' | 'major' | 'milestone'
  photoUrl?: string
  videoUrl?: string
  parentNotes?: string
}

export interface WeeklyProgress {
  weekStartDate: string
  weekEndDate: string
  totalSessions: number
  completedSessions: number
  cancelledSessions: number
  noShowSessions: number
  overallRating: number // 1-5 scale
  keyAchievements: string[]
  challengesNoted: string[]
  therapistFeedback: string
  homeActivity: {
    assigned: number
    completed: number
    completionRate: number
  }
}

export interface HomeProgram {
  id: string
  childId: string
  programTitle: string
  description: string
  assignedBy: string
  assignedByName: string
  assignedDate: string
  dueDate?: string
  priority: 'low' | 'medium' | 'high'
  category: string
  estimatedDuration: number // minutes
  instructions: HomeProgramInstruction[]
  materials: HomeProgramMaterial[]
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue'
  completionDate?: string
  parentFeedback?: string
  parentRating?: number
  videoUrl?: string
  attachments: string[]
}

export interface HomeProgramInstruction {
  stepNumber: number
  title: string
  description: string
  visualAid?: string // image/video URL
  tips: string[]
  commonMistakes: string[]
  targetBehavior: string
}

export interface HomeProgramMaterial {
  id: string
  name: string
  description?: string
  type: 'physical' | 'printable' | 'digital' | 'app'
  required: boolean
  alternativeOptions?: string[]
  purchaseLink?: string
  downloadUrl?: string
}

export interface AppointmentRequest {
  id: string
  childId: string
  parentId: string
  requestType: 'new_session' | 'reschedule' | 'consultation' | 'assessment'
  preferredTherapist?: string
  preferredDates: string[]
  preferredTimes: string[]
  duration: number
  priority: 'routine' | 'urgent' | 'emergency'
  reason: string
  notes?: string
  status: 'pending' | 'approved' | 'rejected' | 'scheduled'
  responseNotes?: string
  scheduledDateTime?: string
  createdAt: string
}

export interface ParentMessage {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderType: 'parent' | 'therapist' | 'admin' | 'system'
  recipientId: string
  recipientName: string
  subject?: string
  messageContent: string
  messageType: 'text' | 'voice' | 'image' | 'document' | 'video'
  attachments: MessageAttachment[]
  isRead: boolean
  isUrgent: boolean
  replyToMessageId?: string
  sentAt: string
  readAt?: string
}

export interface MessageAttachment {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  downloadUrl: string
  thumbnailUrl?: string
}

export interface DocumentAccess {
  id: string
  childId: string
  documentTitle: string
  documentType: 'assessment_report' | 'progress_report' | 'iep' | 'medical_record' | 'session_notes' | 'home_program' | 'photo' | 'video'
  filePath: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedByName: string
  uploadedAt: string
  isConfidential: boolean
  expiryDate?: string
  downloadCount: number
  lastAccessedAt?: string
  parentNotes?: string
  tags: string[]
}

export interface ParentFeedback {
  id: string
  childId: string
  sessionId?: string
  programId?: string
  therapistId: string
  feedbackType: 'session_feedback' | 'program_feedback' | 'home_activity' | 'concern' | 'appreciation'
  rating: number // 1-5 scale
  comments: string
  suggestions?: string
  isAnonymous: boolean
  status: 'submitted' | 'reviewed' | 'responded'
  adminResponse?: string
  submittedAt: string
  reviewedAt?: string
}

export interface ParentDashboardData {
  childrenProgress: ChildProgress[]
  upcomingAppointments: Appointment[]
  recentMessages: ParentMessage[]
  pendingHomeProgramActivities: HomeProgram[]
  recentDocuments: DocumentAccess[]
  systemAnnouncements: Announcement[]
  quickStats: {
    totalChildrenEnrolled: number
    upcomingSessionsThisWeek: number
    completedHomeProgramsThisWeek: number
    unreadMessages: number
  }
}

export interface Appointment {
  id: string
  childId: string
  childName: string
  therapistId: string
  therapistName: string
  sessionType: string
  programType: string
  scheduledDate: string
  scheduledTime: string
  duration: number
  roomNumber?: string
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  reminderSent: boolean
  specialInstructions?: string
  canReschedule: boolean
  rescheduleDeadline?: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'general' | 'urgent' | 'holiday' | 'program_update' | 'policy_change'
  targetAudience: 'all_parents' | 'specific_program' | 'specific_children'
  isActive: boolean
  publishedAt: string
  expiresAt?: string
  attachments: string[]
  readBy: string[]
}

// API Response Types
export interface ParentPortalAPIResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Filter and Search Types
export interface ProgressFilters {
  dateRange?: {
    start: string
    end: string
  }
  programTypes?: string[]
  therapistIds?: string[]
  achievementCategories?: string[]
}

export interface MessageFilters {
  conversationId?: string
  senderType?: 'therapist' | 'admin'
  isUnread?: boolean
  isUrgent?: boolean
  dateRange?: {
    start: string
    end: string
  }
}

export interface DocumentFilters {
  documentTypes?: string[]
  uploadedBy?: string[]
  isConfidential?: boolean
  tags?: string[]
  dateRange?: {
    start: string
    end: string
  }
}