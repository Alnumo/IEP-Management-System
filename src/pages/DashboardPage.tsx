import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, Star, Activity, DollarSign, FileText, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePlans } from '@/hooks/usePlans'
import { useCategories } from '@/hooks/useCategories'
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
  
  const { data: allPlans = [], isLoading: plansLoading } = usePlans({})
  const { data: allCategories = [] } = useCategories()

  // Calculate statistics
  const stats = {
    totalPlans: allPlans.length,
    activePlans: allPlans.filter(plan => plan.is_active).length,
    featuredPlans: allPlans.filter(plan => plan.is_featured).length,
    totalCategories: allCategories.length,
    averagePrice: allPlans.length > 0 
      ? allPlans.reduce((sum, plan) => sum + plan.final_price, 0) / allPlans.length 
      : 0,
    totalRevenue: allPlans.reduce((sum, plan) => sum + plan.final_price, 0)
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
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3 shadow-lg"
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
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm shadow-lg"
              onClick={() => navigate('/plans/add')}
            >
              {language === 'ar' ? 'بدء العمل' : 'Get Started'}
            </Button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <Card className="stats-card stats-card-responsive">
          <CardContent className="p-6">
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center text-primary text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                <TrendingUp className="w-4 h-4 mr-1" />
                +12%
              </div>
            </div>
            <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
              <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {stats.totalPlans}
              </h3>
              <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إجمالي البرامج' : 'Total Plans'}
              </p>
              <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'برنامج علاجي' : 'therapy programs'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card stats-card-responsive">
          <CardContent className="p-6">
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center text-primary text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                <TrendingUp className="w-4 h-4 mr-1" />
                +8%
              </div>
            </div>
            <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
              <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {stats.activePlans}
              </h3>
              <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'البرامج النشطة' : 'Active Plans'}
              </p>
              <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'برنامج نشط' : 'active programs'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card stats-card-responsive">
          <CardContent className="p-6">
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center text-primary text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                <TrendingUp className="w-4 h-4 mr-1" />
                +5%
              </div>
            </div>
            <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
              <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {stats.featuredPlans}
              </h3>
              <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'البرامج المميزة' : 'Featured Plans'}
              </p>
              <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'برنامج مميز' : 'featured programs'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card stats-card-responsive">
          <CardContent className="p-6">
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center text-primary text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                <TrendingUp className="w-4 h-4 mr-1" />
                +3%
              </div>
            </div>
            <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
              <h3 className={`text-2xl font-bold text-foreground mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {stats.totalCategories}
              </h3>
              <p className={`text-muted-foreground font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'التصنيفات' : 'Categories'}
              </p>
              <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'تصنيف' : 'categories'}
              </p>
            </div>
          </CardContent>
        </Card>

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
              <h3 className={`text-2xl font-bold text-gray-900 mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {formatCurrency(stats.averagePrice)}
              </h3>
              <p className={`text-gray-600 font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'متوسط السعر' : 'Average Price'}
              </p>
              <p className={`text-sm text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'متوسط السعر' : 'average price'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className={`text-xl font-bold ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
            {language === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}
          </CardTitle>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
            {language === 'ar' ? 'المهام الأكثر استخداماً' : 'Most frequently used tasks'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              className="action-card bg-gradient-to-br from-teal-500 to-blue-500 cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/plans')}
            >
              <FileText className="w-8 h-8 mb-3 mx-auto" />
              <h4 className={`font-semibold mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إدارة البرامج' : 'Manage Plans'}
              </h4>
              <p className={`text-sm opacity-90 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'عرض البرامج' : 'View Programs'}
              </p>
            </div>

            <div
              className="action-card bg-gradient-to-br from-blue-500 to-purple-500 cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/categories')}
            >
              <FolderOpen className="w-8 h-8 mb-3 mx-auto" />
              <h4 className={`font-semibold mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'التصنيفات' : 'Categories'}
              </h4>
              <p className={`text-sm opacity-90 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إدارة التصنيفات' : 'Manage Categories'}
              </p>
            </div>

            <div
              className="action-card bg-gradient-to-br from-green-500 to-teal-500 cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/plans/add')}
            >
              <Plus className="w-8 h-8 mb-3 mx-auto" />
              <h4 className={`font-semibold mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'برنامج جديد' : 'New Plan'}
              </h4>
              <p className={`text-sm opacity-90 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إنشاء برنامج' : 'Create Program'}
              </p>
            </div>

            <div
              className="action-card bg-gradient-to-br from-orange-500 to-red-500 cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/students')}
            >
              <Activity className="w-8 h-8 mb-3 mx-auto" />
              <h4 className={`font-semibold mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الطلاب' : 'Students'}
              </h4>
              <p className={`text-sm opacity-90 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إدارة الطلاب' : 'Manage Students'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity / Welcome Message */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'مرحباً بك' : 'Welcome'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? `مرحباً بك في نظام إدارة البرامج العلاجية لمركز أركان النمو. يمكنك من هنا إدارة البرامج والتصنيفات وعرض الإحصائيات.`
              : `Welcome to the Therapy Plans Management System for Arkan Al-Numo Center. From here you can manage programs, categories, and view statistics.`
            }
          </p>
          {plansLoading && (
            <p className={`text-sm text-muted-foreground mt-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading data...'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}