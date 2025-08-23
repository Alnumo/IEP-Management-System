import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Calendar, 
  MessageCircle, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Bell,



  TrendingUp
} from 'lucide-react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ParentMobileNav } from '@/components/parent/ParentMobileNav'
import { ParentDesktopNav } from '@/components/parent/ParentDesktopNav'
import { parentPortalService } from '@/services/parent-portal'
import type { ParentDashboardData, ParentUser } from '@/types/parent-portal'

export default function ParentDashboardPage() {
  const [dashboardData, setDashboardData] = useState<ParentDashboardData | null>(null)
  const [parentUser, setParentUser] = useState<ParentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Check authentication
    const storedUser = localStorage.getItem('parentUser')
    if (!storedUser) {
      navigate('/parent-login')
      return
    }

    const user = JSON.parse(storedUser)
    setParentUser(user)
    loadDashboardData(user.id)
  }, [navigate])

  const loadDashboardData = async (parentId: string) => {
    try {
      const data = await parentPortalService.getParentDashboard(parentId)
      setDashboardData(data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setError('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('parentUser')
    localStorage.removeItem('parentSession')
    navigate('/parent-login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جار تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => loadDashboardData(parentUser?.id || '')}>
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Desktop Navigation */}
      <ParentDesktopNav 
        onLogout={handleLogout}
        parentName={`${parentUser?.firstName || ''} ${parentUser?.lastName || ''}`.trim() || 'ولي الأمر'}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 text-right mb-2">
            أهلاً وسهلاً، {parentUser?.firstName} {parentUser?.lastName}
          </h1>
          <p className="text-gray-600 text-right">
            تابع تقدم أطفالك والتواصل مع الفريق العلاجي
          </p>
        </div>

        {/* Quick Actions - Mobile */}
        <div className="mb-8 md:hidden">
          <h2 className="text-lg font-semibold text-gray-900 text-right mb-4">إجراءات سريعة</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/parent-messages" className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-end">
                <div className="text-right mr-3">
                  <p className="font-medium text-gray-900">الرسائل</p>
                  <p className="text-sm text-gray-600">{dashboardData?.quickStats.unreadMessages || 0} جديدة</p>
                </div>
                <MessageCircle className="w-8 h-8 text-purple-600" />
              </div>
            </Link>
            
            <Link to="/parent-appointments" className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-end">
                <div className="text-right mr-3">
                  <p className="font-medium text-gray-900">المواعيد</p>
                  <p className="text-sm text-gray-600">{dashboardData?.quickStats.upcomingSessionsThisWeek || 0} هذا الأسبوع</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </Link>
            
            <Link to="/parent-home-programs" className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-end">
                <div className="text-right mr-3">
                  <p className="font-medium text-gray-900">الأنشطة</p>
                  <p className="text-sm text-gray-600">{dashboardData?.pendingHomeProgramActivities.length || 0} معلقة</p>
                </div>
                <Users className="w-8 h-8 text-orange-600" />
              </div>
            </Link>
            
            <Link to="/parent-documents" className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-end">
                <div className="text-right mr-3">
                  <p className="font-medium text-gray-900">الوثائق</p>
                  <p className="text-sm text-gray-600">{dashboardData?.recentDocuments.length || 0} مستندات</p>
                </div>
                <FileText className="w-8 h-8 text-indigo-600" />
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <p className="text-blue-800 text-sm font-medium">الأطفال المسجلون</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {dashboardData?.quickStats.totalChildrenEnrolled || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <p className="text-green-800 text-sm font-medium">جلسات هذا الأسبوع</p>
                  <p className="text-2xl font-bold text-green-900">
                    {dashboardData?.quickStats.upcomingSessionsThisWeek || 0}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <p className="text-purple-800 text-sm font-medium">رسائل جديدة</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {dashboardData?.quickStats.unreadMessages || 0}
                  </p>
                </div>
                <MessageCircle className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <p className="text-orange-800 text-sm font-medium">أنشطة منزلية</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {dashboardData?.quickStats.completedHomeProgramsThisWeek || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Children Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-right">
                  <TrendingUp className="w-5 h-5 ml-2" />
                  تقدم الأطفال
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.childrenProgress.length ? (
                  <div className="space-y-4">
                    {dashboardData.childrenProgress.map((child, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">{child.childName}</h3>
                          <div className="flex items-center">
                            <span className="text-sm text-gray-600 ml-2">التقدم العام</span>
                            <span className="font-bold text-green-600">
                              {child.overallProgressScore}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${child.overallProgressScore}%` }}
                          ></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="text-right">
                            <p className="text-gray-600">البرامج الحالية:</p>
                            <p className="font-medium">{child.currentPrograms.length}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-600">معدل الحضور:</p>
                            <p className="font-medium">{child.attendanceRate}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-600">آخر جلسة:</p>
                            <p className="font-medium">
                              {new Date(child.lastSessionDate).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-600">الجلسة القادمة:</p>
                            <p className="font-medium">
                              {new Date(child.nextSessionDate).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    لا توجد بيانات تقدم متاحة حالياً
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageCircle className="w-5 h-5 ml-2" />
                    الرسائل الحديثة
                  </div>
                  <Button variant="outline" size="sm">
                    عرض الكل
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.recentMessages.length ? (
                  <div className="space-y-3">
                    {dashboardData.recentMessages.map((message, index) => (
                      <div key={index} className="border-b border-gray-200 pb-3 last:border-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-medium text-gray-900 text-right">
                            {message.subject}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {new Date(message.sentAt).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 text-right mb-1">
                          من: {message.senderName}
                        </p>
                        <p className="text-sm text-gray-700 text-right line-clamp-2">
                          {message.messageContent}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    لا توجد رسائل جديدة
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-right">
                  <Clock className="w-5 h-5 ml-2" />
                  المواعيد القادمة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.upcomingAppointments.length ? (
                  <div className="space-y-3">
                    {dashboardData.upcomingAppointments.slice(0, 3).map((appointment, index) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-3">
                        <div className="text-right">
                          <p className="font-medium text-blue-900">
                            {appointment.childName}
                          </p>
                          <p className="text-sm text-blue-700">
                            {appointment.sessionType}
                          </p>
                          <p className="text-sm text-blue-600">
                            {new Date(appointment.scheduledDate).toLocaleDateString('ar-SA')}
                          </p>
                          <p className="text-sm text-blue-600">
                            {appointment.scheduledTime}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    لا توجد مواعيد قادمة
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Home Programs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-right">
                  <FileText className="w-5 h-5 ml-2" />
                  الأنشطة المنزلية
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.pendingHomeProgramActivities.length ? (
                  <div className="space-y-3">
                    {dashboardData.pendingHomeProgramActivities.slice(0, 3).map((program, index) => (
                      <div key={index} className="bg-orange-50 rounded-lg p-3">
                        <div className="text-right">
                          <p className="font-medium text-orange-900">
                            {program.programTitle}
                          </p>
                          <p className="text-sm text-orange-700">
                            {program.description}
                          </p>
                          <p className="text-sm text-orange-600">
                            المدة المقدرة: {program.estimatedDuration} دقيقة
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    لا توجد أنشطة منزلية معلقة
                  </p>
                )}
              </CardContent>
            </Card>

            {/* System Announcements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-right">
                  <Bell className="w-5 h-5 ml-2" />
                  الإعلانات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.systemAnnouncements.length ? (
                  <div className="space-y-3">
                    {dashboardData.systemAnnouncements.map((announcement, index) => (
                      <div key={index} className="bg-yellow-50 border-r-4 border-yellow-400 p-3">
                        <div className="text-right">
                          <h4 className="font-medium text-yellow-900">
                            {announcement.title}
                          </h4>
                          <p className="text-sm text-yellow-800">
                            {announcement.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    لا توجد إعلانات جديدة
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <ParentMobileNav />
    </div>
  )
}