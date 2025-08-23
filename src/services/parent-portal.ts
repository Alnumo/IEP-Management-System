// Parent Portal Service - Phase 5 Implementation
// Handles all parent-facing functionality

import { supabase } from '@/lib/supabase'
import type {
  ParentUser,
  ChildProgress,
  HomeProgram,
  ParentMessage,
  DocumentAccess,
  AppointmentRequest,
  ParentFeedback,
  ParentDashboardData,
  Appointment,
  MessageFilters,
  DocumentFilters
} from '@/types/parent-portal'

class ParentPortalService {
  
  /**
   * Authentication & User Management
   */
  async authenticateParent(email: string, password: string): Promise<{
    user: ParentUser | null
    session: any
    error: string | null
  }> {
    try {
      // Mock authentication for demo purposes
      // In real implementation, this would use Supabase auth
      
      // Simple validation
      if (!email || !password) {
        return { user: null, session: null, error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' }
      }

      if (!email.includes('@')) {
        return { user: null, session: null, error: 'يرجى إدخال بريد إلكتروني صحيح' }
      }

      if (password.length < 6) {
        return { user: null, session: null, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }
      }

      // Mock user data
      const mockUser: ParentUser = {
        id: 'parent-001',
        parentId: 'parent-001',
        email: email,
        phoneNumber: '0501234567',
        firstName: 'أحمد',
        lastName: 'محمد',
        relationship: 'father',
        preferredLanguage: 'ar',
        timezone: 'Asia/Riyadh',
        notificationPreferences: {
          sessionReminders: true,
          progressUpdates: true,
          homeProgramUpdates: true,
          appointmentChanges: true,
          emergencyAlerts: true,
          weeklyReports: true,
          communicationMethod: 'email',
          reminderTiming: 2
        },
        isActive: true,
        lastLoginAt: new Date().toISOString(),
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: new Date().toISOString()
      }

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: { id: 'parent-001', email: email }
      }

      return {
        user: mockUser,
        session: mockSession,
        error: null
      }
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'فشل في تسجيل الدخول'
      }
    }
  }

  async registerParent(parentData: Partial<ParentUser>, password: string): Promise<{
    user: ParentUser | null
    error: string | null
  }> {
    try {
      // Mock registration for demo purposes
      // In real implementation, this would use Supabase auth
      
      // Validation
      if (!parentData.email || !parentData.firstName || !parentData.lastName) {
        return { user: null, error: 'يرجى ملء جميع الحقول المطلوبة' }
      }

      if (!parentData.email.includes('@')) {
        return { user: null, error: 'يرجى إدخال بريد إلكتروني صحيح' }
      }

      if (password.length < 6) {
        return { user: null, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }
      }

      // Mock successful registration
      const mockUser: ParentUser = {
        id: 'parent-' + Date.now(),
        parentId: 'parent-' + Date.now(),
        email: parentData.email,
        phoneNumber: parentData.phoneNumber || '',
        firstName: parentData.firstName,
        lastName: parentData.lastName,
        relationship: parentData.relationship || 'father',
        preferredLanguage: parentData.preferredLanguage || 'ar',
        timezone: parentData.timezone || 'Asia/Riyadh',
        notificationPreferences: parentData.notificationPreferences || {
          sessionReminders: true,
          progressUpdates: true,
          homeProgramUpdates: true,
          appointmentChanges: true,
          emergencyAlerts: true,
          weeklyReports: true,
          communicationMethod: 'email',
          reminderTiming: 2
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      return { user: mockUser, error: null }
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'فشل في إنشاء الحساب'
      }
    }
  }

  /**
   * Dashboard Data
   */
  async getParentDashboard(parentId: string): Promise<ParentDashboardData> {
    try {
      // Mock dashboard data for demo purposes
      // In real implementation, this would fetch from Supabase
      
      // Mock child progress data
      const mockChildProgress: ChildProgress = {
        childId: 'child-001',
        childName: 'أحمد محمد',
        profilePhoto: '',
        currentPrograms: [
          {
            programId: 'prog-001',
            programName: 'برنامج تطوير النطق واللغة',
            programType: 'SPEECH',
            therapistName: 'د. سارة أحمد',
            startDate: '2025-01-01',
            currentLevel: 'المستوى الثاني',
            progressPercentage: 75,
            weeklySessionsCompleted: 3,
            weeklySessionsTarget: 4,
            recentNotes: 'تحسن ملحوظ في النطق والتعبير',
            nextMilestone: 'تكوين جمل من ثلاث كلمات',
            estimatedCompletionDate: '2025-04-15'
          },
          {
            programId: 'prog-002',
            programName: 'برنامج العلاج الوظيفي',
            programType: 'OT',
            therapistName: 'أ. محمد عبدالله',
            startDate: '2025-01-01',
            currentLevel: 'المستوى الأول',
            progressPercentage: 60,
            weeklySessionsCompleted: 2,
            weeklySessionsTarget: 3,
            recentNotes: 'تطور جيد في المهارات الحركية الدقيقة',
            nextMilestone: 'استخدام المقص بدقة',
            estimatedCompletionDate: '2025-05-01'
          }
        ],
        recentAchievements: [
          {
            id: 'ach-001',
            childId: 'child-001',
            title: 'أول جملة من كلمتين',
            description: 'نطق "أريد ماء" بشكل واضح ومستقل',
            category: 'communication',
            achievedAt: '2025-01-20',
            therapistId: 'th-001',
            therapistName: 'د. سارة أحمد',
            programId: 'prog-001',
            significance: 'major'
          }
        ],
        upcomingGoals: ['تكوين جمل من ثلاث كلمات', 'استخدام أدوات الطعام بشكل مستقل'],
        weeklyProgress: [],
        overallProgressScore: 78,
        lastSessionDate: '2025-01-21',
        nextSessionDate: '2025-01-23',
        totalSessionsCompleted: 45,
        attendanceRate: 92
      }

      // Mock recent messages
      const mockMessages = [
        {
          id: 'msg-001',
          conversationId: 'conv-001',
          senderId: 'th-001',
          senderName: 'د. سارة أحمد',
          senderType: 'therapist' as const,
          recipientId: parentId,
          recipientName: 'والد أحمد',
          subject: 'تقرير الجلسة اليوم',
          messageContent: 'أحمد أظهر تحسناً ملحوظاً في النطق اليوم. استطاع تكوين جملتين جديدتين بوضوح.',
          messageType: 'text' as const,
          attachments: [],
          isRead: false,
          isUrgent: false,
          sentAt: '2025-01-21T14:30:00Z'
        },
        {
          id: 'msg-002',
          conversationId: 'conv-002',
          senderId: 'admin-001',
          senderName: 'إدارة المركز',
          senderType: 'admin' as const,
          recipientId: parentId,
          recipientName: 'والد أحمد',
          subject: 'تذكير بموعد الجلسة',
          messageContent: 'تذكير: موعد جلسة أحمد غداً الساعة 10:00 صباحاً مع د. سارة أحمد.',
          messageType: 'text' as const,
          attachments: [],
          isRead: true,
          isUrgent: false,
          sentAt: '2025-01-20T16:00:00Z'
        }
      ]

      // Mock appointments
      const mockAppointments = [
        {
          id: 'app-001',
          childId: 'child-001',
          childName: 'أحمد محمد',
          therapistId: 'th-001',
          therapistName: 'د. سارة أحمد',
          sessionType: 'جلسة علاج نطق',
          programType: 'Speech Therapy',
          scheduledDate: '2025-01-23',
          scheduledTime: '10:00',
          duration: 45,
          roomNumber: 'غرفة 101',
          status: 'scheduled' as const,
          reminderSent: true,
          canReschedule: true,
          rescheduleDeadline: '2025-01-22T10:00:00Z'
        }
      ]

      // Mock home programs
      const mockHomePrograms = [
        {
          id: 'hp-001',
          childId: 'child-001',
          programTitle: 'تمارين النطق اليومية',
          description: 'تمارين لتحسين النطق والتعبير - 15 دقيقة يومياً',
          assignedBy: 'th-001',
          assignedByName: 'د. سارة أحمد',
          assignedDate: '2025-01-20',
          dueDate: '2025-01-27',
          priority: 'high' as const,
          category: 'communication',
          estimatedDuration: 15,
          status: 'assigned' as const,
          instructions: [],
          materials: [],
          attachments: []
        }
      ]

      const recentDocuments: DocumentAccess[] = []
      const systemAnnouncements = [
        {
          id: '1',
          title: 'إجازة عيد الفطر',
          content: 'سيتم إغلاق المركز من 10-15 أبريل بمناسبة عيد الفطر المبارك',
          type: 'holiday' as const,
          targetAudience: 'all_parents' as const,
          isActive: true,
          publishedAt: new Date().toISOString(),
          attachments: [],
          readBy: []
        }
      ]

      return {
        childrenProgress: [mockChildProgress],
        upcomingAppointments: mockAppointments,
        recentMessages: mockMessages,
        pendingHomeProgramActivities: mockHomePrograms,
        recentDocuments,
        systemAnnouncements,
        quickStats: {
          totalChildrenEnrolled: 1,
          upcomingSessionsThisWeek: mockAppointments.length,
          completedHomeProgramsThisWeek: 2,
          unreadMessages: mockMessages.filter(m => !m.isRead).length
        }
      }
    } catch (error) {
      console.error('Error fetching parent dashboard:', error)
      return {
        childrenProgress: [],
        upcomingAppointments: [],
        recentMessages: [],
        pendingHomeProgramActivities: [],
        recentDocuments: [],
        systemAnnouncements: [],
        quickStats: {
          totalChildrenEnrolled: 0,
          upcomingSessionsThisWeek: 0,
          completedHomeProgramsThisWeek: 0,
          unreadMessages: 0
        }
      }
    }
  }

  /**
   * Child Progress Tracking
   */
  async getChildProgress(childId: string): Promise<ChildProgress | null> {
    try {
      // Fetch child basic info
      const { data: child, error: childError } = await supabase
        .from('students')
        .select('id, first_name_ar, last_name_ar, profile_photo_url')
        .eq('id', childId)
        .single()

      if (childError) throw childError

      // Fetch current therapy programs
      const { data: programEnrollments } = await supabase
        .from('program_enrollments')
        .select(`
          *,
          therapy_programs (name_ar, name_en, category),
          therapists (first_name, last_name)
        `)
        .eq('student_id', childId)
        .eq('status', 'active')

      // Mock progress data - in real implementation, calculate from session data
      const mockProgress: ChildProgress = {
        childId: child.id,
        childName: `${child.first_name_ar} ${child.last_name_ar}`,
        profilePhoto: child.profile_photo_url,
        currentPrograms: programEnrollments?.map(enrollment => ({
          programId: enrollment.therapy_program_id,
          programName: enrollment.therapy_programs.name_ar,
          programType: enrollment.therapy_programs.category.toUpperCase(),
          therapistName: `${enrollment.therapists.first_name} ${enrollment.therapists.last_name}`,
          startDate: enrollment.start_date,
          currentLevel: 'Level 2',
          progressPercentage: Math.floor(Math.random() * 40) + 60, // 60-100%
          weeklySessionsCompleted: Math.floor(Math.random() * 4) + 1,
          weeklySessionsTarget: 4,
          recentNotes: 'Excellent progress in communication skills',
          nextMilestone: 'Two-word combinations',
          estimatedCompletionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        })) || [],
        recentAchievements: [
          {
            id: '1',
            childId,
            title: 'First Two-Word Sentence',
            description: 'Successfully used "want water" independently',
            category: 'communication',
            achievedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            therapistId: 'th-001',
            therapistName: 'Sarah Ahmed',
            programId: 'prog-001',
            significance: 'major'
          }
        ],
        upcomingGoals: [],
        weeklyProgress: [],
        overallProgressScore: 78,
        lastSessionDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        nextSessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        totalSessionsCompleted: 45,
        attendanceRate: 92
      }

      return mockProgress
    } catch (error) {
      console.error('Error fetching child progress:', error)
      return null
    }
  }

  /**
   * Home Programs
   */
  async getHomePrograms(childId: string, status?: string): Promise<HomeProgram[]> {
    try {
      let query = supabase
        .from('home_programs')
        .select('*')
        .eq('child_id', childId)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query.order('assigned_date', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching home programs:', error)
      return []
    }
  }

  async updateHomeProgramProgress(
    programId: string,
    completionData: {
      status: string
      parentFeedback?: string
      parentRating?: number
      completionDate?: string
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('home_programs')
        .update({
          ...completionData,
          updated_at: new Date().toISOString()
        })
        .eq('id', programId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating home program progress:', error)
      return false
    }
  }

  /**
   * Messages & Communication
   */
  async getMessages(parentId: string, filters?: MessageFilters): Promise<ParentMessage[]> {
    try {
      // Mock messages data for demo purposes
      // In real implementation, this would fetch from Supabase
      
      const mockMessages: ParentMessage[] = [
        {
          id: 'msg-001',
          conversationId: 'conv-001',
          senderId: 'th-001',
          senderName: 'د. سارة أحمد',
          senderType: 'therapist',
          recipientId: parentId,
          recipientName: 'والد أحمد',
          subject: 'تقرير الجلسة اليوم',
          messageContent: 'أحمد أظهر تحسناً ملحوظاً في النطق اليوم. استطاع تكوين جملتين جديدتين بوضوح. أنصح بمواصلة التمارين المنزلية.',
          messageType: 'text',
          attachments: [],
          isRead: false,
          isUrgent: false,
          sentAt: '2025-01-21T14:30:00Z'
        },
        {
          id: 'msg-002',
          conversationId: 'conv-001',
          senderId: parentId,
          senderName: 'والد أحمد',
          senderType: 'parent',
          recipientId: 'th-001',
          recipientName: 'د. سارة أحمد',
          messageContent: 'شكراً لكم على الاهتمام. هل يمكن إضافة تمارين جديدة للمنزل؟',
          messageType: 'text',
          attachments: [],
          isRead: true,
          isUrgent: false,
          sentAt: '2025-01-21T15:00:00Z'
        },
        {
          id: 'msg-003',
          conversationId: 'conv-002',
          senderId: 'admin-001',
          senderName: 'إدارة المركز',
          senderType: 'admin',
          recipientId: parentId,
          recipientName: 'والد أحمد',
          subject: 'تذكير بموعد الجلسة',
          messageContent: 'تذكير: موعد جلسة أحمد غداً الساعة 10:00 صباحاً مع د. سارة أحمد في غرفة 101.',
          messageType: 'text',
          attachments: [],
          isRead: true,
          isUrgent: false,
          sentAt: '2025-01-20T16:00:00Z'
        },
        {
          id: 'msg-004',
          conversationId: 'conv-003',
          senderId: 'th-002',
          senderName: 'أ. محمد عبدالله',
          senderType: 'therapist',
          recipientId: parentId,
          recipientName: 'والد أحمد',
          subject: 'تقرير العلاج الوظيفي',
          messageContent: 'أحمد يتطور بشكل ممتاز في استخدام الأدوات. نحتاج لمراجعة الأهداف الأسبوع القادم.',
          messageType: 'text',
          attachments: [],
          isRead: false,
          isUrgent: true,
          sentAt: '2025-01-21T11:00:00Z'
        }
      ]

      // Apply filters
      let filteredMessages = mockMessages

      if (filters?.isUnread) {
        filteredMessages = filteredMessages.filter(m => !m.isRead)
      }

      if (filters?.isUrgent) {
        filteredMessages = filteredMessages.filter(m => m.isUrgent)
      }

      if (filters?.senderType) {
        filteredMessages = filteredMessages.filter(m => m.senderType === filters.senderType)
      }

      return filteredMessages
    } catch (error) {
      console.error('Error fetching messages:', error)
      return []
    }
  }

  async sendMessage(messageData: Partial<ParentMessage>): Promise<boolean> {
    try {
      // Mock message sending for demo purposes
      // In real implementation, this would save to Supabase
      console.log('Sending message:', messageData)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  /**
   * Appointments
   */
  async requestAppointment(requestData: Partial<AppointmentRequest>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('appointment_requests')
        .insert([{
          ...requestData,
          status: 'pending',
          created_at: new Date().toISOString()
        }])

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error requesting appointment:', error)
      return false
    }
  }

  async getAppointments(childId: string, upcoming = true): Promise<Appointment[]> {
    try {
      let query = supabase
        .from('sessions')
        .select(`
          *,
          students (first_name_ar, last_name_ar),
          therapists (first_name, last_name)
        `)
        .eq('student_id', childId)

      if (upcoming) {
        query = query.gte('session_date', new Date().toISOString().split('T')[0])
      }

      const { data, error } = await query.order('session_date', { ascending: true })

      if (error) throw error

      return data?.map(this.mapSessionToAppointment) || []
    } catch (error) {
      console.error('Error fetching appointments:', error)
      return []
    }
  }

  /**
   * Documents
   */
  async getDocuments(_childId: string, _filters?: DocumentFilters): Promise<DocumentAccess[]> {
    try {
      // Mock implementation - replace with actual document fetching logic
      return []
    } catch (error) {
      console.error('Error fetching documents:', error)
      return []
    }
  }

  /**
   * Feedback
   */
  async submitFeedback(feedbackData: Partial<ParentFeedback>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parent_feedback')
        .insert([{
          ...feedbackData,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        }])

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error submitting feedback:', error)
      return false
    }
  }

  /**
   * Utility Methods
   */
  private mapSessionToAppointment = (session: any): Appointment => ({
    id: session.id,
    childId: session.student_id,
    childName: `${session.students.first_name_ar} ${session.students.last_name_ar}`,
    therapistId: session.therapist_id,
    therapistName: `${session.therapists.first_name} ${session.therapists.last_name}`,
    sessionType: session.session_type || 'Therapy Session',
    programType: session.program_type || 'General',
    scheduledDate: session.session_date,
    scheduledTime: session.start_time,
    duration: session.duration || 60,
    roomNumber: session.room_number,
    status: session.status,
    reminderSent: session.reminder_sent || false,
    specialInstructions: session.notes,
    canReschedule: true,
    rescheduleDeadline: new Date(new Date(session.session_date).getTime() - 24 * 60 * 60 * 1000).toISOString()
  })

  /*
  private formatCurrency(amount: number, currency = 'SAR'): string {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  private calculateAge(birthDate: string): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }
  */
}

export const parentPortalService = new ParentPortalService()