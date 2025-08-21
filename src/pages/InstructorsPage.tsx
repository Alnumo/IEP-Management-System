import { useState } from 'react'
import { Plus, Search, Filter, Users, TrendingUp, Clock, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/badge'
import { useInstructors, useInstructorStats } from '@/hooks/useInstructors'
import type { InstructorFilters } from '@/types/instructor'

export const InstructorsPage = () => {
  const { language, isRTL } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Prepare filters for instructors query
  const filters: InstructorFilters = {}
  if (searchTerm.trim()) {
    filters.search = searchTerm.trim()
  }

  // Fetch real data
  const { data: instructors = [], isLoading: instructorsLoading, error: instructorsError } = useInstructors(filters)
  const { data: stats, isLoading: statsLoading } = useInstructorStats()

  // Debug logging
  console.log('🔍 InstructorsPage: instructorsLoading:', instructorsLoading)
  console.log('🔍 InstructorsPage: instructorsError:', instructorsError)
  console.log('🔍 InstructorsPage: instructors:', instructors)
  console.log('🔍 InstructorsPage: statsLoading:', statsLoading)
  console.log('🔍 InstructorsPage: stats:', stats)

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary' 
      case 'on_leave': return 'outline'
      case 'terminated': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      active: language === 'ar' ? 'نشط' : 'Active',
      inactive: language === 'ar' ? 'غير نشط' : 'Inactive',
      on_leave: language === 'ar' ? 'في إجازة' : 'On Leave',
      terminated: language === 'ar' ? 'منتهي الخدمة' : 'Terminated'
    }
    return statusLabels[status as keyof typeof statusLabels] || status
  }

  const getEmploymentTypeLabel = (type: string) => {
    const typeLabels = {
      full_time: language === 'ar' ? 'دوام كامل' : 'Full Time',
      part_time: language === 'ar' ? 'دوام جزئي' : 'Part Time',
      contract: language === 'ar' ? 'تعاقد' : 'Contract',
      volunteer: language === 'ar' ? 'تطوع' : 'Volunteer'
    }
    return typeLabels[type as keyof typeof typeLabels] || type
  }

  const getInstructorName = (instructor: any) => {
    if (language === 'ar') {
      return `${instructor.first_name_ar} ${instructor.last_name_ar}`
    } else {
      const englishName = instructor.first_name_en && instructor.last_name_en 
        ? `${instructor.first_name_en} ${instructor.last_name_en}`
        : `${instructor.first_name_ar} ${instructor.last_name_ar}`
      return englishName
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'المدربون' : 'Instructors'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة المدربين والأكاديميين' : 'Manage instructors and academics'}
          </p>
        </div>
        <Button onClick={() => window.location.href = '/instructors/add'}>
          <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {language === 'ar' ? 'إضافة مدرب' : 'Add Instructor'}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            placeholder={language === 'ar' ? 'البحث في المدربين...' : 'Search instructors...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${isRTL ? 'pr-10' : 'pl-10'} ${language === 'ar' ? 'font-arabic' : ''}`}
          />
        </div>
        <Button variant="outline">
          <Filter className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {language === 'ar' ? 'تصفية' : 'Filter'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'إجمالي المدربين' : 'Total Instructors'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.total_instructors || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'مدرب متاح' : 'available instructors'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'المدربون النشطون' : 'Active Instructors'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : stats?.active_instructors || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'مدرب نشط' : 'active instructors'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'متوسط الخبرة' : 'Average Experience'}
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? '...' : stats?.average_experience || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'سنة خبرة' : 'years experience'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'معدل الأجر/ساعة' : 'Avg Hourly Rate'}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {statsLoading ? '...' : `${stats?.average_hourly_rate || 0} ${language === 'ar' ? 'ر.س' : 'SAR'}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'ريال/ساعة' : 'SAR per hour'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Instructors List */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'قائمة المدربين' : 'Instructors List'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {instructorsError ? (
            <div className="text-center py-8">
              <p className="text-destructive text-sm">
                {language === 'ar' ? 'خطأ في تحميل المدربين' : 'Error loading instructors'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {instructorsError.message}
              </p>
            </div>
          ) : instructorsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : instructors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا يوجد مدربون متاحون' : 'No instructors available'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'ar' ? 'ابدأ بإضافة مدرب جديد' : 'Start by adding a new instructor'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {instructors.map((instructor) => (
                <div
                  key={instructor.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {getInstructorName(instructor)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? instructor.specialization_ar : (instructor.specialization_en || instructor.specialization_ar)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{instructor.experience_years} {language === 'ar' ? 'سنة خبرة' : 'years exp'}</span>
                        <span>•</span>
                        <span>{getEmploymentTypeLabel(instructor.employment_type)}</span>
                        {instructor.hourly_rate && (
                          <>
                            <span>•</span>
                            <span>{instructor.hourly_rate} {language === 'ar' ? 'ر.س/ساعة' : 'SAR/hr'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusBadgeVariant(instructor.status)}>
                      {getStatusLabel(instructor.status)}
                    </Badge>
                    <Button variant="outline" size="sm">
                      {language === 'ar' ? 'عرض' : 'View'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}