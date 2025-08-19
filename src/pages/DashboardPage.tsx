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
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
          </h1>
          <p className={`text-sm sm:text-base text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? 'نظرة عامة على البرامج العلاجية والإحصائيات'
              : 'Overview of therapy programs and statistics'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/plans/add')}>
            <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'برنامج جديد' : 'New Plan'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/categories/add')}>
            <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'تصنيف جديد' : 'New Category'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'إجمالي البرامج' : 'Total Plans'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlans}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'برنامج علاجي' : 'therapy programs'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'البرامج النشطة' : 'Active Plans'}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activePlans}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'برنامج نشط' : 'active programs'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'البرامج المميزة' : 'Featured'}
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.featuredPlans}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'برنامج مميز' : 'featured programs'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'التصنيفات' : 'Categories'}
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'تصنيف' : 'categories'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'متوسط السعر' : 'Avg Price'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averagePrice)}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'متوسط السعر' : 'average price'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'إجمالي القيمة' : 'Total Value'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'إجمالي القيمة' : 'total value'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/plans')}>
          <CardHeader>
            <CardTitle className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} ${language === 'ar' ? 'font-arabic' : ''}`}>
              <FileText className="h-5 w-5 text-blue-600" />
              <span>{language === 'ar' ? 'إدارة البرامج' : 'Manage Plans'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' 
                ? 'عرض وإدارة جميع البرامج العلاجية المتاحة'
                : 'View and manage all available therapy programs'
              }
            </p>
            <div className="mt-4">
              <Button variant="outline" size="sm">
                {language === 'ar' ? 'عرض البرامج' : 'View Plans'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/categories')}>
          <CardHeader>
            <CardTitle className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} ${language === 'ar' ? 'font-arabic' : ''}`}>
              <FolderOpen className="h-5 w-5 text-green-600" />
              <span>{language === 'ar' ? 'إدارة التصنيفات' : 'Manage Categories'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' 
                ? 'تنظيم وإدارة تصنيفات البرامج العلاجية'
                : 'Organize and manage therapy program categories'
              }
            </p>
            <div className="mt-4">
              <Button variant="outline" size="sm">
                {language === 'ar' ? 'عرض التصنيفات' : 'View Categories'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/plans/add')}>
          <CardHeader>
            <CardTitle className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} ${language === 'ar' ? 'font-arabic' : ''}`}>
              <Plus className="h-5 w-5 text-purple-600" />
              <span>{language === 'ar' ? 'إضافة برنامج جديد' : 'Add New Plan'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' 
                ? 'إنشاء برنامج علاجي جديد مع تفاصيل شاملة'
                : 'Create a new therapy program with comprehensive details'
              }
            </p>
            <div className="mt-4">
              <Button variant="outline" size="sm">
                {language === 'ar' ? 'إنشاء برنامج' : 'Create Plan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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