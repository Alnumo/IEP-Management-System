import { useState, useMemo, useEffect } from 'react'
import { Plus, TrendingUp, Users, Star, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlanCard } from '@/components/cards/PlanCard'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { SortDropdown } from '@/components/shared/SortDropdown'
import { LoginForm } from '@/components/auth/LoginForm'
import { usePlans, useDeletePlan } from '@/hooks/usePlans'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { PlanFilters, PlanSortOptions } from '@/types/plans'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export const PlansPage = () => {
  const navigate = useNavigate()
  const { language, isRTL } = useLanguage()
  const { t } = useTranslation()
  const [filters, setFilters] = useState<PlanFilters>({})
  const [sortOptions, setSortOptions] = useState<PlanSortOptions>({
    field: 'created_at',
    direction: 'desc'
  })
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
  
  const { data: allPlans = [], isLoading, error } = usePlans({})
  const deletePlanMutation = useDeletePlan()
  
  // Apply filters and sorting locally for better UX
  const { plans, stats } = useMemo(() => {
    let filteredPlans = [...allPlans]
    
    // Apply filters
    if (filters.category_id) {
      filteredPlans = filteredPlans.filter(plan => plan.category_id === filters.category_id)
    }
    
    if (filters.is_active !== undefined) {
      filteredPlans = filteredPlans.filter(plan => plan.is_active === filters.is_active)
    }
    
    if (filters.is_featured !== undefined) {
      filteredPlans = filteredPlans.filter(plan => plan.is_featured === filters.is_featured)
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredPlans = filteredPlans.filter(plan => 
        plan.name_ar.toLowerCase().includes(searchLower) ||
        plan.name_en?.toLowerCase().includes(searchLower) ||
        plan.description_ar?.toLowerCase().includes(searchLower)
      )
    }
    
    if (filters.price_min !== undefined) {
      filteredPlans = filteredPlans.filter(plan => plan.final_price >= filters.price_min!)
    }
    
    if (filters.price_max !== undefined) {
      filteredPlans = filteredPlans.filter(plan => plan.final_price <= filters.price_max!)
    }
    
    // Apply sorting
    filteredPlans.sort((a, b) => {
      let aValue: any = a[sortOptions.field]
      let bValue: any = b[sortOptions.field]
      
      if (sortOptions.field === 'name_ar') {
        aValue = aValue?.toLowerCase() || ''
        bValue = bValue?.toLowerCase() || ''
      }
      
      if (aValue < bValue) return sortOptions.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOptions.direction === 'asc' ? 1 : -1
      return 0
    })
    
    // Calculate stats
    const activePlans = allPlans.filter(plan => plan.is_active)
    const featuredPlans = allPlans.filter(plan => plan.is_featured)
    const averagePrice = allPlans.length > 0 
      ? allPlans.reduce((sum, plan) => sum + plan.final_price, 0) / allPlans.length 
      : 0
    
    return {
      plans: filteredPlans,
      stats: {
        total: allPlans.length,
        active: activePlans.length,
        featured: featuredPlans.length,
        averagePrice
      }
    }
  }, [allPlans, filters, sortOptions])

  const handleEdit = (id: string) => {
    navigate(`/plans/edit/${id}`)
  }

  const handleView = (id: string) => {
    navigate(`/plans/${id}`)
  }

  const handleDuplicate = (id: string) => {
    console.log('Duplicate plan:', id)
    // Duplicate functionality placeholder - would create copy of plan
  }

  const handleDelete = async (id: string) => {
    console.log('Delete plan:', id)
    
    // Get the plan name for confirmation
    const plan = allPlans.find(p => p.id === id)
    const planName = plan?.name_ar || 'هذا البرنامج'
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف البرنامج "${planName}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`
    )
    
    if (!confirmed) return
    
    try {
      await deletePlanMutation.mutateAsync(id)
      console.log('✅ Plan deleted successfully')
    } catch (error) {
      console.error('❌ Failed to delete plan:', error)
      alert(`خطأ في حذف البرنامج: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    }
  }

  const handleAddNew = () => {
    console.log('Add New button clicked - navigating to /plans/add')
    navigate('/plans/add')
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {t('plans.title')}
          </h1>
          <p className={`text-muted-foreground mb-6 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? 'يجب تسجيل الدخول للوصول لإدارة البرامج العلاجية'
              : 'Please log in to access therapy plans management'
            }
          </p>
        </div>
        <LoginForm />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-red-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
          {error.message || 'An error occurred while loading plans'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {t('plans.title')}
          </h1>
          <p className={`text-sm sm:text-base text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? 'إدارة وتنظيم جميع البرامج العلاجية المتاحة في المركز'
              : 'Manage and organize all therapy programs available in the center'
            }
          </p>
        </div>
        <Button onClick={handleAddNew} className="self-start sm:self-auto">
          <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          <span className="hidden sm:inline">{t('plans.addNew')}</span>
          <span className="sm:hidden">{language === 'ar' ? 'إضافة' : 'Add'}</span>
        </Button>
      </div>

      {/* Statistics cards */}
      {!isLoading && stats.total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 gap-2">
              <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إجمالي البرامج' : 'Total Programs'}
              </CardTitle>
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 gap-2">
              <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'البرامج النشطة' : 'Active Programs'}
              </CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 gap-2">
              <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'البرامج المميزة' : 'Featured Programs'}
              </CardTitle>
              <Star className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.featured}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 gap-2">
              <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'متوسط السعر' : 'Average Price'}
              </CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-lg sm:text-2xl font-bold">{formatCurrency(stats.averagePrice)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and filters */}
      <SearchFilter
        filters={filters}
        onFiltersChange={setFilters}
        placeholder="البحث في البرامج..."
      />

      {/* Results header with sorting */}
      {!isLoading && plans.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <p className={`text-xs sm:text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? `عرض ${plans.length} من أصل ${stats.total} برنامج`
              : `Showing ${plans.length} of ${stats.total} programs`
            }
          </p>
          <SortDropdown
            sortOptions={sortOptions}
            onSortChange={setSortOptions}
          />
        </div>
      )}

      {/* Plans grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''} mb-4 text-sm sm:text-base`}>
            {Object.keys(filters).length > 0 
              ? (language === 'ar' ? 'لا توجد برامج تطابق المرشحات المحددة' : 'No programs match the selected filters')
              : (language === 'ar' ? 'لا توجد برامج علاجية' : 'No therapy programs available')
            }
          </p>
          {Object.keys(filters).length === 0 && (
            <Button onClick={handleAddNew}>
              <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'إضافة أول برنامج' : 'Add first program'}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={handleEdit}
              onView={handleView}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}