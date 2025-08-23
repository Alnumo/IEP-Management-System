import { useState, useEffect } from 'react'
import { 
  User, 
  Calendar, 
  MessageCircle, 
  FileText, 
  TrendingUp, 
  Clock,
  CheckCircle,
  Star,
  Eye,
  Brain,
  Target,
  Award,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useLanguage } from '@/contexts/LanguageContext'
import { parentPortalService } from '@/services/parent-portal'
import type { ParentDashboardData, ChildProgress } from '@/types/parent-portal'
import { formatDate } from '@/lib/utils'

interface ParentDashboardProps {
  parentId: string
}

export const ParentDashboard = ({ parentId }: ParentDashboardProps) => {
  const { language, isRTL } = useLanguage()
  const [dashboardData, setDashboardData] = useState<ParentDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedChild, setSelectedChild] = useState<string>('')

  useEffect(() => {
    loadDashboardData()
  }, [parentId])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const data = await parentPortalService.getParentDashboard(parentId)
      setDashboardData(data)
      
      // Set first child as selected by default
      if (data.childrenProgress.length > 0 && !selectedChild) {
        setSelectedChild(data.childrenProgress[0].childId)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSelectedChildData = (): ChildProgress | null => {
    return dashboardData?.childrenProgress.find(child => child.childId === selectedChild) || null
  }


  const getAchievementIcon = (category: string) => {
    switch (category) {
      case 'communication': return MessageCircle
      case 'social': return User
      case 'motor': return Activity
      case 'cognitive': return Brain
      case 'behavioral': return Target
      default: return Award
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default'
      case 'confirmed': return 'secondary'
      case 'completed': return 'outline'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}
          </p>
        </div>
      </div>
    )
  }

  const selectedChildData = getSelectedChildData()

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'لوحة تحكم ولي الأمر' : 'Parent Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'متابعة تقدم الأطفال والتواصل مع المعالجين'
              : 'Track your children\'s progress and communicate with therapists'
            }
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'الأطفال المسجلين' : 'Enrolled Children'}
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.quickStats.totalChildrenEnrolled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'الجلسات هذا الأسبوع' : 'Sessions This Week'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardData.quickStats.upcomingSessionsThisWeek}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'الأنشطة المنزلية' : 'Home Activities'}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData.quickStats.completedHomeProgramsThisWeek}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'الرسائل الجديدة' : 'New Messages'}
            </CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboardData.quickStats.unreadMessages}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Child Selection */}
      {dashboardData.childrenProgress.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'ar' ? 'اختيار الطفل' : 'Select Child'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {dashboardData.childrenProgress.map((child) => (
                <Button
                  key={child.childId}
                  variant={selectedChild === child.childId ? 'default' : 'outline'}
                  onClick={() => setSelectedChild(child.childId)}
                  className="gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={child.profilePhoto} />
                    <AvatarFallback>
                      {child.childName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {child.childName}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="progress" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="progress" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            {language === 'ar' ? 'التقدم' : 'Progress'}
          </TabsTrigger>
          <TabsTrigger value="appointments" className="gap-2">
            <Calendar className="h-4 w-4" />
            {language === 'ar' ? 'المواعيد' : 'Appointments'}
          </TabsTrigger>
          <TabsTrigger value="home-programs" className="gap-2">
            <FileText className="h-4 w-4" />
            {language === 'ar' ? 'الأنشطة المنزلية' : 'Home Programs'}
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            {language === 'ar' ? 'الرسائل' : 'Messages'}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            {language === 'ar' ? 'المستندات' : 'Documents'}
          </TabsTrigger>
        </TabsList>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          {selectedChildData && (
            <>
              {/* Child Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedChildData.profilePhoto} />
                      <AvatarFallback className="text-lg">
                        {selectedChildData.childName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <CardTitle className="text-2xl">{selectedChildData.childName}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          {language === 'ar' ? 'معدل التقدم:' : 'Progress Score:'} {selectedChildData.overallProgressScore}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {language === 'ar' ? 'آخر جلسة:' : 'Last Session:'} {formatDate(selectedChildData.lastSessionDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          {language === 'ar' ? 'معدل الحضور:' : 'Attendance:'} {selectedChildData.attendanceRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Current Programs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    {language === 'ar' ? 'البرامج الحالية' : 'Current Programs'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedChildData.currentPrograms.map((program) => (
                      <Card key={program.programId} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{program.programName}</CardTitle>
                            <Badge variant="secondary">{program.programType}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'المعالج:' : 'Therapist:'} {program.therapistName}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>{language === 'ar' ? 'التقدم' : 'Progress'}</span>
                              <span className="font-medium">{program.progressPercentage}%</span>
                            </div>
                            <Progress value={program.progressPercentage} className="h-2" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                {language === 'ar' ? 'المستوى الحالي:' : 'Current Level:'}
                              </span>
                              <div className="font-medium">{program.currentLevel}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                {language === 'ar' ? 'الجلسات الأسبوعية:' : 'Weekly Sessions:'}
                              </span>
                              <div className="font-medium">
                                {program.weeklySessionsCompleted}/{program.weeklySessionsTarget}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                {language === 'ar' ? 'الهدف التالي:' : 'Next Milestone:'}
                              </span>
                              <div className="font-medium">{program.nextMilestone}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    {language === 'ar' ? 'الإنجازات الحديثة' : 'Recent Achievements'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedChildData.recentAchievements.map((achievement) => {
                      const IconComponent = getAchievementIcon(achievement.category)
                      return (
                        <div key={achievement.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${
                              achievement.significance === 'major' ? 'bg-yellow-100 text-yellow-700' :
                              achievement.significance === 'milestone' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <h4 className="font-semibold">{achievement.title}</h4>
                              <p className="text-sm text-muted-foreground">{achievement.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{formatDate(achievement.achievedAt)}</span>
                                <span>{achievement.therapistName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {achievement.category}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {achievement.significance === 'major' && <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
                              {achievement.significance === 'milestone' && <Award className="h-5 w-5 fill-green-400 text-green-400" />}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {language === 'ar' ? 'المواعيد القادمة' : 'Upcoming Appointments'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.upcomingAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'لا توجد مواعيد قادمة' : 'No upcoming appointments'}
                  </div>
                ) : (
                  dashboardData.upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{appointment.childName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {appointment.sessionType} - {appointment.therapistName}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'ar' ? 'التاريخ:' : 'Date:'}
                          </span>
                          <div className="font-medium">{formatDate(appointment.scheduledDate)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'ar' ? 'الوقت:' : 'Time:'}
                          </span>
                          <div className="font-medium">{appointment.scheduledTime}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'ar' ? 'المدة:' : 'Duration:'}
                          </span>
                          <div className="font-medium">{appointment.duration} {language === 'ar' ? 'دقيقة' : 'min'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'ar' ? 'الغرفة:' : 'Room:'}
                          </span>
                          <div className="font-medium">{appointment.roomNumber || '-'}</div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Eye className="h-4 w-4" />
                          {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                        </Button>
                        {appointment.canReschedule && (
                          <Button variant="outline" size="sm" className="gap-2">
                            <Clock className="h-4 w-4" />
                            {language === 'ar' ? 'إعادة جدولة' : 'Reschedule'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Home Programs Tab */}
        <TabsContent value="home-programs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {language === 'ar' ? 'الأنشطة المنزلية' : 'Home Programs'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.pendingHomeProgramActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'لا توجد أنشطة منزلية معلقة' : 'No pending home activities'}
                  </div>
                ) : (
                  dashboardData.pendingHomeProgramActivities.map((program) => (
                    <div key={program.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <h4 className="font-semibold">{program.programTitle}</h4>
                          <p className="text-sm text-muted-foreground">{program.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{language === 'ar' ? 'مقدم من:' : 'Assigned by:'} {program.assignedByName}</span>
                            <span>{formatDate(program.assignedDate)}</span>
                            <span>{program.estimatedDuration} {language === 'ar' ? 'دقيقة' : 'minutes'}</span>
                          </div>
                        </div>
                        <Badge variant={
                          program.priority === 'high' ? 'destructive' :
                          program.priority === 'medium' ? 'default' :
                          'secondary'
                        }>
                          {program.priority} {language === 'ar' ? 'الأولوية' : 'priority'}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Eye className="h-4 w-4" />
                          {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                        </Button>
                        <Button variant="default" size="sm" className="gap-2">
                          <CheckCircle className="h-4 w-4" />
                          {language === 'ar' ? 'تسجيل كمكتمل' : 'Mark Complete'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {language === 'ar' ? 'الرسائل الحديثة' : 'Recent Messages'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'لا توجد رسائل' : 'No messages'}
                  </div>
                ) : (
                  dashboardData.recentMessages.slice(0, 5).map((message) => (
                    <div key={message.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{message.senderName}</h4>
                            {!message.isRead && <Badge variant="default" className="text-xs">جديد</Badge>}
                            {message.isUrgent && <Badge variant="destructive" className="text-xs">عاجل</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.messageContent}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(message.sentAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {language === 'ar' ? 'المستندات' : 'Documents'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'قريباً - إدارة المستندات' : 'Coming Soon - Document Management'}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}