import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  Target, 
  TrendingUp, 
  Award, 
  MessageSquare, 
  FileText, 
  Download, 
  Bell,
  Heart,
  Star,
  ChevronRight,
  Play,
  BookOpen,
  Camera,
  Video,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useLanguage } from '@/contexts/LanguageContext'
import { analyticsService } from '@/services/analytics-service'
import { StudentProgressTracker } from '@/components/progress/StudentProgressTracker'
import type { StudentProgressSummary } from '@/types/progress-analytics'

interface ParentPortalProps {
  parentId: string
  className?: string
}

interface StudentInfo {
  id: string
  name: string
  age: number
  avatar?: string
  diagnosis: string
  enrollmentDate: string
  therapyPrograms: string[]
  primaryTherapist: {
    name: string
    avatar?: string
    specialization: string
    email: string
    phone: string
  }
}

interface PortalNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'alert'
  title: string
  message: string
  date: string
  read: boolean
  actionUrl?: string
}

interface UpcomingSession {
  id: string
  date: string
  time: string
  type: string
  therapist: string
  room: string
  duration: number
  status: 'scheduled' | 'confirmed' | 'cancelled'
}

interface RecentActivity {
  id: string
  type: 'session' | 'progress' | 'milestone' | 'message'
  title: string
  description: string
  date: string
  data?: any
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export const ParentPortal: React.FC<ParentPortalProps> = ({
  parentId,
  className = ''
}) => {
  const { language, isRTL } = useLanguage()

  // State management
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [progressSummary, setProgressSummary] = useState<StudentProgressSummary | null>(null)
  const [notifications, setNotifications] = useState<PortalNotification[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'sessions' | 'communication' | 'resources'>('overview')

  useEffect(() => {
    loadPortalData()
  }, [parentId])

  useEffect(() => {
    if (selectedStudent) {
      loadStudentProgressData()
    }
  }, [selectedStudent])

  const loadPortalData = async () => {
    try {
      setLoading(true)
      
      // Load parent's students
      const studentsData = await loadStudents()
      setStudents(studentsData)
      
      if (studentsData.length > 0) {
        setSelectedStudent(studentsData[0].id)
      }

      // Load notifications
      const notificationsData = await loadNotifications()
      setNotifications(notificationsData)

      // Load upcoming sessions
      const sessionsData = await loadUpcomingSessions()
      setUpcomingSessions(sessionsData)

      // Load recent activities
      const activitiesData = await loadRecentActivities()
      setRecentActivities(activitiesData)

    } catch (error) {
      console.error('Error loading portal data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async (): Promise<StudentInfo[]> => {
    // Mock data - replace with actual API call
    return [
      {
        id: 'student-1',
        name: 'أحمد محمد',
        age: 8,
        avatar: '/avatars/student1.jpg',
        diagnosis: 'اضطراب طيف التوحد',
        enrollmentDate: '2023-09-01',
        therapyPrograms: ['تحليل السلوك التطبيقي', 'علاج النطق', 'العلاج الوظيفي'],
        primaryTherapist: {
          name: 'د. سارة أحمد',
          avatar: '/avatars/therapist1.jpg',
          specialization: 'تحليل السلوك التطبيقي',
          email: 'sarah.ahmed@center.com',
          phone: '+966501234567'
        }
      },
      {
        id: 'student-2',
        name: 'فاطمة علي',
        age: 6,
        avatar: '/avatars/student2.jpg',
        diagnosis: 'تأخر في النطق',
        enrollmentDate: '2024-01-15',
        therapyPrograms: ['علاج النطق', 'العلاج الوظيفي'],
        primaryTherapist: {
          name: 'د. محمد حسن',
          avatar: '/avatars/therapist2.jpg',
          specialization: 'علاج النطق',
          email: 'mohammed.hassan@center.com',
          phone: '+966501234568'
        }
      }
    ]
  }

  const loadStudentProgressData = async () => {
    try {
      if (!selectedStudent) return

      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 3)

      const summary = await analyticsService.getStudentProgressSummary(
        selectedStudent,
        startDate.toISOString().split('T')[0],
        endDate
      )
      
      setProgressSummary(summary)
    } catch (error) {
      console.error('Error loading student progress:', error)
    }
  }

  const loadNotifications = async (): Promise<PortalNotification[]> => {
    // Mock data - replace with actual API call
    return [
      {
        id: 'notif-1',
        type: 'info',
        title: language === 'ar' ? 'جلسة جديدة مجدولة' : 'New Session Scheduled',
        message: language === 'ar' ? 'تم جدولة جلسة علاج النطق ليوم الثلاثاء القادم' : 'Speech therapy session scheduled for next Tuesday',
        date: '2024-01-15T09:00:00Z',
        read: false
      },
      {
        id: 'notif-2',
        type: 'success',
        title: language === 'ar' ? 'إنجاز هدف جديد' : 'New Goal Achieved',
        message: language === 'ar' ? 'أحمد حقق هدف التواصل البصري بنجاح' : 'Ahmed successfully achieved eye contact goal',
        date: '2024-01-14T14:30:00Z',
        read: false
      },
      {
        id: 'notif-3',
        type: 'warning',
        title: language === 'ar' ? 'تذكير بالدفع' : 'Payment Reminder',
        message: language === 'ar' ? 'مستحق دفع رسوم شهر يناير' : 'January fees payment due',
        date: '2024-01-13T10:00:00Z',
        read: true
      }
    ]
  }

  const loadUpcomingSessions = async (): Promise<UpcomingSession[]> => {
    // Mock data - replace with actual API call
    return [
      {
        id: 'session-1',
        date: '2024-01-16',
        time: '09:00',
        type: 'تحليل السلوك التطبيقي',
        therapist: 'د. سارة أحمد',
        room: 'الغرفة 101',
        duration: 60,
        status: 'confirmed'
      },
      {
        id: 'session-2',
        date: '2024-01-17',
        time: '14:00',
        type: 'علاج النطق',
        therapist: 'د. محمد حسن',
        room: 'الغرفة 203',
        duration: 45,
        status: 'scheduled'
      },
      {
        id: 'session-3',
        date: '2024-01-18',
        time: '10:30',
        type: 'العلاج الوظيفي',
        therapist: 'د. ليلى قاسم',
        room: 'الغرفة 105',
        duration: 45,
        status: 'scheduled'
      }
    ]
  }

  const loadRecentActivities = async (): Promise<RecentActivity[]> => {
    // Mock data - replace with actual API call
    return [
      {
        id: 'activity-1',
        type: 'milestone',
        title: language === 'ar' ? 'تحقيق معلم جديد' : 'New Milestone Achieved',
        description: language === 'ar' ? 'أحمد حقق هدف التواصل البصري لمدة 5 ثوانٍ' : 'Ahmed achieved 5-second eye contact goal',
        date: '2024-01-14T14:30:00Z'
      },
      {
        id: 'activity-2',
        type: 'session',
        title: language === 'ar' ? 'جلسة علاجية مكتملة' : 'Therapy Session Completed',
        description: language === 'ar' ? 'جلسة تحليل السلوك - تقدم ممتاز في المهارات الاجتماعية' : 'ABA session - excellent progress in social skills',
        date: '2024-01-14T10:00:00Z'
      },
      {
        id: 'activity-3',
        type: 'message',
        title: language === 'ar' ? 'رسالة من المعالج' : 'Message from Therapist',
        description: language === 'ar' ? 'د. سارة أرسلت تحديثاً عن تقدم أحمد' : 'Dr. Sarah sent an update about Ahmed\'s progress',
        date: '2024-01-13T16:45:00Z'
      }
    ]
  }

  const getNotificationIcon = (type: PortalNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-600" />
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'session':
        return <Calendar className="w-5 h-5 text-blue-600" />
      case 'progress':
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'milestone':
        return <Award className="w-5 h-5 text-purple-600" />
      case 'message':
        return <MessageSquare className="w-5 h-5 text-orange-600" />
      default:
        return <Info className="w-5 h-5 text-gray-600" />
    }
  }

  const selectedStudentInfo = students.find(s => s.id === selectedStudent)

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Student Selection & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'ملف الطالب' : 'Student Profile'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedStudentInfo && (
              <>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={selectedStudentInfo.avatar} />
                    <AvatarFallback>{selectedStudentInfo.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {selectedStudentInfo.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {language === 'ar' ? `العمر: ${selectedStudentInfo.age} سنوات` : `Age: ${selectedStudentInfo.age} years`}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">{language === 'ar' ? 'التشخيص:' : 'Diagnosis:'} </span>
                    <span className="text-gray-600">{selectedStudentInfo.diagnosis}</span>
                  </div>
                  <div>
                    <span className="font-medium">{language === 'ar' ? 'تاريخ التسجيل:' : 'Enrollment:'} </span>
                    <span className="text-gray-600">
                      {new Date(selectedStudentInfo.enrollmentDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'البرامج العلاجية' : 'Therapy Programs'}
                  </h4>
                  <div className="space-y-1">
                    {selectedStudentInfo.therapyPrograms.map((program, index) => (
                      <Badge key={index} variant="outline" className="block text-center">
                        {program}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'المعالج الأساسي' : 'Primary Therapist'}
                  </h4>
                  <div className="flex items-center space-x-2 mb-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={selectedStudentInfo.primaryTherapist.avatar} />
                      <AvatarFallback>{selectedStudentInfo.primaryTherapist.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{selectedStudentInfo.primaryTherapist.name}</p>
                      <p className="text-xs text-gray-600">{selectedStudentInfo.primaryTherapist.specialization}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1 flex items-center justify-center">
                      <Mail className="w-3 h-3 mr-1" />
                      {language === 'ar' ? 'رسالة' : 'Message'}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 flex items-center justify-center">
                      <Phone className="w-3 h-3 mr-1" />
                      {language === 'ar' ? 'اتصال' : 'Call'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'نظرة عامة على التقدم' : 'Progress Overview'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'آخر 3 أشهر' : 'Last 3 months'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {progressSummary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {progressSummary.overall_progress_score}%
                  </div>
                  <div className="text-sm text-blue-800">
                    {language === 'ar' ? 'النتيجة الإجمالية' : 'Overall Score'}
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {progressSummary.goal_metrics.length}
                  </div>
                  <div className="text-sm text-green-800">
                    {language === 'ar' ? 'الأهداف النشطة' : 'Active Goals'}
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {progressSummary.session_attendance.attendance_percentage}%
                  </div>
                  <div className="text-sm text-purple-800">
                    {language === 'ar' ? 'معدل الحضور' : 'Attendance Rate'}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Progress Chart */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { month: 'Oct', progress: 65, goals: 8 },
                    { month: 'Nov', progress: 72, goals: 9 },
                    { month: 'Dec', progress: 78, goals: 10 },
                    { month: 'Jan', progress: progressSummary?.overall_progress_score || 85, goals: progressSummary?.goal_metrics.length || 12 }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="progress" 
                    stroke={CHART_COLORS[0]} 
                    fill={CHART_COLORS[0]}
                    fillOpacity={0.3}
                    name={language === 'ar' ? 'التقدم %' : 'Progress %'}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Sessions & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={`flex items-center ${language === 'ar' ? 'font-arabic' : ''}`}>
              <CalendarIcon className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'الجلسات القادمة' : 'Upcoming Sessions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingSessions.slice(0, 3).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <Badge 
                        variant={session.status === 'confirmed' ? 'default' : 'outline'}
                        className="mr-2"
                      >
                        {session.status === 'confirmed' ? 
                          (language === 'ar' ? 'مؤكدة' : 'Confirmed') : 
                          (language === 'ar' ? 'مجدولة' : 'Scheduled')
                        }
                      </Badge>
                      <span className="font-medium text-sm">{session.type}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{session.therapist}</p>
                      <p>
                        {new Date(`${session.date}T${session.time}`).toLocaleDateString()} - {session.time}
                      </p>
                      <p>{session.room} • {session.duration} {language === 'ar' ? 'دقيقة' : 'min'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <Button variant="outline" size="sm">
                      <Video className="w-3 h-3 mr-1" />
                      {language === 'ar' ? 'انضمام' : 'Join'}
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                {language === 'ar' ? 'عرض جميع الجلسات' : 'View All Sessions'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={`flex items-center ${language === 'ar' ? 'font-arabic' : ''}`}>
              <Activity className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'النشاطات الحديثة' : 'Recent Activities'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.slice(0, 4).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <h4 className={`font-medium text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {activity.title}
                    </h4>
                    <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                {language === 'ar' ? 'عرض جميع النشاطات' : 'View All Activities'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className={`flex items-center ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Bell className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'التنبيهات' : 'Notifications'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.slice(0, 3).map((notification) => (
              <Alert key={notification.id} className={`${!notification.read ? 'border-blue-200 bg-blue-50' : ''}`}>
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <AlertTitle className={language === 'ar' ? 'font-arabic' : ''}>
                      {notification.title}
                    </AlertTitle>
                    <AlertDescription className={language === 'ar' ? 'font-arabic' : ''}>
                      {notification.message}
                    </AlertDescription>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.date).toLocaleDateString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </div>
              </Alert>
            ))}
            <Button variant="outline" className="w-full">
              {language === 'ar' ? 'عرض جميع التنبيهات' : 'View All Notifications'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderProgressTab = () => (
    <div className="space-y-6">
      {selectedStudent && (
        <StudentProgressTracker
          studentId={selectedStudent}
          className="w-full"
        />
      )}
    </div>
  )

  const renderSessionsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'التقويم' : 'Calendar'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Session List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'الجلسات المجدولة' : 'Scheduled Sessions'}
            </CardTitle>
            <CardDescription>
              {selectedDate?.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {session.type}
                    </h3>
                    <Badge 
                      variant={session.status === 'confirmed' ? 'default' : 'outline'}
                      className={session.status === 'confirmed' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {session.status === 'confirmed' ? 
                        (language === 'ar' ? 'مؤكدة' : 'Confirmed') : 
                        (language === 'ar' ? 'مجدولة' : 'Scheduled')
                      }
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {session.time} ({session.duration} {language === 'ar' ? 'دقيقة' : 'min'})
                    </div>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      {session.therapist}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {session.room}
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-4">
                    <Button size="sm" className="flex items-center">
                      <Video className="w-3 h-3 mr-1" />
                      {language === 'ar' ? 'انضمام للجلسة' : 'Join Session'}
                    </Button>
                    <Button variant="outline" size="sm">
                      {language === 'ar' ? 'تفاصيل' : 'Details'}
                    </Button>
                    <Button variant="outline" size="sm">
                      {language === 'ar' ? 'إعادة جدولة' : 'Reschedule'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderCommunicationTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center ${language === 'ar' ? 'font-arabic' : ''}`}>
              <MessageSquare className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'الرسائل' : 'Messages'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center mb-2">
                  <Avatar className="w-8 h-8 mr-2">
                    <AvatarFallback>د.س</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">د. سارة أحمد</p>
                    <p className="text-xs text-gray-500">2024-01-15 14:30</p>
                  </div>
                </div>
                <p className={`text-sm text-gray-700 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 
                    'أحمد أظهر تقدماً ممتازاً في جلسة اليوم. لاحظنا تحسناً في التواصل البصري والاستجابة للتعليمات.' :
                    'Ahmed showed excellent progress in today\'s session. We noticed improvement in eye contact and response to instructions.'
                  }
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center mb-2">
                  <Avatar className="w-8 h-8 mr-2">
                    <AvatarFallback>د.م</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">د. محمد حسن</p>
                    <p className="text-xs text-gray-500">2024-01-14 16:00</p>
                  </div>
                </div>
                <p className={`text-sm text-gray-700 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 
                    'نرجو منكم ممارسة التمارين المرسلة في المنزل، خاصة تمارين النطق.' :
                    'Please practice the exercises sent home, especially the speech exercises.'
                  }
                </p>
              </div>

              <Button className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إرسال رسالة جديدة' : 'Send New Message'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Video Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center ${language === 'ar' ? 'font-arabic' : ''}`}>
              <Video className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'الجلسات المرئية' : 'Video Sessions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert>
                <Video className="w-4 h-4" />
                <AlertTitle className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'جلسة قادمة اليوم' : 'Upcoming Session Today'}
                </AlertTitle>
                <AlertDescription className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 
                    'جلسة علاج النطق في الساعة 2:00 مساءً' :
                    'Speech therapy session at 2:00 PM'
                  }
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button className="w-full" size="lg">
                  <Play className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'الانضمام للجلسة الآن' : 'Join Session Now'}
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    <Camera className="w-3 h-3 mr-1" />
                    {language === 'ar' ? 'اختبار الكاميرا' : 'Test Camera'}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Phone className="w-3 h-3 mr-1" />
                    {language === 'ar' ? 'اختبار الصوت' : 'Test Audio'}
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'سجل الجلسات' : 'Session History'}
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>2024-01-14 - {language === 'ar' ? 'علاج النطق' : 'Speech Therapy'}</span>
                    <Button variant="outline" size="sm">
                      {language === 'ar' ? 'مشاهدة' : 'Watch'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>2024-01-12 - {language === 'ar' ? 'تحليل السلوك' : 'ABA Therapy'}</span>
                    <Button variant="outline" size="sm">
                      {language === 'ar' ? 'مشاهدة' : 'Watch'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderResourcesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents & Reports */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center ${language === 'ar' ? 'font-arabic' : ''}`}>
              <FileText className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'التقارير والوثائق' : 'Reports & Documents'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-sm">
                      {language === 'ar' ? 'تقرير التقدم - يناير 2024' : 'Progress Report - January 2024'}
                    </p>
                    <p className="text-xs text-gray-500">PDF • 2.3 MB</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-3 h-3 mr-1" />
                  {language === 'ar' ? 'تحميل' : 'Download'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-sm">
                      {language === 'ar' ? 'خطة العلاج المحدثة' : 'Updated Treatment Plan'}
                    </p>
                    <p className="text-xs text-gray-500">PDF • 1.8 MB</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-3 h-3 mr-1" />
                  {language === 'ar' ? 'تحميل' : 'Download'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <p className="font-medium text-sm">
                      {language === 'ar' ? 'تمارين منزلية' : 'Home Exercises'}
                    </p>
                    <p className="text-xs text-gray-500">PDF • 1.2 MB</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-3 h-3 mr-1" />
                  {language === 'ar' ? 'تحميل' : 'Download'}
                </Button>
              </div>

              <Button className="w-full">
                {language === 'ar' ? 'عرض جميع الوثائق' : 'View All Documents'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Educational Resources */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center ${language === 'ar' ? 'font-arabic' : ''}`}>
              <BookOpen className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'الموارد التعليمية' : 'Educational Resources'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg hover:shadow-sm cursor-pointer">
                <div className="flex items-center mb-2">
                  <Video className="w-5 h-5 text-red-600 mr-2" />
                  <span className="font-medium text-sm">
                    {language === 'ar' ? 'فيديوهات تعليمية' : 'Educational Videos'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {language === 'ar' ? '15 فيديو متاح' : '15 videos available'}
                </p>
              </div>

              <div className="p-3 border rounded-lg hover:shadow-sm cursor-pointer">
                <div className="flex items-center mb-2">
                  <BookOpen className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-sm">
                    {language === 'ar' ? 'دليل الأهل' : 'Parent Guide'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {language === 'ar' ? 'نصائح وإرشادات للأهل' : 'Tips and guidance for parents'}
                </p>
              </div>

              <div className="p-3 border rounded-lg hover:shadow-sm cursor-pointer">
                <div className="flex items-center mb-2">
                  <Target className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-sm">
                    {language === 'ar' ? 'أنشطة منزلية' : 'Home Activities'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {language === 'ar' ? 'أنشطة يمكن ممارستها في المنزل' : 'Activities to practice at home'}
                </p>
              </div>

              <div className="p-3 border rounded-lg hover:shadow-sm cursor-pointer">
                <div className="flex items-center mb-2">
                  <Heart className="w-5 h-5 text-pink-600 mr-2" />
                  <span className="font-medium text-sm">
                    {language === 'ar' ? 'دعم الأهل' : 'Parent Support'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {language === 'ar' ? 'مجموعات الدعم والمشورة' : 'Support groups and counseling'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 flex flex-col items-center justify-center">
              <FileText className="w-6 h-6 mb-2" />
              {language === 'ar' ? 'طلب تقرير' : 'Request Report'}
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Calendar className="w-6 h-6 mb-2" />
              {language === 'ar' ? 'حجز جلسة' : 'Book Session'}
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <MessageSquare className="w-6 h-6 mb-2" />
              {language === 'ar' ? 'راسل المعالج' : 'Message Therapist'}
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Star className="w-6 h-6 mb-2" />
              {language === 'ar' ? 'تقييم الخدمة' : 'Rate Service'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold text-gray-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'بوابة الأهل' : 'Parent Portal'}
          </h1>
          <p className={`text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'متابعة تقدم طفلكم والتواصل مع فريق العلاج' : 'Track your child\'s progress and communicate with the therapy team'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {students.length > 1 && (
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          )}
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'تحميل التطبيق' : 'Download App'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="progress" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'التقدم' : 'Progress'}
          </TabsTrigger>
          <TabsTrigger value="sessions" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الجلسات' : 'Sessions'}
          </TabsTrigger>
          <TabsTrigger value="communication" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'التواصل' : 'Communication'}
          </TabsTrigger>
          <TabsTrigger value="resources" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الموارد' : 'Resources'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{renderOverviewTab()}</TabsContent>
        <TabsContent value="progress">{renderProgressTab()}</TabsContent>
        <TabsContent value="sessions">{renderSessionsTab()}</TabsContent>
        <TabsContent value="communication">{renderCommunicationTab()}</TabsContent>
        <TabsContent value="resources">{renderResourcesTab()}</TabsContent>
      </Tabs>
    </div>
  )
}

export default ParentPortal