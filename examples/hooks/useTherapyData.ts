/**
 * useTherapyData Hook
 * 
 * Why: Demonstrates data management patterns for therapy applications:
 * - Async data fetching with loading and error states
 * - Arabic text formatting for therapy content
 * - Progress tracking and metrics calculation
 * - Real-time updates and optimistic updates
 * - Type-safe therapy data operations
 * - Integration with Supabase patterns
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from './useLanguage'

// Types for therapy data
export interface TherapySession {
  id: string
  studentId: string
  therapistId: string
  type: 'speech' | 'physical' | 'occupational' | 'behavioral' | 'cognitive'
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  date: string
  duration: number // minutes
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  progress: number // 0-100
  notes: string
  notesAr: string
  goals: string[]
  goalsAr: string[]
  createdAt: string
  updatedAt: string
}

export interface TherapyProgress {
  sessionId: string
  metric: string
  metricAr: string
  value: number
  target: number
  unit: string
  unitAr: string
  trend: 'improving' | 'stable' | 'declining'
  lastUpdated: string
}

export interface TherapyStats {
  totalSessions: number
  completedSessions: number
  averageProgress: number
  upcomingSessions: number
  missedSessions: number
  therapyTypes: Record<string, number>
}

// Hook return type
export interface TherapyDataHookReturn {
  // Data state
  sessions: TherapySession[]
  progress: TherapyProgress[]
  stats: TherapyStats | null
  
  // Loading states
  isLoading: boolean
  isLoadingSessions: boolean
  isLoadingProgress: boolean
  isLoadingStats: boolean
  
  // Error states
  error: string | null
  sessionError: string | null
  progressError: string | null
  statsError: string | null
  
  // Data operations
  fetchSessions: (studentId?: string) => Promise<void>
  fetchProgress: (sessionId: string) => Promise<void>
  fetchStats: (studentId: string) => Promise<void>
  
  // CRUD operations
  createSession: (session: Omit<TherapySession, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TherapySession | null>
  updateSession: (id: string, updates: Partial<TherapySession>) => Promise<TherapySession | null>
  deleteSession: (id: string) => Promise<boolean>
  
  // Progress operations
  updateProgress: (sessionId: string, progress: number, notes?: string) => Promise<void>
  addProgressMetric: (metric: Omit<TherapyProgress, 'lastUpdated'>) => Promise<void>
  
  // Utility functions
  getSessionsByType: (type: TherapySession['type']) => TherapySession[]
  getUpcomingSessions: () => TherapySession[]
  getCompletedSessions: () => TherapySession[]
  getSessionProgress: (sessionId: string) => TherapyProgress[]
  
  // Arabic formatting
  formatSessionTitle: (session: TherapySession) => string
  formatSessionDescription: (session: TherapySession) => string
  formatProgressMetric: (progress: TherapyProgress) => string
}

/**
 * Custom hook for managing therapy data with Arabic support
 */
export const useTherapyData = (
  initialStudentId?: string
): TherapyDataHookReturn => {
  const { language, isArabic, formatText } = useLanguage()
  
  // State management
  const [sessions, setSessions] = useState<TherapySession[]>([])
  const [progress, setProgress] = useState<TherapyProgress[]>([])
  const [stats, setStats] = useState<TherapyStats | null>(null)
  
  // Loading states
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingProgress, setIsLoadingProgress] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  
  // Error states
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  
  // Computed loading state
  const isLoading = useMemo(() => 
    isLoadingSessions || isLoadingProgress || isLoadingStats,
    [isLoadingSessions, isLoadingProgress, isLoadingStats]
  )
  
  // Computed error state
  const error = useMemo(() => 
    sessionError || progressError || statsError,
    [sessionError, progressError, statsError]
  )
  
  // Mock API functions (replace with actual Supabase calls)
  const fetchSessions = useCallback(async (studentId?: string) => {
    setIsLoadingSessions(true)
    setSessionError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock data
      const mockSessions: TherapySession[] = [
        {
          id: '1',
          studentId: studentId || 'student-1',
          therapistId: 'therapist-1',
          type: 'speech',
          title: 'Speech Therapy Session',
          titleAr: 'جلسة علاج النطق',
          description: 'Working on pronunciation and articulation',
          descriptionAr: 'العمل على النطق والتلفظ الصحيح',
          date: new Date().toISOString(),
          duration: 45,
          status: 'scheduled',
          progress: 75,
          notes: 'Good progress with consonant sounds',
          notesAr: 'تقدم جيد في أصوات الحروف الساكنة',
          goals: ['Improve articulation', 'Increase vocabulary'],
          goalsAr: ['تحسين التلفظ', 'زيادة المفردات'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          studentId: studentId || 'student-1',
          therapistId: 'therapist-2',
          type: 'physical',
          title: 'Physical Therapy Session',
          titleAr: 'جلسة العلاج الطبيعي',
          description: 'Strengthening exercises and mobility work',
          descriptionAr: 'تمارين التقوية وتحسين الحركة',
          date: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          status: 'completed',
          progress: 85,
          notes: 'Excellent improvement in range of motion',
          notesAr: 'تحسن ممتاز في مدى الحركة',
          goals: ['Increase strength', 'Improve balance'],
          goalsAr: ['زيادة القوة', 'تحسين التوازن'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
      
      setSessions(mockSessions)
    } catch (err) {
      setSessionError('Failed to fetch therapy sessions')
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])
  
  const fetchProgress = useCallback(async (sessionId: string) => {
    setIsLoadingProgress(true)
    setProgressError(null)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const mockProgress: TherapyProgress[] = [
        {
          sessionId,
          metric: 'Articulation Accuracy',
          metricAr: 'دقة التلفظ',
          value: 78,
          target: 85,
          unit: '%',
          unitAr: '%',
          trend: 'improving',
          lastUpdated: new Date().toISOString()
        },
        {
          sessionId,
          metric: 'Vocabulary Size',
          metricAr: 'حجم المفردات',
          value: 245,
          target: 300,
          unit: 'words',
          unitAr: 'كلمة',
          trend: 'improving',
          lastUpdated: new Date().toISOString()
        }
      ]
      
      setProgress(prev => [...prev.filter(p => p.sessionId !== sessionId), ...mockProgress])
    } catch (err) {
      setProgressError('Failed to fetch progress data')
    } finally {
      setIsLoadingProgress(false)
    }
  }, [])
  
  const fetchStats = useCallback(async (studentId: string) => {
    setIsLoadingStats(true)
    setStatsError(null)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 600))
      
      const mockStats: TherapyStats = {
        totalSessions: 24,
        completedSessions: 18,
        averageProgress: 82,
        upcomingSessions: 3,
        missedSessions: 3,
        therapyTypes: {
          speech: 8,
          physical: 6,
          occupational: 4,
          behavioral: 3,
          cognitive: 3
        }
      }
      
      setStats(mockStats)
    } catch (err) {
      setStatsError('Failed to fetch therapy statistics')
    } finally {
      setIsLoadingStats(false)
    }
  }, [])
  
  // CRUD operations
  const createSession = useCallback(async (
    sessionData: Omit<TherapySession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TherapySession | null> => {
    try {
      const newSession: TherapySession = {
        ...sessionData,
        id: `session-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      setSessions(prev => [...prev, newSession])
      return newSession
    } catch (err) {
      setSessionError('Failed to create therapy session')
      return null
    }
  }, [])
  
  const updateSession = useCallback(async (
    id: string,
    updates: Partial<TherapySession>
  ): Promise<TherapySession | null> => {
    try {
      setSessions(prev => prev.map(session => 
        session.id === id 
          ? { ...session, ...updates, updatedAt: new Date().toISOString() }
          : session
      ))
      
      const updatedSession = sessions.find(s => s.id === id)
      return updatedSession ? { ...updatedSession, ...updates } : null
    } catch (err) {
      setSessionError('Failed to update therapy session')
      return null
    }
  }, [sessions])
  
  const deleteSession = useCallback(async (id: string): Promise<boolean> => {
    try {
      setSessions(prev => prev.filter(session => session.id !== id))
      setProgress(prev => prev.filter(p => p.sessionId !== id))
      return true
    } catch (err) {
      setSessionError('Failed to delete therapy session')
      return false
    }
  }, [])
  
  // Progress operations
  const updateProgress = useCallback(async (
    sessionId: string,
    progressValue: number,
    notes?: string
  ) => {
    try {
      setSessions(prev => prev.map(session =>
        session.id === sessionId
          ? { 
              ...session, 
              progress: progressValue,
              notes: notes || session.notes,
              notesAr: notes || session.notesAr,
              updatedAt: new Date().toISOString()
            }
          : session
      ))
    } catch (err) {
      setProgressError('Failed to update progress')
    }
  }, [])
  
  const addProgressMetric = useCallback(async (
    metric: Omit<TherapyProgress, 'lastUpdated'>
  ) => {
    try {
      const newMetric: TherapyProgress = {
        ...metric,
        lastUpdated: new Date().toISOString()
      }
      
      setProgress(prev => [...prev, newMetric])
    } catch (err) {
      setProgressError('Failed to add progress metric')
    }
  }, [])
  
  // Utility functions
  const getSessionsByType = useCallback((type: TherapySession['type']) => {
    return sessions.filter(session => session.type === type)
  }, [sessions])
  
  const getUpcomingSessions = useCallback(() => {
    const now = new Date()
    return sessions
      .filter(session => 
        session.status === 'scheduled' && 
        new Date(session.date) > now
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [sessions])
  
  const getCompletedSessions = useCallback(() => {
    return sessions.filter(session => session.status === 'completed')
  }, [sessions])
  
  const getSessionProgress = useCallback((sessionId: string) => {
    return progress.filter(p => p.sessionId === sessionId)
  }, [progress])
  
  // Arabic formatting functions
  const formatSessionTitle = useCallback((session: TherapySession) => {
    const title = isArabic ? session.titleAr : session.title
    return formatText(title)
  }, [isArabic, formatText])
  
  const formatSessionDescription = useCallback((session: TherapySession) => {
    const description = isArabic ? session.descriptionAr : session.description
    return formatText(description)
  }, [isArabic, formatText])
  
  const formatProgressMetric = useCallback((progressItem: TherapyProgress) => {
    const metric = isArabic ? progressItem.metricAr : progressItem.metric
    const unit = isArabic ? progressItem.unitAr : progressItem.unit
    return `${formatText(metric)}: ${progressItem.value}${unit}`
  }, [isArabic, formatText])
  
  // Load initial data
  useEffect(() => {
    if (initialStudentId) {
      fetchSessions(initialStudentId)
      fetchStats(initialStudentId)
    }
  }, [initialStudentId, fetchSessions, fetchStats])
  
  return {
    // Data state
    sessions,
    progress,
    stats,
    
    // Loading states
    isLoading,
    isLoadingSessions,
    isLoadingProgress,
    isLoadingStats,
    
    // Error states
    error,
    sessionError,
    progressError,
    statsError,
    
    // Data operations
    fetchSessions,
    fetchProgress,
    fetchStats,
    
    // CRUD operations
    createSession,
    updateSession,
    deleteSession,
    
    // Progress operations
    updateProgress,
    addProgressMetric,
    
    // Utility functions
    getSessionsByType,
    getUpcomingSessions,
    getCompletedSessions,
    getSessionProgress,
    
    // Arabic formatting
    formatSessionTitle,
    formatSessionDescription,
    formatProgressMetric
  }
}

// Usage Examples:

/*
// Basic therapy data management
function TherapyDashboard({ studentId }: { studentId: string }) {
  const {
    sessions,
    stats,
    isLoading,
    error,
    getUpcomingSessions,
    formatSessionTitle
  } = useTherapyData(studentId)
  
  if (isLoading) return <div>جاري التحميل...</div>
  if (error) return <div>خطأ: {error}</div>
  
  const upcomingSessions = getUpcomingSessions()
  
  return (
    <div>
      <h2>لوحة العلاج</h2>
      {stats && (
        <div>
          <p>إجمالي الجلسات: {stats.totalSessions}</p>
          <p>الجلسات المكتملة: {stats.completedSessions}</p>
          <p>متوسط التقدم: {stats.averageProgress}%</p>
        </div>
      )}
      
      <h3>الجلسات القادمة</h3>
      {upcomingSessions.map(session => (
        <div key={session.id}>
          <h4>{formatSessionTitle(session)}</h4>
          <p>التاريخ: {new Date(session.date).toLocaleDateString('ar')}</p>
          <p>المدة: {session.duration} دقيقة</p>
        </div>
      ))}
    </div>
  )
}

// Session management with progress tracking
function SessionManager() {
  const {
    sessions,
    updateProgress,
    updateSession,
    formatSessionDescription
  } = useTherapyData()
  
  const handleProgressUpdate = async (sessionId: string, progress: number) => {
    await updateProgress(sessionId, progress, 'تحديث التقدم')
  }
  
  const handleStatusChange = async (sessionId: string, status: string) => {
    await updateSession(sessionId, { status: status as any })
  }
  
  return (
    <div>
      {sessions.map(session => (
        <div key={session.id} className="session-card">
          <h3>{formatSessionDescription(session)}</h3>
          <div>التقدم: {session.progress}%</div>
          <input
            type="range"
            min="0"
            max="100"
            value={session.progress}
            onChange={(e) => handleProgressUpdate(session.id, parseInt(e.target.value))}
          />
          <select
            value={session.status}
            onChange={(e) => handleStatusChange(session.id, e.target.value)}
          >
            <option value="scheduled">مجدولة</option>
            <option value="in-progress">قيد التنفيذ</option>
            <option value="completed">مكتملة</option>
            <option value="cancelled">ملغية</option>
          </select>
        </div>
      ))}
    </div>
  )
}
*/
