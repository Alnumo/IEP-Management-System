import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Star, Activity, DollarSign, Heart, Brain, Target, Users, Calendar, ClipboardList, Stethoscope, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePlans } from '@/hooks/usePlans'
import { useStudents } from '@/hooks/useStudents'
import { useEnrollmentStats } from '@/hooks/useEnrollments'
import { useCourses } from '@/hooks/useCourses'
import { useTherapists } from '@/hooks/useTherapists'
import { useSessions } from '@/hooks/useSessions'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export const DashboardPage = () => {
  const navigate = useNavigate()
  const { language, isRTL } = useLanguage()
  const [user, setUser] = useState<any>(null)
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])
  
  // Fetch all data
  const { data: allPlans = [], isLoading: plansLoading } = usePlans({})
  const { data: allStudents = [] } = useStudents()
  const { data: enrollmentStats } = useEnrollmentStats()
  const { data: allCourses = [] } = useCourses()
  const { data: allTherapists = [] } = useTherapists()
  const { data: allSessions = [] } = useSessions()

  // Calculate comprehensive ERP statistics
  const stats = {
    // Students & Enrollments
    totalStudents: allStudents.length,
    activeStudents: allStudents.filter(student => student.status === 'active').length,
    totalEnrollments: enrollmentStats?.total || 0,
    activeEnrollments: enrollmentStats?.enrolled || 0,
    completedEnrollments: enrollmentStats?.completed || 0,
    
    // Programs & Courses
    totalPlans: allPlans.length,
    activePlans: allPlans.filter(plan => plan.is_active).length,
    totalCourses: allCourses.length,
    activeCourses: allCourses.filter(course => new Date(course.end_date || '') > new Date()).length,
    
    // Staff & Sessions
    totalTherapists: allTherapists.length,
    activeTherapists: allTherapists.filter(therapist => therapist.status === 'active').length,
    totalSessions: allSessions.length,
    upcomingSessions: allSessions.filter(session => new Date(session.session_date || '') > new Date()).length,
    
    // Medical & Health (placeholder values until hooks are implemented)
    totalMedicalRecords: 0,
    activeDiagnoses: 0,
    criticalAlerts: 0,
    
    // Therapy Programs (placeholder values until hooks are implemented)
    activePrograms: 0,
    averageProgress: 0,
    
    // Assessments & Goals (placeholder values until hooks are implemented)
    totalAssessments: 0,
    activeGoals: 0,
    achievedGoals: 0,
    goalCompletionRate: 0,
    
    // Financial
    totalRevenue: enrollmentStats?.totalRevenue || 0,
    averagePrice: allPlans.length > 0 
      ? allPlans.reduce((sum, plan) => sum + plan.final_price, 0) / allPlans.length 
      : 0,
    paymentCompletionRate: enrollmentStats?.paymentCompletionRate || 0,
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
          </h1>
          <p className={`text-muted-foreground mb-6 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? 'يجب تسجيل الدخول للوصول للوحة التحكم'
              : 'Please log in to access the dashboard'
            }
          </p>
        </div>
        <div className="flex justify-center">
          <Button onClick={() => navigate('/plans')}>
            {language === 'ar' ? 'الذهاب لصفحة البرامج' : 'Go to Plans'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-8">
            {/* LEFT SECTION: Action Buttons */}
            <div className={`flex ${isRTL ? 'space-x-4 space-x-reverse order-last' : 'space-x-4 order-first'} md:flex hidden`}>
              <Button 
                className="bg-white/20 hover:bg-white/30 text-white border-white/20 rounded-xl px-6 py-3"
                onClick={() => navigate('/plans')}
              >
                {language === 'ar' ? 'عرض البرامج' : 'View Programs'}
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-6 py-3 shadow-lg"
                onClick={() => navigate('/plans/add')}
              >
                {language === 'ar' ? 'بدء العمل' : 'Get Started'}
              </Button>
            </div>
            
            {/* RIGHT SECTION: Welcome Text Content */}
            <div className={`flex-1 ${isRTL ? 'text-right order-first' : 'text-right order-last'}`}>
              <h1 className={`text-3xl font-bold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'مرحباً بك في نظام إدارة مركز أركان النمو' : 'Welcome to Arkan Growth Center Management'}
              </h1>
              <p className={`text-xl opacity-90 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لوحة التحكم الرئيسية - إدارة شاملة للمركز' : 'Main Dashboard - Comprehensive Center Management'}
              </p>
            </div>
          </div>
          
          {/* Mobile Action Buttons */}
          <div className={`flex md:hidden mt-6 ${isRTL ? 'space-x-4 space-x-reverse justify-end' : 'space-x-4 justify-start'}`}>
            <Button 
              className="bg-white/20 hover:bg-white/30 text-white border-white/20 rounded-xl px-4 py-2 text-sm"
              onClick={() => navigate('/plans')}
            >
              {language === 'ar' ? 'عرض البرامج' : 'View Programs'}
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 text-sm shadow-lg"
              onClick={() => navigate('/plans/add')}
            >
              {language === 'ar' ? 'بدء العمل' : 'Get Started'}
            </Button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
      </div>

      {/* Comprehensive ERP Dashboard */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="overview">{language === 'ar' ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="students">{language === 'ar' ? 'الطلاب' : 'Students'}</TabsTrigger>
          <TabsTrigger value="medical">{language === 'ar' ? 'طبي' : 'Medical'}</TabsTrigger>
          <TabsTrigger value="therapy">{language === 'ar' ? 'علاجي' : 'Therapy'}</TabsTrigger>
          <TabsTrigger value="financial">{language === 'ar' ? 'مالي' : 'Financial'}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="stats-grid">
            {/* Key Performance Indicators */}
            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center text-primary text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +12%
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {stats.totalStudents}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}
                  </p>
                  <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? `نشط: ${stats.activeStudents}` : `Active: ${stats.activeStudents}`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center text-primary text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +8%
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {stats.totalEnrollments}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'التسجيلات' : 'Enrollments'}
                  </p>
                  <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? `نشط: ${stats.activeEnrollments}` : `Active: ${stats.activeEnrollments}`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center text-primary text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +15%
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {stats.totalSessions}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الجلسات' : 'Sessions'}
                  </p>
                  <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? `قادمة: ${stats.upcomingSessions}` : `Upcoming: ${stats.upcomingSessions}`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center text-primary text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Star className="w-4 h-4 mr-1" />
                    {stats.activeTherapists}/{stats.totalTherapists}
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {stats.totalTherapists}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الأخصائيين' : 'Therapists'}
                  </p>
                  <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? `نشط: ${stats.activeTherapists}` : `Active: ${stats.activeTherapists}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <div className="stats-grid">
            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {stats.activeStudents}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الطلاب النشطون' : 'Active Students'}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {stats.activeEnrollments}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'التسجيلات النشطة' : 'Active Enrollments'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {stats.completedEnrollments}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'التسجيلات المكتملة' : 'Completed Enrollments'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="medical" className="space-y-6">
          <div className="stats-grid">
            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {stats.totalMedicalRecords}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'السجلات الطبية' : 'Medical Records'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {stats.activeDiagnoses}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'التشخيصات النشطة' : 'Active Diagnoses'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {stats.criticalAlerts}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'تنبيهات حرجة' : 'Critical Alerts'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="therapy" className="space-y-6">
          <div className="stats-grid">
            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {stats.activePrograms}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'البرامج العلاجية النشطة' : 'Active Therapy Programs'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {stats.activeGoals}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الأهداف النشطة' : 'Active Goals'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {Math.round(stats.goalCompletionRate)}%
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'معدل إنجاز الأهداف' : 'Goal Completion Rate'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="stats-grid">
            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center text-green-600 text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +15%
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {formatCurrency(stats.totalRevenue)}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {Math.round(stats.paymentCompletionRate)}%
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'معدل اكتمال المدفوعات' : 'Payment Completion Rate'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card stats-card-responsive">
              <CardContent className="p-6">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {formatCurrency(stats.averagePrice)}
                  </h3>
                  <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'متوسط سعر البرنامج' : 'Average Program Price'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Quick Actions */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className={`text-xl font-bold ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
            {language === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}
          </CardTitle>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
            {language === 'ar' ? 'المهام الأكثر استخداماً في النظام العلاجي' : 'Most frequently used tasks in the therapy system'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div
              className="action-card bg-gradient-to-br from-blue-500 to-cyan-400 cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/students')}
            >
              <Users className="w-8 h-8 mb-3 mx-auto" />
              <h4 className={`font-semibold mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إدارة الطلاب' : 'Manage Students'}
              </h4>
              <p className={`text-sm opacity-90 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'عرض الطلاب' : 'View Students'}
              </p>
            </div>

            <div
              className="action-card bg-gradient-to-br from-green-500 to-emerald-400 cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/enrollments')}
            >
              <ClipboardList className="w-8 h-8 mb-3 mx-auto" />
              <h4 className={`font-semibold mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'التسجيلات' : 'Enrollments'}
              </h4>
              <p className={`text-sm opacity-90 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إدارة التسجيلات' : 'Manage Enrollments'}
              </p>
            </div>

            <div
              className="action-card bg-gradient-to-br from-red-500 to-pink-400 cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/students')}
            >
              <Heart className="w-8 h-8 mb-3 mx-auto" />
              <h4 className={`font-semibold mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'السجلات الطبية' : 'Medical Records'}
              </h4>
              <p className={`text-sm opacity-90 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الصحة والعلاج' : 'Health & Therapy'}
              </p>
            </div>

            <div
              className="action-card bg-gradient-to-br from-purple-500 to-indigo-400 cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/courses')}
            >
              <Brain className="w-8 h-8 mb-3 mx-auto" />
              <h4 className={`font-semibold mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'البرامج العلاجية' : 'Therapy Programs'}
              </h4>
              <p className={`text-sm opacity-90 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إدارة البرامج' : 'Manage Programs'}
              </p>
            </div>

            <div
              className="action-card bg-gradient-to-br from-teal-500 to-green-400 cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/sessions')}
            >
              <Calendar className="w-8 h-8 mb-3 mx-auto" />
              <h4 className={`font-semibold mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الجلسات' : 'Sessions'}
              </h4>
              <p className={`text-sm opacity-90 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'جدولة الجلسات' : 'Schedule Sessions'}
              </p>
            </div>

            <div
              className="action-card bg-gradient-to-br from-orange-500 to-yellow-400 cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/therapists')}
            >
              <Stethoscope className="w-8 h-8 mb-3 mx-auto" />
              <h4 className={`font-semibold mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الأخصائيين' : 'Therapists'}
              </h4>
              <p className={`text-sm opacity-90 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إدارة الأخصائيين' : 'Manage Therapists'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Overview / Welcome Message */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'نظام إدارة العلاج الشامل' : 'Comprehensive Therapy Management System'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-muted-foreground mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? `مرحباً بك في نظام إدارة العلاج الشامل لمركز أركان النمو. نظام متكامل لإدارة الطلاب، السجلات الطبية، البرامج العلاجية، والتقييمات بشكل احترافي.`
              : `Welcome to the Comprehensive Therapy Management System for Arkan Growth Center. An integrated system for managing students, medical records, therapy programs, and assessments professionally.`
            }
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className={`p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500 ${isRTL ? 'border-r-4 border-l-0' : ''}`}>
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Users className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <p className={`text-sm font-medium text-blue-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'إدارة الطلاب' : 'Student Management'}
                  </p>
                  <p className={`text-xs text-blue-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'ملفات شاملة للطلاب' : 'Comprehensive student profiles'}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg bg-red-50 border-l-4 border-red-500 ${isRTL ? 'border-r-4 border-l-0' : ''}`}>
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Heart className="w-5 h-5 text-red-600 mr-2" />
                <div>
                  <p className={`text-sm font-medium text-red-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'السجلات الطبية' : 'Medical Records'}
                  </p>
                  <p className={`text-xs text-red-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'متابعة صحية دقيقة' : 'Precise health monitoring'}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg bg-purple-50 border-l-4 border-purple-500 ${isRTL ? 'border-r-4 border-l-0' : ''}`}>
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Brain className="w-5 h-5 text-purple-600 mr-2" />
                <div>
                  <p className={`text-sm font-medium text-purple-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'البرامج العلاجية' : 'Therapy Programs'}
                  </p>
                  <p className={`text-xs text-purple-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'خطط علاجية مخصصة' : 'Customized therapy plans'}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg bg-green-50 border-l-4 border-green-500 ${isRTL ? 'border-r-4 border-l-0' : ''}`}>
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
                <div>
                  <p className={`text-sm font-medium text-green-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'التقارير والتحليلات' : 'Reports & Analytics'}
                  </p>
                  <p className={`text-xs text-green-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'رؤى تحليلية متقدمة' : 'Advanced analytical insights'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {plansLoading && (
            <p className={`text-sm text-muted-foreground mt-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading system data...'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}