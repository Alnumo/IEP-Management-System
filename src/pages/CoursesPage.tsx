import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, BookOpen, Users, DollarSign, TrendingUp, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/badge'
import { useCourses, useCourseStats } from '@/hooks/useCourses'
import type { CourseFilters } from '@/types/course'

export const CoursesPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Prepare filters for courses query
  const filters: CourseFilters = {}
  if (searchTerm.trim()) {
    filters.search = searchTerm.trim()
  }

  // Fetch real data
  const { data: courses = [], isLoading: coursesLoading, error: coursesError } = useCourses(filters)
  const { data: stats, isLoading: statsLoading } = useCourseStats()

  // Debug logging
  console.log('🔍 CoursesPage: coursesLoading:', coursesLoading)
  console.log('🔍 CoursesPage: coursesError:', coursesError)
  console.log('🔍 CoursesPage: courses:', courses)
  console.log('🔍 CoursesPage: statsLoading:', statsLoading)
  console.log('🔍 CoursesPage: stats:', stats)

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'planned': return 'outline' 
      case 'completed': return 'secondary'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      active: language === 'ar' ? 'نشط' : 'Active',
      planned: language === 'ar' ? 'مخطط' : 'Planned',
      completed: language === 'ar' ? 'مكتمل' : 'Completed',
      cancelled: language === 'ar' ? 'ملغي' : 'Cancelled'
    }
    return statusLabels[status as keyof typeof statusLabels] || status
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'الدورات' : 'Courses'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة الدورات التدريبية' : 'Manage training courses'}
          </p>
        </div>
        <Button onClick={() => navigate('/courses/add')}>
          <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {language === 'ar' ? 'إضافة دورة' : 'Add Course'}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            placeholder={language === 'ar' ? 'البحث في الدورات...' : 'Search courses...'}
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
          <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 gap-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'إجمالي الدورات' : 'Total Courses'}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'دورة متاحة' : 'available courses'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 gap-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الدورات النشطة' : 'Active Courses'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : stats?.active || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'دورة نشطة' : 'active courses'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 gap-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'إجمالي الطلاب' : 'Total Enrolled'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : stats?.totalEnrollments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'طالب مسجل' : 'enrolled students'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 gap-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'معدل الإشغال' : 'Occupancy Rate'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {statsLoading ? '...' : `${stats?.occupancyRate || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'معدل التسجيل' : 'enrollment rate'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Courses List */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'قائمة الدورات' : 'Courses List'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coursesError ? (
            <div className="text-center py-8">
              <p className="text-destructive text-sm">
                {language === 'ar' ? 'خطأ في تحميل الدورات' : 'Error loading courses'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {coursesError.message}
              </p>
            </div>
          ) : coursesLoading ? (
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
          ) : courses.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد دورات متاحة' : 'No courses available'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'ar' ? 'ابدأ بإنشاء دورة جديدة' : 'Start by creating a new course'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-custom-accent transition-colors"
                >
                  {/* Right side: Action buttons and Status badge */}
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/courses/${course.id}`)}
                    >
                      {language === 'ar' ? 'عرض' : 'View'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/courses/edit/${course.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </Button>
                    <Badge variant={getStatusBadgeVariant(course.status)}>
                      {getStatusLabel(course.status)}
                    </Badge>
                  </div>
                  {/* Left side: Text and Icon */}
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? course.name_ar : (course.name_en || course.name_ar)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {course.course_code} • {language === 'ar' ? 'المدرب:' : 'Instructor:'} {course.therapist_name || (language === 'ar' ? 'غير محدد' : 'Not assigned')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(course.start_date)} - {formatDate(course.end_date)} • 
                        {' '}{course.enrolled_students}/{course.max_students} {language === 'ar' ? 'طلاب' : 'students'}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
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